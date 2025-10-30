// Função auxiliar para converter um arquivo (File) para uma string base64
const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

/**
 * Função para fazer upload de imagem, enviando-a para nossa API no servidor Vercel.
 * @param {File} arquivo - Arquivo de imagem selecionado.
 * @returns {Promise<string>} - A URL pública da imagem após o upload.
 */
export async function uploadImagem(arquivo) {
  try {
    // Validação 1: Arquivo existe?
    if (!arquivo) {
      throw new Error('Nenhum arquivo selecionado');
    }
    
    // Validação 2: Limite de tamanho de 4.5MB (limite da Vercel no plano Hobby)
    const tamanhoMaximo = 4.5 * 1024 * 1024;
    if (arquivo.size > tamanhoMaximo) {
        throw new Error(`Arquivo muito grande. O limite para envio pelo painel é de 4.5 MB.`);
    }

    // Converte o arquivo para base64 para poder enviá-lo via JSON
    const base64Arquivo = await fileToBase64(arquivo);

    // Gera um nome de arquivo único para evitar conflitos
    const timestamp = Date.now();
    const nomeOriginal = arquivo.name.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
    const nomeArquivo = `${timestamp}_${nomeOriginal}`;

    console.log('⏳ Processando arquivo...', nomeArquivo);

    // Envia os dados para a nossa função de servidor na Vercel
    const response = await fetch('/api/upload-imagem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        arquivo: base64Arquivo,
        nomeArquivo: nomeArquivo,
        mimeType: arquivo.type,
      }),
    });
    
    console.log('⏳ Enviando para servidor...');

    const data = await response.json();

    // Se a resposta do servidor não for OK, lança um erro com a mensagem do servidor
    if (!response.ok) {
      throw new Error(data.detalhe || data.erro || 'Erro desconhecido no servidor.');
    }
    
    console.log('✅ Upload bem-sucedido!', data.url);

    // Retorna a URL pública da imagem
    return data.url;

  } catch (erro) {
    // Em caso de erro, exibe no console e lança para a UI
    console.error('❌ Erro no upload:', erro.message);
    // Lançar o erro novamente para que o componente que chamou a função possa tratá-lo
    throw erro;
  }
}
