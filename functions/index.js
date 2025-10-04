/* eslint-disable max-len */
const {onCall} = require("firebase-functions/v2/onCall");
const {onRequest} = require("firebase-functions/v2/onRequest");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();
const db = admin.firestore();

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