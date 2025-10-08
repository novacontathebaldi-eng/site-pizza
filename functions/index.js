/* eslint-disable max-len */
const {onCall} = require("firebase-functions/v2/https");
const {onRequest} = require("firebase-functions/v2/https");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const {MercadoPagoConfig, Payment} = require("mercadopago");
require("dotenv").config();

admin.initializeApp();
const db = admin.firestore();

// Initialize Mercado Pago Client
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
});

/**
 * Creates a PIX payment order with Mercado Pago.
 * This function is called from the frontend to initiate a payment.
 */
exports.createMercadoPagoOrder = onCall(async (request) => {
  const orderId = request.data.orderId;
  if (!orderId) {
    logger.error("Request missing orderId.");
    throw new Error("O ID do pedido é obrigatório.");
  }

  try {
    const orderDoc = await db.collection("orders").doc(orderId).get();
    if (!orderDoc.exists) {
      logger.error(`Order with ID ${orderId} not found.`);
      throw new Error("Pedido não encontrado.");
    }
    const orderData = orderDoc.data();

    // The notification URL for the webhook
    const notificationUrl = `https://us-central1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/mercadoPagoWebhook`;

    const paymentData = {
      transaction_amount: orderData.total,
      description: `Pedido #${orderId.substring(0, 8)} - ${orderData.customer.name}`,
      payment_method_id: "pix",
      payer: {
        email: `cliente_${orderId}@santasensacao.me`,
        first_name: orderData.customer.name.split(" ")[0],
        last_name: orderData.customer.name.split(" ").slice(1).join(" ") || "Cliente",
        identification: {
          type: "CPF",
          number: "00000000000",
        },
      },
      notification_url: notificationUrl,
      external_reference: orderId, // Link the payment to our order ID
    };

    const payment = new Payment(client);
    const result = await payment.create({body: paymentData});

    if (!result || !result.id) {
        logger.error("Invalid response from Mercado Pago when creating payment.", {result});
        throw new Error("Resposta inválida do gateway de pagamento.");
    }

    const paymentId = result.id.toString();
    const qrCodeBase64 = result.point_of_interaction?.transaction_data?.qr_code_base64;
    const copyPaste = result.point_of_interaction?.transaction_data?.qr_code;

    if (!qrCodeBase64 || !copyPaste) {
        logger.error("Mercado Pago response missing PIX data.", {result});
        throw new Error("Dados PIX não retornados pelo gateway de pagamento.");
    }

    await db.collection("orders").doc(orderId).update({
      mercadoPagoPaymentId: paymentId,
    });

    logger.info(`Pagamento PIX criado para o pedido ${orderId}, ID do pagamento MP: ${paymentId}`);

    return {
      qrCodeBase64,
      copyPaste,
    };
  } catch (error) {
    logger.error(`Erro ao criar pagamento no Mercado Pago para o pedido ${orderId}:`, error.cause || error.message);
    throw new Error("Falha ao comunicar com o gateway de pagamento.");
  }
});


/**
 * Webhook to receive payment status updates from Mercado Pago.
 */
exports.mercadoPagoWebhook = onRequest(async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).send("Method Not Allowed");
    return;
  }

  const {action, data} = request.body;
  logger.info("Webhook do Mercado Pago recebido:", request.body);

  if (action !== "payment.updated") {
    logger.info(`Ação '${action}' ignorada.`);
    response.status(200).send("OK");
    return;
  }

  const paymentId = data?.id;
  if (!paymentId) {
    logger.warn("Webhook recebido sem ID de pagamento.");
    response.status(400).send("Bad Request: Missing payment ID");
    return;
  }

  try {
    const payment = new Payment(client);
    const paymentInfo = await payment.get({id: paymentId});

    if (!paymentInfo || !paymentInfo.external_reference) {
      logger.error(`Não foi possível obter informações do pagamento ${paymentId} ou falta referência externa.`);
      response.status(404).send("Payment not found or missing reference");
      return;
    }

    const orderId = paymentInfo.external_reference;

    if (paymentInfo.status === "approved") {
      const orderRef = db.collection("orders").doc(orderId);
      await orderRef.update({paymentStatus: "paid"});
      logger.info(`Pedido ${orderId} (Pagamento MP: ${paymentId}) foi marcado como 'pago' via webhook.`);
    } else {
      logger.info(`Status do pagamento ${paymentId} é '${paymentInfo.status}'. Nenhuma ação tomada.`);
    }

    response.status(200).send("OK");
  } catch (error) {
    logger.error(`Erro ao processar webhook para o pagamento ${paymentId}:`, error.cause || error.message);
    response.status(500).send("Internal Server Error");
  }
});

/**
 * Sends a push notification to all admins when a new pending order is created.
 */
exports.sendPushOnNewOrder = onDocumentCreated("orders/{orderId}", async (event) => {
  const orderData = event.data.data();

  // Only send notification for new pending orders
  if (orderData.status !== "pending") {
    logger.info(`Order ${event.params.orderId} created with status '${orderData.status}', no notification sent.`);
    return null;
  }

  logger.info(`New pending order detected: ${event.params.orderId}. Preparing to send notifications.`);

  // Get all saved FCM tokens for admins
  const tokensSnapshot = await db.collection("fcmTokens").get();
  if (tokensSnapshot.empty) {
    logger.info("No FCM tokens found. No notifications will be sent.");
    return null;
  }

  const tokens = tokensSnapshot.docs.map((doc) => doc.id);

  const payload = {
    notification: {
      title: "🍕 Novo Pedido na Santa Sensação!",
      body: `Novo pedido de ${orderData.customer.name} no valor de R$${orderData.total.toFixed(2).replace(".", ",")}.`,
      icon: "https://www.santasensacao.me/assets/logo para icones.png",
    },
    data: {
      url: "/#admin", // This will be used by the service worker to open the correct page
    },
  };

  logger.info(`Sending notification to ${tokens.length} device(s).`);

  // Send notifications to all tokens
  const response = await admin.messaging().sendToDevice(tokens, payload);
  const tokensToRemove = [];

  response.results.forEach((result, index) => {
    const error = result.error;
    if (error) {
      logger.error(`Failure sending notification to ${tokens[index]}`, error);
      // Cleanup the tokens that are not registered anymore.
      if (error.code === "messaging/invalid-registration-token" ||
          error.code === "messaging/registration-token-not-registered") {
        tokensToRemove.push(tokensSnapshot.docs[index].ref.delete());
      }
    }
  });

  return Promise.all(tokensToRemove);
});
