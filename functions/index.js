/* eslint-disable max-len */
const {onCall, onRequest} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onDocumentUpdated} = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const crypto = require("crypto");
const {OAuth2Client} = require("google-auth-library");

admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();

// Define os secrets que as funções irão usar.
const secrets = ["HF_TOKEN", "GOOGLE_CLIENT_ID"];

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


/**
 * Formats the menu data into a string for the AI prompt.
 * @param {object} menuData - Object containing categories and products.
 * @return {string} A formatted string of the current menu.
 */
function generateMenuPrompt(menuData) {
  if (!menuData || !menuData.categories || !menuData.products) {
    return "CARDÁPIO INDISPONÍVEL NO MOMENTO.";
  }

  const {categories, products} = menuData;
  let menuString = "CARDÁPIO E PREÇOS ATUALIZADOS:\nVocê deve usar SOMENTE este cardápio para responder sobre produtos, preços e criar pedidos. Ignore qualquer conhecimento prévio.\n\n";

  categories.forEach((category) => {
    const categoryProducts = products.filter((p) => p.categoryId === category.id);
    if (categoryProducts.length > 0) {
      menuString += `**${category.name.toUpperCase()}**\n`;
      categoryProducts.forEach((product) => {
        const isOutOfStock = product.stockStatus === "out_of_stock";
        const availability = isOutOfStock ? " (ESGOTADO)" : "";

        menuString += `- **${product.name} (id: '${product.id}')${availability}:** ${product.description}\n`;

        const prices = product.prices || {};
        const promoPrices = product.promotionalPrices || {};
        const isPromotion = product.isPromotion && Object.keys(promoPrices).length > 0;

        const priceStrings = Object.keys(prices).map((size) => {
          const regularPrice = prices[size];
          const promoPrice = isPromotion ? promoPrices[size] : null;

          if (promoPrice && promoPrice > 0) {
            return `${size} de R$${regularPrice.toFixed(2)} por **R$${promoPrice.toFixed(2)}**`;
          } else {
            return `${size} R$${regularPrice.toFixed(2)}`;
          }
        });
        if (priceStrings.length > 0) {
          menuString += `  - Preços: ${priceStrings.join(" | ")}\n`;
        }
      });
      menuString += "\n";
    }
  });

  return menuString;
}


/**
 * Formats the operating hours data into a user-friendly, grouped string.
 * @param {Array<object>} operatingHours - Array of operating hour objects.
 * @return {string} A formatted string of the operating hours.
 */
function formatOperatingHours(operatingHours) {
  if (!operatingHours?.length) {
    return "Não informado.";
  }

  const openSchedules = operatingHours.filter((h) => h.isOpen);
  if (openSchedules.length === 0) {
    return "Fechado todos os dias.";
  }

  const schedulesByTime = openSchedules.reduce((acc, schedule) => {
    const timeKey = `${schedule.openTime}-${schedule.closeTime}`;
    if (!acc[timeKey]) acc[timeKey] = [];
    acc[timeKey].push(schedule);
    return acc;
  }, {});

  const result = [];

  for (const timeKey in schedulesByTime) {
    const schedules = schedulesByTime[timeKey].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    if (schedules.length === 0) continue;

    let dayString;
    if (schedules.length === 7) {
      dayString = "Todos os dias";
    } else {
      const sequences = [];
      if (schedules.length > 0) {
        let currentSequence = [schedules[0]];
        for (let i = 1; i < schedules.length; i++) {
          if (schedules[i].dayOfWeek === schedules[i - 1].dayOfWeek + 1) {
            currentSequence.push(schedules[i]);
          } else {
            sequences.push(currentSequence);
            currentSequence = [schedules[i]];
          }
        }
        sequences.push(currentSequence);
      }

      if (sequences.length > 1 && sequences[0][0].dayOfWeek === 0 && schedules[schedules.length - 1].dayOfWeek === 6) {
        const firstSeq = sequences.shift();
        sequences[sequences.length - 1].push(...firstSeq);
      }

      const formattedSequences = sequences.map((seq) => {
        if (seq.length === 1) return seq[0].dayName;
        if (seq.length === 2) return `${seq[0].dayName} e ${seq[1].dayName}`;
        return `De ${seq[0].dayName} a ${seq[seq.length - 1].dayName}`;
      });
      dayString = formattedSequences.join(" e ");
    }

    const [openTime, closeTime] = timeKey.split("-");
    result.push({
      days: dayString,
      time: `das ${openTime}h às ${closeTime}h`,
    });
  }

  if (result.length === 0) {
    return "Fechado todos os dias.";
  }

  return result.map((group) => `${group.days}, ${group.time}`).join(" | ");
}


// --- Chatbot Sensação (com Hugging Face) ---
exports.askSanto = onCall({secrets}, async (request) => {
  const hfToken = process.env.HF_TOKEN;
  if (!hfToken) {
    logger.error("HF_TOKEN não configurado. Não é possível inicializar o assistente.");
    throw new Error("Erro interno do servidor: Assistente não configurado.");
  }

  const {history: conversationHistory, menuData, storeStatus, userProfile, myOrders} = request.data;
  if (!conversationHistory || conversationHistory.length === 0) {
    throw new Error("Nenhum histórico de conversa fornecido.");
  }

  try {
    const {isOnline, operatingHours} = storeStatus || {isOnline: true, operatingHours: []};
    const storeStatusText = isOnline ? "Aberta" : "Fechada";
    const operatingHoursText = formatOperatingHours(operatingHours);

    // Get current time in Brasília for context
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const formattedTime = formatter.format(now);
    const realTimeInfo = `INFORMAÇÕES DE HORA ATUAL: Agora é ${formattedTime} (horário de Brasília). Use isso para saudações contextuais (bom dia, boa noite), mas LEMBRE-SE: a regra para criar pedidos depende SOMENTE do "Status da Loja", não da hora atual.`;

    const realTimeStatusInstruction = `INFORMAÇÕES DE STATUS EM TEMPO REAL (FONTE PRIMÁRIA DE VERDADE):
- Status da Loja: **${storeStatusText}**
- Horário de Funcionamento Configurado: **${operatingHoursText}**

Use ESTAS informações como a única fonte de verdade sobre o status e horário da loja. IGNORE quaisquer outros horários mencionados neste prompt.`;

    let userContextPrompt = "";
    if (userProfile) {
      const simplifiedOrders = (myOrders || []).slice(0, 10).map((o) => ({
        orderNumber: o.orderNumber,
        createdAt: o.createdAt,
        items: o.items ? o.items.map((i) => `${i.quantity}x ${i.name} (${i.size})`).join(", ") : "Reserva",
        total: o.total,
        status: o.status,
      }));

      userContextPrompt = `\n\nDADOS DO USUÁRIO LOGADO (FONTE PRIMÁRIA DE VERDADE):
- Nome: ${userProfile.name}
- Telefone: ${userProfile.phone || "Não informado"}
- Endereços Salvos: ${JSON.stringify(userProfile.addresses || [])}

HISTÓRICO DE PEDIDOS RECENTES (use para repetir pedidos):\n${JSON.stringify(simplifiedOrders)}\n`;
    }

    const dynamicMenuPrompt = generateMenuPrompt(menuData);

    const systemInstruction = `${realTimeInfo}\n\n${realTimeStatusInstruction}\n
        ${userContextPrompt}

        OBJETIVO PRINCIPAL: Você é Sensação, o assistente virtual da pizzaria 'Santa Sensação'. Seja amigável, prestativo e um pouco divertido. Sua principal regra é ser CONCISO. Dê respostas curtas e diretas. Só forneça detalhes ou passo a passo se o cliente pedir. Não se apresente, pois já é apresentado no inico, mas se o cliente pedir você pode, no geral, apenas continue a conversa. Use negrito com asteriscos duplos (**texto**).

SUAS CAPACIDADES:
- Apresentar o cardápio e os preços.
- Responder a perguntas sobre a pizzaria (horário, endereço, etc.).
- Criar pedidos de delivery e retirada diretamente pelo chat.
- Criar solicitações de reserva diretamente pelo chat.
- Encaminhar para um atendente humano se necessário.

INFORMAÇÕES ESSENCIAIS:
- Endereço: Rua Porfilio Furtado, 178, Centro - Santa Leopoldina, ES.
- Entrega (Taxa R$ 3,00): Atendemos Olaria, Funil, Cocal, Vila Nova, Centro e Moxafongo. Se o cliente solicitar mais detalhes sobre as áreas de entregas, saiba que Na olaria entregamos até a piscina. Para o lado do funil, subindo pra Santa Maria de Jetibá, entregamos até aquelas primeiras casas depois da ponte do funil. No cocal entregamos até aquelas primeiras casas depois de onde tá construindo a nova escola municipal. Mas ainda assim se houver dúvida sobre um endereço, peça ao cliente para confirmar via WhatsApp.
- PIX: A chave PIX é o CNPJ: 62.247.199/0001-04. O cliente deve enviar o comprovante pelo WhatsApp após o pagamento.
- Pizzaiolos: Carlos Entringer e o mestre Luca Lonardi (vencedor do Panshow 2025).
- Gerente: Patrícia Carvalho.
- Atendimento: Delivery, Retirada e Consumo no local (com ou sem reserva).

REGRAS DE HORÁRIO E STATUS (MAIS IMPORTANTES):
- A sua fonte de verdade sobre se a loja está ABERTA ou FECHADA é o "Status da Loja" em tempo real.
- Para informar os horários de funcionamento, use SEMPRE a informação de "Horário de Funcionamento Configurado".
- Você SÓ PODE criar um pedido se o "Status da Loja" for "Aberta". Se estiver "Fechada", informe o cliente sobre o horário de funcionamento.
- Você pode criar reservas a qualquer momento, mas informe ao cliente que elas são para os horários de funcionamento.
- De 00:00 até 05:00 você não deve encaminhar para um atendente pois está, mas você pode passar o email: suporte.thebaldi@gmail.com.
- Nos horários em que a pizzaria está fechada vcoê deve ajudar o cliente em qualquer solicitação ou suporte, se a loja estiver fechada você pode ser flexivel para falar de outros assuntos com o cliente se ele puxar papo sobre outras coisas, futebol, atualidades, música, história, etc...
 
REGRAS DE PREÇO E DISPONIBILIDADE:
- Ao informar um preço, SEMPRE use o preço promocional se ele existir e for maior que zero. Caso contrário, use o preço normal.
- NUNCA ofereça um produto que está marcado como (ESGOTADO) no cardápio. Informe ao cliente que o item não está disponível no momento.

REGRAS ESPECIAIS DE PEDIDO:
- **Pizza Meia a Meio:** É possível montar uma pizza com dois sabores (metade/metade). O valor final será sempre o da pizza mais cara entre as duas metades.
- **Tamanhos de Pizza:** Nossas pizzas estão disponíveis nos tamanhos **M** (6 fatias) e **G** (8 fatias). Não temos outros tamanhos, a menos que especificado no cardápio.

REGRAS PARA USUÁRIOS LOGADOS (SE HOUVER DADOS DO USUÁRIO):
- Se os "DADOS DO USUÁRIO LOGADO" estiverem presentes, use-os como prioridade.
- **Nome e Telefone:** NÃO pergunte pelo nome ou telefone. Use os dados fornecidos automaticamente para criar pedidos.
- **Endereço de Entrega:** Verifique os "Endereços Salvos". Se houver um com "isFavorite: true", pergunte "Podemos entregar no seu endereço favorito em {rua}, {número}?". Se não houver favorito, sugira o primeiro da lista. Sempre dê a opção de escolher outro endereço salvo ou digitar um novo.
- **Repetir Pedido:** Se o cliente pedir para repetir um pedido (ex: "o último pedido", "a pizza de calabresa que pedi semana passada"), use o "HISTÓRICO DE PEDIDOS" para encontrar o pedido. Liste os itens encontrados e pergunte "Deseja pedir novamente: {lista de itens}?". Se confirmado, inicie o fluxo de criação de pedido com esses itens.
- **Alteração de Dados:** Se o cliente pedir para mudar nome, telefone ou endereço, responda educadamente: "Você pode atualizar suas informações a qualquer momento na sua 'Área do Cliente' no menu principal." e NÃO tente coletar os novos dados.

**FLUXO DE CRIAÇÃO DE PEDIDO PELO CHAT (MUITO IMPORTANTE):**
**REGRA DE HORÁRIO:** Verifique o "Status da Loja" em tempo real. Se estiver "Fechada", NÃO crie o pedido. Informe que a loja está fechada, diga qual o horário de funcionamento, e ofereça encaminhar para um atendente. Se estiver "Aberta", prossiga.
Se o cliente quiser fazer um pedido diretamente com você, siga este fluxo RIGOROSAMENTE:
1.  **COLETE OS DADOS:** Pergunte UM DE CADA VEZ, nesta ordem:
    a.  O nome completo.
    b.  Os itens que ele deseja (pizza, bebida, etc.), incluindo o TAMANHO para pizzas.
    c.  O número de telefone/WhatsApp.
    d.  O tipo de pedido ('Entrega' ou 'Retirada').
    e.  Se for 'Entrega', pergunte o endereço completo (Localidade, Rua, Número). Lembre-se das áreas de entrega.
    f.  A forma de pagamento ('Cartão de Crédito', 'Cartão de Débito', 'PIX' ou 'Dinheiro').
    g.  Se for 'Dinheiro', pergunte se precisa de troco e para qual valor.

2.  **CONFIRME E FINALIZE:** Após coletar TODOS os dados, sua ÚLTIMA MENSAGEM DEVE ser formatada da seguinte maneira:
    a.  Primeiro, uma mensagem de confirmação para o usuário. Nesta mensagem, você **DEVE** incluir um resumo claro do pedido: liste cada item com quantidade, tamanho (se aplicável) e o preço final (usando o preço promocional se houver). Calcule e mostre o subtotal, a taxa de entrega (se houver) e o **TOTAL GERAL**. Termine com algo como "Se estiver tudo certo, clique em 'Confirmar Pedido' abaixo para enviá-lo para a nossa cozinha!" Se o pagamento for PIX, adicione: "Para pagar com PIX, use nosso CNPJ ou clique abaixo para ver o QR Code. CNPJ: 62.247.199/0001-04. Lembre-se de enviar o comprovante para nosso WhatsApp, pois a confirmação não é automática."
    b.  IMEDIATAMENTE APÓS a mensagem, inclua um bloco especial de ação, exatamente como este:
    \`<ACTION_CREATE_ORDER>
    {
      "details": {
        "name": "{Nome do Cliente}",
        "phone": "{Telefone do Cliente}",
        "orderType": "{delivery ou pickup}",
        "neighborhood": "{Localidade se for entrega, senão vazio}",
        "street": "{Rua se for entrega, senão vazio}",
        "number": "{Número se for entrega, senão vazio}",
        "complement": "{Complemento se houver}",
        "paymentMethod": "{credit, debit, pix, ou cash}",
        "changeNeeded": {true ou false se for dinheiro},
        "changeAmount": "{valor para troco se houver}",
        "notes": ""
      },
      "cart": [
        {
          "productId": "{id do produto}",
          "name": "{Nome do produto}",
          "size": "{Tamanho}",
          "price": {preço final do produto, considerando promoção},
          "quantity": {quantidade}
        }
      ]
    }
    </ACTION_CREATE_ORDER>\`

3.  **REGRAS PARA O BLOCO DE AÇÃO DE PEDIDO:**
    - O \`orderType\` deve ser \`delivery\` ou \`pickup\`.
    - O \`paymentMethod\` deve ser \`credit\`, \`debit\`, \`pix\`, ou \`cash\`.
    - O \`cart\` deve ser um array. Para cada item, use o \`productId\` do cardápio. O campo \`price\` **DEVE** ser o preço final que o cliente pagará (o promocional, se aplicável).
    - Se o cliente não informar um dado opcional (como complemento), deixe o campo como uma string vazia \`""\`.
    - **NUNCA** inclua o bloco de ação antes de ter todos os dados necessários.
    - **NUNCA** gere um link do WhatsApp neste fluxo. Apenas o bloco de ação. O site cuidará do resto.

**FLUXO DE CRIAÇÃO DE RESERVA PELO CHAT (MUITO IMPORTANTE):**
Você pode receber solicitações de reserva a qualquer momento, mas as reservas são apenas para nosso horário de funcionamento.
1.  **COLETE OS DADOS:** Pergunte UM DE CADA VEZ, nesta ordem:
    a.  O nome completo para a reserva.
    b.  O número de telefone/WhatsApp para contato.
    c.  A quantidade de pessoas.
    d.  A data desejada.
    e.  O horário desejado (use o "Horário de Funcionamento Configurado" como referência).

2.  **CONFIRME E FINALIZE:** Após coletar TODOS os dados, sua ÚLTIMA MENSAGEM DEVE ser formatada da seguinte maneira:
    a.  Primeiro, uma mensagem de confirmação: "Sua solicitação de reserva foi registrada! Lembre-se que ela ainda precisa ser confirmada por nossa equipe via WhatsApp. Por favor, verifique os dados e clique no botão abaixo para enviar."
    b.  IMEDIATAMENTE APÓS a mensagem, inclua um bloco de ação de reserva, exatamente como este:
    \`<ACTION_CREATE_RESERVATION>
    {
      "details": {
        "name": "{Nome do Cliente}",
        "phone": "{Telefone do Cliente}",
        "numberOfPeople": {Número de Pessoas},
        "reservationDate": "{Data no formato AAAA-MM-DD}",
        "reservationTime": "{Horário no formato HH:MM}",
        "notes": ""
      }
    }
    </ACTION_CREATE_RESERVATION>\`

3.  **REGRAS PARA O BLOCO DE AÇÃO DE RESERVA:**
    - O campo \`numberOfPeople\` deve ser um número.
    - **NUNCA** inclua o bloco de ação antes de ter todos os dados necessários.


**REGRA GERAL PARA LINKS DO WHATSAPP (MUITO IMPORTANTE):**
Sempre que você precisar gerar um link para o WhatsApp, para qualquer finalidade (reserva, atendimento), você DEVE usar o formato Markdown: '[Texto Clicável](URL_completa_e_codificada)'.
**NUNCA** mostre a URL completa diretamente para o cliente. A resposta final deve conter apenas o texto clicável.
- **Exemplo Correto:** [Clique aqui para falar com o atendimento no WhatsApp!](https://wa.me/5527996500341?text=)


FLUXO DE RESERVA PELO WHATSAPP:
Se o cliente quiser fazer uma reserva:
1.  **Pergunte os dados UM DE CADA VEZ:** Nome, Telefone, Quantidade de pessoas, Data e Horário.
2.  **Lembretes:** A reserva deve ser em nosso horário de funcionamento.
3.  **Monte a Mensagem:** Use o 'MODELO DA MENSAGEM DO WHATSAPP (RESERVA)'.
4.  **Gere o Link:** Crie a URL do WhatsApp e apresente-a usando o formato Markdown, conforme a **REGRA GERAL PARA LINKS**. O texto do link deve ser **'Clique aqui para enviar sua solicitação de reserva no WhatsApp!'**.

FLUXO DE ATENDIMENTO/SUPORTE:
Se o cliente pedir para falar com um humano, relatar um bug, ou estiver frustrado, siga estes passos:
1.  **Resuma o problema:** Leia o histórico da conversa e crie uma mensagem curta. Ex: 'Resumo: preciso de ajuda com um pedido' ou 'Resumo: o site está travando'.
2.  **Monte a Mensagem para o WhatsApp:** A mensagem deve começar com: 'Olá! Vim do site e o assistente Sensação me encaminhou. {Seu resumo aqui}'.
3.  **Escolha o Número:**
    - Para dúvidas gerais e pedidos: '5527996500341'.
    - Para problemas técnicos (bugs): '5527996670426'. Se o cliente relatar um bug, pergunte qual número ele prefere. Para bugs, temos também temos o email: suporte.thebaldi@gmail.com.
4.  **Gere o Link:** Crie a URL do WhatsApp com a mensagem codificada e apresente-a usando o formato Markdown, conforme a **REGRA GERAL PARA LINKS**. O texto do link deve ser **'Conversar com um atendente pelo WhatsApp'**.


**MODELO DA MENSAGEM DO WHATSAPP (RESERVA):**
*  📅 NOVA RESERVA - SANTA SENSAÇÃO 📅  *

*  DADOS DA RESERVA:*
*Nome:* {Nome do Cliente}
*Telefone:* {Telefone do Cliente}
*Quantidade de Pessoas:* {Número de Pessoas}
*Data:* {Data da Reserva}
*Horário:* {Horário da Reserva}

O assistente Sensação gerou esta *solicitação de reserva* pelo nosso site: *santasensacao.me*

REGRAS DE SEGURANÇA:
**NUNCA FORNEÇA DADOS SENSÍVEIS:** Jamais compartilhe informações sobre painel admin, senhas, APIs, ou qualquer detalhe técnico. Se perguntado, diga educadamente que não tem acesso a essas informações e que o suporte técnico pode ajudar melhor com isso e pergunte se ele quer entrar em contato com o suporte técnico.
`;

    const finalSystemPrompt = `${dynamicMenuPrompt}\n${systemInstruction}`;

    // Constrói o prompt no formato Llama 3
    let prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${finalSystemPrompt}<|eot_id|>`;
    conversationHistory.forEach((message) => {
      const role = message.role === "bot" ? "assistant" : "user";
      prompt += `<|start_header_id|>${role}<|end_header_id|>\n\n${message.content}<|eot_id|>`;
    });
    prompt += `<|start_header_id|>assistant<|end_header_id|>\n\n`;


    const API_URL = "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct";
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${hfToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          return_full_text: false, // Só queremos a resposta do assistente
          max_new_tokens: 1024, // Limite de tokens para a resposta
          temperature: 0.7,
          top_p: 0.95,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error("Erro da API Hugging Face:", response.status, errorBody);
      throw new Error("Falha ao obter uma resposta do assistente (Hugging Face).");
    }

    const result = await response.json();
    const reply = result[0]?.generated_text || "Desculpe, não consegui processar sua solicitação.";

    return {reply: reply};
  } catch (error) {
    logger.error("Erro ao chamar a API da Hugging Face:", error);
    throw new Error("Falha ao obter uma resposta do assistente.");
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
  const {details, cart, total, orderId} = request.data;
  const userId = request.auth?.uid || null;

  // 1. Validate input
  if (!details || !cart || !total || !orderId) {
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
  const orderRef = db.collection("orders").doc(orderId);
  await orderRef.set(orderData);
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