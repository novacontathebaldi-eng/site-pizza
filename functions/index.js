/* eslint-disable max-len */
const {onCall} = require("firebase-functions/v2/https");
const functions = require("firebase-functions");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();
const db = admin.firestore();

// Helper to format price to cents
const toCents = (price) => Math.round(price * 100);

// Callable function to generate a PIX charge with InfinitePay (V2 API)
exports.generatePixCharge = onCall(async (request) => {
  const orderId = request.data.orderId;
  if (!orderId) {
    throw new Error("O ID do pedido é obrigatório.");
  }

  const infinitePayApiKey = process.env.INFINITEPAY_API_KEY;
  if (!infinitePayApiKey) {
    logger.error("INFINITEPAY_API_KEY não está configurado nas variáveis de ambiente da função.");
    throw new Error("A chave da API de pagamento não está configurada.");
  }

  try {
    const orderDoc = await db.collection("orders").doc(orderId).get();
    if (!orderDoc.exists) {
      throw new Error("Pedido não encontrado.");
    }
    const orderData = orderDoc.data();

    const payload = {
      amount: toCents(orderData.total),
      type: "pix",
      customer_id: orderId,
      description: `Pedido #${orderId.substring(0, 8)} - ${orderData.customer.name}`,
      callback_url: `https://us-central1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/infinitePayWebhook`,
    };

    const response = await axios.post("https://api.infinitepay.io/v2/transactions", payload, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${infinitePayApiKey}`,
      },
    });

    const transaction = response.data.transaction;

    if (!transaction || !transaction.pix_qr_code_url || !transaction.pix_emv) {
      logger.error("Resposta da API da InfinitePay não contém os dados do PIX.", response.data);
      throw new Error("Resposta da API de pagamento está incompleta.");
    }

    const pixData = {
      qrCode: transaction.pix_qr_code_url,
      copyPaste: transaction.pix_emv,
      chargeId: transaction.id,
    };

    await db.collection("orders").doc(orderId).update({pixChargeId: pixData.chargeId});

    logger.info(`Cobrança PIX criada para o pedido ${orderId}, ID da cobrança: ${pixData.chargeId}`);
    return pixData;
  } catch (error) {
    logger.error("Erro ao criar cobrança na InfinitePay:", error.response ? error.response.data : error.message);
    throw new Error("Falha ao comunicar com o gateway de pagamento.");
  }
});

// Webhook receiver for InfinitePay payment confirmations (V2 API)
exports.infinitePayWebhook = functions.https.onRequest(async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).send("Method Not Allowed");
    return;
  }
  logger.info("Webhook recebido:", request.body);
  const {status, customer_id: orderId} = request.body;
  if (!orderId) {
    logger.error("Payload do webhook não contém 'customer_id'.");
    response.status(400).json({success: false, message: "Missing customer_id"});
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

// New Cloud Function to send push notifications for new orders
exports.sendNewOrderNotification = functions.firestore
    .document("orders/{orderId}")
    .onCreate(async (snap, context) => {
      const newOrder = snap.data();

      // Only send for new 'pending' orders
      if (newOrder.status !== "pending") {
        return null;
      }

      logger.info(`Novo pedido pendente detectado: ${context.params.orderId}`);

      try {
        // 1. Get all FCM tokens from the 'fcmTokens' collection
        const tokensSnapshot = await db.collection("fcmTokens").get();
        if (tokensSnapshot.empty) {
          logger.info("Nenhum token FCM encontrado para enviar notificação.");
          return null;
        }

        const tokens = tokensSnapshot.docs.map((doc) => doc.id);
        logger.info(`Enviando notificação para ${tokens.length} dispositivo(s).`);

        // 2. Construct the notification payload
        const payload = {
          notification: {
            title: "🍕 Novo Pedido Recebido!",
            body: `Pedido de ${newOrder.customer.name} no valor de R$${newOrder.total.toFixed(2).replace(".", ",")}.`,
            icon: "/assets/logo para icones.png",
            click_action: "https://www.santasensacao.me/#admin",
          },
        };

        // 3. Send the notification to all registered devices
        const response = await admin.messaging().sendToDevice(tokens, payload);

        // 4. Clean up invalid tokens
        const tokensToRemove = [];
        response.results.forEach((result, index) => {
          const error = result.error;
          if (error) {
            logger.error(`Falha ao enviar notificação para ${tokens[index]}`, error);
            if (["messaging/invalid-registration-token", "messaging/registration-token-not-registered"].includes(error.code)) {
              tokensToRemove.push(tokensSnapshot.docs[index].ref.delete());
            }
          }
        });
        await Promise.all(tokensToRemove);
        logger.info("Tokens inválidos removidos.");
      } catch (error) {
        logger.error("Erro ao enviar notificação de novo pedido:", error);
      }
      return null;
    });
