const functions = require("firebase-functions/v2");
const admin = require("firebase-admin");
const axios = require("axios");
const cors = require("cors")({origin: true});
const crypto = require("crypto");

// --- INICIALIZAÇÃO ---
admin.initializeApp();
const db = admin.firestore();

// --- CONFIGURAÇÃO DE SEGREDOS ---
const MERCADO_PAGO_ACCESS_TOKEN = functions.params.defineString("MERCADO_PAGO_ACCESS_TOKEN");
const MERCADO_PAGO_WEBHOOK_SECRET = functions.params.defineString("MERCADO_PAGO_WEBHOOK_SECRET");

// Instância do Axios para a API do Mercado Pago
const mercadoPagoApi = axios.create({
  baseURL: "https://api.mercadopago.com",
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Adiciona o Access Token a cada requisição
 */
mercadoPagoApi.interceptors.request.use((config) => {
  const accessToken = MERCADO_PAGO_ACCESS_TOKEN.value();
  if (!accessToken) {
    throw new Error("Access Token do Mercado Pago não está configurado.");
  }
  config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// ============================================================================
// 1. CRIAR ORDEM DE PAGAMENTO (PIX) - CORRIGIDO
// ============================================================================
exports.createMercadoPagoOrder = functions.https.onCall(async (data, context) => {
  const {orderId} = data;
  if (!orderId) {
    throw new functions.https.HttpsError("invalid-argument", "O ID do pedido é obrigatório.");
  }

  const orderRef = db.collection("orders").doc(orderId);
  const orderDoc = await orderRef.get();

  if (!orderDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Pedido não encontrado no banco de dados.");
  }

  const order = orderDoc.data();

  // Payload 100% alinhado com a documentação da API de Orders
  const orderData = {
    external_reference: orderId,
    title: `Pedido #${orderId.substring(0, 5)} - Santa Sensação`,
    description: `Pedido realizado por ${order.customer.name}`,
    notification_url: "https://mercadopagowebhook-lxwiyf7dla-uc.a.run.app",
    total_amount: parseFloat(order.total.toFixed(2)),
    items: order.items.map((item) => ({
      title: item.name,
      description: item.size,
      quantity: item.quantity,
      unit_price: parseFloat(item.price.toFixed(2)),
      total_amount: parseFloat((item.price * item.quantity).toFixed(2)),
      unit: "unit",
    })),
    // Para PIX, a documentação recomenda a API de Pagamentos
    // que é mais direta. Vamos usar a estrutura correta para ela.
    transaction_amount: parseFloat(order.total.toFixed(2)),
    payment_method_id: 'pix',
    payer: {
      email: "test@testuser.com", // Obrigatório para o ambiente de teste
      first_name: order.customer.name.split(" ")[0],
      last_name: order.customer.name.split(" ").slice(1).join(" ") || "N/A",
    },
  };

  try {
    // A API correta e mais simples para gerar um PIX direto é /v1/payments
    const response = await mercadoPagoApi.post("/v1/payments", orderData, {
      headers: {
        "X-Idempotency-Key": orderId,
      },
    });

    const pixDetails = response.data.point_of_interaction?.transaction_data;
    if (!pixDetails || !pixDetails.qr_code_base64 || !pixDetails.qr_code) {
      throw new Error("Resposta do Mercado Pago não contém os dados do PIX.");
    }

    // Salva os IDs importantes no nosso pedido no Firestore
    await orderRef.update({
      mercadoPagoOrderId: response.data.order?.id?.toString(),
      mercadoPagoDetails: {
        paymentId: response.data.id?.toString(),
      },
    });

    return {
      qrCodeBase64: pixDetails.qr_code_base64,
      copyPaste: pixDetails.qr_code,
    };
  } catch (error) {
    console.error("Erro detalhado ao criar pagamento no MP:", JSON.stringify(error.response?.data, null, 2));
    const errorDetails = error.response?.data?.message || "Erro de comunicação com o Mercado Pago.";
    throw new functions.https.HttpsError("internal", errorDetails);
  }
});


// ============================================================================
// 2. RECEBER NOTIFICAÇÕES (WEBHOOK) - CORRIGIDO
// ============================================================================
exports.mercadoPagoWebhook = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    try {
      const webhookSecret = MERCADO_PAGO_WEBHOOK_SECRET.value();
      if (!webhookSecret) {
        console.error("Segredo do Webhook não configurado.");
        return res.status(500).send("Webhook secret not configured.");
      }

      const signature = req.headers["x-signature"];
      const requestId = req.headers["x-request-id"];
      const topic = req.body.topic || req.body.type; // Compatibilidade com ambos os formatos
      const dataId = req.body.data?.id || req.query["data.id"];

      if (!signature || !dataId) {
        return res.status(400).send("Bad Request: Missing signature or data.id");
      }

      const [tsPart, v1Part] = signature.split(",");
      const timestamp = tsPart.split("=")[1];
      const receivedHash = v1Part.split("=")[1];
      
      const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;

      const hmac = crypto.createHmac("sha256", webhookSecret);
      hmac.update(manifest);
      const calculatedHash = hmac.digest("hex");

      if (!crypto.timingSafeEqual(Buffer.from(receivedHash), Buffer.from(calculatedHash))) {
        console.error("Falha na validação da assinatura do webhook.");
        return res.status(400).send("Invalid signature");
      }

      console.log("Assinatura do webhook validada com sucesso.");

      // O evento 'payment' é o correto para a API de pagamentos
      if (topic === "payment" && dataId) {
        console.log(`Recebida notificação para o pagamento: ${dataId}`);

        const paymentResponse = await mercadoPagoApi.get(`/v1/payments/${dataId}`);
        const paymentData = paymentResponse.data;
        const firestoreOrderId = paymentData.external_reference;

        if (firestoreOrderId && paymentData.status === "approved") {
          console.log(`Pagamento ${dataId} aprovado. Atualizando pedido ${firestoreOrderId} no Firestore.`);
          const orderRef = db.collection("orders").doc(firestoreOrderId);
          await orderRef.update({
            paymentStatus: "paid_online",
            status: "pending",
            mercadoPagoDetails: {
                paymentId: paymentData.id?.toString(),
            }
          });
        }
      }
      return res.status(200).send("OK");

    } catch (error) {
      console.error("Erro no processamento do webhook:", error);
      return res.status(500).send("Internal Server Error");
    }
  });
});


// ============================================================================
// 3. CANCELAR PAGAMENTO NO MERCADO PAGO - CORRIGIDO
// ============================================================================
exports.cancelMercadoPagoOrder = functions.https.onCall(async (data, context) => {
  const { firestoreOrderId } = data;
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
     await orderRef.update({ status: "cancelled" });
     return { success: true, message: "Pedido cancelado no sistema (sem ID de pagamento MP para cancelar)." };
  }
  
  try {
    // O endpoint para cancelar um pagamento é /v1/payments/{id} com status cancelled
    await mercadoPagoApi.put(`/v1/payments/${paymentId}`, { status: "cancelled" });

    await orderRef.update({ status: "cancelled" });
    return { success: true, message: "Pagamento cancelado com sucesso no Mercado Pago." };

  } catch (error) {
    console.error("Erro ao cancelar no MP:", error.response?.data || error.message);
    // Se o pagamento já expirou ou foi pago, o cancelamento pode falhar.
    // Mesmo assim, cancelamos no nosso sistema.
    await orderRef.update({ status: "cancelled" });
    const errorDetails = error.response?.data?.message || "Erro desconhecido";
    throw new functions.https.HttpsError("internal", `Falha no cancelamento MP: ${errorDetails}. Pedido cancelado no sistema.`);
  }
});


// ============================================================================
// 4. REEMBOLSAR PAGAMENTO NO MERCADO PAGO - CORRIGIDO
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
    throw new functions.https.HttpsError("failed-precondition", "ID de pagamento do Mercado Pago não encontrado.");
  }
  
  try {
    const refundPayload = amount ? { amount: parseFloat(amount) } : {};
    
    // O endpoint de reembolso é em /v1/payments/{id}/refunds
    await mercadoPagoApi.post(`/v1/payments/${paymentId}/refunds`, refundPayload, {
      headers: { "X-Idempotency-Key": `${firestoreOrderId}-refund-${Date.now()}` },
    });

    await orderRef.update({ paymentStatus: "refunded" });
    return { success: true, message: "Reembolso processado com sucesso pelo Mercado Pago." };

  } catch (error) {
    console.error("Erro ao reembolsar no MP:", error.response?.data || error.message);
    const errorDetails = error.response?.data?.message || "Erro desconhecido";
    throw new functions.https.HttpsError("internal", `Falha no reembolso: ${errorDetails}`);
  }
});
