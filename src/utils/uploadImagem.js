/**

Função para fazer upload de imagem

@param {File} arquivo - Arquivo selecionado pelo input

@returns {Promise<string>} - URL pública da imagem
*/
export async function uploadImagem(arquivo) {
  try {
    // Validação 1: Arquivo existe?
    if (!arquivo) {
      throw new Error('❌ Nenhum arquivo selecionado')
    }

    // Validação 2: Tamanho máximo 50 MB
    const tamanhoMaximo = 50 * 1024 * 1024 // 50 MB em bytes
    if (arquivo.size > tamanhoMaximo) {
      throw new Error(`❌ Arquivo muito grande. Máximo: 50 MB. Seu arquivo: ${(arquivo.size / 1024 / 1024).toFixed(2)} MB`)
    }

    // Validação 3: É imagem?
    if (!arquivo.type.startsWith('image/')) {
      throw new Error('❌ O arquivo precisa ser uma imagem')
    }

    // Gera nome único com timestamp
    const timestamp = Date.now()
    const nomeOriginal = arquivo.name
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Remove caracteres especiais
      .toLowerCase()
    const nomeArquivo = `${timestamp}_${nomeOriginal}`

    console.log('⏳ Processando arquivo...', nomeArquivo)

    // Converte arquivo para base64
    const base64 = await lerArquivoBase64(arquivo)

    console.log('⏳ Enviando para servidor...')

    // Chama função do Vercel
    const response = await fetch('/api/upload-imagem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        arquivo: base64, // Dados em base64
        nomeArquivo: nomeArquivo,
        mimeType: arquivo.type // Enviando o tipo do arquivo
      })
    })

    const dados = await response.json()

    // Se houve erro na resposta
    if (!response.ok) {
      // Tenta extrair uma mensagem de erro mais detalhada do corpo da resposta
      const erroMsg = dados.erro || dados.detalhe || 'Erro desconhecido ao fazer upload';
      throw new Error(erroMsg);
    }

    console.log('✅ Upload bem-sucedido!')
    console.log('🔗 URL da imagem:', dados.url)

    return dados.url

  } catch (erro) {
    console.error('❌ Erro no upload:', erro.message)
    // Re-lança o erro para que a UI possa capturá-lo
    throw erro
  }
}

/**

Helper: Converte arquivo para base64

@param {File} arquivo

@returns {Promise<string>}
*/
function lerArquivoBase64(arquivo) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      resolve(e.target.result) // base64 string
    }

    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo'))
    }

    reader.readAsDataURL(arquivo)
  })
}

/**

EXEMPLO DE USO:

try {

const url = await uploadImagem(arquivo)

console.log('Imagem salva em:', url)

} catch (erro) {

alert('Erro: ' + erro.message)

}
*/