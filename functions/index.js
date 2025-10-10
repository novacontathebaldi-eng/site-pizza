/* eslint-disable max-len */
const {onCall, onRequest} = require("firebase-functions/v2/https");
const {HttpsError} = require("firebase-functions/v2/https");
const {defineString} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const axios = require("axios");
const crypto = require("crypto");

// Define parameters for environment variables from .env file
const MERCADO_PAGO_ACCESS_TOKEN = defineString("MERCADO_PAGO_ACCESS_TOKEN");
const MERCADO_PAGO_WEBHOOK_SECRET = defineString("MERCADO_PAGO_WEBHOOK_SECRET");

admin.initializeApp();
const db = admin.firestore();

// Configure axios for Mercado Pago API calls
const mercadoPagoApi = axios.create({
  baseURL: "https://api.mercadopago.com",
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor to inject the access token into every request
mercadoPagoApi.interceptors.request.use((config) => {
  const token = MERCADO_PAGO_ACCESS_TOKEN.value();
  if (!token) {
    logger.error("MERCADO_PAGO_ACCESS_TOKEN not configured.");
    throw new HttpsError("failed-precondition", "A chave de acesso do gateway de pagamento não está configurada.");
  }
  config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => {
  return Promise.reject(error);
});

/**
 * Creates a Mercado Pago Order for PIX payment.
 */
exports.createMercadoPagoOrder = onCall(async (request) => {
  const {orderId} = request.data;
  if (!orderId) {
    logger.error("Request missing orderId.");
    throw new HttpsError("invalid-argument", "O ID do pedido é obrigatório.");
  }

  try {
    const orderDoc = await db.collection("orders").doc(orderId).get();
    if (!orderDoc.exists) {
      logger.error(`Order with ID ${orderId} not found.`);
      throw new HttpsError("not-found", "Pedido não encontrado.");
    }
    const orderData = orderDoc.data();

    // Ensure total is a number before converting to string
    const totalAmount = typeof orderData.total === "number" ? orderData.total : parseFloat(orderData.total);
    if (isNaN(totalAmount)) {
      throw new HttpsError("invalid-argument", "O valor total do pedido é inválido.");
    }

    const orderPayload = {
      external_reference: orderId,
      title: `Pedido #${orderId.substring(0, 8)} - Santa Sensação`,
      description: `Pedido para ${orderData.customer.name}`,
      notification_url: "https://mercadopagowebhook-lxwiyf7dla-uc.a.run.app",
      total_amount: totalAmount.toFixed(2), // MUST be a string
      items: orderData.items.map((item) => ({
        title: `${item.name} (${item.size})`,
        unit_price: item.price.toFixed(2), // MUST be a string
        quantity: item.quantity,
        description: `Item: ${item.name}`,
        category_id: "default", // Recommended field
      })),
      payer: {
        email: `test_${Date.now()}@testuser.com`,
        first_name: orderData.customer.name.split(" ")[0],
        last_name: orderData.customer.name.split(" ").slice(1).join(" ") || "Cliente",
      },
      transactions: [{
        amount: totalAmount.toFixed(2), // MUST be a string
        payment_method_id: "pix",
        description: `Pagamento do Pedido #${orderId.substring(0, 8)}`,
        expiration_date: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes expiration
      }],
    };

    const idempotencyKey = crypto.randomBytes(16).toString("hex");

    const response = await axios.post("https://api.mercadopago.com/v1/advanced_payments", orderPayload, {
      headers: {
        "Authorization": `Bearer ${MERCADO_PAGO_ACCESS_TOKEN.value()}`,
        "X-Idempotency-Key": idempotencyKey,
        "Content-Type": "application/json",
      },
    });

    const mpPayment = response.data;

    if (!mpPayment || !mpPayment.id || !mpPayment.point_of_interaction?.transaction_data) {
      logger.error("Invalid response from Mercado Pago when creating payment.", {responseData: mpPayment});
      throw new HttpsError("internal", "Resposta inválida do gateway de pagamento.");
    }

    const {qr_code_base64: qrCodeBase64, qr_code: copyPaste} = mpPayment.point_of_interaction.transaction_data;
    const mercadoPagoPaymentId = mpPayment.id;

    if (!qrCodeBase64 || !copyPaste) {
      logger.error("Mercado Pago response missing PIX data details.", {responseData: mpPayment});
      throw new HttpsError("internal", "Dados PIX não retornados pelo gateway de pagamento.");
    }

    await db.collection("orders").doc(orderId).update({
      mercadoPagoOrderId: `adv_payment_${mercadoPagoPaymentId}`, // Use payment ID as reference
      mercadoPagoDetails: {
        paymentId: mercadoPagoPaymentId,
      },
    });

    logger.info(`Pagamento PIX criado para o pedido ${orderId}, ID do Pagamento MP: ${mercadoPagoPaymentId}`);

    return {
      qrCodeBase64,
      copyPaste,
    };
  } catch (error) {
    const errorData = error.response?.data;
    const errorMessage = errorData?.message || error.message || "Falha na comunicação com o gateway.";
    const errorCauses = errorData?.cause?.map((c) => c.description).join(", ") || "Sem detalhes adicionais.";
    const finalMessage = `${errorMessage} (${errorCauses})`;

    logger.error(`Erro ao criar pagamento no Mercado Pago para o pedido ${orderId}:`, finalMessage, {errorData});
    throw new HttpsError("internal", finalMessage);
  }
});


/**
 * Webhook to receive order status updates from Mercado Pago.
 * Implements signature validation as per Mercado Pago documentation for security.
 */
exports.mercadoPagoWebhook = onRequest(async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).send("Method Not Allowed");
    return;
  }

  logger.info("Webhook do Mercado Pago recebido:", {headers: request.headers, body: request.body, query: request.query});

  try {
    const topic = request.body.type;
    const dataId = request.body.data?.id;

    if (topic !== "payment") {
      logger.warn(`Webhook ignorado: Tópico '${topic}' não é 'payment'.`);
      response.status(200).send("OK (Ignored, not a payment event)");
      return;
    }
    if (!dataId) {
       logger.warn("Webhook de pagamento ignorado: data.id ausente.");
       response.status(200).send("OK (Ignored, no data.id)");
       return;
    }

    // Since this is a payment webhook, we fetch the payment details
    const {data: mpPayment} = await mercadoPagoApi.get(`/v1/payments/${dataId}`);
    const firestoreOrderId = mpPayment.external_reference;

    if (!firestoreOrderId) {
      logger.error(`Webhook de pagamento processado, mas o pagamento MP ${dataId} não possui external_reference.`);
      response.status(200).send("OK (Ignored, no external_reference)");
      return;
    }

    const orderRef = db.collection("orders").doc(firestoreOrderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      logger.error(`Ordem ${firestoreOrderId} referenciada pelo Webhook de pagamento não encontrada no Firestore.`);
      response.status(200).send("OK (Order not found in DB)");
      return;
    }

    const currentOrderData = orderDoc.data();

    // Check if the payment is approved and the order is still awaiting payment
    if (mpPayment.status === "approved" && currentOrderData.status === "awaiting-payment") {
      const updateData = {
        status: "pending", // Move to the first stage of preparation
        paymentStatus: "paid_online",
        mercadoPagoDetails: {
          ...currentOrderData.mercadoPagoDetails,
          transactionId: mpPayment.transaction_details?.transaction_id || null,
        },
      };
      await orderRef.update(updateData);
      logger.info(`Pedido ${firestoreOrderId} (Pagamento MP: ${dataId}) foi pago e movido para 'pendente' via webhook.`);
    } else if (["cancelled", "expired"].includes(mpPayment.status)) {
      if (currentOrderData.status !== "cancelled") {
        await orderRef.update({status: "cancelled"});
        logger.info(`Pedido ${firestoreOrderId} (Pagamento MP: ${dataId}) foi cancelado/expirado via webhook.`);
      }
    } else {
      logger.info(`Status do pagamento MP '${mpPayment.status}' para o pedido ${firestoreOrderId}. Nenhuma ação necessária.`);
    }

    // Respond OK after processing
    response.status(200).send("OK");
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    logger.error("Erro ao processar webhook de pagamento:", errorMessage, error.response?.data || error);
    // Respond with an error but don't prevent Mercado Pago from retrying if it's a server issue.
    // However, if it's a permanent error, we should still respond 200 to avoid infinite retries.
    // For simplicity, we send 200 and log the error.
    response.status(200).send("OK (Error logged)");
  }
});


/**
 * Cancels a Mercado Pago Order that has not been processed yet.
 */
exports.cancelMercadoPagoOrder = onCall(async (request) => {
  const {firestoreOrderId} = request.data;
  if (!firestoreOrderId) {
    throw new HttpsError("invalid-argument", "O ID do pedido do Firestore é obrigatório.");
  }

  try {
    const orderDoc = await db.collection("orders").doc(firestoreOrderId).get();
    if (!orderDoc.exists) throw new HttpsError("not-found", "Pedido não encontrado no Firestore.");

    const {mercadoPagoDetails} = orderDoc.data();
    if (!mercadoPagoDetails?.paymentId) throw new HttpsError("failed-precondition", "Este pedido não tem um pagamento do Mercado Pago associado.");

    // For Advanced Payments, you cancel the payment itself
    const response = await mercadoPagoApi.put(`/v1/payments/${mercadoPagoDetails.paymentId}`, {
      status: "cancelled",
    });

    if (response.data.status === "cancelled") {
      await db.collection("orders").doc(firestoreOrderId).update({status: "cancelled"});
      logger.info(`Pagamento MP ${mercadoPagoDetails.paymentId} para o pedido ${firestoreOrderId} cancelado com sucesso.`);
      return {success: true, message: "Pagamento do Mercado Pago cancelado."};
    } else {
      throw new HttpsError("internal", `Status inesperado do MP: ${response.data.status}`);
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    logger.error(`Erro ao cancelar pagamento MP para o pedido ${firestoreOrderId}:`, errorMessage, error.response?.data);
    throw new HttpsError("internal", `Falha ao cancelar no Mercado Pago: ${errorMessage}`);
  }
});

/**
 * Refunds a payment from a Mercado Pago Order (total or partial).
 */
exports.refundMercadoPagoOrder = onCall(async (request) => {
  const {firestoreOrderId, amount} = request.data;
  if (!firestoreOrderId) {
    throw new HttpsError("invalid-argument", "O ID do pedido do Firestore é obrigatório.");
  }

  try {
    const orderDoc = await db.collection("orders").doc(firestoreOrderId).get();
    if (!orderDoc.exists) throw new HttpsError("not-found", "Pedido não encontrado no Firestore.");

    const {mercadoPagoDetails} = orderDoc.data();
    if (!mercadoPagoDetails?.paymentId) throw new HttpsError("failed-precondition", "ID de pagamento do Mercado Pago não encontrado para este pedido.");

    const refundPayload = amount && amount > 0 ? {amount: parseFloat(amount)} : {};

    const idempotencyKey = crypto.randomBytes(16).toString("hex");

    // The endpoint is /v1/payments/{id}/refunds
    const response = await mercadoPagoApi.post(`/v1/payments/${mercadoPagoDetails.paymentId}/refunds`, refundPayload, {
        headers: {"X-Idempotency-Key": idempotencyKey},
    });

    if (response.data.status === "approved" || response.data.status === "in_process") {
       const isPartial = amount && amount > 0;
       await db.collection("orders").doc(firestoreOrderId).update({
        status: "cancelled", // Or a custom status like 'refunded'
        paymentStatus: "refunded",
      });
      logger.info(`Reembolso para o pagamento MP ${mercadoPagoDetails.paymentId} processado. Status: ${response.data.status}`);
      const message = `Reembolso ${isPartial ? "parcial" : "total"} processado com sucesso.`;
      return {success: true, message: message};
    } else {
      throw new HttpsError("internal", `Status de reembolso inesperado do MP: ${response.data.status}`);
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    logger.error(`Erro ao reembolsar pagamento MP para o pedido ${firestoreOrderId}:`, errorMessage, error.response?.data);
    throw new HttpsError("internal", `Falha ao reembolsar no Mercado Pago: ${errorMessage}`);
  }
});
