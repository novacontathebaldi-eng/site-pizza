/* eslint-disable max-len */
const {onCall} = require("firebase-functions/v2/onCall");
const {onRequest} = require("firebase-functions/v2/onRequest");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const axios = require("axios");
const functions = require("firebase-functions");


admin.initializeApp();
const db = admin.firestore();

// V2 onCall function to create an InfinitePay public checkout link
exports.createInfinitePayLink = onCall(async (request) => {
  const {orderId, totalInCents, customerName} = request.data;

  if (!orderId || !totalInCents || !customerName) {
    logger.error("Request missing required data", {data: request.data});
    throw new functions.https.HttpsError("invalid-argument", "The function must be called with 'orderId', 'totalInCents', and 'customerName'.");
  }

  const webhookUrl = `https://us-central1-site-pizza-a2930.cloudfunctions.net/infinitePayWebhook`;
  // The redirect URL must be exactly what is configured in the InfinitePay dashboard.
  // We add query params for our app to handle the success case.
  const redirectUrl = `https://santasensacao.me?payment_status=success&order_nsu=${orderId}`;

  const payload = {
    handle: "thebaldi",
    redirect_url: redirectUrl,
    webhook_url: webhookUrl,
    order_nsu: orderId,
    items: [{
      quantity: 1,
      price: totalInCents,
      description: `Pedido de ${customerName} na Santa Sensação`,
    }],
  };

  try {
    logger.info("Sending request to InfinitePay", {payload});
    const response = await axios.post("https://api.infinitepay.io/invoices/public/checkout/links", payload, {
      headers: {"Content-Type": "application/json"},
    });

    if (response.data && response.data.data && response.data.data.payment_url) {
      logger.info("InfinitePay link created successfully", {orderId, url: response.data.data.payment_url});
      return {paymentUrl: response.data.data.payment_url};
    } else {
      logger.error("Invalid response from InfinitePay", {response: response.data});
      throw new functions.https.HttpsError("internal", "Falha ao obter URL de pagamento da InfinitePay.");
    }
  } catch (error) {
    logger.error("Error calling InfinitePay API", {
      error: error.response ? error.response.data : error.message,
      orderId,
    });
    const errorMessage = error.response?.data?.message || "Não foi possível gerar o link de pagamento PIX.";
    throw new functions.https.HttpsError("internal", errorMessage);
  }
});


// Webhook receiver for InfinitePay payment confirmations (V2 API)
exports.infinitePayWebhook = onRequest(async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).send("Method Not Allowed");
    return;
  }

  logger.info("Webhook recebido:", request.body);

  // The public checkout link webhook might send data differently.
  // We'll check for both `customer_id` (from the old API) and `order_nsu` (from the public API).
  const {status} = request.body;
  const orderId = request.body.customer_id || request.body.order_nsu;

  if (!orderId) {
    logger.error("Payload do webhook não contém 'customer_id' ou 'order_nsu'.");
    response.status(400).json({success: false, message: "Missing order identifier"});
    return;
  }

  // The public API sends 'paid' in lowercase.
  if (status && status.toLowerCase() === "paid") {
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
