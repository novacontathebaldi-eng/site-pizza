/* eslint-disable max-len */
const {onCall, HttpsError} = require("firebase-functions/v2/https");
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

// FIX: Implement the Mercado Pago PIX payment initiation logic.
// This function creates a payment request and returns the QR code data.
exports.initiateMercadoPagoPixPayment = onCall(async (request) => {
  if (!request.data.orderId) {
    throw new HttpsError(
        "invalid-argument",
        "The function must be called with one argument 'orderId'.",
    );
  }

  const orderId = request.data.orderId;
  logger.info(`Initiating PIX payment for orderId: ${orderId}`);

  try {
    const orderDoc = await db.collection("orders").doc(orderId).get();
    if (!orderDoc.exists) {
      throw new HttpsError(
          "not-found",
          `Order with ID ${orderId} not found.`,
      );
    }

    const orderData = orderDoc.data();

    // Update order status to indicate it's waiting for payment.
    await db.collection("orders").doc(orderId).update({
      status: "awaiting-payment",
    });

    const payment = new Payment(client);

    // Set expiration for 5 minutes from now.
    const expirationDate = new Date();
    expirationDate.setMinutes(expirationDate.getMinutes() + 5);

    const paymentData = {
      transaction_amount: orderData.total,
      description: `Pedido #${orderId} - Santa Sensação`,
      payment_method_id: "pix",
      payer: {
        email: `cliente_${orderData.customer.phone.replace(/\D/g, "")}@santasensacao.com`,
        first_name: orderData.customer.name.split(" ")[0],
        last_name: orderData.customer.name.split(" ").slice(1).join(" ") || "Cliente",
      },
      // IMPORTANT: This URL must be publicly accessible for Mercado Pago to send notifications.
      // You must deploy your functions to get the correct URL.
      notification_url: `https://us-central1-site-pizza-a2930.cloudfunctions.net/mercadoPagoWebhook`,
      external_reference: orderId,
      date_of_expiration: expirationDate.toISOString(),
    };

    const result = await payment.create({body: paymentData});

    if (result.point_of_interaction?.transaction_data) {
      const {qr_code_base64: qrCodeBase64, qr_code: copyPaste} =
        result.point_of_interaction.transaction_data;
      return {qrCodeBase64, copyPaste};
    } else {
      logger.error("Error creating Mercado Pago payment: No transaction data found", result);
      throw new HttpsError(
          "internal",
          "Failed to get PIX details from Mercado Pago.",
      );
    }
  } catch (error) {
    logger.error("Error in initiateMercadoPagoPixPayment:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError(
        "internal",
        "An unexpected error occurred while creating the PIX payment.",
        error.message,
    );
  }
});

// FIX: Implement the Mercado Pago webhook to handle payment notifications.
// This function updates the order status in Firestore when a payment is approved.
exports.mercadoPagoWebhook = onRequest(async (req, res) => {
  logger.info("Received Mercado Pago Webhook", {query: req.query});

  if (req.query.type === "payment") {
    const paymentId = req.query["data.id"];

    try {
      const payment = new Payment(client);
      const paymentInfo = await payment.get({id: paymentId});

      const orderId = paymentInfo.external_reference;
      const paymentStatus = paymentInfo.status; // e.g., "approved", "pending", "rejected"

      if (orderId) {
        const orderRef = db.collection("orders").doc(orderId);
        const orderDoc = await orderRef.get();

        if (orderDoc.exists) {
          // Check if payment is approved and not already marked as paid
          if (paymentStatus === "approved" && orderDoc.data().paymentStatus !== "paid_online") {
            await orderRef.update({
              paymentStatus: "paid_online", // Use 'paid_online' to distinguish from in-person payments
              status: "accepted", // Move order to production
              mercadoPagoDetails: {
                paymentId: String(paymentInfo.id),
                transactionId: String(paymentInfo.id),
              },
            });
            logger.info(`Order ${orderId} updated to paid_online.`);
          } else {
            logger.info(`Payment status for order ${orderId} is ${paymentStatus}. No update needed or already updated.`);
          }
        } else {
          logger.warn(`Order with external_reference ${orderId} not found.`);
        }
      } else {
        logger.warn(`Payment ${paymentId} does not have an external_reference.`);
      }
    } catch (error) {
      logger.error(`Error processing webhook for payment ${paymentId}:`, error);
      res.status(500).send("Error processing webhook");
      return;
    }
  }
  res.status(200).send("OK");
});
