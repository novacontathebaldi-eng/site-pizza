/* eslint-disable max-len */
const {onCall} = require("firebase-functions/v2/https");
const {onRequest} = require("firebase-functions/v2/https");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();
const db = admin.firestore();

// Helper to format price to cents
const toCents = (price) => Math.round(price * 100);

// NEW: Callable function to generate a PIX checkout link with InfinitePay (Public API)
exports.generateInfinitePayCheckoutLink = onCall(async (request) => {
  const {orderId, cartItems} = request.data;

  if (!orderId || !cartItems) {
    throw new Error("O ID do pedido e os itens do carrinho são obrigatórios.");
  }

  try {
    const itemsPayload = cartItems.map((item) => ({
      description: `${item.name} (${item.size})`,
      quantity: item.quantity,
      price: toCents(item.price),
    }));

    const payload = {
      handle: "thebaldi", // Your InfinitePay handle without the '$'
      redirect_url: "https://santasensacao.me/#payment-success",
      webhook_url: `https://us-central1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/infinitePayWebhook`,
      order_nsu: orderId, // Use Firestore order ID to link the transaction
      items: itemsPayload,
    };

    const response = await axios.post("https://api.infinitepay.io/invoices/public/checkout/links", payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    const checkoutUrl = response.data.checkout_url;

    if (!checkoutUrl) {
      logger.error("Resposta da API da InfinitePay não contém a URL de checkout.", response.data);
      throw new Error("Resposta da API de pagamento está incompleta.");
    }

    await db.collection("orders").doc(orderId).update({pixChargeId: response.data.id});

    logger.info(`Link de checkout PIX criado para o pedido ${orderId}`);
    return checkoutUrl;
  } catch (error) {
    logger.error("Erro ao criar link de checkout na InfinitePay:", error.response ? error.response.data : error.message);
    throw new Error("Falha ao comunicar com o gateway de pagamento.");
  }
});


// Webhook receiver for InfinitePay payment confirmations
exports.infinitePayWebhook = onRequest(async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).send("Method Not Allowed");
    return;
  }

  logger.info("Webhook recebido:", request.body);

  // Handle both old (customer_id) and new (order_nsu) identifiers
  const {status, customer_id, order_nsu} = request.body;
  const orderId = order_nsu || customer_id;

  if (!orderId) {
    logger.error("Payload do webhook não contém 'order_nsu' ou 'customer_id'.");
    response.status(400).json({success: false, message: "Missing order identifier"});
    return;
  }

  if (status === "PAID") {
    try {
      const orderRef = db.collection("orders").doc(orderId);
      await orderRef.update({paymentStatus: "paid"});
      logger.info(`Pedido ${orderId} marcado como pago via webhook.`);
      response.status(200).json({success: true});
    } catch (error) {
      logger.error(`Erro ao atualizar o pedido ${orderId} a partir do webhook:`, error);
      response.status(500).json({success: false, message: "Internal server error"});
    }
  } else {
    logger.info(`Webhook para o pedido ${orderId} recebido com status: ${status}. Nenhuma ação tomada.`);
    response.status(200).json({success: true, message: `Webhook received with status: ${status}`});
  }
});

// Cloud Function to send a push notification when a new order is created
exports.sendNotificationOnNewOrder = onDocumentCreated("orders/{orderId}", async (event) => {
  const order = event.data.data();

  if (order.status !== "pending") {
    logger.info(`Order ${event.params.orderId} created with status '${order.status}', no notification sent.`);
    return null;
  }

  const tokensSnapshot = await db.collection("fcmTokens").get();
  if (tokensSnapshot.empty) {
    logger.info("No FCM tokens found. No notification will be sent.");
    return null;
  }
  const tokens = tokensSnapshot.docs.map((doc) => doc.id);

  const payload = {
    notification: {
      title: "🍕 Novo Pedido!",
      body: `Cliente: ${order.customer.name} - Total: R$${order.total.toFixed(2).replace(".", ",")}`,
      icon: "https://santasensacao.me/assets/logo para icones.png",
      click_action: `https://santasensacao.me/#admin`,
    },
    webpush: {
      fcmOptions: {
        link: `https://santasensacao.me/#admin`,
      },
    },
  };

  logger.info(`Sending notification for new order ${event.params.orderId} to ${tokens.length} device(s).`);

  const response = await admin.messaging().sendToDevice(tokens, payload);
  const tokensToRemove = [];

  response.results.forEach((result, index) => {
    const error = result.error;
    if (error) {
      logger.error(`Failure sending notification to ${tokens[index]}`, error);
      if (error.code === "messaging/registration-token-not-registered" ||
          error.code === "messaging/invalid-registration-token") {
        tokensToRemove.push(tokensSnapshot.docs[index].ref.delete());
      }
    }
  });

  return Promise.all(tokensToRemove);
});