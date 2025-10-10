
const functions = require("firebase-functions/v2");
const admin = require("firebase-admin");
const axios = require("axios");
const cors = require("cors")({ origin: true });
const crypto = require("crypto");

// --- INICIALIZAÇÃO ---
admin.initializeApp();
const db = admin.firestore();

// --- CONFIGURAÇÃO DE SEGREDOS ---
// Suas chaves secretas agora são gerenciadas de forma segura pelo Firebase.
const MERCADO_PAGO_ACCESS_TOKEN = functions.params.defineString("MERCADO_PAGO_ACCESS_TOKEN");
const MERCADO_PAGO_WEBHOOK_SECRET = functions.params.defineString("MERCADO_PAGO_WEBHOOK_SECRET");

const mercadoPagoApi = axios.create({
  baseURL: "https://api.mercadopago.com",
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================================================
// 1. CRIAR ORDEM DE PAGAMENTO (PIX)
// ============================================================================
exports.createMercadoPagoOrder = functions.https.onCall(async (data, context) => {
  const { orderId } = data;

  if (!orderId) {
    throw new functions.https.HttpsError("invalid-argument", "O ID do pedido é obrigatório.");
  }

  // Busca o pedido no Firestore para obter os detalhes
  const orderRef = db.collection("orders").doc(orderId);
  const orderDoc = await orderRef.get();

  if (!orderDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Pedido não encontrado no banco de dados.");
  }

  const order = orderDoc.data();
  const accessToken = MERCADO_PAGO_ACCESS_TOKEN.value();
  if (!accessToken) {
    throw new functions.https.HttpsError("failed-precondition", "Access Token do Mercado Pago não configurado.");
  }

  // Monta o payload EXATAMENTE como a documentação da API de Orders exige
  const orderData = {
    external_reference: orderId,
    title: `Pedido na Santa Sensação #${orderId.substring(0, 5)}`,
    description: `Pedido realizado por ${order.customer.name}`,
    notification_url: "https://mercadopagowebhook-lxwiyf7dla-uc.a.run.app", // SUA URL DE WEBHOOK ATIVA
    total_amount: parseFloat(order.total.toFixed(2)),
    items: order.items.map((item) => ({
      title: item.name,
      description: `Tamanho: ${item.size}`,
      quantity: item.quantity,
      unit_price: parseFloat(item.price.toFixed(2)),
      total_amount: parseFloat((item.price * item.quantity).toFixed(2)),
      unit: "unit",
    })),
    payer: {
      email: "test@testuser.com", // Email genérico conforme documentação para testes
      first_name: order.customer.name.split(" ")[0],
      last_name: order.customer.name.split(" ").slice(1).join(" ") || order.customer.name.split(" ")[0],
    },
    payment_methods: {
      excluded_payment_types: [
        { id: "credit_card" },
        { id: "debit_card" },
        { id: "ticket" },
      ],
    },
    transaction_amount: parseFloat(order.total.toFixed(2)),
    payment_method_id: "pix",
  };

  try {
    // A API correta para criar a cobrança PIX é /v1/payments
    const response = await mercadoPagoApi.post("/v1/payments", orderData, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "X-Idempotency-Key": orderId, // Usa o ID do pedido para evitar duplicidade
      },
    });

    const pixDetails = response.data.point_of_interaction.transaction_data;
    const paymentId = response.data.id;

    // Salva os IDs do Mercado Pago no nosso pedido no Firestore
    await orderRef.update({
      mercadoPagoOrderId: response.data.order?.id, // Pode não existir em /v1/payments, mas salvamos se vier
      mercadoPagoDetails: {
        paymentId: paymentId.toString(),
      },
    });

    return {
      qrCodeBase64: pixDetails.qr_code_base64,
      copyPaste: pixDetails.qr_code,
    };
  } catch (error) {
    console.error("Erro ao criar pagamento no Mercado Pago:", error.response?.data || error.message);
    const errorDetails = error.response?.data?.message || error.message || "Erro desconhecido";
    throw new functions.https.HttpsError("internal", errorDetails);
  }
});


// ============================================================================
// 2. RECEBER NOTIFICAÇÕES (WEBHOOK)
// ============================================================================
exports.mercadoPagoWebhook = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    try {
      const webhookSecret = MERCADO_PAGO_WEBHOOK_SECRET.value();
      if (!webhookSecret) {
        console.error("Segredo do Webhook não configurado.");
        res.status(500).send("Webhook secret not configured.");
        return;
      }
      
      // Validação da Assinatura (Segurança)
      const signature = req.headers["x-signature"];
      const requestId = req.headers["x-request-id"];
      const dataId = req.query["data.id"];
      
      if (!signature || !dataId) {
        console.warn("Webhook recebido sem assinatura ou data.id.");
        res.status(400).send("Bad Request");
        return;
      }

      const [tsPart, v1Part] = signature.split(",");
      const timestamp = tsPart.split("=")[1];
      const receivedHash = v1Part.split("=")[1];
      
      const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
      const hmac = crypto.createHmac("sha256", webhookSecret);
      hmac.update(manifest);
      const calculatedHash = hmac.digest("hex");

      if (crypto.timingSafeEqual(Buffer.from(receivedHash), Buffer.from(calculatedHash))) {
        console.log("Assinatura do webhook validada com sucesso.");

        // Processa a notificação
        const { type, action, data } = req.body;
        if (type === "payment" && data?.id) {
            const paymentId = data.id;
            console.log(`Recebida notificação para o pagamento: ${paymentId}`);

            const accessToken = MERCADO_PAGO_ACCESS_TOKEN.value();
            const paymentResponse = await mercadoPagoApi.get(`/v1/payments/${paymentId}`, {
                headers: { "Authorization": `Bearer ${accessToken}` },
            });

            const paymentData = paymentResponse.data;
            const firestoreOrderId = paymentData.external_reference;

            if (firestoreOrderId && paymentData.status === "approved") {
                console.log(`Pagamento ${paymentId} aprovado. Atualizando pedido ${firestoreOrderId} no Firestore.`);
                const orderRef = db.collection("orders").doc(firestoreOrderId);
                await orderRef.update({
                    paymentStatus: "paid_online",
                    status: "pending",
                });
            }
        }
        res.status(200).send("OK");
      } else {
        console.error("Falha na validação da assinatura do webhook.");
        res.status(400).send("Invalid signature");
      }
    } catch (error) {
      console.error("Erro no processamento do webhook:", error);
      res.status(500).send("Internal Server Error");
    }
  });
});


// ============================================================================
// 3. CANCELAR ORDEM NO MERCADO PAGO
// ============================================================================
exports.cancelMercadoPagoOrder = functions.https.onCall(async (data, context) => {
    // Implementação pendente - A API v1/orders não tem um endpoint de cancelamento direto para pagamentos PIX
    // que já foram criados. O cancelamento ocorre por expiração ou por reembolso.
    // Esta função pode ser usada para cancelar pagamentos de cartão antes de serem capturados, se implementado no futuro.
    
    // Por enquanto, apenas atualizamos o status no nosso sistema
    const { firestoreOrderId } = data;
    if (!firestoreOrderId) {
        throw new functions.https.HttpsError("invalid-argument", "ID do pedido é obrigatório.");
    }
    
    const orderRef = db.collection("orders").doc(firestoreOrderId);
    await orderRef.update({ status: "cancelled" });
    
    return { success: true, message: "Pedido cancelado no sistema. O PIX expirará automaticamente." };
});


// ============================================================================
// 4. REEMBOLSAR PAGAMENTO NO MERCADO PAGO
// ============================================================================
exports.refundMercadoPagoOrder = functions.https.onCall(async (data, context) => {
  const { firestoreOrderId, amount } = data;

  if (!firestoreOrderId) {
    throw new functions.https.HttpsError("invalid-argument", "ID do pedido é obrigatório.");
  }

  const orderRef = db.collection("orders").doc(firestoreOrderId);
  const orderDoc = await orderRef.get();

  if (!orderDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Pedido não encontrado.");
  }

  const paymentId = orderDoc.data().mercadoPagoDetails?.paymentId;
  if (!paymentId) {
    throw new functions.https.HttpsError("failed-precondition", "ID de pagamento do Mercado Pago não encontrado para este pedido.");
  }
  
  const accessToken = MERCADO_PAGO_ACCESS_TOKEN.value();

  try {
    const refundPayload = amount ? { amount: parseFloat(amount) } : {};
    
    // O endpoint de reembolso é em /v1/payments/{id}/refunds
    await mercadoPagoApi.post(`/v1/payments/${paymentId}/refunds`, refundPayload, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "X-Idempotency-Key": `${firestoreOrderId}-refund-${Date.now()}`,
      },
    });

    await orderRef.update({ paymentStatus: "refunded" });

    return { success: true, message: "Pedido de reembolso enviado com sucesso ao Mercado Pago." };
  } catch (error) {
    console.error("Erro ao reembolsar no Mercado Pago:", error.response?.data || error.message);
    const errorDetails = error.response?.data?.message || error.message || "Erro desconhecido";
    throw new functions.https.HttpsError("internal", `Falha no reembolso: ${errorDetails}`);
  }
});
