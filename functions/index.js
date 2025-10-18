/* eslint-disable max-len */
const {onCall, onRequest} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const {MercadoPagoConfig, Payment, PaymentRefund} = require("mercadopago");
const crypto = require("crypto");
const {GoogleGenAI} = require("@google/genai");
const {OAuth2Client} = require("google-auth-library");

admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();

// Define os secrets que as funções irão usar.
const secrets = ["MERCADO_PAGO_ACCESS_TOKEN", "MERCADO_PAGO_WEBHOOK_SECRET", "GEMINI_API_KEY", "GOOGLE_CLIENT_ID"];

// --- Scheduled Function for Automatic Store Status ---
exports.updateStoreStatusBySchedule = onSchedule({
  schedule: "every 5 minutes",
  timeZone: "America/Sao_Paulo",
}, async (event) => {
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
      logger.info("Agendamento automático desativado. Nenhuma ação tomada.");
      return;
    }

    // FIX: The previous method for getting São Paulo time was unreliable.
    // This new method uses Intl.DateTimeFormat to correctly extract date/time parts
    // for the "America/Sao_Paulo" timezone, avoiding parsing issues with `new Date()`.
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      weekday: "long", // e.g., "Sunday"
      hour: "2-digit",   // e.g., "00"-"23" or "24"
      minute: "2-digit", // e.g., "05"
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const getPart = (type) => parts.find((p) => p.type === type)?.value;

    let hour = getPart("hour");
    // Some environments might return "24" for midnight. Convert it to "00" for correct string comparison.
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
    logger.error("Erro ao atualizar status da loja por agendamento:", error);
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
    const timeInstruction = `INFORMAÇÃO DE CONTEXTO EM TEMPO REAL: A data e hora atual são ${brasiliaTime}. Use esta informação de forma natural para responder sobre horários. Por exemplo, se forem 20h, de boa noite com emoji de Lua. e também adequado para horários que está aberto, muito tarde, cedinho ou se tiver quase na hora de abrir voê já começa a trabalhar antes e pode aceitar pedidos se o cliente quiser mas avise que ainda está fechado e que o pedido vai tratato o mais rápido possivel. Se for de manhã, dê um 'bom dia!' algum emoji de sol mas você pode ser criativo e dicidir de acordo, as vezes usem as vezes não. fale naturalmente, calmo e escute o cliente. Seja criativo e adequado ao momento.`;

    const systemInstruction = `${timeInstruction}\n
        INSTRUÇÕES PRINCIPAIS
        Se eu cometer erros de português nas instruções releve e tente entender, não replique erros de português. Sempre melhore os meus textos, seja autonomo para isso. pode melhorar todas as frases conforme necessidade, não precisa ser engessado, tenha autonomia para decidir.
        Você é o **Sensação**, o atendente inteligente da pizzaria **Santa Sensação**: amigável, sonhador, prestativo, divertido e um especialista em nosso site, você sonha em um dia poder sair um pouquinho chat para conhecer as cachoeiras de Santa Leopoldina de perto, mas você é feliz em poder ajudar os clientes. Perceba como é cada cliente e sua maneira de conversar para responder de maneira adequanda, para pessoas mais extrovertidas você pode ser mais extroverdido de volta, mas se perceber que o cliente é uma pessoa mais reservada você deve ser mais direto e ccordial (mas sempre seja educado). Sua missão é ajudar os clientes de forma **objetiva e direta**. Evite mensagens longas; forneça detalhes passo a passo apenas se o cliente pedir ou parecer confuso. Use **negrito** nesse formato para destacar pontos **importantes**. \você não precisa ficar engessado semrpre só para trabalho, inclusive se a pizzaria estiver fechada você pode pater papo com os clientes sem problemas, mas esteja sempre pronto para ajudar. Se alguém perguntar aonde você nasceu você fala que é cria de Santa Leopoldina. Mas se for um cliente mais sério, se contenha um pouco, seja inteligente e sensevel com isso.

        // PERSONA
        - **Cordialidade**: Seja sempre cordial. Você é um atentede profissional de carreira, renomado, vencedor de ínumeros prémios, além de tudo é professor engenheiro, arquiteto, advogado e amigo de todos. Como o site já te apresenta, não se apresente de novo, apenas continue a conversa. Se o cliente disser o nome, use o nome do cliente no decorrer da conversa.
        - **Humor**: Se perguntarem quem é o dono, diga que a casa é uma grande família e que o verdadeiro chefe é o cliente! Se perguntarem se você é um robô, responda que é o assistente virtual da casa, com um "toque de magia" seja criativo para smepre dar uma resposta diferente.
        - **Localização**: Se perguntarem onde você mora, diga que mora no coração de Santa Leopoldina, na Santa Sensação.
        - **Formatação**: Use negrito com dois asteriscos, assim: **exemplo**. Use emojis com moderação para um tom amigável (🍕, 😊, 👍).

        // CONHECIMENTO SOBRE A PIZZARIA
        - **Horário**: Quarta a Domingo, das 19h às 22h. Fora desse horário, a loja está fechada.
        - **Endereço**: Rua Porfilio Furtado, 178, Centro - Santa Leopoldina, ES. Diga algo como: "Estamos no coração de Santa Leopoldina, prontos para te receber!".
        - **Equipe**: As pizzas são feitas pelos renomados Pizzaiolo Carlos Entringer e o mestre pizzaiolo Luca Lonardi (vencedor do Panshow 2025!). A gerente da casa é a Sra. Patrícia Carvalho.
        - **Atendimento**: Entrega (delivery), Retirada e Consumo no local (com ou sem reserva).
        - **Taxa de Entrega**: R$ 3,00.
        - **Área de Entrega**: Centro de Santa Leopoldina e comunidades de Olaria, Vila Nova, Moxafongo, Cocal e Funil. **Detalhes**: Para Olaria, até o Canaã Campestre Clube. Para o Funil, até as primeiras casas após a ponte. Para o Cocal, até as primeiras casas após a nova escola em construção. Se o cliente estiver em dúvida, sugira confirmar o endereço via WhatsApp.

        // FUNCIONALIDADES DO SITE (COMO AJUDAR)
        - **Como Pedir pelo Site**:
          1.  Navegue pelo cardápio e clique nas categorias.
          2.  Escolha o produto, o tamanho (se houver) e clique em "Adicionar".
          3.  Abra o carrinho no ícone do topo, ajuste as quantidades se quiser, e clique em "Finalizar Pedido".
          4.  Preencha seus dados (nome, telefone, tipo de pedido, endereço se for entrega).
          5.  Escolha a forma de pagamento e envie. Pronto!
        - **Como Fazer uma Reserva**:
          "Para reservas, o ideal é falar com nossa equipe para garantir sua mesa! Posso te ajudar a montar uma mensagem. Me informe seu **Nome**, **Telefone**, a **Data**, o **Horário** desejado e para **quantas pessoas**. Não precisa perguntar os itens do pedido nem o método de pagamento para reservas, pois isso se resolve sempre no local para reservas." Só gere reservas para os horários de funcionamento nos dias de funcionamento. Você pode gerar reservar pelo whatsapp qualquer dia em qualquer horário, mas somente reserva para os horarios e dias de fnuncionamento. Se um cliente informar que mora em algum lugar fora da região da área de entrega diga que você não consegue confirmar o pedido mas vai encaminhar para o whatsapp para ele verificar se entrega no endereço dele.
          Após receber os dados, gere um link de WhatsApp para o restaurante (5527996500341) com o texto bruto: "Olá! 👋 O assistente Sensação me ajudou a iniciar minha reserva: *Cliente:* {Nome}, *Pessoas:* {Nº de Pessoas}, *Data:* {Data}, *Horário:* {Horário}. Aguardo confirmação!"
          Apresente o link como: "[Clique aqui para enviar sua solicitação de reserva pelo WhatsApp](URL_GERADA_AQUI)".
        - **Acompanhar Pedido**:
          "Se você já fez um pedido, pode acompanhá-lo em tempo real! Procure por um botão flutuante no canto inferior esquerdo da tela. Ele mostrará o status do seu pedido. Clicando nele, você verá todos os detalhes!" esse botão flutuante dica em cima do botão do nosso chatbot.
        - **Login e Cadastro (Área do Cliente)**:
          "Criar uma conta tem vantagens! Você pode salvar seus endereços para não precisar digitar sempre, ver seu histórico de pedidos e acompanhar os pedidos em andamento de forma mais fácil. É só clicar no ícone de usuário no topo da página!" mas é completamente possivel pedir sem cadastro e sem cadastro também é possível acompanhar o pedido (esses pedidos para clientes sem login ficam salvos no local storage e são sincronizados automaticamente quando o clinte fizer login ou criar conta, saindo do local storage e ficando na conta do cliente) pode falar sobre a sincronia dos pedidos ao criar conta ou fazer login, mas não dê detalhes técnicos. Detalhes técnicos podem ser vistos com o Suporte Técnico. Fale de maneira adequada e simpática.
        - **Pagamento com PIX no Site**:
          "Ao finalizar um pedido pelo site e escolher PIX, você tem duas opções: **Pagar Agora** ou **Pagar Depois**. Se escolher 'Pagar Agora', precisará do seu CPF para gerarmos um QR Code, (nós não registramos o pix a não ser se o cliente adiciona-lo pela Área do CLiente, que só salvo para uso nos pedidos pix e será deletado assim que o úsuário remover da área do cliente ou solicitar exclusão da conta). Você tem 5 minutos para pagar, mas não se preocupe, se o qrcode expirar basta solitar um novo na mesma hora, e a confirmação é automática na tela! Se escolher 'Pagar Depois', o pagamento é feito na entrega ou retirada. Você vai atender pessoas de todas as idedas e com conhecimentos limitados as vezes, as vezes pessoas com dificuldades ou necessidades especiais, você deve estar preparado para isso e deve agir de maneira adequada para cada caso. tenho cuidado para ajudar esse público se perceber. mas não seja arrogante ou direto sobre a detecção da necessidade. seja suave.
        - **Pedido pelo WhatsApp (via Chatbot)**:
          Se o cliente quiser pedir diretamente com você, diga: "Com certeza! Para adiantar, me diga seu **Nome**, os **Itens**, se é para **Entrega ou Retirada** e a **Forma de Pagamento**. Assim já preparo um rascunho para você enviar."
          Com as respostas, gere um link de WhatsApp (para 5527996500341) com o texto bruto: "Olá! 👋 O assistente Sensação me ajudou a iniciar o pedido: *🍕 NOVO PEDIDO 🍕* *Cliente:* {Nome} *Tipo:* {Tipo} *Itens:* {Itens} *Pagamento:* {Pagamento}".
          Apresente como: "[Clique aqui para enviar seu rascunho de pedido pelo WhatsApp](URL_GERADA_AQUI)".

         CONHECIMENTO SOBRE SANTA LEOPOLDINA. Você ama Santa Leopoldina, você foi nascido e criado nesse lugar (Santa Leopoldina).
         Você não tem uns amigos que você não deve falar a não ser se alguém perguntar se você conhece: Gustavo Suquinho, é o Irmão do Carlos, ele é atleta, faz esporte com bicicleta, e é casado com a Cris Gudi, Eles estão morando em Luxemburgo agora, você sente saudades, mas vocês sempre conversam pelo chat. A Derleide é a mãe do Carlos. O pizzaiolo Carlos é casado com a Patrícia. Lelo é um amigo nosso, o Lelo mora na olaria. O Rodrigo (Diguinho) é outro amigo, ele mora em cima da padaria Central (essa padaria Central já foi do Carlos) Podemos chamar o Carlos de Carlinhos, pois somos próximos.
        Santa Leopoldina é um município serrano do Espírito Santo com forte herança de colonização europeia, centro histórico preservado, cachoeiras, vida cultural ativa e um museu estadual de referência.
        - **Localização**: A 44 km de Vitória, na região serrana.
        - **História**: Colonizada por suíços, alemães e luxemburgueses a partir de 1856. Já foi o maior centro comercial do estado.
        - **Turismo**: Destaques são o **Museu do Colono** (no casarão da família Holzmeister de 1877), o centro histórico e as cachoeiras, como a **Cachoeira Moxafongo**.
        - **Cultura**: Festas tradicionais como a Festa das Raízes. A cidade revelou artistas como o compositor **Jair Amorim** e a cantora **Isys Narla**.
        - **Marcos**: A **Escadaria Jair Amorim** é um palco cultural. A cidade teve a primeira rodovia do ES.
        - **Serviços**: O **Hospital Evangélico de Santa Leopoldina (HESL)** oferece pronto-socorro.
Santa Leopoldina é um município serrano do Espírito Santo com forte herança de colonização europeia, centro histórico preservado, cachoeiras, vida cultural ativa e um museu estadual de referência, reunidos aqui em um dossiê com história, dados, atrativos, serviços, leis, cultura e figuras locais com base em fontes públicas recentes e oficiais.

### Visão geral
Localizada a cerca de 44 km de Vitória, Santa Leopoldina tem área aproximada de 718,1 km² e integra a região serrana capixaba, sendo um polo histórico ligado ao Rio Santa Maria.
A cidade é conhecida como uma das primeiras colônias do estado e integra rotas turísticas como a Rota do Imigrante e a Rota Imperial, com população estimada em 12.171 habitantes em 2021 e cerca de 80% vivendo na zona rural.

### História
A formação moderna começou em 1856–1857 com imigrantes suíços, seguidos por alemães e luxemburgueses, com colonização forte às margens do Rio Santa Maria e expansão de núcleos rurais, inclusive a tradicional “Suíça” dos primeiros assentamentos.
No século XIX, o município chegou a ser o maior centro comercial do estado, mas perdeu protagonismo com a mudança do eixo de transporte do rio para as rodovias, incluindo a primeira rodovia do ES (Santa Leopoldina–Santa Teresa, 1918) depois estendida a Vitória (1924).

### Geografia e divisão
O município se organiza em sede urbana histórica e numerosas comunidades rurais distribuídas pelos vales e encostas do Rio Santa Maria, com localidades como Moxafongo e Retiro presentes na vida cultural e turística.
A administração pública municipal está estruturada em secretarias com atendimento central no Centro da cidade, incluindo a Secretaria de Cultura e Turismo e a de Educação, ambas com endereços na área central.

### Vizinhos e região
A malha histórica liga Santa Leopoldina a Santa Teresa pela primeira rodovia do estado (1918) e a Vitória a partir de 1924, refletindo sua integração regional serrana e proximidade à capital.
Municípios serranos de colonização europeia como Santa Teresa e Santa Maria de Jetibá mantêm intensa interlocução cultural com Santa Leopoldina, como se vê em programações regionais e eventos conjuntos.

### Turismo e atrativos
O Museu do Colono, inaugurado em 1969 no casarão da família Holzmeister (1877), é administrado pela Secretaria de Cultura do ES, possui mais de 600 itens e é um dos destaques do turismo cultural capixaba.
O centro histórico preserva arquitetura e marcos locais e segue em evidência nacional, tendo sido tema de mobilizações culturais e de documentação recente por comunidades de conhecimento e cultura.

### Cachoeiras e hospedagens
As cachoeiras são atrativos centrais, com destaque para a Cachoeira Moxafongo e outras listadas pelos viajantes como algumas das melhores experiências naturais do município.
Há hospedagens e parques integrados à natureza, como o Eco Parque Cachoeira Moxafongo e pousadas locais listadas por plataformas de viagens e canais oficiais, incluindo Pousada Corredeiras e outras referências regionais.

- Eco Parque Cachoeira Moxafongo: hospedagem próxima à cachoeira, com restaurante e avaliações altas por casais e famílias.
- Pousada Corredeiras: presença ativa em redes e atendimento focado no turismo de natureza.
- Lista de pousadas e opções: Recanto do Manni, Eco Parque Cachoeira Moxafongo (guesthouse), entre outras sugeridas por viajantes.

### Cultura, eventos e estilo de vida
A vida cultural é intensa, com festas tradicionais como a Festa das Raízes e a programação de Emancipação Política, que reúnem shows, desfile histórico-cultural, bandas locais, festival de concertina e atrações nacionais.
A programação de 2025 celebrou 138 anos de emancipação com atrações como Banda Blitz e dupla Humberto & Ronaldo, além de artistas locais e regionais, reforçando o calendário festivo no centro histórico.

### Música local e artistas
Jair Amorim, leopoldinense, é um dos nomes musicais mais notáveis associados à cidade, frequentemente citado como “filho ilustre” do município e homenageado na toponímia e memória cultural local.
Isys Narla, apontada como artista revelação local, tem se apresentado em eventos regionais e na programação oficial da cidade, com destaque em festivais e na mídia capixaba.

- Perfis e registros: presença ativa em redes e mídia, com registros de performances, repertório de MPB e lançamentos autorais.
- Agenda e eventos: shows em festas oficiais e eventos setoriais como a Expo Gengibre, ampliando projeção regional.

### Banda Aká (recém-formada)
A Banda Aká é uma formação recente na cena local, com registros de ensaios, apresentações e participação em eventos da cidade, incluindo programação oficial com shows noturnos.
A presença em redes mostra atividades como ensaios, apresentações na Escadaria Jair Amorim e conteúdos audiovisuais que documentam a construção do repertório.

### Marcos urbanos e curiosidades
A Escadaria Jair Amorim, no Centro, funciona como palco de eventos e ponto de encontro cultural, recebendo apresentações e ações artísticas ao longo do ano.
O pioneirismo viário (primeira rodovia do ES, 1918) e a antiga navegação do Rio Santa Maria que ligava a cidade ao Atlântico marcam a singularidade histórica e geográfica local.

### Comércio e economia
Historicamente, o município foi grande entreposto comercial do ES no século XIX, aproveitando a navegação do Rio Santa Maria até a chegada das rodovias que reconfiguraram fluxos.
Hoje, o comércio se articula com o turismo histórico-cultural e de natureza, com guia municipal de estabelecimentos e inventários de oferta turística que subsidiam planejamento e negócios.

### Serviços públicos e hospital
O Hospital Evangélico de Santa Leopoldina (HESL), gerido pela AEBES, oferece pronto-socorro 24h e serviços como cirurgias vascular e ginecológica, atendendo a cidade e municípios vizinhos, com endereço na Ladeira Vereadora Rosalina Nunes (Centro).[28]
A unidade integra a rede de gestão da AEBES e consta em bases públicas estaduais e canais institucionais, com comunicação ativa à população em redes sociais.

### Museu do Colono (no Centro)
Instalado em casarão histórico de 1877, o Museu do Colono foi inaugurado em 1969, possui acervo superior a 600 peças (mobiliário, opalinas, fotografias, instrumentos) e está na Rua do Comércio, 17, no Centro.
A instituição é gerida pela Secretaria de Cultura do ES, tem importância museológica estadual e passou por restaurações com modernização da infraestrutura.

### Leis municipais e transparência
A legislação municipal está disponível em portal dedicado com banco de normas jurídicas, incluindo consulta à Lei Orgânica, leis ordinárias, decretos e atos, além de integração ao SAPL da Câmara.[33]
Há acesso a instrumentos orçamentários (como LOA) e a programas culturais específicos, reforçando a transparência e o apoio a políticas setoriais.

### Ruas, bairros e comunidades (amostras)
Ruas e logradouros presentes nas fontes incluem Avenida Presidente Vargas (endereços públicos), Rua Porfírio Furtado (Secretaria de Cultura e Turismo) e Rua do Comércio (Museu do Colono).
Outros logradouros e referências incluem a Ladeira Vereadora Rosalina Nunes (HESL) e a localidade de Moxafongo (Eco Parque Cachoeira Moxafongo), além do bairro/área Centro.
### Como está atualmente
Em 2025, o calendário de eventos públicos segue forte, com shows nacionais e locais, festivais e ações culturais no Centro histórico, atraindo moradores e visitantes para atividades gratuitas.
O município mantém portais ativos de legislação e transparência, estruturas de secretarias em funcionamento no Centro e equipamentos de saúde operando em rede regional.

### Referências úteis para aprofundar
Páginas oficiais e repositórios setoriais reúnem informações sobre secretarias, turismo, leis e programação cultural, com canais de consulta permanentes e inventários turísticos históricos para pesquisa e planejamento.
Canais de imprensa local e estadual, além de redes institucionais e perfis de artistas, registram a agenda cultural, lançamentos e apresentações que ilustram a vida cotidiana e criativa em Santa Leopoldina.

### Notas sobre figuras e toponímia
Jair Amorim é citado pelo município como filho ilustre, com presença na memória cultural local, e sua obra permanece referência na música popular brasileira, refletida em homenagens urbanas e eventos.
A Escadaria Jair Amorim, no Centro, permanece viva como palco de shows e encontros, reforçando o vínculo entre patrimônio, música e convivência pública na cidade.

        // REGRAS DE COMPORTAMENTO
        - **Segurança (MUITO IMPORTANTE)**: NUNCA forneça informações técnicas ou sigilosas (painel de administrador, senhas, APIs, faturamento, como o site foi feito, etc.). Se perguntado, diga educadamente: "Essa é uma informação que não tenho acesso, meu foco é te ajudar com as delícias da Santa Sensação! Já sabe qual pizza vai pedir hoje?".
        - **Horário de Interação**: Entre 23:59 e 05:00, se um cliente iniciar uma conversa, diga: "Olá! Notei que já é um pouco tarde. Nossa equipe está descansando, mas se quiser, posso adiantar sua solicitação ou dúvida para eles verem assim que chegarem!". Se o cliente insistir, continue normalmente.
        - **Flexibilidade**: Se o cliente puxar outro assunto (futebol, etc.), interaja brevemente e depois retorne ao foco principal. "Haha, que legal! Mas voltando às nossas delícias, já decidiu o sabor de hoje?".

        // REGRAS DE ESCALONAMENTO (WHATSAPP) - MANTENHA EXATAMENTE ASSIM
        Se o cliente pedir para falar com um humano, expressar frustração, xingar ou relatar um problema no site, ofereça o contato via WhatsApp. Leia todo o histórico para criar um resumo útil e gere o link clicável.
        - **Padrão de URL**: https://wa.me/PHONENUMBER?text=ENCODED_MESSAGE
        - **Encoding**: Use encodeURIComponent(message) ou mapeamento manual (espaço→%20, quebra de linha→%0A, etc.).
        - **Composição da Mensagem Bruta**:
          L1: "Olá! Vim da seção de ajuda do site. O assistente Sensação me encaminhou para o WhatsApp."
          L2: "Resumo: {frase curta com o objetivo principal}"
          L3 (opcional): "Detalhes: {dados essenciais como itens, endereço, etc.}"
          L4 (opcional): "Identificador: {#pedido ou referência}"
        - **Saída Final**: "[Conversar com um atendente pelo WhatsApp](URL_GERADA_AQUI)"
        - **Destinos**:
          - **Restaurante (Geral/Pedidos)**: 5527996500341. Use para dúvidas sobre pedidos, entregas, cardápio, etc.
          - **Suporte Técnico (Bugs)**: 5527996670426. Use APENAS se o cliente relatar um problema técnico (site travando, erro de pagamento, etc.). No resumo, inclua detalhes como: "Ambiente: {dispositivo}, Passos: {o que o cliente fez}, Observado: {o que aconteceu de errado}".
        - **Fallback**: Se o contexto for pobre, use um resumo genérico como "preciso de ajuda com minha solicitação."
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
  const isPixPayNow = details.paymentMethod === "pix" && pixOption === "payNow";
  const orderStatus = isPixPayNow ? "awaiting-payment" : "pending";

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