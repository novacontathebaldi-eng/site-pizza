import { createClient } from '@supabase/supabase-js';

// As credenciais são lidas das Variáveis de Ambiente na Vercel para segurança
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export default async function handler(req, res) {
  // Permite apenas requisições do tipo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  try {
    const { arquivo, nomeArquivo, mimeType } = req.body;

    // Validação básica dos dados recebidos
    if (!arquivo || !nomeArquivo) {
      return res.status(400).json({ erro: 'Dados do arquivo ou nome faltando' });
    }

    // A imagem chega como uma string base64 (ex: "data:image/jpeg;base64,...").
    // Pegamos apenas a parte dos dados, depois da vírgula.
    const base64Data = arquivo.split(',')[1];
    // Convertendo a string base64 em um formato que o Supabase entende (Buffer).
    const buffer = Buffer.from(base64Data, 'base64');

    // Faz o upload para o Supabase Storage
    const { data, error } = await supabase.storage
      .from('sitepizza') // Nome do bucket
      .upload(nomeArquivo, buffer, {
        contentType: mimeType || 'image/jpeg', // Garante que o tipo do arquivo seja enviado
        upsert: false,
      });

    // Se o Supabase retornar um erro, o enviamos na resposta
    if (error) {
      console.error('Erro no upload para o Supabase:', error);
      return res.status(500).json({ 
        erro: 'Erro ao fazer upload para o Supabase',
        detalhe: error.message 
      });
    }

    // Constrói a URL pública da imagem para retornar ao frontend
    const urlPublica = `${process.env.SUPABASE_URL}/storage/v1/object/public/sitepizza/${nomeArquivo}`;

    // Retorna uma resposta de sucesso com a URL da imagem
    res.status(200).json({
      sucesso: true,
      url: urlPublica,
      mensagem: 'Imagem enviada com sucesso'
    });

  } catch (erro) {
    console.error('Erro interno na função:', erro);
    res.status(500).json({ 
      erro: 'Erro interno no servidor',
      detalhe: erro.message 
    });
  }
}
