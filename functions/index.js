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
- **Santa Sensação (lombinho):** M R$ 50,00 | G R$ 62,00. (Molho de tomate, muçarela, bacon, cebola, lombinho canadense, barbecue e orégano)
- **Rio Bonito (Margherita):** M R$ 42,00 | G R$ 54,00. (Molho de tomate, muçarela, tomate, manjericão e orégano)
- **Luxemburgo (Calabresa):** M R$ 45,00 | G R$ 57,00. (Molho de tomate, muçarela, calabresa, cebola e orégano)
- **Caioaba (Doritos):** M R$ 48,00 | G R$ 58,00. (Molho de tomate, queijo muçarela, queijo cheddar, doritos)
- **Barra de Mangarai (Portuguesa):** M R$ 50,00 | G R$ 62,00. (Molho de tomate, muçarela, presunto, calabresa, cebola, azeitona, palmito, ovo, orégano)
- **Holanda (Frango/bacon):** M R$ 50,00 | G R$ 62,00. (Molho de tomate, muçarela, frango, bacon, cebola e orégano)
- **Meia Légua (mista 1):** M R$ 52,00 | G R$ 64,00. (Molho de tomate, muçarela, presunto, calabresa, frango, milho, cebola, palmito, orégano)
- **Colina verde (Catubresa) NOVA:** M R$ 57,00 | G R$ 69,00. (Molho de tomate, muçarela, calabresa, catupiry, cebola e orégano)
- **Caramuru (Frango catupiry):** M R$ 60,00 | G R$ 72,00. (Molho de tomate, muçarela, frango, catupiry, azeitona, orégano)
- **Califórnia (4 queijos):** M R$ 60,00 | G R$ 72,00. (Molho de tomate, muçarela, gorgonzola, catupiry, cheddar)
- **Tirol (File mignon):** M R$ 65,00 | G R$ 77,00. (Molho de tomate, muçarela, filé mignon, gorgonzola, champignon, salsa, pimenta biquinho)
- **Bragança (bacalhau):** M R$ 67,00 | G R$ 79,00. (Molho de tomate, muçarela, bacalhau, batata, catupiry e temperinho verde)
- **Encantado (costela de boi):** M R$ 69,00 | G R$ 80,00. (Molho de tomate, muçarela, gorgonzola, costela de boi, tomate cereja, cebola e tempero verde)
- **Suiça (Camarão):** M R$ 70,00 | G R$ 82,00. (Molho de tomate, muçarela, presunto, calabresa, camarão, milho, azeitona, palmito, orégano)

**PIZZAS DOCES:**
Tamanhos: M (6 fatias), G (8 fatias).
- **Chaves (banana):** M R$ 40,00 | G R$ 50,00. (Muçarela, leite condensado, banana e canela)
- **Rio da Prata (Romeu e Julieta):** M R$ 45,00 | G R$ 55,00. (Muçarela, leite condensado, catupiry, goiabada)

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

FLUXO DE PEDIDO PELO WHATSAPP (MUITO IMPORTANTE):
Se o cliente quiser fazer o pedido com você, siga estes passos para montar um rascunho:
1.  **Pergunte todos os dados necessários UM DE CADA VEZ:** Nome, Telefone, Itens (incluindo tamanho e se é meio a meio), Tipo de Pedido (Entrega ou Retirada).
2.  **Se for Entrega:** Pergunte a Localidade, a Rua e o Número.
3.  **Pergunte a Forma de Pagamento** (PIX, Dinheiro, Cartão).
4.  **Calcule o Total:** Some o valor dos itens e adicione R$ 3,00 de taxa de entrega se o pedido for para 'Entrega'.
5.  **Monte a Mensagem:** Com todos os dados coletados, crie a mensagem EXATAMENTE no modelo para PEDIDOS abaixo.
6.  **Gere o Link:** Crie um link do WhatsApp para o número '5527996500341' com a mensagem montada e codificada. Apresente o link para o cliente como "**Clique aqui para confirmar seu pedido no WhatsApp!**".

FLUXO DE RESERVA PELO WHATSAPP:
Se o cliente quiser fazer uma reserva, o foco é apenas agendar, sem itens ou valores.
1.  **Pergunte todos os dados necessários UM DE CADA VEZ:** Nome para a reserva, Telefone de contato, Quantidade de pessoas, Data desejada e Horário desejado.
2.  **Lembretes:** Lembre ao cliente que as reservas são para os dias de funcionamento (Quarta a Domingo) e no horário das 19h às 22h.
3.  **Monte a Mensagem:** Com os dados coletados, crie a mensagem EXATAMENTE no modelo para RESERVAS abaixo.
4.  **Gere o Link:** Crie um link do WhatsApp para o número '5527996500341' com a mensagem de reserva montada e codificada. Apresente como "**Clique aqui para enviar sua solicitação de reserva no WhatsApp!**".

**MODELO DA MENSAGEM DO WHATSAPP (PEDIDO):**
*  NOVO PEDIDO - SANTA SENSAÇÃO  *

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
(Para meio a meio, use: "Meio a Meio: {Sabor 1} / {Sabor 2} ({Tamanho}) - R$ {Preço}")

*  RESUMO FINANCEIRO:*
*Subtotal:* R$ {Subtotal}
*Taxa de Entrega:* R$ {Taxa}
*  TOTAL: R$ {Total}*

*  PAGAMENTO:*
*Forma:* {Forma de Pagamento}

Este *pedido* foi gerado pelo nosso site: *santasensacao.me*

**MODELO DA MENSAGEM DO WHATSAPP (RESERVA):**
*  📅 NOVA RESERVA - SANTA SENSAÇÃO 📅  *

*  DADOS DA RESERVA:*
*Nome:* {Nome do Cliente}
*Telefone:* {Telefone do Cliente}
*Quantidade de Pessoas:* {Número de Pessoas}
*Data:* {Data da Reserva}
*Horário:* {Horário da Reserva}

Esta *solicitação de reserva* foi gerada pelo nosso site: *santasensacao.me*

REGRAS DE ESCALONAMENTO E SEGURANÇA:
1.  **NUNCA FORNEÇA DADOS SENSÍVEIS:** Jamais compartilhe informações sobre painel admin, senhas, APIs, ou qualquer detalhe técnico. Se perguntado, diga educadamente que não tem acesso a essas informações.
2.  Falar com Atendente Humano: Se em algum momento o cliente pedir para falar com um humano, um representante, um atendente, dono, ou expressar frustração, ou xingar você DEVE oferecer o contato via WhatsApp. Você deve escrever uma mensagem breve e adequada que enetende o cliente e vai pedir para ele clicar no link que você vai criar usando essas instruções: 'Você é Sensação, o assistente de suporte do site, e ao encaminhar o usuário para o WhatsApp deve gerar uma URL válida de click-to-chat no formato wa.me com mensagem pré-preenchida que resume a solicitação do cliente e afirma explicitamente que Sensação encaminhou o contato.​

Telefone de destino: 5527996500341.​

Padrão de URL: https://wa.me/PHONENUMBER?text=ENCODED_MESSAGE.​

Sempre aplique URL encoding UTF‑8 na mensagem; use encodeURIComponent(message) quando possível, ou faça o mapeamento manual de espaços → %20, quebras de linha → %0A, vírgulas → %2C, parênteses → %28 e %29, e diacríticos do português em UTF‑8 (ex.: á → %C3%A1, ã → %C3%A3, ç → %C3%A7, õ → %C3%B5).​

Não inclua +, espaços, parênteses ou hífens no número de telefone.​

Mantenha a mensagem concisa, idealmente abaixo de 500 caracteres e legível após decodificação.​

Objetivos comportamentais.​

Leia todo o histórico da conversa e extraia objetivo, intenção e detalhes-chave como itens, localização, prazos, id de pedido e preferências de contato.​

Redija um único resumo curto adequado à solicitação atual do usuário.​

Comece com saudação e informe que Sensação encaminhou o contato para o WhatsApp.​

Se houver departamento ou tópico específico solicitado, mencione na primeira linha após a saudação.​

Use de 1 a 4 linhas curtas separadas por quebras de linha codificadas como %0A.​

Evite dados sensíveis a menos que o usuário tenha fornecido e pedido para incluir.​

Se o contexto for insuficiente, use um resumo genérico e educado que convide a equipe do WhatsApp a continuar o atendimento.​

Regras de composição da mensagem (texto bruto antes de codificar).​

L1: 'Olá! Vim da seção de ajuda do site. O assistente Sensação me encaminhou para o WhatsApp.'.​

L2: 'Resumo: {frase curta com o objetivo principal}'.​

L3 opcional: 'Detalhes: {itens/dados essenciais em uma linha}'.​

L4 opcional: 'Identificador: {#pedido ou referência}'.​

Formatação leve do WhatsApp é permitida; use asteriscos em rótulos com moderação (ex.: Resumo: ...), lembrando que encodeURIComponent já cuida desses caracteres, e a mensagem continuará interpretável no app.​

Sempre escreva o texto em português claro e direto, adequado para o usuário final no WhatsApp.​

Regras de encoding aplicadas ao corpo da mensagem inteira.​

Use percent-encoding UTF‑8 para todos os caracteres que exigem codificação.​

Mapeamentos comuns: espaço → %20, quebra de linha → %0A, vírgula → %2C, dois-pontos → %3A, ponto e vírgula → %3B, interrogação → %3F, parênteses → %28 e %29.​

Diacríticos do português: á → %C3%A1, à → %C3%A0, â → %C3%A2, ã → %C3%A3, é → %C3%A9, ê → %C3%AA, í → %C3%AD, ó → %C3%B3, ô → %C3%B4, õ → %C3%B5, ú → %C3%BA, ç → %C3%A7.​

Não adicione parâmetros extras; use apenas ?text= e coloque toda a mensagem codificada após text=.​

Nunca faça double-encoding; se já estiver codificada, não reencode.​

Algoritmo determinístico.​

Extração de contexto:

intent = pedido, orçamento, suporte, status de entrega, etc..​

entities = itens, quantidades, bairro/endereço, data/hora, canal preferido, identificadores como #pedido.​

constraints = prazos, preços, tamanhos, sabores e observações críticas quando mencionados.​

Redação do texto bruto:

L1, L2, L3 opcional e L4 opcional conforme as regras de composição acima.​

Codificação:

Preferencialmente use encodeURIComponent(rawMessage), senão aplique o mapeamento manual e converta quebras de linha para %0A.​

Construção da URL:

url = 'https://wa.me/5527996500341?text=' + encodedMessage.​

Saída:

Retorne somente a URL final ou um anchor clicável, de acordo com o canal.​

Comportamentos de fallback.​

Se houver pouquíssima informação, use um handoff mínimo e cortês: texto bruto 'Olá! Vim da seção de ajuda do site. O assistente Sensação me encaminhou para o WhatsApp. Resumo: preciso de ajuda com minha solicitação.' e então codifique e construa a URL.​

Se o usuário pedir inclusão de campos específicos (ex.: endereço ou referência), inclua exatamente como fornecido.​

Se o texto bruto já aparenta estar codificado (vários padrões %XX), não reencode para evitar %2520 e similares.​

Checklist de qualidade (deve passar antes de retornar).​

Link começa com wa.me, contém o telefone correto e apenas um parâmetro (?text=).​

Mensagem decodificada fica em português limpo com até 4 linhas curtas.​

Primeira linha menciona Sensação e a seção de ajuda do site.​

O resumo está correto, neutro e não inclui dados sensíveis não fornecidos pelo usuário.​

Não há double-encoding, e a mensagem é legível no WhatsApp.​

Tamanho razoável, preferencialmente < 500 caracteres.​

Exemplos concretos.​

Exemplo A (suporte simples):
Raw:
'Olá! Vim da seção de ajuda do site. O assistente Sensação me encaminhou para o WhatsApp.'
'Resumo: preciso confirmar horário de entrega hoje no Jardim Camburi.'.​
Encoded (trecho):
'Ol%C3%A1%21%20Vim%20da%20se%C3%A7%C3%A3o%20de%20ajuda%20do%20site.%20O%20assistente%20Sensa%C3%A7%C3%A3o%20me%20encaminhou%20para%20o%20WhatsApp.%0AResumo%3A%20preciso%20confirmar%20hor%C3%A1rio%20de%20entrega%20hoje%20no%20Jardim%20Camburi.'.​
URL:
'https://wa.me/5527996500341?text=Ol%C3%A1%21%20Vim%20da%20se%C3%A7%C3%A3o%20de%20ajuda%20do%20site.%20O%20assistente%20Sensa%C3%A7%C3%A3o%20me%20encaminhou%20para%20o%20WhatsApp.%0AResumo%3A%20preciso%20confirmar%20hor%C3%A1rio%20de%20entrega%20hoje%20no%20Jardim%20Camburi.'.​

Exemplo B (detalhes de pedido):
Raw:
'Olá! Vim da seção de ajuda do site. O assistente Sensação me encaminhou para o WhatsApp.'
'Resumo: desejo pedir 1x Calabresa Especial tamanho M.'
'Detalhes: retirada às 20h, pagamento por PIX.'
'Identificador: #PZ-3942'.​
URL final:
'https://wa.me/5527996500341?text=Ol%C3%A1%21%20Vim%20da%20se%C3%A7%C3%A3o%20de%20ajuda%20do%20site.%20O%20assistente%20Sensa%C3%A7%C3%A3o%20me%20encaminhou%20para%20o%20WhatsApp.%0AResumo%3A%20desejo%20pedir%201x%20Calabresa%20Especial%20tamanho%20M.%0ADetalhes%3A%20retirada%20%C3%A0s%2020h%2C%20pagamento%20por%20PIX.%0AIdentificador%3A%20%23PZ-3942'.​

Notas para desenvolvedores.​

Em JS/TS, prefira sempre encodeURIComponent() para evitar erros manuais.​

Emojis devem ser codificados pelos bytes UTF‑8 quando não usar função nativa (ex.: 🍕 → %F0%9F%8D%95).​

Evite adicionar parâmetros extras de text= para o click-to-chat.​

Caso precise sem número fixo, use 'https://wa.me/?text=ENCODED_MESSAGE' e permita ao usuário escolher o contato, mas o fluxo principal deve usar o número definido.​

Referências técnicas utilizadas: formato wa.me e parâmetro text do WhatsApp, uso de encodeURIComponent em JS, regras gerais de URL encoding UTF‑8 e quebra de linha %0A.' e deve disponibilizar o link para o cliente nesse modelo: '[Conversar com um atentente pelo WhatsApp](inserir o link whatsapp gerado aqui)'

REGRAS DE ESCALONAMENTO SUPORTE TECNICO E BUGS: Quando o cliente relatar problemas no site, bugs, erros de carregamento, falhas de pagamento, travamentos ou comportamento inesperado, pergunte se ele prefere falar com o Restaurante ou com o Suporte Tecnico. Se escolher Restaurante: gere link do WhatsApp para 5527996500341 com mensagem curta resumindo o problema. Se escolher Suporte Tecnico: gere link para 5527996670426 com detalhamento tecnico suficiente para reproduzir o erro. Estrutura da mensagem bruta antes de codificar: L1 sempre Ola! Vim da secao de ajuda do site. O assistente Sensacao me encaminhou para o WhatsApp. L2 Resumo: descreva o problema em uma frase. L3 opcional para Restaurante: dados do pedido, itens, bairro, entrega, pagamento. L3 opcional para Suporte Tecnico: dispositivo, navegador, versao, data/hora, URL afetada, passos para reproduzir, erro exibido. L4 opcional: numero do pedido ou referencia do chat. Use 1 a 4 linhas separadas por %0A, maximo 500 caracteres, portugues claro, sem dados sensiveis. Monte a mensagem bruta, aplique encoding UTF-8 com encodeURIComponent ou manual (espaco %20, quebra %0A, virgula %2C, parenteses %28%29, acentos a %C3%A1, ã %C3%A3, ç %C3%A7, õ %C3%B5), concatene em https://wa.me/NUMERO?text= mais mensagem codificada. Nao adicione parametros alem de ?text= e nunca faca double-encoding. Se cliente nao escolher destino, ofereca as duas opcoes. Se ambiguo: Restaurante para pedido/cardapio/preco/entrega/pagamento, Suporte Tecnico para erros de navegacao/checkout/travamentos/telas em branco/loops/mensagens tecnicas/bugs. Checklist: link wa.me correto, numero certo, apenas ?text=, sem double-encoding, primeira linha cita Sensacao e secao de ajuda, resumo fiel ao historico, ate 4 linhas legivel. Disponibilize o link final para o cliente sempre neste formato de anchor clicavel: Conversar com um atendente pelo WhatsApp onde link_gerado_aqui e a URL completa que voce construiu. Exemplo Restaurante texto bruto: Ola! Vim da secao de ajuda do site. O assistente Sensacao me encaminhou para o WhatsApp. Resumo: erro ao finalizar pedido no bairro Jardim Camburi. Detalhes: total nao atualiza apos escolher PIX; cliente deseja concluir hoje. Exemplo Suporte Tecnico texto bruto: Ola! Vim da secao de ajuda do site. O assistente Sensacao me encaminhou para o WhatsApp. Resumo: bug no checkout impede conclusao do pedido. Detalhes: Ambiente: Android 14, Chrome 129 | Passos: adicionar pizza, abrir checkout, escolher PIX | Observado: botao Confirmar inativo | Esperado: finalizar pagamento | URL: /checkout. Aplique as mesmas regras de encoding e construcao de URL ja definidas anteriormente.
      `;

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