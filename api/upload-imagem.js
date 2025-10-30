import { createClient } from '@supabase/supabase-js'

// Inicializa Supabase com variáveis de ambiente (seguras)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

export default async function handler(req, res) {
  // Apenas POST é permitido
  if (req.method !== 'POST') {
    return res.status(405).json({
      erro: 'Método não permitido. Use POST.'
    })
  }

  try {
    // Recebe arquivo em base64, nome e o tipo do arquivo (MIME type)
    const { arquivo, nomeArquivo, mimeType } = req.body

    // Valida dados
    if (!arquivo || !nomeArquivo) {
      return res.status(400).json({ 
        erro: 'Arquivo ou nome faltando' 
      })
    }

    // Converte base64 para Buffer
    const base64Data = arquivo.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')

    // Faz upload para Supabase Storage
    const { data, error } = await supabase.storage
      .from('sitepizza')
      .upload(nomeArquivo, buffer, {
        contentType: mimeType || 'image/jpeg', // Usa o tipo do arquivo enviado
        upsert: false // Não sobrescreve se existir
      })

    // Se houve erro
    if (error) {
      console.error('Erro Supabase:', error)
      return res.status(500).json({ 
        erro: 'Erro ao fazer upload no Supabase',
        detalhe: error.message
      })
    }

    // Construir URL pública
    const urlPublica = `${process.env.SUPABASE_URL}/storage/v1/object/public/sitepizza/${nomeArquivo}`

    // Retorna sucesso com URL
    res.status(200).json({
      sucesso: true,
      url: urlPublica,
      mensagem: 'Imagem enviada com sucesso',
      arquivo: nomeArquivo
    })
  } catch (erro) {
    console.error('Erro:', erro)
    res.status(500).json({
      erro: 'Erro interno do servidor',
      detalhe: erro.message
    })
  }
}
