```javascript
/* eslint-disable max-len */
const {onCall} = require("firebase-functions/v2/https");
const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const axios = require("axios");
const crypto = require("crypto");
require("dotenv").config();

admin.initializeApp();
const db = admin.firestore();

// Configurações do Mercado Pago
const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const MP_SECRET_SIGNATURE = process.env.MERCADO_PAGO_SECRET_SIGNATURE;
const MP_BASE_URL = "https://api.mercadopago.com/merchant_orders";

// Headers padrão para requisições ao Mercado Pago
const getMPHeaders = () => ({
  "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
  "Content-Type": "application/json",
  "X-Idempotency-Key": crypto.randomUUID(),
});

/**
 * ============================================
 * 1. CRIAR E PROCESSAR ORDER (Payment + Order simultâneo)
 * ============================================
 * Cria uma Order no Mercado Pago com processamento de transação PIX.
 */
exports.createMercadoPagoOrder = onCall(async (request) => {
  const {orderId} = request.data;

  if (!orderId) {
    logger.error("Request missing orderId.");
    throw new Error("O ID do pedido é obrigatório.");
  }

  try {
    // Buscar dados do pedido no Firestore
    const orderDoc = await db.collection("orders").doc(orderId).get();
    if (!orderDoc.exists) {
      logger.error(`Order with ID ${orderId} not found.`);
      throw new Error("Pedido não encontrado.");
    }

    const orderData = orderDoc.data();
    const notificationUrl = `https://us-central1-site-pizza-a2930.cloudfunctions.net/mercadoPagoWebhook`;

    // Criar payload da Order conforme documentação oficial do Mercado Pago
    const orderPayload = {
      external_reference: orderId,
      notification_url: notificationUrl,
      items: orderData.items.map((item) => ({
        title: `${item.name} (${item.size})`,
        quantity: item.quantity,
        unit_price: item.price,
      })),
      payer: {
        email: `cliente${orderId.substring(0, 8)}@santasensacao.com.br`,
        first_name: orderData.customer.name.split(" ")[0],
        last_name: orderData.customer.name.split(" ").slice(1).join(" ") || "Cliente",
      },
      total_amount: orderData.total,
      transactions: [
        {
          payments: [
            {
              payment_method_id: "pix",
              transaction_amount: orderData.total,
              description: `Pedido #${orderId.substring(0, 8)} - ${orderData.customer.name}`,
              payer: {
                email: `cliente${orderId.substring(0, 8)}@santasensacao.com.br`,
                first_name: orderData.customer.name.split(" ")[0],
                last_name: orderData.customer.name.split(" ").slice(1).join(" ") || "Cliente",
                identification: {
                  type: "CPF",
                  number: "00000000000", // Placeholder - em produção coletar CPF real
                },
              },
            },
          ],
        },
      ],
    };

    // Fazer requisição para criar Order no Mercado Pago
    const response = await axios.post(MP_BASE_URL, orderPayload, {
      headers: getMPHeaders(),
    });

    if (!response.data || !response.data.id) {
      logger.error("Invalid response from Mercado Pago:", response.data);
      throw new Error("Resposta inválida do gateway de pagamento.");
    }

    const mpOrder = response.data;
    const transaction = mpOrder.transactions?.[0];
    const payment = transaction?.payments?.[0];

    // Extrair dados do QR Code PIX
    const qrCodeBase64 = payment?.point_of_interaction?.transaction_data?.qr_code_base64;
    const qrCode = payment?.point_of_interaction?.transaction_data?.qr_code;

    if (!qrCodeBase64 || !qrCode) {
      logger.error("Missing PIX QR Code data:", mpOrder);
      throw new Error("Dados PIX não retornados pelo gateway.");
    }

    // Salvar detalhes da Order do Mercado Pago no Firestore
    await db.collection("orders").doc(orderId).update({
      mercadoPagoOrder: {
        orderId: mpOrder.id.toString(),
        status: mpOrder.status,
        transactions: mpOrder.transactions.map((t) => ({
          id: t.id?.toString(),
          type: t.type || "payment",
          amount: t.total_amount || 0,
          status: t.payments?.[0]?.status || "pending",
          paymentMethodId: t.payments?.[0]?.payment_method_id,
          qrCode: t.payments?.[0]?.point_of_interaction?.transaction_data?.qr_code,
          qrCodeBase64: t.payments?.[0]?.point_of_interaction?.transaction_data?.qr_code_base64,
        })),
        totalAmount: mpOrder.total_amount,
        paidAmount: mpOrder.paid_amount || 0,
        refundedAmount: 0,
        externalReference: orderId,
      },
    });

    logger.info(`Order ${orderId} criada no Mercado Pago: ${mpOrder.id}`);

    return {
      mpOrderId: mpOrder.id.toString(),
      qrCodeBase64,
      qrCode,
      status: mpOrder.status,
    };
  } catch (error) {
    logger.error(`Erro ao criar order no Mercado Pago:`, error.response?.data || error.message);
    throw new Error("Falha ao comunicar com o gateway de pagamento.");
  }
});

/**
 * ============================================
 * 2. OBTER ORDER
 * ============================================
 * Consulta status de uma Order no Mercado Pago.
 */
exports.getMercadoPagoOrder = onCall(async (request) => {
  const {mpOrderId} = request.data;

  if (!mpOrderId) {
    throw new Error("ID da Order do Mercado Pago é obrigatório.");
  }

  try {
    const response = await axios.get(`${MP_BASE_URL}/${mpOrderId}`, {
      headers: getMPHeaders(),
    });

    const mpOrder = response.data;

    logger.info(`Order ${mpOrderId} consultada com sucesso:`, mpOrder.status);

    return {
      orderId: mpOrder.id.toString(),
      status: mpOrder.status,
      paidAmount: mpOrder.paid_amount || 0,
      totalAmount: mpOrder.total_amount,
      transactions: mpOrder.transactions || [],
    };
  } catch (error) {
    logger.error(`Erro ao consultar order ${mpOrderId}:`, error.response?.data || error.message);
    throw new Error("Falha ao consultar status do pagamento.");
  }
});

/**
 * ============================================
 * 3. CAPTURAR ORDER (somente para cartões)
 * ============================================
 * Captura valor autorizado de uma order (válido para cartão de crédito).
 */
exports.captureMercadoPagoOrder = onCall(async (request) => {
  const {mpOrderId, transactionId} = request.data;

  if (!mpOrderId || !transactionId) {
    throw new Error("ID da Order e ID da transação são obrigatórios.");
  }

  try {
    const captureUrl = `${MP_BASE_URL}/${mpOrderId}/transactions/${transactionId}/capture`;
    const response = await axios.post(captureUrl, {}, {
      headers: getMPHeaders(),
    });

    logger.info(`Transação ${transactionId} capturada com sucesso.`);

    return {
      success: true,
      transaction: response.data,
    };
  } catch (error) {
    logger.error(`Erro ao capturar transação ${transactionId}:`, error.response?.data || error.message);
    throw new Error("Falha ao capturar pagamento.");
  }
});

/**
 * ============================================
 * 4. CANCELAR ORDER
 * ============================================
 * Cancela uma order que ainda não foi processada.
 */
exports.cancelMercadoPagoOrder = onCall(async (request) => {
  const {mpOrderId} = request.data;

  if (!mpOrderId) {
    throw new Error("ID da Order do Mercado Pago é obrigatório.");
  }

  try {
    const cancelUrl = `${MP_BASE_URL}/${mpOrderId}`;
    const response = await axios.put(
        cancelUrl,
        {status: "cancelled"},
        {headers: getMPHeaders()},
    );

    logger.info(`Order ${mpOrderId} cancelada com sucesso.`);

    return {
      success: true,
      status: response.data.status,
    };
  } catch (error) {
    logger.error(`Erro ao cancelar order ${mpOrderId}:`, error.response?.data || error.message);
    throw new Error("Falha ao cancelar pedido.");
  }
});

/**
 * ============================================
 * 5. REEMBOLSAR ORDER (Total ou Parcial)
 * ============================================
 * Estorna valor de uma order paga.
 */
exports.refundMercadoPagoOrder = onCall(async (request) => {
  const {mpOrderId, transactionId, amount} = request.data;

  if (!mpOrderId || !transactionId) {
    throw new Error("ID da Order e ID da transação são obrigatórios.");
  }

  try {
    const refundUrl = `${MP_BASE_URL}/${mpOrderId}/transactions/${transactionId}/refund`;

    // Reembolso total: body vazio
    // Reembolso parcial: especificar amount
    const payload = amount ? {amount} : {};

    const response = await axios.post(refundUrl, payload, {
      headers: getMPHeaders(),
    });

    logger.info(`Reembolso ${amount ? "parcial" : "total"} realizado para transação ${transactionId}.`);

    return {
      success: true,
      refund: response.data,
    };
  } catch (error) {
    logger.error(`Erro ao reembolsar transação ${transactionId}:`, error.response?.data || error.message);
    throw new Error("Falha ao processar reembolso.");
  }
});

/**
 * ============================================
 * 6. WEBHOOK - Receber notificações do Mercado Pago
 * ============================================
 */
exports.mercadoPagoWebhook = onRequest(async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).send("Method Not Allowed");
    return;
  }

  const {action, data} = request.body;
  logger.info("Webhook recebido:", request.body);

  // Validar assinatura do webhook (segurança)
  const signature = request.headers["x-signature"];
  const requestId = request.headers["x-request-id"];

  // TODO: Implementar validação da assinatura conforme documentação MP
  // const isValid = validateWebhookSignature(signature, requestId, data);
  // if (!isValid) {
  //   response.status(401).send("Unauthorized");
  //   return;
  // }

  // Processar notificação de merchant_order
  if (action === "merchant_order.updated" || data.type === "merchant_order") {
    const mpOrderId = data.id;

    try {
      // Buscar dados atualizados da order no Mercado Pago
      const orderResponse = await axios.get(`${MP_BASE_URL}/${mpOrderId}`, {
        headers: getMPHeaders(),
      });

      const mpOrder = orderResponse.data;
      const externalRef = mpOrder.external_reference;

      if (!externalRef) {
        logger.warn(`Order ${mpOrderId} sem referência externa.`);
        response.status(200).send("OK");
        return;
      }

      // Atualizar no Firestore
      const orderRef = db.collection("orders").doc(externalRef);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        logger.warn(`Pedido ${externalRef} não encontrado no Firestore.`);
        response.status(200).send("OK");
        return;
      }

      // Verificar se order foi paga completamente
      const isPaid = mpOrder.paid_amount >= mpOrder.total_amount;

      const updateData = {
        paymentStatus: isPaid ? "paid_online" : "pending",
        "mercadoPagoOrder.status": mpOrder.status,
        "mercadoPagoOrder.paidAmount": mpOrder.paid_amount || 0,
        "mercadoPagoOrder.transactions": mpOrder.transactions.map((t) => ({
          id: t.id?.toString(),
          type: t.type || "payment",
          amount: t.total_amount || 0,
          status: t.payments?.[0]?.status || "pending",
        })),
      };

      await orderRef.update(updateData);

      logger.info(`Pedido ${externalRef} atualizado via webhook. Status: ${mpOrder.status}, Pago: ${isPaid}`);

      response.status(200).send("OK");
    } catch (error) {
      logger.error(`Erro ao processar webhook para order ${mpOrderId}:`, error.response?.data || error.message);
      response.status(500).send("Internal Server Error");
    }
  } else {
    logger.info(`Ação '${action}' ignorada.`);
    response.status(200).send("OK");
  }
});
```