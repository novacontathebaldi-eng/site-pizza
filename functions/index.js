/* eslint-disable max-len */
const {onCall, onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const axios = require("axios");
const crypto = require("crypto");
require("dotenv").config();

admin.initializeApp();
const db = admin.firestore();

// Configure axios for Mercado Pago API calls
const mercadoPagoApi = axios.create({
  baseURL: "https://api.mercadopago.com",
  headers: {
    "Authorization": `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  },
});

/**
 * Creates a Mercado Pago Order for PIX payment using the modern v1/orders endpoint.
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

    const notificationUrl = `https://us-central1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/mercadoPagoWebhook`;

    const orderPayload = {
      external_reference: orderId,
      title: "Pedido na Pizzaria Santa Sensação",
      description: `Pedido #${orderId.substring(0, 8)} - ${orderData.customer.name}`,
      notification_url: notificationUrl,
      total_amount: orderData.total,
      items: orderData.items.map((item) => ({
        title: `${item.name} (${item.size})`,
        unit_price: item.price,
        quantity: item.quantity,
        total_amount: item.price * item.quantity,
      })),
      payer: {
        email: `cliente_${orderId}@santasensacao.me`, // Placeholder email as we don't collect it
        first_name: orderData.customer.name.split(" ")[0],
        last_name: orderData.customer.name.split(" ").slice(1).join(" ") || "Cliente",
      },
      transactions: [{
        amount: orderData.total,
        payment_method: {
            id: "pix",
            type: "bank_transfer",
        },
      }],
    };

    const idempotencyKey = crypto.randomBytes(16).toString("hex");

    const response = await mercadoPagoApi.post("/v1/orders", orderPayload, {
      headers: { "X-Idempotency-Key": idempotencyKey },
    });

    const mpOrder = response.data;

    if (!mpOrder || !mpOrder.id) {
      logger.error("Invalid response from Mercado Pago when creating order.", { responseData: mpOrder });
      throw new Error("Resposta inválida do gateway de pagamento.");
    }

    const pixTransaction = mpOrder.transactions?.find((t) => t.payment_method?.id === "pix");
    if (!pixTransaction) {
        logger.error("Mercado Pago response missing PIX transaction data.", { responseData: mpOrder });
        throw new Error("Dados da transação PIX não encontrados na resposta.");
    }

    const qrCodeBase64 = pixTransaction.payment_method?.qr_code_base64;
    const copyPaste = pixTransaction.payment_method?.qr_code;
    const mercadoPagoOrderId = mpOrder.id;
    const mercadoPagoPaymentId = pixTransaction.id;

    if (!qrCodeBase64 || !copyPaste) {
      logger.error("Mercado Pago response missing PIX data details.", { responseData: mpOrder });
      throw new Error("Dados PIX não retornados pelo gateway de pagamento.");
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
    const errorMessage = error.response?.data?.message || error.message;
    logger.error(`Erro ao criar ordem no Mercado Pago para o pedido ${orderId}:`, errorMessage, error.response?.data);
    throw new Error(`Falha ao comunicar com o gateway de pagamento: ${errorMessage}`);
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
    const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(manifest);
    const calculatedSignature = hmac.digest("hex");

    if (crypto.timingSafeEqual(Buffer.from(calculatedSignature), Buffer.from(hash))) {
      logger.info(`Assinatura do webhook para a ordem ${dataId} validada com sucesso.`);
    } else {
      logger.error("Falha na validação do Webhook: Assinatura inválida.");
      response.status(400).send("Bad Request: Invalid signature");
      return;
    }

    // Respond immediately to Mercado Pago before processing
    response.status(200).send("OK");

    // Process the notification after responding
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

    if (mpOrder.status === "processed" && currentOrderData.status === "awaiting-payment") {
      const paymentDetails = mpOrder.transactions?.[0];
      const updateData = {
        status: "pending",
        paymentStatus: "paid_online",
        mercadoPagoDetails: {
          paymentId: paymentDetails?.id || currentOrderData.mercadoPagoDetails?.paymentId || null,
          transactionId: paymentDetails?.reference_id || null,
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
    // Do not send error response here as we've already sent 200 OK
  }
});

/**
 * Cancels a Mercado Pago Order that has not been processed yet.
 */
exports.cancelMercadoPagoOrder = onCall(async (request) => {
  const {firestoreOrderId} = request.data;
  if (!firestoreOrderId) {
    throw new Error("O ID do pedido do Firestore é obrigatório.");
  }

  try {
    const orderDoc = await db.collection("orders").doc(firestoreOrderId).get();
    if (!orderDoc.exists) throw new Error("Pedido não encontrado no Firestore.");

    const {mercadoPagoOrderId} = orderDoc.data();
    if (!mercadoPagoOrderId) throw new Error("Este pedido não tem uma ordem do Mercado Pago associada.");

    const response = await mercadoPagoApi.post(`/v1/orders/${mercadoPagoOrderId}/cancel`);

    if (response.data.status === "cancelled") {
      await db.collection("orders").doc(firestoreOrderId).update({status: "cancelled"});
      logger.info(`Ordem MP ${mercadoPagoOrderId} para o pedido ${firestoreOrderId} cancelada com sucesso.`);
      return {success: true, message: "Ordem do Mercado Pago cancelada."};
    } else {
      throw new Error(`Status inesperado do MP: ${response.data.status}`);
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    logger.error(`Erro ao cancelar ordem MP para o pedido ${firestoreOrderId}:`, errorMessage, error.response?.data);
    throw new Error(`Falha ao cancelar ordem no Mercado Pago: ${errorMessage}`);
  }
});

/**
 * Refunds a payment from a Mercado Pago Order (total or partial).
 */
exports.refundMercadoPagoOrder = onCall(async (request) => {
  const {firestoreOrderId, amount} = request.data;
  if (!firestoreOrderId) {
    throw new Error("O ID do pedido do Firestore é obrigatório.");
  }

  try {
    const orderDoc = await db.collection("orders").doc(firestoreOrderId).get();
    if (!orderDoc.exists) throw new Error("Pedido não encontrado no Firestore.");

    const {mercadoPagoOrderId, mercadoPagoDetails} = orderDoc.data();
    if (!mercadoPagoOrderId) throw new Error("Este pedido não tem uma ordem do Mercado Pago associada.");
    if (!mercadoPagoDetails?.paymentId) throw new Error("ID de transação do Mercado Pago não encontrado para este pedido.");

    let refundPayload = {};
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
        status: "cancelled",
        paymentStatus: "refunded",
      });
      logger.info(`Reembolso para a ordem MP ${mercadoPagoOrderId} processado. Status: ${refundStatus}`);
      const message = `Reembolso ${refundStatus === "refunded" ? "total" : "parcial"} processado com sucesso.`;
      return {success: true, message: message};
    } else {
      throw new Error(`Status de reembolso inesperado do MP: ${response.data.status}`);
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    logger.error(`Erro ao reembolsar ordem MP para o pedido ${firestoreOrderId}:`, errorMessage, error.response?.data);
    throw new Error(`Falha ao reembolsar no Mercado Pago: ${errorMessage}`);
  }
});
