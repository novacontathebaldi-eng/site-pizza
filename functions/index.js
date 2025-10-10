/* eslint-disable max-len */
const {onCall, onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const axios = require("axios");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

// User-provided credentials. Best practice is to store these as environment variables.
const accessToken = "APP_USR-7397519658646796-100800-bc33cefb4c1ebb4b1ab6359462bf9c41-2912646539";
const webhookSecret = "57dec2fea5f3c2c8f89e8506cff1c7ac60a085e79a5db70219e9d4c2ba28fad1";

const mercadoPagoApi = axios.create({
  baseURL: "https://api.mercadopago.com",
  headers: {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
});

/**
 * Creates a Mercado Pago Order and returns PIX payment details.
 */
exports.createMercadoPagoOrder = onCall(async (request) => {
  const {orderId, orderData} = request.data;
  if (!orderId || !orderData) {
    logger.error("Request missing orderId or orderData.");
    throw new functions.https.HttpsError("invalid-argument", "Dados do pedido incompletos.");
  }

  const notificationUrl = `https://us-central1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/mercadoPagoWebhook`;
  const totalAmountStr = orderData.total.toFixed(2);

  const orderPayload = {
    type: "online",
    external_reference: orderId,
    description: `Pedido #${orderId.substring(0, 8)} - Pizzaria Santa Sensação`,
    notification_url: notificationUrl,
    total_amount: Number(totalAmountStr),
    items: orderData.items.map((item) => ({
      title: item.name,
      unit_price: Number(item.price.toFixed(2)),
      quantity: item.quantity,
      description: `Tamanho: ${item.size}`,
    })),
    payer: {
      email: `test_user_${orderId.replace(/[^\w-]/g, "")}@testuser.com`,
      first_name: orderData.customer.name.split(" ")[0] || "Test",
      last_name: orderData.customer.name.split(" ").slice(1).join(" ") || "User",
    },
    transactions: {
      payments: [
        {
          amount: Number(totalAmountStr),
          payment_method: {
            id: "pix",
            type: "bank_transfer",
          },
        },
      ],
    },
  };


  try {
    logger.info(`Sending payload to Mercado Pago for order ${orderId}:`, {payload: orderPayload});
    const response = await mercadoPagoApi.post("/v1/orders", orderPayload, {
      headers: {
        "X-Idempotency-Key": orderId + Date.now(), // Ensure idempotency key is unique per attempt
      },
    });

    const mpOrder = response.data;
    const pixPayment = mpOrder.transactions?.payments?.[0];

    if (!pixPayment || mpOrder.status !== "action_required") {
      logger.error("Invalid response from Mercado Pago when creating order.", {mpOrder});
      throw new functions.https.HttpsError("internal", "Resposta inválida do gateway de pagamento ao criar a order.");
    }

    const qrCodeBase64 = pixPayment.payment_method?.qr_code_base64;
    const copyPaste = pixPayment.payment_method?.qr_code;

    if (!qrCodeBase64 || !copyPaste) {
      logger.error("Mercado Pago response missing PIX data.", {pixPayment});
      throw new functions.https.HttpsError("internal", "Dados PIX não retornados pelo gateway de pagamento.");
    }

    await db.collection("orders").doc(orderId).update({
      mercadoPagoOrderId: mpOrder.id,
      mercadoPagoTransactions: admin.firestore.FieldValue.arrayUnion({
        id: pixPayment.id,
        status: pixPayment.status,
        status_detail: pixPayment.status_detail,
      }),
    });


    logger.info(`Ordem PIX criada para o pedido ${orderId}, ID da Ordem MP: ${mpOrder.id}`);

    return {
      qrCodeBase64,
      copyPaste,
    };
  } catch (error) {
    logger.error(`Erro ao criar ordem no Mercado Pago para o pedido ${orderId}:`, error.response?.data || error.message);
    const errorMessage = error.response?.data?.message || "Falha ao comunicar com o gateway de pagamento.";
    throw new functions.https.HttpsError("internal", errorMessage);
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

  try {
    logger.info("Webhook do Mercado Pago recebido:", {
      headers: request.headers,
      query: request.query,
      body: request.body,
    });

    const signature = request.headers["x-signature"];
    const requestId = request.headers["x-request-id"];
    const topic = request.query.type;
    const mpOrderIdFromQuery = request.query["data.id"];

    if (!signature || !requestId || !mpOrderIdFromQuery) {
      logger.warn("Webhook validation failed: Missing headers or query params.");
      return response.status(400).send("Bad Request: Missing signature information.");
    }

    const [tsPart, v1Part] = signature.split(",");
    if (!tsPart || !v1Part) {
        return response.status(400).send("Bad Request: Invalid signature format.");
    }
    const timestamp = tsPart.split("=")[1];
    const receivedHash = v1Part.split("=")[1];

    const manifest = `id:${mpOrderIdFromQuery.toLowerCase()};request-id:${requestId};ts:${timestamp};`;

    const hmac = crypto.createHmac("sha256", webhookSecret);
    hmac.update(manifest);
    const calculatedHash = hmac.digest("hex");

    if (calculatedHash !== receivedHash) {
      logger.warn("Webhook validation failed: Invalid signature.");
      return response.status(403).send("Forbidden: Invalid signature.");
    }

    response.status(200).send("OK");

    if (topic === "order") {
      const orderResponse = await mercadoPagoApi.get(`/v1/orders/${mpOrderIdFromQuery}`);
      const order = orderResponse.data;
      logger.info(`Processing webhook for Order ID: ${order.id}, Status: ${order.status}`);

      const firestoreOrderId = order.external_reference;
      if (!firestoreOrderId) {
        logger.error(`Webhook for MP Order ${order.id} is missing external_reference.`);
        return;
      }

      const orderRef = db.collection("orders").doc(firestoreOrderId);
      const transaction = order.transactions?.payments?.[0];
      const updateData = {
          mercadoPagoTransactions: admin.firestore.FieldValue.arrayUnion({
            id: transaction?.id,
            status: transaction?.status,
            status_detail: transaction?.status_detail,
          }),
      };

      if (order.status === "processed" && order.status_detail === "accredited") {
        await orderRef.update({
          ...updateData,
          status: "pending",
          paymentStatus: "paid_online",
        });
        logger.info(`Pedido ${firestoreOrderId} (Ordem MP: ${order.id}) foi marcado como 'pago' via webhook.`);
      } else if (order.status === "refunded" || order.status_detail === "refunded") {
        await orderRef.update({
          ...updateData,
          status: "cancelled",
          paymentStatus: "refunded",
        });
        logger.info(`Pedido ${firestoreOrderId} (Ordem MP: ${order.id}) foi marcado como 'reembolsado' via webhook.`);
      } else if (order.status === "cancelled" || order.status_detail === "canceled_transaction") {
        await orderRef.update({
          ...updateData,
          status: "cancelled",
        });
        logger.info(`Pedido ${firestoreOrderId} (Ordem MP: ${order.id}) foi marcado como 'cancelado' via webhook.`);
      } else {
        await orderRef.update(updateData);
        logger.info(`Status da ordem ${order.id} é '${order.status}'. Nenhuma ação de pagamento tomada, apenas log da transação.`);
      }
    }
  } catch (error) {
    logger.error("Erro ao processar webhook do Mercado Pago:", error.response?.data || error.message);
  }
});

/**
 * Gets the latest order status from Mercado Pago.
 */
exports.getOrder = onCall(async (request) => {
    const {mercadoPagoOrderId} = request.data;
    if (!mercadoPagoOrderId) {
        throw new functions.https.HttpsError("invalid-argument", "ID da Ordem do Mercado Pago é obrigatório.");
    }
    try {
        const response = await mercadoPagoApi.get(`/v1/orders/${mercadoPagoOrderId}`);
        return response.data;
    } catch (error) {
        logger.error(`Erro ao obter ordem ${mercadoPagoOrderId} do Mercado Pago:`, error.response?.data || error.message);
        throw new functions.https.HttpsError("internal", "Não foi possível obter os detalhes da ordem.");
    }
});

/**
 * Cancels an order in Mercado Pago.
 */
exports.cancelOrder = onCall(async (request) => {
    const {mercadoPagoOrderId} = request.data;
    if (!mercadoPagoOrderId) {
        throw new functions.https.HttpsError("invalid-argument", "ID da Ordem do Mercado Pago é obrigatório.");
    }
    try {
        const response = await mercadoPagoApi.post(`/v1/orders/${mercadoPagoOrderId}/cancel`);
        logger.info(`Ordem ${mercadoPagoOrderId} cancelada com sucesso no Mercado Pago.`);
        return response.data;
    } catch (error) {
        logger.error(`Erro ao cancelar ordem ${mercadoPagoOrderId} no Mercado Pago:`, error.response?.data || error.message);
        throw new functions.https.HttpsError("internal", "Não foi possível cancelar a ordem.");
    }
});

/**
 * Refunds an order in Mercado Pago (full or partial).
 */
exports.refundOrder = onCall(async (request) => {
    const {mercadoPagoOrderId, transactionId, amount} = request.data;
    if (!mercadoPagoOrderId) {
        throw new functions.https.HttpsError("invalid-argument", "ID da Ordem do Mercado Pago é obrigatório.");
    }

    let payload = {};
    if (amount && transactionId) { // Partial refund
        payload = {
            transactions: [{
                id: transactionId,
                amount: Number(amount.toFixed(2)),
            }],
        };
    } // Full refund has an empty body

    try {
        const response = await mercadoPagoApi.post(`/v1/orders/${mercadoPagoOrderId}/refund`, payload);
        logger.info(`Reembolso para ordem ${mercadoPagoOrderId} processado com sucesso.`);
        return response.data;
    } catch (error) {
        logger.error(`Erro ao reembolsar ordem ${mercadoPagoOrderId}:`, error.response?.data || error.message);
        throw new functions.https.HttpsError("internal", "Não foi possível processar o reembolso.");
    }
});