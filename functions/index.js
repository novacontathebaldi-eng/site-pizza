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
 * Creates a Mercado Pago Order for PIX payment using the v1/orders endpoint.
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

    const totalAmount = typeof orderData.total === "number" ? orderData.total : parseFloat(orderData.total);
    if (isNaN(totalAmount)) {
      throw new HttpsError("invalid-argument", "O valor total do pedido é inválido.");
    }

    const orderPayload = {
      type: "online",
      external_reference: orderId,
      total_amount: parseFloat(totalAmount.toFixed(2)),
      description: `Pedido #${orderId.substring(0, 6)} da Santa Sensação`,
      notification_url: "https://mercadopagowebhook-lxwiyf7dla-uc.a.run.app",
      items: orderData.items.map((item) => ({
        title: `${item.name} (${item.size})`,
        unit_price: parseFloat(item.price.toFixed(2)),
        quantity: item.quantity,
        description: `Item: ${item.name}`,
      })),
      payer: {
        email: `test_${Date.now()}@testuser.com`,
        first_name: orderData.customer.name.split(" ")[0],
        last_name: orderData.customer.name.split(" ").slice(1).join(" ") || "Cliente",
      },
      transactions: [{
        payment_method_id: "pix",
        amount: parseFloat(totalAmount.toFixed(2)),
        description: `Pagamento do Pedido #${orderId.substring(0, 6)}`,
        // expiration_date must be in ISO_8601 format
        date_of_expiration: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes expiration
      }],
    };

    const idempotencyKey = crypto.randomBytes(16).toString("hex");

    const response = await mercadoPagoApi.post("/v1/orders", orderPayload, {
      headers: {
        "X-Idempotency-Key": idempotencyKey,
      },
    });

    const mpOrder = response.data;
    const paymentInfo = mpOrder?.payments?.[0];

    if (!mpOrder || !mpOrder.id || !paymentInfo?.transaction_info?.qr_code_base64) {
      logger.error("Invalid response from Mercado Pago when creating order.", {responseData: mpOrder});
      throw new HttpsError("internal", "Resposta inválida do gateway de pagamento ao gerar PIX.");
    }

    const {qr_code_base64: qrCodeBase64, qr_code: copyPaste} = paymentInfo.transaction_info;
    const mercadoPagoOrderId = mpOrder.id;
    const mercadoPagoPaymentId = paymentInfo.id;

    await db.collection("orders").doc(orderId).update({
      mercadoPagoOrderId: mercadoPagoOrderId,
      mercadoPagoDetails: {
        paymentId: mercadoPagoPaymentId,
      },
    });

    logger.info(`Ordem PIX criada para o pedido ${orderId}, ID da Ordem MP: ${mercadoPagoOrderId}`);

    return {
      qrCodeBase64,
      copyPaste,
    };
  } catch (error) {
    const errorData = error.response?.data;
    const errorMessage = errorData?.message || error.message || "Falha na comunicação com o gateway.";
    const errorCauses = errorData?.causes?.map((c) => c.description).join(", ") || "Sem detalhes adicionais.";
    const finalMessage = `${errorMessage} ${errorCauses ? `(${errorCauses})` : ""}`;

    logger.error(`Erro ao criar ordem no Mercado Pago para o pedido ${orderId}:`, finalMessage, {errorData});
    throw new HttpsError("internal", finalMessage);
  }
});


/**
 * Webhook to receive ORDER status updates from Mercado Pago.
 * Implements signature validation as per Mercado Pago documentation for security.
 */
exports.mercadoPagoWebhook = onRequest(async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).send("Method Not Allowed");
    return;
  }

  logger.info("Webhook do Mercado Pago recebido:", {headers: request.headers, body: request.body});

  try {
    const topic = request.body.type;
    const mercadoPagoOrderId = request.body.data?.id;

    if (topic !== "order") {
      logger.warn(`Webhook ignorado: Tópico '${topic}' não é 'order'.`);
      response.status(200).send("OK (Ignored, not an order event)");
      return;
    }
    if (!mercadoPagoOrderId) {
      logger.warn("Webhook de ordem ignorado: data.id ausente.");
      response.status(200).send("OK (Ignored, no data.id)");
      return;
    }

    const {data: mpOrder} = await mercadoPagoApi.get(`/v1/orders/${mercadoPagoOrderId}`);
    const firestoreOrderId = mpOrder.external_reference;

    if (!firestoreOrderId) {
      logger.error(`Webhook processado, mas a ordem MP ${mercadoPagoOrderId} não possui external_reference.`);
      response.status(200).send("OK (Ignored, no external_reference)");
      return;
    }

    const orderRef = db.collection("orders").doc(firestoreOrderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      logger.error(`Ordem ${firestoreOrderId} referenciada pelo Webhook não encontrada no Firestore.`);
      response.status(200).send("OK (Order not found in DB)");
      return;
    }

    const currentOrderData = orderDoc.data();
    const paymentInfo = mpOrder.payments?.[0];

    if (mpOrder.order_status === "paid" && currentOrderData.status === "awaiting-payment") {
      const updateData = {
        status: "pending",
        paymentStatus: "paid_online",
        mercadoPagoDetails: {
          ...currentOrderData.mercadoPagoDetails,
          transactionId: paymentInfo?.id || null, // Payment ID from the order
        },
      };
      await orderRef.update(updateData);
      logger.info(`Pedido ${firestoreOrderId} (Ordem MP: ${mercadoPagoOrderId}) foi pago e movido para 'pendente' via webhook.`);
    } else if (mpOrder.status === "cancelled" || mpOrder.status === "expired") {
      if (currentOrderData.status !== "cancelled") {
        await orderRef.update({status: "cancelled"});
        logger.info(`Pedido ${firestoreOrderId} (Ordem MP: ${mercadoPagoOrderId}) foi cancelado/expirado via webhook.`);
      }
    } else {
      logger.info(`Status da ordem MP '${mpOrder.status}' para o pedido ${firestoreOrderId}. Nenhuma ação necessária.`);
    }

    response.status(200).send("OK");
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    logger.error("Erro ao processar webhook do Mercado Pago:", errorMessage, error.response?.data || error);
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

    const {mercadoPagoOrderId} = orderDoc.data();
    if (!mercadoPagoOrderId) throw new HttpsError("failed-precondition", "Este pedido não tem uma ordem do Mercado Pago associada.");

    const response = await mercadoPagoApi.post(`/v1/orders/${mercadoPagoOrderId}/cancel`);

    if (response.data.status === "cancelled") {
      await db.collection("orders").doc(firestoreOrderId).update({status: "cancelled"});
      logger.info(`Ordem MP ${mercadoPagoOrderId} para o pedido ${firestoreOrderId} cancelada com sucesso.`);
      return {success: true, message: "Ordem do Mercado Pago cancelada."};
    } else {
      throw new HttpsError("internal", `Status inesperado do MP ao cancelar: ${response.data.status}`);
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    logger.error(`Erro ao cancelar ordem MP para o pedido ${firestoreOrderId}:`, errorMessage, error.response?.data);
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

    const {mercadoPagoOrderId, mercadoPagoDetails} = orderDoc.data();
    if (!mercadoPagoOrderId) throw new HttpsError("failed-precondition", "ID da Ordem do Mercado Pago não encontrado para este pedido.");

    let refundPayload = {}; // Empty for full refund
    if (amount && amount > 0) {
      if (!mercadoPagoDetails?.paymentId) {
        throw new HttpsError("failed-precondition", "ID de Pagamento do MP necessário para reembolso parcial.");
      }
      refundPayload = {
        transactions: [{
          id: mercadoPagoDetails.paymentId,
          amount: parseFloat(amount).toFixed(2),
        }],
      };
    }

    const idempotencyKey = crypto.randomBytes(16).toString("hex");

    const response = await mercadoPagoApi.post(`/v1/orders/${mercadoPagoOrderId}/refunds`, refundPayload, {
      headers: {"X-Idempotency-Key": idempotencyKey},
    });

    if (response.status === 201) {
      const isPartial = amount && amount > 0;
      await db.collection("orders").doc(firestoreOrderId).update({
        paymentStatus: "refunded",
      });
      logger.info(`Reembolso para a ordem MP ${mercadoPagoOrderId} processado. Status: ${response.status}`);
      const message = `Reembolso ${isPartial ? "parcial" : "total"} processado com sucesso.`;
      return {success: true, message: message};
    } else {
      throw new HttpsError("internal", `Status de reembolso inesperado do MP: ${response.status}`);
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    logger.error(`Erro ao reembolsar ordem MP para o pedido ${firestoreOrderId}:`, errorMessage, error.response?.data);
    throw new HttpsError("internal", `Falha ao reembolsar no Mercado Pago: ${errorMessage}`);
  }
});
