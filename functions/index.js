/* eslint-disable max-len */

const {onCall} = require("firebase-functions/v2/https");
const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const {MercadoPagoConfig, Order} = require("mercadopago");
const crypto = require("crypto");
require("dotenv").config();

admin.initializeApp();
const db = admin.firestore();

// Initialize Mercado Pago Client with Orders API
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
  options: {
    timeout: 30000, // 30 seconds timeout
  },
});

// Generate order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `SS${timestamp}${random}`;
};

/**
 * Creates a PIX payment order with Mercado Pago using Orders API.
 * This function is called from the frontend to initiate a payment.
 */
exports.createMercadoPagoOrder = onCall(async (request) => {
  const {orderId} = request.data;

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
    
    // Generate a unique order number for display
    const orderNumber = generateOrderNumber();

    // The notification URL for the webhook
    const notificationUrl = `https://us-central1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/mercadoPagoWebhook`;

    // Order data for Orders API (PIX payment)
    const orderPayload = {
      type: "online",
      processing_mode: "automatic",
      total_amount: orderData.total.toString(),
      external_reference: orderId,
      notification_url: notificationUrl,
      payer: {
        first_name: orderData.customer.name.split(" ")[0],
        last_name: orderData.customer.name.split(" ").slice(1).join(" ") || "Cliente",
        email: `cliente_${orderId.substring(0, 8)}@santasensacao.me`,
        phone: {
          area_code: orderData.customer.phone.substring(0, 2),
          number: orderData.customer.phone.substring(2),
        },
        identification: {
          type: "CPF",
          number: "00000000000", // In production, collect real CPF
        },
      },
      transactions: {
        payments: [
          {
            amount: orderData.total.toString(),
            payment_method: {
              id: "pix",
              type: "bank_transfer",
            },
          },
        ],
      },
    };

    const orderMP = new Order(client);
    const result = await orderMP.create({
      body: orderPayload,
      requestOptions: {
        idempotencyKey: `order_${orderId}_${Date.now()}`,
      },
    });

    if (!result || !result.id) {
      logger.error("Invalid response from Mercado Pago when creating order.", {result});
      throw new Error("Resposta inválida do gateway de pagamento.");
    }

    // Extract PIX data
    const paymentData = result.transactions?.payments?.[0];
    if (!paymentData) {
      logger.error("No payment data in Mercado Pago response.", {result});
      throw new Error("Dados de pagamento não encontrados.");
    }

    const qrCodeBase64 = paymentData.point_of_interaction?.transaction_data?.qr_code_base64;
    const copyPaste = paymentData.point_of_interaction?.transaction_data?.qr_code;
    const ticketUrl = paymentData.point_of_interaction?.transaction_data?.ticket_url;

    if (!qrCodeBase64 || !copyPaste) {
      logger.error("Mercado Pago response missing PIX data.", {result});
      throw new Error("Dados PIX não retornados pelo gateway de pagamento.");
    }

    // Save the Mercado Pago order and payment IDs to our order for tracking
    await db.collection("orders").doc(orderId).update({
      orderNumber: orderNumber,
      mercadoPagoOrderId: result.id,
      mercadoPagoPaymentId: paymentData.id?.toString(),
      mercadoPagoDetails: {
        orderId: result.id,
        paymentId: paymentData.id?.toString(),
        status: result.status,
        paymentStatus: paymentData.status,
        transactionId: paymentData.transaction_details?.transaction_id || null,
        ticketUrl: ticketUrl,
      },
    });

    logger.info(`PIX order created for ${orderId}, Order ID: ${result.id}, Payment ID: ${paymentData.id}`);

    return {
      orderNumber: orderNumber,
      qrCodeBase64,
      copyPaste,
      ticketUrl,
      mercadoPagoOrderId: result.id,
      mercadoPagoPaymentId: paymentData.id?.toString(),
    };

  } catch (error) {
    logger.error(`Error creating Mercado Pago order for ${orderId}:`, error.cause || error.message);
    throw new Error("Falha ao comunicar com o gateway de pagamento.");
  }
});

/**
 * Get order details from Mercado Pago
 */
exports.getMercadoPagoOrder = onCall(async (request) => {
  const {mercadoPagoOrderId} = request.data;

  if (!mercadoPagoOrderId) {
    throw new Error("ID da order do Mercado Pago é obrigatório.");
  }

  try {
    const orderMP = new Order(client);
    const result = await orderMP.get({id: mercadoPagoOrderId});

    logger.info(`Order details retrieved for ${mercadoPagoOrderId}`);
    return result;

  } catch (error) {
    logger.error(`Error getting Mercado Pago order ${mercadoPagoOrderId}:`, error.message);
    throw new Error("Erro ao obter detalhes da order.");
  }
});

/**
 * Cancel order in Mercado Pago
 */
exports.cancelMercadoPagoOrder = onCall(async (request) => {
  const {mercadoPagoOrderId, orderId} = request.data;

  if (!mercadoPagoOrderId) {
    throw new Error("ID da order do Mercado Pago é obrigatório.");
  }

  try {
    const orderMP = new Order(client);
    const result = await orderMP.cancel({
      id: mercadoPagoOrderId,
      requestOptions: {
        idempotencyKey: `cancel_${mercadoPagoOrderId}_${Date.now()}`,
      },
    });

    // Update local order status
    if (orderId) {
      await db.collection("orders").doc(orderId).update({
        paymentStatus: "cancelled",
        "mercadoPagoDetails.status": result.status,
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    logger.info(`Order ${mercadoPagoOrderId} cancelled successfully`);
    return result;

  } catch (error) {
    logger.error(`Error cancelling Mercado Pago order ${mercadoPagoOrderId}:`, error.message);
    throw new Error("Erro ao cancelar order.");
  }
});

/**
 * Refund order in Mercado Pago (total or partial)
 */
exports.refundMercadoPagoOrder = onCall(async (request) => {
  const {mercadoPagoOrderId, amount, orderId} = request.data;

  if (!mercadoPagoOrderId) {
    throw new Error("ID da order do Mercado Pago é obrigatório.");
  }

  try {
    const orderMP = new Order(client);
    
    // If amount is provided, it's a partial refund
    const refundData = amount ? {amount: amount.toString()} : {};

    const result = await orderMP.refund({
      id: mercadoPagoOrderId,
      body: refundData,
      requestOptions: {
        idempotencyKey: `refund_${mercadoPagoOrderId}_${Date.now()}`,
      },
    });

    // Update local order status
    if (orderId) {
      const updateData = {
        paymentStatus: amount ? "partially_refunded" : "refunded",
        "mercadoPagoDetails.refundStatus": result.status,
        refundedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      if (amount) {
        updateData.refundedAmount = amount;
      }

      await db.collection("orders").doc(orderId).update(updateData);
    }

    logger.info(`Order ${mercadoPagoOrderId} refunded successfully. Amount: ${amount || 'total'}`);
    return result;

  } catch (error) {
    logger.error(`Error refunding Mercado Pago order ${mercadoPagoOrderId}:`, error.message);
    throw new Error("Erro ao estornar order.");
  }
});

/**
 * Webhook to receive payment status updates from Mercado Pago.
 * Now handles Orders API webhooks
 */
exports.mercadoPagoWebhook = onRequest(async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).send("Method Not Allowed");
    return;
  }

  const {action, data} = request.body;
  logger.info("Webhook do Mercado Pago recebido:", request.body);

  // Handle both payment and order updates
  if (!action || (!action.includes("payment") && !action.includes("order"))) {
    logger.info(`Ação '${action}' ignorada.`);
    response.status(200).send("OK");
    return;
  }

  const resourceId = data?.id;
  if (!resourceId) {
    logger.warn("Webhook recebido sem ID do recurso.");
    response.status(400).send("Bad Request: Missing resource ID");
    return;
  }

  try {
    // Validate webhook signature for security
    const xSignature = request.headers['x-signature'];
    const xRequestId = request.headers['x-request-id'];
    
    if (xSignature && process.env.MERCADO_PAGO_WEBHOOK_SECRET) {
      const isValid = validateWebhookSignature(xSignature, xRequestId, data.id);
      if (!isValid) {
        logger.error("Invalid webhook signature");
        response.status(401).send("Unauthorized");
        return;
      }
    }

    // Get order information from Mercado Pago
    const orderMP = new Order(client);
    let orderInfo;

    try {
      orderInfo = await orderMP.get({id: resourceId});
    } catch (error) {
      logger.error(`Cannot get order ${resourceId} from MP:`, error.message);
      response.status(404).send("Order not found");
      return;
    }

    if (!orderInfo || !orderInfo.external_reference) {
      logger.error(`Order ${resourceId} missing external reference.`);
      response.status(404).send("Missing external reference");
      return;
    }

    const orderId = orderInfo.external_reference;
    const paymentData = orderInfo.transactions?.payments?.[0];

    if (paymentData && paymentData.status === "approved") {
      const orderRef = db.collection("orders").doc(orderId);
      
      const updateData = {
        paymentStatus: "paid",
        "mercadoPagoDetails.status": orderInfo.status,
        "mercadoPagoDetails.paymentStatus": paymentData.status,
        "mercadoPagoDetails.transactionId": paymentData.transaction_details?.transaction_id || null,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await orderRef.update(updateData);
      logger.info(`Order ${orderId} (MP Order: ${resourceId}) marked as paid via webhook.`);
    } else {
      logger.info(`Order ${resourceId} status is '${orderInfo.status}' / Payment: '${paymentData?.status}'. No action taken.`);
    }

    response.status(200).send("OK");

  } catch (error) {
    logger.error(`Error processing webhook for resource ${resourceId}:`, error.cause || error.message);
    response.status(500).send("Internal Server Error");
  }
});

/**
 * Validate webhook signature for security
 */
function validateWebhookSignature(xSignature, xRequestId, dataId) {
  try {
    const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    if (!secret) return false;

    // Parse signature
    const parts = xSignature.split(',');
    let ts = null;
    let hash = null;

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key.trim() === 'ts') {
        ts = value.trim();
      } else if (key.trim() === 'v1') {
        hash = value.trim();
      }
    }

    if (!ts || !hash) return false;

    // Generate manifest
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

    // Calculate HMAC
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(manifest)
      .digest('hex');

    return expectedSignature === hash;

  } catch (error) {
    logger.error("Error validating webhook signature:", error.message);
    return false;
  }
}

/**
 * Generate payment receipt URL for viewing
 */
exports.getPaymentReceipt = onCall(async (request) => {
  const {mercadoPagoPaymentId} = request.data;

  if (!mercadoPagoPaymentId) {
    throw new Error("ID do pagamento é obrigatório.");
  }

  try {
    // For PIX payments, we can return the ticket URL stored during creation
    // or construct a receipt URL based on Mercado Pago's patterns
    const receiptUrl = `https://www.mercadopago.com.br/payments/${mercadoPagoPaymentId}/ticket`;
    
    logger.info(`Receipt URL generated for payment ${mercadoPagoPaymentId}`);
    return {receiptUrl};

  } catch (error) {
    logger.error(`Error generating receipt URL for ${mercadoPagoPaymentId}:`, error.message);
    throw new Error("Erro ao gerar comprovante.");
  }
});