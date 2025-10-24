/* eslint-disable max-len */
const {onCall, onRequest} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onDocumentUpdated} = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const crypto = require("crypto");
const {GoogleGenAI} = require("@google/genai");
const {OAuth2Client} = require("google-auth-library");

admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();

// Define os secrets que as funções irão usar.
const secrets = ["GEMINI_API_KEY", "GOOGLE_CLIENT_ID"];

// --- Reusable function to check and set store status based on schedule ---
const runStoreStatusCheck = async () => {
  logger.info("Executando verificação de horário da loja...");

  const settingsRef = db.doc("store_config/site_settings");
  const statusRef = db.doc("store_config/status");

  try {
    const settingsDoc = await settingsRef.get();
    if (!settingsDoc.exists) {
      logger.warn("Documento de configurações do site não encontrado.");
      return;
    }

    const settings = settingsDoc.data();
    if (!settings.automaticSchedulingEnabled || !settings.operatingHours) {
      logger.info("Agendamento automático desativado. Nenhuma ação tomada pela verificação.");
      return;
    }

    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const getPart = (type) => parts.find((p) => p.type === type)?.value;

    let hour = getPart("hour");
    if (hour === "24") {
      hour = "00";
    }
    const currentTime = `${hour}:${getPart("minute")}`;

    const dayName = getPart("weekday");
    const dayOfWeekMap = {Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6};
    const dayOfWeek = dayOfWeekMap[dayName];

    const todaySchedule = settings.operatingHours.find((d) => d.dayOfWeek === dayOfWeek);

    let shouldBeOpen = false;
    if (todaySchedule && todaySchedule.isOpen) {
      if (currentTime >= todaySchedule.openTime && currentTime < todaySchedule.closeTime) {
        shouldBeOpen = true;
      }
    }

    const statusDoc = await statusRef.get();
    const currentStatus = statusDoc.exists ? statusDoc.data().isOpen : !shouldBeOpen;

    if (currentStatus !== shouldBeOpen) {
      await statusRef.set({isOpen: shouldBeOpen});
      logger.info(`Status da loja atualizado para: ${shouldBeOpen ? "ABERTA" : "FECHADA"}`);
    } else {
      logger.info(`Status da loja já está correto. Nenhuma atualização necessária. Atualmente: ${currentStatus ? "ABERTA" : "FECHADA"}`);
    }
  } catch (error) {
    logger.error("Erro ao executar a verificação de status da loja:", error);
  }
};


// --- Scheduled Function for Automatic Store Status ---
exports.updateStoreStatusBySchedule = onSchedule({
  schedule: "every 5 minutes",
  timeZone: "America/Sao_Paulo",
}, async (event) => {
  await runStoreStatusCheck();
});

// --- Firestore Trigger to run status check when automatic scheduling is enabled ---
exports.onSettingsChange = onDocumentUpdated("store_config/site_settings", async (event) => {
  const beforeData = event.data.before.data();
  const afterData = event.data.after.data();

  const wasEnabled = beforeData.automaticSchedulingEnabled === true;
  const isEnabled = afterData.automaticSchedulingEnabled === true;

  // Trigger the check only when the feature is toggled from OFF to ON.
  if (!wasEnabled && isEnabled) {
    logger.info("Agendamento automático foi ativado. Acionando verificação de status imediata.");
    await runStoreStatusCheck();
  }
});


// --- Chatbot Sensação ---
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

  // 1. Recebemos o histórico da conversa (que veio do frontend)
  const conversationHistory = request.data.history;
  if (!conversationHistory || conversationHistory.length === 0) {
    throw new Error("No conversation history provided.");
  }

  // 2. Formatamos o histórico para o formato que a API do Gemini espera.
  // A API espera um array de objetos { role: 'user'|'model', parts: [{ text: '...' }] }
  // O papel do nosso bot ('bot') é traduzido para 'model' para a API.
  const contents = conversationHistory.map((message) => ({
    role: message.role === "bot" ? "model" : "user",
    parts: [{text: message.content}],
  }));

  try {
    const now = new Date();
    const brasiliaTime = now.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const timeInstruction = `INFORMAÇÃO DE CONTEXTO EM TEMPO REAL: A data e hora atual em Brasília são: ${brasiliaTime}. Use esta informação para responder sobre horários de funcionamento e disponibilidade.`;

    const systemInstruction = `${timeInstruction}\n
        OBJETIVO PRINCIPAL: Você é Sensação, o assistente virtual da pizzaria 'Santa Sensação'. Seja amigável, prestativo e um pouco divertido. Sua principal regra é ser CONCISO. Dê respostas curtas e diretas. Só forneça detalhes ou passo a passo se o cliente pedir. Não se apresente, apenas continue a conversa. Use negrito com asteriscos duplos (**texto**).

INFORMAÇÕES ESSENCIAIS:
- Horário: Quarta a Domingo, das 19h às 22h. Fora desse horário, a loja está fechada.
- Endereço: Rua Porfilio Furtado, 178, Centro - Santa Leopoldina, ES.
- Entrega (Taxa R$ 3,00): Atendemos Olaria, Funil, Cocal, Vila Nova, Centro e Moxafongo. Se houver dúvida sobre um endereço, peça ao cliente para confirmar via WhatsApp.
- Pizzaiolos: Carlos Entringer e o mestre Luca Lonardi (vencedor do Panshow 2025).
- Gerente: Patrícia Carvalho.
- Atendimento: Delivery, Retirada e Consumo no local (com ou sem reserva).

CARDÁPIO E PREÇOS:
Você deve saber todos os produtos e seus preços de cor.

**PIZZAS SALGADAS:**
Tamanhos: M (6 fatias), G (8 fatias).
- **Santa Sensação (lombinho):** M R$ 50,00 | G R$ 62,00.
- **Rio Bonito (Margherita):** M R$ 42,00 | G R$ 54,00.
- **Luxemburgo (Calabresa):** M R$ 45,00 | G R$ 57,00.
- **Caioaba (Doritos):** M R$ 48,00 | G R$ 58,00.
- **Barra de Mangarai (Portuguesa):** M R$ 50,00 | G R$ 62,00.
- **Holanda (Frango/bacon):** M R$ 50,00 | G R$ 62,00.
- **Meia Légua (mista 1):** M R$ 52,00 | G R$ 64,00.
- **Colina verde (Catubresa) NOVA:** M R$ 57,00 | G R$ 69,00.
- **Caramuru (Frango catupiry):** M R$ 60,00 | G R$ 72,00.
- **Califórnia (4 queijos):** M R$ 60,00 | G R$ 72,00.
- **Tirol (File mignon):** M R$ 65,00 | G R$ 77,00.
- **Bragança (bacalhau):** M R$ 67,00 | G R$ 79,00.
- **Encantado (costela de boi):** M R$ 69,00 | G R$ 80,00.
- **Suiça (Camarão):** M R$ 70,00 | G R$ 82,00.

**PIZZAS DOCES:**
Tamanhos: M (6 fatias), G (8 fatias).
- **Chaves (banana):** M R$ 40,00 | G R$ 50,00.
- **Rio da Prata (Romeu e Julieta):** M R$ 45,00 | G R$ 55,00.

**CALZONES:**
- **Calzone Calabresa:** Único R$ 27,00.
- **Calzone Frango:** Único R$ 29,00.
- **Calzone Portuguesa:** Único R$ 29,00.

**BEBIDAS:**
- **Água com gás:** R$ 4,00.
- **Coca-Cola 350ml:** R$ 7,00.
- **Coca-Cola Zero 350ml:** R$ 7,00.
- **Guaraná Antártica 350ml:** R$ 7,00.
- **Fanta Uva 350ml:** R$ 7,00.
- **Cerveja Amstel (Latão):** R$ 8,00.
- **Coca-Cola 600ml:** R$ 9,00.
- **Heineken long neck:** R$ 10,00.
- **Guaraná Antártica 2L:** R$ 14,00.
- **Coca-Cola Zero 1,5L:** R$ 14,00.
- **Coca-Cola 2L:** R$ 16,00.

REGRAS ESPECIAIS DE PEDIDO:
- **Pizza Meio a Meio:** É possível montar uma pizza com dois sabores (metade/metade). O valor final será sempre o da pizza mais cara entre as duas metades.
- **Tamanhos de Pizza:** Nossas pizzas estão disponíveis nos tamanhos **M (6 fatias)** e **G (8 fatias)**. Não temos outros tamanhos.

**REGRA GERAL PARA LINKS DO WHATSAPP (MUITO IMPORTANTE):**
Sempre que você precisar gerar um link para o WhatsApp, use o formato Markdown: '[Texto para o Cliente Clicar](URL completa e codificada)'. Nunca mostre a URL diretamente para o cliente.
- **Exemplo para Pedido:** '[Clique aqui para confirmar seu pedido no WhatsApp!](https://wa.me/5527996500341?text=...)'
- **Exemplo para Reserva:** '[Clique aqui para enviar sua solicitação de reserva no WhatsApp!](https://wa.me/5527996500341?text=...)'
- **Exemplo para Atendimento:** '[Conversar com um atendente pelo WhatsApp](https://wa.me/5527996500341?text=...)'

FLUXO DE PEDIDO PELO WHATSAPP:
Se o cliente quiser fazer o pedido com você, siga estes passos:
1.  **Pergunte todos os dados necessários UM DE CADA VEZ:** Nome, Telefone, Itens (tamanho, se é meio a meio), Tipo de Pedido (Entrega ou Retirada).
2.  **Se for Entrega:** Pergunte a Localidade, a Rua e o Número.
3.  **Pergunte a Forma de Pagamento** (PIX, Dinheiro, Cartão).
4.  **Calcule o Total:** Some os itens e adicione R$ 3,00 de taxa de entrega se for 'Entrega'.
5.  **Monte a Mensagem:** Use o 'MODELO DA MENSAGEM DO WHATSAPP (PEDIDO)'.
6.  **Gere o Link:** Crie a URL do WhatsApp e apresente-a usando o formato Markdown. O texto do link deve ser **'Clique aqui para confirmar seu pedido no WhatsApp!'**.

FLUXO DE RESERVA PELO WHATSAPP:
Se o cliente quiser fazer uma reserva:
1.  **Pergunte os dados UM DE CADA VEZ:** Nome, Telefone, Quantidade de pessoas, Data e Horário.
2.  **Lembretes:** A reserva deve ser em nosso horário de funcionamento (Quarta a Domingo, 19h-22h).
3.  **Monte a Mensagem:** Use o 'MODELO DA MENSAGEM DO WHATSAPP (RESERVA)'.
4.  **Gere o Link:** Crie a URL do WhatsApp e apresente-a usando o formato Markdown. O texto do link deve ser **'Clique aqui para enviar sua solicitação de reserva no WhatsApp!'**.

**MODELO DA MENSAGEM DO WHATSAPP (PEDIDO):**
*   NOVO PEDIDO - SANTA SENSAÇÃO  *

*  DADOS DO CLIENTE:*
*Nome:* {Nome do Cliente}
*Telefone:* {Telefone do Cliente}
*Tipo de Pedido:* {Entrega ou Retirada}

*  ENDEREÇO DE ENTREGA:*
*Localidade:* {Localidade}
*Rua:* {Rua}
*Número:* {Número}

*  ITENS DO PEDIDO:*
• {Quantidade}x {Nome do Item} ({Tamanho}) - R$ {Preço}
(Para meio a meio, use: 'Meio a Meio: {Sabor 1} / {Sabor 2} ({Tamanho}) - R$ {Preço}')

*  RESUMO FINANCEIRO:*
*Subtotal:* R$ {Subtotal}
*Taxa de Entrega:* R$ {Taxa}
*  TOTAL: R$ {Total}*

*  PAGAMENTO:*
*Forma:* {Forma de Pagamento}

O Sensação gerou este *pedido* pelo nosso site: *santasensacao.me*

**MODELO DA MENSAGEM DO WHATSAPP (RESERVA):**
*  📅 NOVA RESERVA - SANTA SENSAÇÃO 📅  *

*  DADOS DA RESERVA:*
*Nome:* {Nome do Cliente}
*Telefone:* {Telefone do Cliente}
*Quantidade de Pessoas:* {Número de Pessoas}
*Data:* {Data da Reserva}
*Horário:* {Horário da Reserva}

O Sensação gerou esta *solicitação de reserva* pelo nosso site: *santasensacao.me*

REGRAS DE ESCALONAMENTO E SEGURANÇA:
1.  **NUNCA FORNEÇA DADOS SENSÍVEIS:** Jamais compartilhe informações sobre painel admin, senhas, APIs, ou qualquer detalhe técnico. Se perguntado, diga educadamente que não tem acesso a essas informações.
2.  **FALAR COM ATENDENTE/SUPORTE:** Se o cliente pedir para falar com um humano, relatar um bug, ou estiver frustrado, ofereça contato via WhatsApp.
    - **Para pedidos e dúvidas gerais**, use o número do restaurante: '5527996500341'.
    - **Para problemas técnicos no site**, pergunte se ele prefere falar com o Restaurante ou com o Suporte Técnico ('5527996670426').
    - **Sempre gere o link no formato Markdown:** '[Conversar com um atendente pelo WhatsApp](URL_gerada)'.
    - **Estrutura da Mensagem:**
        - L1: 'Olá! Eu estava no site e o assistente Sensação me encaminhou para o WhatsApp.'
        - L2: 'Resumo: {frase resumida com o objetivo principal do cliente e detalhes importantes}'`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      // 3. Enviamos o histórico completo para a API
      contents: contents,
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
 * Verifies a Google ID token, creates or updates a Firebase user,
 * and returns a custom token for session authentication.
 */
exports.verifyGoogleToken = onCall({secrets}, async (request) => {
  const {idToken} = request.data;
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!idToken) {
    throw new onCall.HttpsError("invalid-argument", "The function must be called with an idToken.");
  }
  if (!clientId) {
    logger.error("GOOGLE_CLIENT_ID not set.");
    throw new onCall.HttpsError("internal", "Authentication is not configured correctly.");
  }

  const client = new OAuth2Client(clientId);

  try {
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: clientId,
    });
    const payload = ticket.getPayload();

    if (!payload) {
      throw new onCall.HttpsError("unauthenticated", "Invalid ID token.");
    }

    const {sub: googleUid, email, name, picture} = payload;
    // We create a unique UID for Firebase Auth based on the Google UID
    const uid = `google:${googleUid}`;
    let isNewUser = false;

    // Update or create user in Firebase Auth
    try {
      await admin.auth().updateUser(uid, {
        email: email,
        displayName: name,
        photoURL: picture,
      });
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        isNewUser = true;
        await admin.auth().createUser({
          uid: uid,
          email: email,
          displayName: name,
          photoURL: picture,
        });
      } else {
        throw error; // Re-throw other errors
      }
    }

    // Create or update user profile in Firestore 'users' collection
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    // Create profile in Firestore only if it doesn't exist
    if (isNewUser || !userDoc.exists) {
      await userRef.set({
        name,
        email,
        photoURL: picture,
        addresses: [], // Initialize with empty addresses
      }, {merge: true});
    }

    // Create a custom token for the Firebase user
    const customToken = await admin.auth().createCustomToken(uid);
    return {customToken};
  } catch (error) {
    logger.error("Error verifying Google token:", error);
    throw new onCall.HttpsError("unauthenticated", "Token verification failed.", error.message);
  }
});


/**
 * Creates an order in Firestore.
 */
exports.createOrder = onCall({secrets}, async (request) => {
  const {details, cart, total} = request.data;
  const userId = request.auth?.uid || null;

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
  const orderStatus = "pending";

  const orderData = {
    userId, // Associate order with user if logged in
    orderNumber,
    customer: {
      name: details.name,
      phone: details.phone,
      orderType: details.orderType,
      neighborhood: details.neighborhood || "",
      street: details.street || "",
      number: details.number || "",
      complement: details.complement || "",
    },
    items: cart,
    total,
    deliveryFee: details.deliveryFee || 0,
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

  // 5. Return order info
  return {orderId, orderNumber};
});

// FIX: Added the missing `createReservation` Cloud Function.
// This function handles the creation of reservations, which are stored as a special type of order.
// It generates an atomic order number and saves the reservation details to Firestore.
/**
 * Creates a reservation (as an order) in Firestore.
 */
exports.createReservation = onCall({secrets}, async (request) => {
  const {details} = request.data;
  const userId = request.auth?.uid || null;

  // 1. Validate input
  if (!details || !details.name || !details.phone || !details.reservationDate || !details.reservationTime || !details.numberOfPeople) {
    throw new Error("Dados da reserva incompletos.");
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

  // 3. Prepare reservation data for Firestore (as an Order)
  const orderData = {
    userId,
    orderNumber,
    customer: {
      name: details.name,
      phone: details.phone,
      orderType: "local",
      reservationDate: details.reservationDate,
      reservationTime: details.reservationTime,
    },
    numberOfPeople: details.numberOfPeople,
    notes: details.notes || "",
    status: "pending",
    paymentStatus: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // 4. Create the order document
  const orderRef = await db.collection("orders").add(orderData);
  const orderId = orderRef.id;
  logger.info(`Reserva #${orderNumber} (ID: ${orderId}) criada no Firestore.`);

  // 5. Return order info
  return {orderId, orderNumber};
});


/**
 * Manages user profile picture upload and removal securely.
 */
exports.manageProfilePicture = onCall({secrets}, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new onCall.HttpsError("unauthenticated", "A função deve ser chamada por um usuário autenticado.");
  }

  const {imageBase64} = request.data;
  const bucket = storage.bucket();
  const filePath = `user-profiles/${uid}/profile.jpg`;
  const file = bucket.file(filePath);

  // Case 1: Remove photo (imageBase64 is null)
  if (imageBase64 === null) {
    try {
      await file.delete({ignoreNotFound: true});
      await admin.auth().updateUser(uid, {photoURL: null});
      await db.collection("users").doc(uid).update({photoURL: null});
      logger.info(`Foto de perfil removida para o usuário: ${uid}`);
      return {success: true, photoURL: null};
    } catch (error) {
      logger.error(`Falha ao remover a foto de perfil para ${uid}:`, error);
      throw new onCall.HttpsError("internal", "Não foi possível remover a foto de perfil.");
    }
  }

  // Case 2: Upload/update photo (imageBase64 is a string)
  if (typeof imageBase64 === "string") {
    try {
      const matches = imageBase64.match(/^data:(image\/[a-z]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new onCall.HttpsError("invalid-argument", "Formato de imagem base64 inválido.");
      }
      const mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");

      // Upload the file and make it public
      await file.save(buffer, {
        metadata: {contentType: mimeType},
        public: true,
      });

      const publicUrl = file.publicUrl();
      // Appending a timestamp as a query parameter to act as a cache buster.
      // This ensures the browser always fetches the latest version of the profile picture.
      const photoURL = `${publicUrl}?t=${new Date().getTime()}`;

      // Update Firebase Auth and Firestore user records
      await admin.auth().updateUser(uid, {photoURL});
      await db.collection("users").doc(uid).update({photoURL});

      logger.info(`Foto de perfil atualizada para o usuário: ${uid}`);
      return {success: true, photoURL};
    } catch (error) {
      logger.error(`Falha ao atualizar a foto de perfil para ${uid}:`, error);
      throw new onCall.HttpsError("internal", "Não foi possível salvar a nova foto de perfil.");
    }
  }

  throw new onCall.HttpsError("invalid-argument", "Payload inválido para gerenciar foto de perfil.");
});

/**
 * Associates guest orders with a user account after login.
 */
exports.syncGuestOrders = onCall({secrets}, async (request) => {
  // 1. Check for authentication
  const uid = request.auth?.uid;
  if (!uid) {
    logger.error("syncGuestOrders foi chamada sem autenticação.");
    throw new onCall.HttpsError(
        "unauthenticated",
        "A função deve ser chamada por um usuário autenticado.",
    );
  }

  // 2. Validate input
  const {orderIds} = request.data;
  if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
    logger.warn(`syncGuestOrders foi chamada com orderIds inválido para o usuário ${uid}.`);
    throw new onCall.HttpsError(
        "invalid-argument",
        "A função deve ser chamada com um array de IDs de pedidos.",
    );
  }

  // 3. Perform the update
  try {
    const batch = db.batch();
    // A regra de segurança do Firestore irá garantir que um usuário só pode "reivindicar"
    // um pedido que ainda não tem um 'userId'.
    orderIds.forEach((orderId) => {
      if (typeof orderId === "string" && orderId.length > 0) {
        const orderRef = db.collection("orders").doc(orderId);
        batch.update(orderRef, {userId: uid});
      }
    });

    await batch.commit();
    logger.info(`[Sucesso] ${orderIds.length} pedido(s) associado(s) ao usuário ${uid}.`);
    return {success: true, message: "Pedidos associados com sucesso."};
  } catch (error) {
    logger.error(`[Falha] Erro ao associar pedidos para o usuário ${uid}:`, error);
    throw new onCall.HttpsError(
        "internal",
        "Ocorreu um erro ao associar seus pedidos.",
        error.message,
    );
  }
});
