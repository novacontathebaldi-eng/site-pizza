/* eslint-disable max-len */
const {onCall, onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const {MercadoPagoConfig, Payment, PaymentRefund} = require("mercadopago");
const crypto = require("crypto");
require("dotenv").config();

admin.initializeApp();
const db = admin.firestore();

// --- ATENÇÃO ---
// Suas credenciais do Mercado Pago devem ser configuradas como secrets no Firebase.
// Para emulação local, crie um arquivo .env na pasta /functions com o conteúdo:
// MERCADO_PAGO_ACCESS_TOKEN="SEU_ACCESS_TOKEN"
// MERCADO_PAGO_WEBHOOK_SECRET="SUA_SECRET_PARA_WEBHOOK"
//
// Para produção, execute no seu terminal (na pasta do projeto):
// firebase functions:secrets:set MERCADO_PAGO_ACCESS_TOKEN
// (cole seu Access Token quando solicitado)
// firebase functions:secrets:set MERCADO_PAGO_WEBHOOK_SECRET
// (cole sua Webhook Secret quando solicitado)
// E adicione `runWith({ secrets: ["MERCADO_PAGO_ACCESS_TOKEN", "MERCADO_PAGO_WEBHOOK_SECRET"] })`
// em cada função que usa as secrets.

const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

if (!accessToken) {
  logger.error("MERCADO_PAGO_ACCESS_TOKEN não está configurado.");
}
if (!webhookSecret) {
  logger.error("MERCADO_PAGO_WEBHOOK_SECRET não está configurado.");
}

const client = new MercadoPagoConfig({accessToken});

/**
 * Creates an order in Firestore and optionally initiates a PIX payment.
 */
exports.createOrder = onCall(async (request) => {
  const {details, cart, total} = request.data;

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
  const isPixPayNow = details.paymentMethod === "pix" && request.data.pixOption === "payNow";
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

    const notificationUrl = `https://us-central1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/mercadoPagoWebhook`;

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
exports.mercadoPagoWebhook = onRequest(async (request, response) => {
  if (request.method !== "POST") {
    return response.status(405).send("Method Not Allowed");
  }

  try {
    // 1. Validate Signature for security
    const signature = request.headers["x-signature"];
    const requestId = request.headers["x-request-id"];
    const receivedTopic = request.body.topic || request.body.type;

    if (!signature || !requestId || receivedTopic !== "payment") {
      logger.warn("Webhook ignorado: Faltando headers ou tópico inválido.", {headers: request.headers, body: request.body});
      return response.status(200).send("OK");
    }

    const [ts, hash] = signature.split(",").map((part) => part.split("=")[1]);
    const manifest = `id:${request.body.data.id};request-id:${requestId};ts:${ts};`;
    const hmac = crypto.createHmac("sha256", webhookSecret);
    hmac.update(manifest);
    const expectedHash = hmac.digest("hex");

    if (expectedHash !== hash) {
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
exports.refundPayment = onCall(async (request) => {
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
    throw new Error(error.cause?.message || "Erro ao processar o estorno.");
  }
});
