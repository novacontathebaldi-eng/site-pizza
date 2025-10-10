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

    // Ensure total is a number before using toFixed
    const totalAmount = typeof orderData.total === "number" ? orderData.total : parseFloat(orderData.total);
    if (isNaN(totalAmount)) {
       throw new HttpsError("invalid-argument", "O valor total do pedido é inválido.");
    }

    const orderPayload = {
      type: "online",
      external_reference: orderId,
      description: `Pedido #${orderId.substring(0, 8)} - ${orderData.customer.name}`,
      notification_url: "https://mercadopagowebhook-lxwiyf7dla-uc.a.run.app",
      total_amount: parseFloat(totalAmount.toFixed(2)),
      items: orderData.items.map((item) => ({
        title: `${item.name} (${item.size})`,
        unit_price: parseFloat(item.price.toFixed(2)),
        quantity: item.quantity,
      })),
      payer: {
        email: `test_${Date.now()}@testuser.com`,
        first_name: orderData.customer.name.split(" ")[0],
        last_name: orderData.customer.name.split(" ").slice(1).join(" ") || "Cliente",
      },
      transactions: {
        payments: [{
          amount: parseFloat(totalAmount.toFixed(2)),
          payment_method: {
            id: "pix",
            type: "bank_transfer",
          },
          expiration_time: "PT5M", // 5 minutes expiration
        }],
      },
    };

    const idempotencyKey = crypto.randomBytes(16).toString("hex");

    const response = await mercadoPagoApi.post("/v1/orders", orderPayload, {
      headers: {"X-Idempotency-Key": idempotencyKey},
    });

    const mpOrder = response.data;

    if (!mpOrder || !mpOrder.id) {
      logger.error("Invalid response from Mercado Pago when creating order.", {responseData: mpOrder});
      throw new HttpsError("internal", "Resposta inválida do gateway de pagamento.");
    }

    const pixTransaction = mpOrder.transactions?.payments?.find((p) => p.payment_method?.id === "pix");
    if (!pixTransaction) {
      logger.error("Mercado Pago response missing PIX payment data.", {responseData: mpOrder});
      throw new HttpsError("internal", "Dados da transação PIX não encontrados na resposta.");
    }

    const qrCodeBase64 = pixTransaction.payment_method?.qr_code_base64;
    const copyPaste = pixTransaction.payment_method?.qr_code;
    const mercadoPagoOrderId = mpOrder.id;
    const mercadoPagoPaymentId = pixTransaction.id;

    if (!qrCodeBase64 || !copyPaste) {
      logger.error("Mercado Pago response missing PIX data details.", {responseData: mpOrder});
      throw new HttpsError("internal", "Dados PIX não retornados pelo gateway de pagamento.");
    }

    await db.collection("orders").doc(orderId).update({
      mercadoPagoOrderId,
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
    const finalMessage = `${errorMessage} (${errorCauses})`;

    logger.error(`Erro ao criar ordem no Mercado Pago para o pedido ${orderId}:`, finalMessage, {errorData});
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
    const signatureHeader = request.headers["x-signature"];
    const requestId = request.headers["x-request-id"];
    const topic = request.body.type;

    if (!signatureHeader || !requestId || topic !== "order") {
      logger.warn("Webhook ignorado: Faltando headers ou tópico não é 'order'.", {topic, signatureHeader, requestId});
      response.status(200).send("OK (Ignored)");
      return;
    }

    const parts = signatureHeader.split(",");
    const tsPart = parts.find((p) => p.startsWith("ts="));
    const hashPart = parts.find((p) => p.startsWith("v1="));

    if (!tsPart || !hashPart) {
      logger.error("Falha na validação do Webhook: Partes da assinatura ausentes.");
      response.status(400).send("Bad Request: Missing signature parts.");
      return;
    }

    const ts = tsPart.split("=")[1];
    const hash = hashPart.split("=")[1];
    const dataId = request.query["data.id"] || request.body.data?.id;

    if (!ts || !hash || !dataId) {
      logger.error("Falha na validação do Webhook: Assinatura ou data.id ausentes.");
      response.status(400).send("Bad Request: Missing signature parts or data.id");
      return;
    }

    const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
    const secret = MERCADO_PAGO_WEBHOOK_SECRET.value();
    if (!secret) {
      logger.error("Falha na validação do Webhook: A chave secreta não está configurada.");
      response.status(500).send("Internal Server Error: Webhook secret not configured.");
      return;
    }

    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(manifest);
    const calculatedSignature = hmac.digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(calculatedSignature), Buffer.from(hash))) {
      logger.error("Falha na validação do Webhook: Assinatura inválida.");
      response.status(400).send("Bad Request: Invalid signature");
      return;
    }

    logger.info(`Assinatura do webhook para a ordem ${dataId} validada com sucesso.`);
    response.status(200).send("OK");

    const mercadoPagoOrderId = dataId;
    const {data: mpOrder} = await mercadoPagoApi.get(`/v1/orders/${mercadoPagoOrderId}`);

    const firestoreOrderId = mpOrder.external_reference;
    if (!firestoreOrderId) {
      logger.error(`Webhook processado, mas a ordem MP ${mercadoPagoOrderId} não possui external_reference.`);
      return;
    }

    const orderRef = db.collection("orders").doc(firestoreOrderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      logger.error(`Ordem ${firestoreOrderId} referenciada pelo Webhook não encontrada no Firestore.`);
      return;
    }

    const currentOrderData = orderDoc.data();
    const paymentDetails = mpOrder.transactions?.payments?.[0];

    if (mpOrder.status === "processed" && currentOrderData.status === "awaiting-payment") {
      const updateData = {
        status: "pending",
        paymentStatus: "paid_online",
        mercadoPagoDetails: {
          paymentId: paymentDetails?.id || currentOrderData.mercadoPagoDetails?.paymentId || null,
          transactionId: paymentDetails?.reference_id || currentOrderData.mercadoPagoDetails?.transactionId || null,
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
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    logger.error("Erro ao processar webhook:", errorMessage, error.response?.data || error);
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
      throw new HttpsError("internal", `Status inesperado do MP: ${response.data.status}`);
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    logger.error(`Erro ao cancelar ordem MP para o pedido ${firestoreOrderId}:`, errorMessage, error.response?.data);
    throw new HttpsError("internal", `Falha ao cancelar ordem no Mercado Pago: ${errorMessage}`);
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
    if (!mercadoPagoOrderId) throw new HttpsError("failed-precondition", "Este pedido não tem uma ordem do Mercado Pago associada.");
    if (!mercadoPagoDetails?.paymentId) throw new HttpsError("failed-precondition", "ID de transação do Mercado Pago não encontrado para este pedido.");

    let refundPayload = {}; // Empty body for full refund
    if (amount && amount > 0) {
      refundPayload = {transactions: [{id: mercadoPagoDetails.paymentId, amount: parseFloat(amount)}]};
    }

    const idempotencyKey = crypto.randomBytes(16).toString("hex");
    const response = await mercadoPagoApi.post(`/v1/orders/${mercadoPagoOrderId}/refund`, refundPayload, {
      headers: {"X-Idempotency-Key": idempotencyKey},
    });

    const refundStatus = response.data.status_detail;
    if (refundStatus === "refunded" || refundStatus === "partially_refunded") {
      await db.collection("orders").doc(firestoreOrderId).update({
        status: "cancelled", // Or a custom status like 'refunded'
        paymentStatus: "refunded",
      });
      logger.info(`Reembolso para a ordem MP ${mercadoPagoOrderId} processado. Status: ${refundStatus}`);
      const message = `Reembolso ${refundStatus === "refunded" ? "total" : "parcial"} processado com sucesso.`;
      return {success: true, message: message};
    } else {
      throw new HttpsError("internal", `Status de reembolso inesperado do MP: ${response.data.status}`);
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    logger.error(`Erro ao reembolsar ordem MP para o pedido ${firestoreOrderId}:`, errorMessage, error.response?.data);
    throw new HttpsError("internal", `Falha ao reembolsar no Mercado Pago: ${errorMessage}`);
  }
});