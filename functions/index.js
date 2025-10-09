/* eslint-disable max-len */
const {onCall} = require("firebase-functions/v2/https);
const {onRequest} = require("firebase-functions/v2/https");
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
 * This function is now idempotent: it will return an existing pending payment
 * if one is found for the order, preventing duplicate charges.
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

    // Check if we have valid, unexpired PIX data already stored in Firestore
    if (orderData.pixData && orderData.pixData.dateOfExpiration) {
      const expirationDate = new Date(orderData.pixData.dateOfExpiration);
      if (expirationDate > new Date()) {
        logger.info(`Returning existing valid PIX from Firestore for order ${orderId}.`);
        const pixData = orderData.pixData;
        // Re-create the object to avoid any potential Firestore proxy/serialization issues
        return {
          qrCodeBase64: pixData.qrCodeBase64,
          copyPaste: pixData.copyPaste,
          dateOfExpiration: pixData.dateOfExpiration,
        };
      }
      logger.info(`Existing PIX for order ${orderId} has expired. Creating a new one.`);
    }

    const payment = new Payment(client);
    // The notification URL for the webhook
    const notificationUrl = `https://us-central1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/mercadoPagoWebhook`;

    const paymentData = {
      // Ensure transaction amount has exactly two decimal places
      transaction_amount: Number(orderData.total.toFixed(2)),
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

    const result = await payment.create({body: paymentData});

    if (!result || !result.id) {
        logger.error("Invalid response from Mercado Pago when creating payment.", {result});
        throw new Error("Resposta inválida do gateway de pagamento.");
    }

    const paymentId = result.id.toString();
    const qrCodeBase64 = result.point_of_interaction?.transaction_data?.qr_code_base64;
    const copyPaste = result.point_of_interaction?.transaction_data?.qr_code;
    const dateOfExpiration = result.date_of_expiration;

    if (!qrCodeBase64 || !copyPaste || !dateOfExpiration) {
        logger.error("Mercado Pago response missing PIX data.", {result});
        throw new Error("Dados PIX não retornados pelo gateway de pagamento.");
    }

    const pixDataToSave = {
      qrCodeBase64,
      copyPaste,
      dateOfExpiration,
    };

    // Save the new Mercado Pago payment ID and PIX data to our order for tracking and persistence
    await db.collection("orders").doc(orderId).update({
      mercadoPagoPaymentId: paymentId,
      pixData: pixDataToSave,
    });

    logger.info(`New PIX payment created for order ${orderId}, MP Payment ID: ${paymentId}`);

    return pixDataToSave;
  } catch (error) {
    logger.error(`Error creating Mercado Pago payment for order ${orderId}:`, error.cause || error.message);
    throw new Error("Falha ao comunicar com o gateway de pagamento.");
  }
});

/**
 * Manually checks the status of a PIX payment.
 * Called from the frontend when the user clicks "Refresh Status".
 */
exports.getPixPaymentStatus = onCall(async (request) => {
  const {orderId} = request.data;
  if (!orderId) {
    logger.error("Request missing orderId for status check.");
    throw new Error("O ID do pedido é obrigatório.");
  }

  try {
    const orderDoc = await db.collection("orders").doc(orderId).get();
    if (!orderDoc.exists) {
      throw new Error("Pedido não encontrado.");
    }
    const paymentId = orderDoc.data().mercadoPagoPaymentId;
    if (!paymentId) {
      throw new Error("Este pedido não tem um pagamento PIX associado.");
    }

    const payment = new Payment(client);
    const paymentInfo = await payment.get({id: paymentId});

    logger.info(`Status check for order ${orderId} (Payment ID: ${paymentId}): ${paymentInfo.status}`);

    return {status: paymentInfo.status};
  } catch (error) {
    logger.error(`Error checking payment status for order ${orderId}:`, error.cause || error.message);
    throw new Error("Falha ao verificar status do pagamento.");
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

  // We only care about payment updates
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
    // Security Best Practice: Fetch the payment from Mercado Pago to verify the webhook
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
      const updateData = {
        paymentStatus: "paid_online",
        mercadoPagoDetails: {
          paymentId: paymentId.toString(),
          transactionId: paymentInfo.transaction_details?.transaction_id || null,
        },
      };
      await orderRef.update(updateData);
      logger.info(`Pedido ${orderId} (Pagamento MP: ${paymentId}) foi marcado como 'pago' com detalhes da transação via webhook.`);
    } else {
      logger.info(`Status do pagamento ${paymentId} é '${paymentInfo.status}'. Nenhuma ação tomada.`);
    }

    response.status(200).send("OK");
  } catch (error) {
    logger.error(`Erro ao processar webhook para o pagamento ${paymentId}:`, error.cause || error.message);
    response.status(500).send("Internal Server Error");
  }
});