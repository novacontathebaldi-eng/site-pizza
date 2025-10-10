/* eslint-disable max-len */
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const {MercadoPagoConfig, Payment, MerchantOrder} = require("mercadopago");
const crypto = require("crypto");
const {v4: uuidv4} = require("uuid");

// Carregar variáveis de ambiente do Firebase config
const functions = require("firebase-functions");
const mercadopagoConfig = functions.config().mercadopago;

admin.initializeApp();
const db = admin.firestore();

// Inicializa o cliente do Mercado Pago com o Access Token
if (!mercadopagoConfig || !mercadopagoConfig.accesstoken) {
  logger.error("Access Token do Mercado Pago não está configurado no Firebase Functions.");
}
const client = new MercadoPagoConfig({
  accessToken: mercadopagoConfig ? mercadopagoConfig.accesstoken : process.env.MERCADO_PAGO_ACCESS_TOKEN,
});


/**
 * Cria uma Order no Mercado Pago.
 * Esta função é chamada pelo frontend para iniciar um pagamento PIX.
 */
exports.createMercadoPagoOrder = onCall( async (request) => {
  const orderId = request.data.orderId;
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

    const idempotencyKey = uuidv4();
    const notificationUrl = `https://us-central1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/mercadoPagoWebhook`;

    const payment = new Payment(client);
    const paymentResult = await payment.create({
      body: {
        transaction_amount: orderData.total,
        description: `Pedido #${orderId.substring(0, 8)} - ${orderData.customer.name}`,
        payment_method_id: "pix",
        payer: {
          email: `cliente_${orderId}@santasensacao.me`, // Placeholder email
          first_name: orderData.customer.name.split(" ")[0],
          last_name: orderData.customer.name.split(" ").slice(1).join(" ") || "Cliente",
        },
        notification_url: notificationUrl,
        external_reference: orderId,
      },
      requestOptions: {"idempotencyKey": idempotencyKey},
    });

    const paymentId = paymentResult.id.toString();
    const qrCodeBase64 = paymentResult.point_of_interaction?.transaction_data?.qr_code_base64;
    const copyPaste = paymentResult.point_of_interaction?.transaction_data?.qr_code;

    if (!qrCodeBase64 || !copyPaste) {
      logger.error("Mercado Pago response missing PIX data.", {paymentResult});
      throw new HttpsError("internal", "Dados PIX não retornados pelo gateway de pagamento.");
    }

    await db.collection("orders").doc(orderId).update({
      mercadoPagoPaymentId: paymentId,
      mercadoPagoOrderId: paymentResult.order?.id?.toString(),
    });

    logger.info(`Pagamento PIX criado para o pedido ${orderId}, ID do pagamento MP: ${paymentId}`);

    return {
      qrCodeBase64,
      copyPaste,
    };
  } catch (error) {
    logger.error(`Erro ao criar pagamento PIX para o pedido ${orderId}:`, error);
    if (error.cause) {
        logger.error("Detalhes do erro:", error.cause);
    }
    throw new HttpsError("internal", "Falha ao comunicar com o gateway de pagamento.");
  }
});

/**
 * Webhook para receber notificações de status do Mercado Pago.
 */
exports.mercadoPagoWebhook = onRequest(  async (req, res) => {
  logger.info("Webhook do Mercado Pago recebido", {query: req.query, headers: req.headers, body: req.body});
  const topic = req.query.topic || req.body.topic || req.body.type;

  // Validação de segurança HMAC SHA256
  const signature = req.headers["x-signature"];
  const requestId = req.headers["x-request-id"];
  
  if (!signature || !requestId) {
    logger.warn("Webhook recebido sem x-signature ou x-request-id.");
    return res.status(400).send("Bad Request: Missing signature headers.");
  }
  
  const secret = mercadopagoConfig ? mercadopagoConfig.webhook_secret : process.env.MERCADO_PAGO_WEBHOOK_SECRET;

  if (!secret) {
    logger.error("A chave secreta do webhook do Mercado Pago não está configurada.");
    return res.status(500).send("Internal Server Error: Webhook secret not set.");
  }

  const parts = signature.split(",");
  const ts = parts.find((part) => part.startsWith("ts=")).split("=")[1];
  const hash = parts.find((part) => part.startsWith("v1=")).split("=")[1];
  
  const manifest = `id:${req.body.data.id};request-id:${requestId};ts:${ts};`;
  
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(manifest);
  const expectedHash = hmac.digest("hex");
  
  if (expectedHash !== hash) {
    logger.error("Falha na validação da assinatura do Webhook!");
    return res.status(400).send("Bad Request: Invalid signature.");
  }
  logger.info("Assinatura do Webhook validada com sucesso.");

  if (topic === "payment" || req.body.action?.startsWith("payment.")) {
    const paymentId = req.body.data.id;
    try {
      const payment = await new Payment(client).get({id: paymentId});
      const orderId = payment.external_reference;

      if (!orderId) {
        logger.warn(`Pagamento ${paymentId} recebido sem external_reference.`);
        return res.status(200).send("OK");
      }

      const orderRef = db.collection("orders").doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        logger.error(`Pedido ${orderId} não encontrado no Firestore para o pagamento ${paymentId}.`);
        return res.status(200).send("OK");
      }

      if (payment.status === "approved" && orderDoc.data().paymentStatus !== "paid_online") {
        await orderRef.update({
          status: "pending",
          paymentStatus: "paid_online",
          mercadoPagoPaymentId: payment.id.toString(),
          mercadoPagoOrderId: payment.order?.id?.toString(),
        });
        logger.info(`Pedido ${orderId} atualizado para PENDENTE e PAGO PELO SITE via webhook.`);
      } else {
        logger.info(`Status do pagamento ${paymentId} é '${payment.status}'. Nenhuma ação necessária ou pedido já atualizado.`);
      }
    } catch (error) {
      logger.error(`Erro ao processar webhook para pagamento ${paymentId}:`, error);
      return res.status(500).send("Internal Server Error");
    }
  }

  res.status(200).send("OK");
});


/**
 * Cancela uma Order no Mercado Pago (se ainda não paga).
 */
exports.cancelMercadoPagoOrder = onCall(async (request) => {
    const {orderId} = request.data;
    if (!orderId) {
        throw new HttpsError("invalid-argument", "O ID do pedido é obrigatório.");
    }

    try {
        const orderDoc = await db.collection("orders").doc(orderId).get();
        if (!orderDoc.exists) {
            throw new HttpsError("not-found", "Pedido não encontrado.");
        }
        const mpOrderId = orderDoc.data().mercadoPagoOrderId;
        if (!mpOrderId) {
            throw new HttpsError("failed-precondition", "Este pedido não possui um ID do Mercado Pago associado.");
        }
        
        // No Mercado Pago, o cancelamento é feito no "Merchant Order".
        // O cancelamento real só funciona se o pagamento não foi efetuado.
        const merchantOrder = new MerchantOrder(client);
        const orderInfo = await merchantOrder.get({merchantOrderId: mpOrderId});

        // A API de cancelamento direto de 'Order' não é clara, mas podemos atualizar
        // o status do nosso lado e, se o pagamento não foi feito, ele expirará.
        // Se já pago, o correto é reembolsar.
        if (orderInfo.order_status === 'paid' || orderInfo.order_status === 'partially_paid') {
            throw new HttpsError("failed-precondition", "Não é possível cancelar um pedido que já foi pago. Use a função de reembolso.");
        }

        await db.collection("orders").doc(orderId).update({
            status: "cancelled",
        });
        
        logger.info(`Pedido ${orderId} (MP Order: ${mpOrderId}) marcado como cancelado.`);
        return {success: true, message: "Pedido cancelado com sucesso no sistema."};

    } catch (error) {
        logger.error(`Erro ao cancelar pedido ${orderId} no Mercado Pago:`, error);
        throw new HttpsError("internal", "Falha ao cancelar o pedido.");
    }
});

/**
 * Reembolsa um pagamento no Mercado Pago.
 */
exports.refundMercadoPagoOrder = onCall(async (request) => {
    const {orderId, amount} = request.data;
    if (!orderId) {
        throw new HttpsError("invalid-argument", "O ID do pedido é obrigatório.");
    }
    
    try {
        const orderDoc = await db.collection("orders").doc(orderId).get();
        if (!orderDoc.exists) {
            throw new HttpsError("not-found", "Pedido não encontrado.");
        }

        const mpPaymentId = orderDoc.data().mercadoPagoPaymentId;
        if (!mpPaymentId) {
            throw new HttpsError("failed-precondition", "Este pedido não possui um ID de pagamento do Mercado Pago para reembolsar.");
        }
        
        const payment = new Payment(client);
        const refund = await payment.refund({paymentId: mpPaymentId, body: {amount: amount ? Number(amount) : undefined}});
        
        if (refund.id) {
            logger.info(`Reembolso criado para o pagamento ${mpPaymentId}. ID do Reembolso: ${refund.id}`);
            
            // Atualizar o status do pedido no Firestore
            const orderRef = db.collection("orders").doc(orderId);
            const orderData = orderDoc.data();
            const newRefund = {id: refund.id.toString(), amount: amount || orderData.total, date: new Date()};
            const existingRefunds = orderData.refunds || [];
            const totalRefunded = existingRefunds.reduce((sum, r) => sum + r.amount, 0) + newRefund.amount;
            const newPaymentStatus = totalRefunded >= orderData.total ? "refunded" : "partially_refunded";

            await orderRef.update({
                paymentStatus: newPaymentStatus,
                refunds: admin.firestore.FieldValue.arrayUnion(newRefund),
            });

            return {success: true, refundId: refund.id, newStatus: newPaymentStatus};
        } else {
            throw new Error("Resposta de reembolso do Mercado Pago inválida.");
        }

    } catch (error) {
        logger.error(`Erro ao reembolsar pagamento para o pedido ${orderId}:`, error.cause || error);
        throw new HttpsError("internal", "Falha ao processar reembolso.");
    }
});
