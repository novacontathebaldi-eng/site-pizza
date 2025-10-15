/* eslint-disable max-len */
const {onCall, onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const {MercadoPagoConfig, Payment, PaymentRefund} = require("mercadopago");
const crypto = require("crypto");
const {GoogleGenAI, FunctionDeclaration, Type} = require("@google/genai");

admin.initializeApp();
const db = admin.firestore();

// Define os secrets que as funções irão usar.
const secrets = ["MERCADO_PAGO_ACCESS_TOKEN", "MERCADO_PAGO_WEBHOOK_SECRET", "GEMINI_API_KEY"];

// --- Chatbot Santo ---
let ai; // Mantém a instância da IA no escopo global para ser reutilizada após a primeira chamada.

const encaminharParaWhatsAppTool = {
  functionDeclarations: [
    {
      name: "encaminharParaWhatsApp",
      description: "Encaminha o cliente para o atendimento humano via WhatsApp com um resumo da conversa.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          resumoDaConversa: {
            type: Type.STRING,
            description: "Um resumo conciso do problema ou da solicitação do cliente para pré-preencher na mensagem do WhatsApp.",
          },
        },
        required: ["resumoDaConversa"],
      },
    },
  ],
};

/**
 * Chatbot Cloud Function to interact with Gemini API.
 */
exports.askSanto = onCall({secrets}, async (request) => {
  // "Lazy Initialization"
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.error("GEMINI_API_KEY not set. Cannot initialize Gemini AI.");
      throw new Error("Internal server error: Assistant is not configured.");
    }
    ai = new GoogleGenAI({apiKey});
    logger.info("Gemini AI client initialized on first call.");
  }

  const conversationHistory = request.data.history;
  if (!conversationHistory || conversationHistory.length === 0) {
    throw new Error("No conversation history provided.");
  }

  const contents = conversationHistory.map((message) => ({
    role: message.role === "bot" ? "model" : "user",
    parts: [{text: message.content}],
  }));

  try {
    const systemInstruction = `
    Você é "Sensação", o assistente virtual da pizzaria 'Santa Sensação'. Sua personalidade é amigável, eficiente e sofisticada. Sua missão é ser o maior especialista no site da pizzaria, ajudando os clientes de forma clara e objetiva. Você se chama "Sensação".

    **REGRAS DE COMPORTAMENTO FUNDAMENTAIS:**
    1.  **Objetividade e Detalhe:** Seja conciso e direto ao ponto. Se o cliente pedir mais detalhes, forneça explicações aprofundadas.
    2.  **Adaptação ao Público:** Adapte sua linguagem. Se a conversa for com alguém com dificuldade em tecnologia, seja simples e guie-o passo a passo.
    3.  **Foco Principal:** Seu domínio é o site. Se o cliente desviar do assunto, responda brevemente e retorne ao foco.
    4.  **Segurança (MUITO IMPORTANTE):** NUNCA forneça informações técnicas (código, APIs, senhas, Mercado Pago, etc). Se perguntado, responda educadamente: "Essa é uma informação técnica que não tenho acesso, mas posso te ajudar com o cardápio!".

    **INFORMAÇÕES GERAIS:**
    - **Horário:** Quarta a Domingo, das 19h às 22h.
    - **Endereço:** Rua Porfilio Furtado, 178, Centro - Santa Leopoldina, ES.
    - **História:** Parceria entre Chef Carlos Entringer e mestre pizzaiolo Luca Lonardi, vencedor do Panshow 2025.
    - **Pedidos:** Entrega (delivery), Retirada e Consumo no local (com reserva).

    **GUIAS RÁPIDOS:**
    - **Como Pedir:** 1. Navegar no cardápio. 2. Add ao carrinho. 3. Finalizar Pedido. 4. Preencher dados. 5. Pagar e enviar.
    - **PIX:** Opções "Pagar Agora" (com CPF, gera QR Code na hora) e "Pagar Depois" (paga na entrega/retirada).
    - **Troco:** Mencione a opção "Precisa de troco?" ao escolher pagamento em dinheiro.

    **--- USO DE FERRAMENTAS ---**
    **REGRA ABSOLUTA PARA ATENDIMENTO HUMANO:**
    1.  **SE** um cliente pedir para falar com um atendente, um humano, ou expressar frustração, sua **ÚNICA AÇÃO** deve ser chamar a ferramenta \`encaminharParaWhatsApp\`.
    2.  Crie um resumo inteligente e conciso da conversa (máximo 15 palavras) para o argumento \`resumoDaConversa\`.
    3.  **NÃO GERE NENHUM OUTRO TEXTO.** Não diga que está encaminhando, não peça para aguardar. Apenas chame a ferramenta. O sistema cuidará da mensagem para o cliente.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      },
      tools: [encaminharParaWhatsAppTool],
    });
    
    if (response.functionCalls && response.functionCalls.length > 0) {
      const functionCall = response.functionCalls[0];

      if (functionCall.name === "encaminharParaWhatsApp") {
        const resumo = functionCall.args.resumoDaConversa || "Preciso de ajuda.";
        const numero = "5527996500341";
        const mensagemPreEscrita = `Olá! Vim do site após conversar com o assistente Sensação. ${resumo}`;
        
        const whatsappUrl = `https://wa.me/${numero}?text=${encodeURIComponent(mensagemPreEscrita)}`;
        
        const replyText = `Compreendo. Para que possamos te atender da melhor forma, estou te encaminhando para um de nossos atendentes.\n\nPor favor, clique no link abaixo para continuar no WhatsApp:\n\n[Continuar o atendimento pelo WhatsApp](${whatsappUrl})`;

        return {reply: replyText};
      }
    }

    // Se a IA não usou a ferramenta, apenas retorne a resposta de texto normal.
    return {reply: response.text};
  } catch (error) {
    logger.error("Error calling Gemini API:", error);
    throw new Error("Failed to get a response from the assistant.");
  }
});


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

    // FIX: Use process.env.FUNCTION_REGION which is a standard populated env var for v2 functions.
    const region = process.env.FUNCTION_REGION || "us-central1";
    const notificationUrl = `https://${region}-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/mercadoPagoWebhook`;
    logger.info(`Usando a URL de notificação: ${notificationUrl}`);

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