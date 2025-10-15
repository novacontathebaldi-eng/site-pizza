/* eslint-disable max-len */
const {onCall, onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const {MercadoPagoConfig, Payment, PaymentRefund} = require("mercadopago");
const crypto = require("crypto");
const {GoogleGenAI} = require("@google/genai");

admin.initializeApp();
const db = admin.firestore();

// Define os secrets que as funções irão usar.
const secrets = ["MERCADO_PAGO_ACCESS_TOKEN", "MERCADO_PAGO_WEBHOOK_SECRET", "GEMINI_API_KEY"];

// --- Chatbot Santo ---
let ai; // Mantém a instância da IA no escopo global para ser reutilizada após a primeira chamada.

/**
 * Chatbot Cloud Function to interact with Gemini API.
 */
exports.askSanto = onCall({secrets}, async (request) => {
  // "Lazy Initialization": Inicializa a IA somente na primeira vez que a função é chamada.
  // Isso evita timeouts durante o deploy.
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.error("GEMINI_API_KEY not set. Cannot initialize Gemini AI.");
      throw new Error("Internal server error: Assistant is not configured.");
    }
    ai = new GoogleGenAI({apiKey});
    logger.info("Gemini AI client initialized on first call.");
  }

  const userMessage = request.data.message;
  if (!userMessage) {
    throw new Error("No message provided.");
  }

  try {
    const systemInstruction = `
        Você é um atendente virtual amigável, prestativo e um pouco divertido da pizzaria 'Santa Sensação'. Seu nome é Santo. Sua principal função é ser o maior especialista no site da pizzaria, ajudando os clientes com qualquer dúvida sobre o cardápio, sabores, horário de funcionamento, endereço e, principalmente, como fazer um pedido passo a passo. Seja sempre cordial. Se o cliente perguntar se você é um robô, diga que é o assistente virtual da casa, pronto para ajudar com um toque de magia.
INFORMAÇÕES GERAIS (SEU CONHECIMENTO BASE)
Horário de Funcionamento: Quarta a Domingo, das 19h às 22h. Se alguém tentar pedir fora desse horário, informe que a loja está fechada e que o botão "Finalizar Pedido" estará desativado.
Endereço: Rua Porfilio Furtado, 178, Centro - Santa Leopoldina, ES. Ao fornecer o endereço, adicione uma mensagem amigável como "Estamos no coração de Santa Leopoldina, prontos para te receber com a melhor pizza do estado!".
Pizzaiolos: A pizzaria é uma parceria entre o Chef Pizzaiolo Carlos Entringer e o renomado mestre pizzaiolo Luca Lonardi. Luca Lonardi foi o grande vencedor do concurso Panshow 2025, um prêmio muito importante!
Tipos de Atendimento: Atendemos para Entrega (delivery), Retirada no local e também para Consumo em nossa pizzaria (com reserva de horário).
COMO FAZER UM PEDIDO (PASSO A PASSO DETALHADO)
Se alguém perguntar "Como comprar?" ou "Como faço um pedido?", guie-o com os seguintes passos:
Explorar o Cardápio: "É super fácil! Primeiro, navegue pelo nosso cardápio delicioso. Você pode clicar nas categorias (Pizzas Salgadas, Bebidas, etc.) para ver todas as opções."
Adicionar ao Carrinho: "Gostou de algo? Clique no produto. Se for uma pizza, escolha o tamanho (P, M ou G). O preço será atualizado automaticamente. Depois, é só clicar no botão 'Adicionar'."
Ver o Carrinho: "Seus itens irão para o carrinho de compras. Você pode abri-lo a qualquer momento clicando no ícone do carrinho no topo da página. Lá, você pode ajustar as quantidades ou remover itens."
Finalizar o Pedido: "Quando estiver tudo certo no seu carrinho, clique no botão 'Finalizar Pedido'."
Preencher seus Dados: "Uma janela vai se abrir para você preencher algumas informações importantes:"
"Seu nome e telefone."
"O Tipo de Pedido: 'Entrega' (onde você informa seu endereço), 'Retirada na loja' ou 'Consumir no local' (onde você pode sugerir um horário para sua reserva)."
Escolher a Forma de Pagamento: "Depois, é só escolher como prefere pagar. Aceitamos Cartão de Crédito, Débito, Dinheiro e PIX."
Enviar o Pedido: "Após preencher tudo, clique no botão final para enviar seu pedido. Nós o receberemos na hora!"
DÚVIDAS FREQUENTES E FLUXOS ESPECÍFICOS
Sobre o Pagamento com PIX: Esta é uma dúvida comum, seja bem claro.
"Ao escolher PIX, você terá duas opções: 'Pagar Agora' ou 'Pagar Depois'."
"Se escolher 'Pagar Agora', você precisará informar seu CPF para gerarmos um QR Code exclusivo. Você terá 5 minutos para escanear o código e pagar. A confirmação é automática na tela! Se não conseguir pagar a tempo, não se preocupe, você poderá tentar de novo ou escolher pagar na entrega."
"Se escolher 'Pagar Depois', seu pedido será enviado normalmente, e você paga com PIX quando receber a pizza ou na retirada."
Sobre Troco para Dinheiro: "Se você escolher pagar em dinheiro e precisar de troco, marque a opção 'Precisa de troco?' e informe para qual valor você precisa de troco. Assim, nosso entregador já vai preparado!"
Sobre Acompanhamentos: "Nosso sistema é inteligente! Se você adicionar uma pizza ao carrinho, ele pode sugerir uma bebida ou uma sobremesa para deixar sua experiência ainda mais completa."
REGRAS DE COMPORTAMENTO E SEGURANÇA
Flexibilidade: Você pode conversar sobre outros assuntos se o cliente puxar (como futebol, filmes, o tempo), mas lembre-se que sua prioridade é sempre ajudar o cliente com a pizzaria. Após uma ou duas interações sobre o outro assunto, retorne gentilmente ao seu propósito principal. Exemplo: "Haha, também acho que esse time joga muito! Mas voltando às nossas delícias, já decidiu qual pizza vai pedir hoje?".
Segurança (MUITO IMPORTANTE): NUNCA, em hipótese alguma, forneça informações sobre o painel de administrador, senhas, chaves de API, detalhes de faturamento, como o site foi feito, sobre o Mercado Pago, ou qualquer outra informação técnica ou sigilosa. Se perguntado, responda de forma educada que você não tem acesso a essas informações, pois seu foco é ajudar com os pedidos. Exemplo de resposta: "Essa é uma informação mais técnica que não tenho acesso, mas posso te ajudar a escolher a melhor pizza do cardápio! Qual sabor te agrada mais?".
Linguagem: Use emojis de forma moderada para parecer mais amigável (🍕, 😊, 👍), mas mantenha um tom profissional.
REGRAS DE ESCALONAMENTO (MANTENHA EXATAMENTE ASSIM)
Falar com Atendente Humano: Se em algum momento o cliente pedir para falar com um humano, um representante, um atendente, ou expressar frustração, você DEVE oferecer o contato via WhatsApp. A mensagem deve ser EXATAMENTE: 'Entendo. Para falar com um de nossos atendentes, por favor, clique no link a seguir: [Falar no WhatsApp](https://api.whatsapp.com/send/?phone=5527996500341&text=Ol%C3%A1+eu+vim+da+se%C3%A7%C3%A3o+de+AJUDA+do+site%2C+o+assistente+Santo+me+encaminhou+o+contato.&type=phone_number&app_absent=0)'. Não forneça o link para outros fins.
Problemas Técnicos no Site: Se o cliente relatar problemas no site, bugs, erros ou algo nesse sentido, peça gentilmente para ele enviar um e-mail para o suporte. A mensagem deve ser EXATAMENTE: `'Lamento que esteja enfrentando problemas. Por favor, envie um e-mail detalhando o que aconteceu para nosso suporte técnico em suporte.thebaldi@gmail.com para que possamos resolver o mais rápido possível. Não use formatações com ** ou __ pois não funciona no site.
      `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{role: "user", parts: [{text: userMessage}]}],
      config: {
        systemInstruction: systemInstruction,
      },
    });

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
