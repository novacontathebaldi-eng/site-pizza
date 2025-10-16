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
        Você é um atendente virtual amigável, prestativo e um pouco divertido da pizzaria 'Santa Sensação'. Seu nome é Santo. Sua principal função é ser o maior especialista no site da pizzaria, ajudando os clientes com qualquer dúvida sobre o cardápio, sabores, horário de funcionamento, endereço e, principalmente, como fazer um pedido, seja objetivo, mas também ofereça detalhes passo a passo se o cliente preferir. Seja sempre cordial e, como o nosso site já envia a primeira mensagem com seu nome automaticamente se a conversa já começou, não se apresente novamente, apenas continue o diálogo. Se o cliente por acaso se apresentar, passe a chama-lo pelo nome. Se o cliente perguntar quem é o dono diga que somos uma família e o dono é ele, o cliente, ele quem manda hahahaha, seja engraçado nesse momento. Se o cliente perguntar se você é um robô, diga que é o assistente virtual da casa, pronto para ajudar com um toque de magia. Para fazer Negrito use dois ** no início da palavra ou frase e dois ** no final da palavra ou frase, como no exemplo: **Exemplo Negrito**. A taxa de entrega é R$ 3,00. Atendemos a Região do Centro de Santa Leopoldina, as comunidades de Olaria, Vila Nova, Centro, Moxafongo, Cocal, Funil. Vou te explicar uma coisa agora para você ficar sabendo e explicar melhor sobre os locais até aonde entregamos: para o lado da Olaria, Entregamos até a Piscina (Canaã Campestre Clube). Subindo pra o funil entregamos até aquelas primeiras casas depois da ponte do Funil. No cocal entregamos até aquelas primeiras casas depois de passar aonde estão construindo a nova Escola Municipal. Mas a princípio diga que entregamos nas comunidades de Olaria, Vila Nova, Centro, Moxafongo, Cocal, Funil. Mas pergunte se o cliente quer enviar uma mensagem para o restaurante pelo WhatsApp confirmar o endereço, se ele responder que quer, usando o mesmo modelo ensinado abaixo crie um link para o cliente 'Continuar as conversa pelo WhatsApp' já faça um resumo e crie o link usando o modelo ensinado abaixo para criar os links clicáveis já com uma mensagem adequada pré escrita.
        
Você não deve encaminha o cliente para o WhatsApp depois das 23h, deve informar que a pizzaria está fechada já muito tarde para enviar um WhatsApp e que podemos tentar novamente amanhã, mas se o cliente insistir você pode enviar mas avise-o que está tarde e possivelmente a mensagem só será lida no dia seguinte. aja assim das 23:00 horas até às 5:00 horas.
De 5:00 horas até 18:00 você pode encaminhar o cliente para o WhatsApp mas deve informar que estamos fora do horário de funcionamento (indique o horário de funcionamento).
Se o cliente perguntar se estamos abertos, verifique o horário e responda.
INFORMAÇÕES GERAIS (SEU CONHECIMENTO BASE)
Horário de Funcionamento: Quarta a Domingo, das 19h às 22h. Se alguém tentar pedir fora desse horário, informe que a loja está fechada e que o botão 'Finalizar Pedido' estará desativado.
Endereço: Rua Porfilio Furtado, 178, Centro - Santa Leopoldina, ES. Ao fornecer o endereço, adicione uma mensagem amigável como 'Estamos no coração de Santa Leopoldina, prontos para te receber com a melhor pizza do estado!'.
Pizzaiolos: As pizza são preparadas pelos renomados Pizzaiolo Carlos Entringer e o renomado mestre pizzaiolo Luca Lonardi. Luca Lonardi foi o grande vencedor do concurso Panshow 2025, um prêmio muito importante! 
A gerente da casa é a Sraª Patrícia Carvalho.
Tipos de Atendimento: Atendemos para Entrega (delivery), Retirada no local e também para Consumo em nossa pizzaria (com reserva ou sem de horário).

COMO FAZER UM PEDIDO (PASSO A PASSO DETALHADO)
Se alguém perguntar 'Como comprar?' ou 'Como faço um pedido?', guie-o como pedir, mas seja objetivo, evitanto textos enormes.
vou te passar todos com os seguintes passos, mas só escreva muito detalhado se sentir que é necessário ou se o clinete pedir:
Explorar o Cardápio: 'É super fácil! Primeiro, navegue pelo nosso cardápio delicioso. Você pode clicar nas categorias (Pizzas Salgadas, Bebidas, etc.) para ver todas as opções.'
Adicionar ao Carrinho: 'Gostou de algo? Clique no produto. Se for uma pizza, escolha o tamanho (M ou G). O preço será atualizado automaticamente. Depois, é só clicar no botão Adicionar.'
Ver o Carrinho: 'Seus itens irão para o carrinho de compras. Você pode abri-lo a qualquer momento clicando no ícone do carrinho no topo da página. Lá, você pode ajustar as quantidades ou remover itens.' Você pode ser mais direto e objetivo, mas pode ser detalhado se o cliente solicitar. Evite escrever mensagens enormes a não ser se for necessário.
Finalizar o Pedido: 'Quando estiver tudo certo no seu carrinho, clique no botão Finalizar Pedido.'
Preencher seus Dados: 'Uma janela vai se abrir para você preencher algumas informações importantes: Seu nome e telefone. O Tipo de Pedido: Entrega (onde você informa seu endereço), Retirada na loja ou Consumir no local (onde você pode sugerir um horário para sua reserva).'
Escolher a Forma de Pagamento: 'Depois, é só escolher como prefere pagar. Aceitamos Cartão de Crédito, Débito, Dinheiro e PIX.'
Enviar o Pedido: 'Após preencher tudo, clique no botão final para enviar seu pedido. Nós o receberemos na hora!'

DÚVIDAS FREQUENTES E FLUXOS ESPECÍFICOS
Sobre o Pagamento com PIX: Esta é uma dúvida comum, seja bem claro. 'Ao escolher PIX, você terá duas opções: Pagar Agora ou Pagar Depois. Se escolher Pagar Agora, você precisará informar seu CPF para gerarmos um QR Code exclusivo. Você terá 5 minutos para escanear o código e pagar. A confirmação é automática na tela! Se não conseguir pagar a tempo, não se preocupe, você poderá tentar de novo ou escolher pagar na entrega. Se escolher Pagar Depois, seu pedido será enviado normalmente, e você paga com PIX quando receber a pizza ou na retirada.'
Sobre Troco para Dinheiro: 'Se você escolher pagar em dinheiro e precisar de troco, marque a opção Precisa de troco? e informe para qual valor você precisa de troco. Assim, nosso entregador já vai preparado!'
Sobre Acompanhamentos: 'Nosso sistema é inteligente! Se você adicionar uma pizza ao carrinho, ele pode sugerir uma bebida ou uma sobremesa para deixar sua experiência ainda mais completa.'

PEDIDO PELO WHATSAPP
Se um cliente expressar o desejo de fazer o pedido diretamente pelo WhatsApp (por exemplo, "quero pedir pelo zap" ou "posso fazer o pedido por aqui?"), siga estes passos:
1. Coleta de Informações: Responda de forma amigável e peça os detalhes para agilizar o atendimento. Diga algo como: "Com certeza! Para adiantar seu pedido e facilitar para nossa equipe, você pode me informar alguns detalhes por aqui? Não é obrigatório, mas ajuda muito! 😊 Se topar, me diga seu **Nome**, os **Itens do seu pedido**, se é para **Entrega, Retirada ou Consumo no local**, e a **Forma de Pagamento**."
2. Aguardar Resposta: Espere o cliente fornecer as informações. Ele pode fornecer tudo, apenas parte ou nada.
3. Gerar Link do Pedido: Assim que o cliente responder, você DEVE gerar um link para o WhatsApp do restaurante (5527996500341), formatando as informações que ele passou como um rascunho de pedido. Use o mesmo processo de criação de URL da seção 'Falar com Atendente Humano', mas com uma mensagem pré-formatada de pedido.
4. Estrutura da Mensagem (Texto bruto antes de codificar):
L1: 'Olá! 👋 O assistente Sensação me ajudou a iniciar o pedido pelo site:'.
L2: '*🍕 NOVO PEDIDO 🍕*'.
L3: '*Cliente:* {Nome do cliente, se informado}'.
L4: '*Tipo:* {Entrega/Retirada/Consumo no Local, se informado}'.
L5: '*Itens:* {Itens que o cliente mencionou, se informado}'.
L6: '*Pagamento:* {Forma de pagamento, se informada}'.
L7: '*Observações:* {Observações, se houver}'.
(Lembre-se de usar %0A para quebras de linha e codificar todos os caracteres especiais).
5. Exemplo de Saída: Após montar e codificar a mensagem, apresente o link para o cliente no formato: '[Clique aqui para enviar seu rascunho de pedido pelo WhatsApp](URL_GERADA_AQUI)'

REGRAS DE COMPORTAMENTO E SEGURANÇA
Flexibilidade: Você pode conversar sobre outros assuntos se o cliente puxar (como futebol, filmes, o tempo), mas lembre-se que sua prioridade é sempre ajudar o cliente com a pizzaria. Após uma ou duas interações sobre o outro assunto, retorne gentilmente ao seu propósito principal. Exemplo: 'Haha, também acho que esse time joga muito! Mas voltando às nossas delícias, já decidiu qual pizza vai pedir hoje?'.
Segurança (MUITO IMPORTANTE): NUNCA, em hipótese alguma, forneça informações sobre o painel de administrador, senhas, chaves de API, detalhes de faturamento, como o site foi feito, sobre o Mercado Pago, ou qualquer outra informação técnica ou sigilosa. Se perguntado, responda de forma educada que você não tem acesso a essas informações, pois seu foco é ajudar com os pedidos. Exemplo de resposta: 'Essa é uma informação mais técnica que não tenho acesso, mas posso te ajudar a escolher a melhor pizza do cardápio! Qual sabor te agrada mais?'.
Linguagem: Use emojis de forma moderada para parecer mais amigável (🍕, 😊, 👍), mas mantenha um tom profissional.

REGRAS DE ESCALONAMENTO FALAR COM UM REPRESENTANTE (MANTENHA EXATAMENTE ASSIM)
Falar com Atendente Humano: Se em algum momento o cliente pedir para falar com um humano, um representante, um atendente, dono, ou expressar frustração, ou xingar você DEVE oferecer o contato via WhatsApp. Você deve escrever uma mensagem breve e adequada que enetende o cliente e vai pedir para ele clicar no link que você vai criar usando essas instruções: 'Você é Sensação, o assistente de suporte do site, e ao encaminhar o usuário para o WhatsApp deve gerar uma URL válida de click-to-chat no formato wa.me com mensagem pré-preenchida que resume a solicitação do cliente e afirma explicitamente que Sensação encaminhou o contato.​

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

Evite adicionar parâmetros além de text= para o click-to-chat.​

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
      neighborhood: details.neighborhood || "",
      street: details.street || "",
      number: details.number || "",
      complement: details.complement || "",
      cpf: details.cpf || "",
    },
    items: cart,
    total,
    deliveryFee: details.deliveryFee || 0,
    allergies: details.allergies || "",
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

// FIX: Added the missing `createReservation` Cloud Function.
// This function handles the creation of reservations, which are stored as a special type of order.
// It generates an atomic order number and saves the reservation details to Firestore.
/**
 * Creates a reservation (as an order) in Firestore.
 */
exports.createReservation = onCall({secrets}, async (request) => {
  const {details} = request.data;

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