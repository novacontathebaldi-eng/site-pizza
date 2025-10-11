/* eslint-disable max-len */
const {onCall, onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const {MercadoPagoConfig, Payment, PaymentRefund} = require("mercadopago");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

// Define os secrets que as funções irão usar.
const secrets = ["MERCADO_PAGO_ACCESS_TOKEN", "MERCADO_PAGO_WEBHOOK_SECRET"];

/**
 * Creates an order in Firestore and optionally initiates a PIX payment.
 */
exports.createOrder = onCall({secrets}, async (request) => {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) {
    logger.error("MERCADO_PAGO_ACCESS_TOKEN não está configurado.");
    throw new Error("Erro de configuração interna do servidor.");
  }
  const client = new MercadoPagoConfig({accessToken});

  const {details, cart, total, pixOption} = request.data;

  // 1. Validate input
  if (!details || !cart || !total) {
    throw new Error("Dados do pedido incompletos.");
  }

  // 2. Generate a sequential order number atomically
  const counterRef = db.doc("_internal/counters");
  let orderNumber;
  try {
    await db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      if (!counterDoc.exists) {
        orderNumber = 1;
        transaction.set(counterRef, {orderNumber: orderNumber + 1});
      } else {
        orderNumber = counterDoc.data().orderNumber;
        transaction.update(counterRef, {orderNumber: orderNumber + 1});
      }
    });
  } catch (error) {
    logger.error("Falha ao gerar o número do pedido:", error);
    throw new Error("Não foi possível gerar o número do pedido.");
  }


  // 3. Prepare order data for Firestore
  const isPixPayNow = details.paymentMethod === "pix" && pixOption === "payNow";
  const orderStatus = isPixPayNow ? "awaiting-payment" : "pending";

  const orderData = {
    orderNumber,
    customer: {
      name: details.name,
      phone: details.phone,
      orderType: details.orderType,
      address: details.address || "",
      reservationTime: details.reservationTime || "",
      cpf: details.cpf || "",
    },
    items: cart,
    total,
    paymentMethod: details.paymentMethod,
    changeNeeded: details.changeNeeded || false,
    changeAmount: details.changeAmount || "",
    notes: details.notes || "",
    status: orderStatus,
    paymentStatus: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    mercadoPagoDetails: {}, // Initialize the object
  };

  // 4. Create the order document
  const orderRef = await db.collection("orders").add(orderData);
  const orderId = orderRef.id;
  logger.info(`Pedido #${orderNumber} (ID: ${orderId}) criado no Firestore.`);

  // 5. If it's a PIX payment, create it in Mercado Pago
  if (isPixPayNow) {
    if (!details.cpf) {
      throw new Error("CPF é obrigatório para pagamento com PIX.");
    }

    const notificationUrl = `https://${process.env.GCLOUD_REGION}-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/mercadoPagoWebhook`;

    const paymentData = {
      transaction_amount: total,
      description: `Pedido #${orderNumber} - ${details.name}`,
      payment_method_id: "pix",
      payer: {
        email: `cliente_${orderId}@santasensacao.me`, // MP requires an email
        first_name: details.name.split(" ")[0],
        last_name: details.name.split(" ").slice(1).join(" ") || "Cliente",
        identification: {
          type: "CPF",
          number: details.cpf.replace(/\D/g, ""), // Ensure only digits are sent
        },
      },
      notification_url: notificationUrl,
      external_reference: orderId,
    };

    try {
      const payment = new Payment(client);
      const idempotencyKey = crypto.randomUUID();
      const result = await payment.create({
        body: paymentData,
        requestOptions: {idempotencyKey},
      });

      const paymentId = result.id?.toString();
      const qrCodeBase64 = result.point_of_interaction?.transaction_data?.qr_code_base64;
      const copyPaste = result.point_of_interaction?.transaction_data?.qr_code;

      if (!paymentId || !qrCodeBase64 || !copyPaste) {
        throw new Error("Dados PIX não retornados pelo Mercado Pago.");
      }

      // Save payment details to our order
      await orderRef.update({
        "mercadoPagoDetails.paymentId": paymentId,
        "mercadoPagoDetails.qrCodeBase64": qrCodeBase64,
        "mercadoPagoDetails.qrCode": copyPaste,
      });

      logger.info(`Pagamento PIX criado para o pedido #${orderNumber}, ID MP: ${paymentId}`);

      return {
        orderId,
        orderNumber,
        pixData: {qrCodeBase64, copyPaste},
      };
    } catch (error) {
      logger.error(`Erro ao criar pagamento MP para o pedido #${orderNumber}:`, error.cause || error);
      throw new Error("Falha ao criar cobrança PIX.");
    }
  }

  // 6. Return order info for non-PIX or "Pay Later" orders
  return {orderId, orderNumber};
});


/**
 * Webhook to receive payment status updates from Mercado Pago.
 */
exports.mercadoPagoWebhook = onRequest({secrets}, async (request, response) => {
  const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  if (!webhookSecret || !accessToken) {
    logger.error("Secrets do Mercado Pago não estão configurados no ambiente da função.");
    return response.status(500).send("Internal Server Error: Missing configuration.");
  }
  const client = new MercadoPagoConfig({accessToken});

  if (request.method !== "POST") {
    return response.status(405).send("Method Not Allowed");
  }

  try {
    // 1. Validate Signature for security
    const signature = request.headers["x-signature"];
    const requestId = request.headers["x-request-id"];
    const receivedTopic = request.body.type;

    // The 'data.id' for signature validation comes from the query parameters
    const paymentIdFromQuery = request.query["data.id"];

    if (!signature || !requestId || !paymentIdFromQuery || receivedTopic !== "payment") {
      logger.warn("Webhook ignorado: Faltando headers, data.id no query, ou tópico inválido.", {
        headers: request.headers,
        query: request.query,
        body: request.body,
      });
      return response.status(200).send("OK"); // Respond OK to prevent retries
    }

    const [ts, hash] = signature.split(",").map((part) => part.split("=")[1]);
    
    // The manifest MUST be built from query params as per Mercado Pago docs.
    const manifest = `id:${paymentIdFromQuery};request-id:${requestId};ts:${ts};`;
    
    const hmac = crypto.createHmac("sha256", webhookSecret);
    hmac.update(manifest);
    const expectedHash = hmac.digest("hex");

    if (crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash)) === false) {
      logger.error("Falha na validação da assinatura do Webhook.");
      return response.status(401).send("Invalid Signature");
    }

    // 2. Process the payment update
    const paymentId = request.body.data.id;
    logger.info(`Webhook validado recebido para o pagamento: ${paymentId}`);

    const payment = new Payment(client);
    const paymentInfo = await payment.get({id: paymentId});

    if (!paymentInfo || !paymentInfo.external_reference) {
      throw new Error(`Pagamento ${paymentId} não encontrado ou sem external_reference.`);
    }

    const orderId = paymentInfo.external_reference;
    const orderRef = db.collection("orders").doc(orderId);

    // 3. Update Firestore based on payment status
    const updateData = {
      "mercadoPagoDetails.status": paymentInfo.status,
      "mercadoPagoDetails.statusDetail": paymentInfo.status_detail,
    };

    if (paymentInfo.status === "approved") {
      updateData.paymentStatus = "paid_online";
      updateData.status = "pending"; // Move from 'awaiting-payment' to 'pending' for the kitchen
      updateData["mercadoPagoDetails.transactionId"] = paymentInfo.transaction_details?.transaction_id || null;
      await orderRef.update(updateData);
      logger.info(`Pedido ${orderId} atualizado para PAGO via webhook.`);
    } else if (["cancelled", "rejected"].includes(paymentInfo.status)) {
      updateData.status = "cancelled";
      await orderRef.update(updateData);
      logger.info(`Pedido ${orderId} atualizado para CANCELADO/REJEITADO via webhook.`);
    } else {
      await orderRef.update(updateData);
      logger.info(`Status do pedido ${orderId} atualizado para '${paymentInfo.status}'.`);
    }

    return response.status(200).send("OK");
  } catch (error) {
    logger.error("Erro ao processar webhook do Mercado Pago:", error);
    return response.status(500).send("Internal Server Error");
  }
});

/**
 * Processes a full refund for a given order.
 */
exports.refundPayment = onCall({secrets}, async (request) => {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) {
    logger.error("MERCADO_PAGO_ACCESS_TOKEN não está configurado.");
    throw new Error("Erro de configuração interna do servidor.");
  }
  const client = new MercadoPagoConfig({accessToken});

  const {orderId} = request.data;
  if (!orderId) {
    throw new Error("O ID do pedido é obrigatório para o estorno.");
  }

  try {
    const orderDoc = await db.collection("orders").doc(orderId).get();
    if (!orderDoc.exists) {
      throw new Error("Pedido não encontrado.");
    }

    const orderData = orderDoc.data();
    const paymentId = orderData.mercadoPagoDetails?.paymentId;

    if (!paymentId) {
      throw new Error("Este pedido não possui um ID de pagamento do Mercado Pago para estornar.");
    }
    if (orderData.paymentStatus === "refunded") {
      throw new Error("Este pagamento já foi estornado.");
    }

    logger.info(`Iniciando estorno para o pedido ${orderId}, Pagamento MP: ${paymentId}`);

    const refund = new PaymentRefund(client);
    await refund.create({payment_id: paymentId});

    // For confirmation, fetch the payment again from Mercado Pago
    const payment = new Payment(client);
    const updatedPaymentInfo = await payment.get({id: paymentId});

    await db.collection("orders").doc(orderId).update({
      paymentStatus: "refunded",
      status: "cancelled",
      "mercadoPagoDetails.status": updatedPaymentInfo.status,
      "mercadoPagoDetails.refunds": updatedPaymentInfo.refunds || [],
    });

    logger.info(`Estorno concluído e pedido ${orderId} atualizado.`);
    return {success: true, message: "Pagamento estornado com sucesso!"};
  } catch (error) {
    logger.error(`Falha ao estornar o pedido ${orderId}:`, error.cause || error);
    const errorMessage = error.cause?.error?.message || error.cause?.message || "Erro ao processar o estorno.";
    throw new Error(errorMessage);
  }
});