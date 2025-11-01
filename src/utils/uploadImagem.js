// Importa o cliente Supabase que acabamos de configurar
// ATUALIZADO: Usando o alias '@/' para um caminho mais robusto.
import { supabase } from '@/services/supabase';

/**
 * Função para fazer upload de imagem diretamente para o Supabase Storage.
 * @param {File} arquivo - Arquivo de imagem selecionado pelo input.
 * @returns {Promise<string>} - A URL pública da imagem após o upload.
 */
export async function uploadImagem(arquivo) {
  try {
    // Validação 1: Arquivo existe?
    if (!arquivo) {
      throw new Error('❌ Nenhum arquivo selecionado');
    }

    // Validação 2: Tamanho máximo 50 MB (limite do Supabase Free Tier)
    const tamanhoMaximo = 50 * 1024 * 1024; // 50 MB em bytes
    if (arquivo.size > tamanhoMaximo) {
      throw new Error(`❌ Arquivo muito grande. Máximo: 50 MB. Seu arquivo: ${(arquivo.size / 1024 / 1024).toFixed(2)} MB`);
    }

    // Validação 3: É uma imagem?
    if (!arquivo.type.startsWith('image/')) {
      throw new Error('❌ O arquivo precisa ser uma imagem');
    }

    // Gera um nome de arquivo único para evitar conflitos, usando timestamp.
    const timestamp = Date.now();
    const nomeOriginal = arquivo.name.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
    const nomeArquivo = `${timestamp}_${nomeOriginal}`;

    console.log('⏳ Enviando para o Supabase Storage...', nomeArquivo);

    // Faz o upload do arquivo diretamente para o bucket 'sitepizza' no Supabase.
    const { data, error } = await supabase.storage
      .from('sitepizza') // Nome do seu bucket no Supabase
      .upload(nomeArquivo, arquivo, {
        cacheControl: '3600', // Cache de 1 hora
        upsert: false, // Não sobrescreve se o arquivo já existir
      });

    // Se o Supabase retornar um erro, lança o erro para ser tratado.
    if (error) {
      throw error;
    }

    // Se o upload foi bem-sucedido, pega a URL pública do arquivo.
    const { data: { publicUrl } } = supabase.storage
      .from('sitepizza')
      .getPublicUrl(nomeArquivo);

    console.log('✅ Upload bem-sucedido!');
    console.log('🔗 URL da imagem:', publicUrl);

    // Retorna a URL pública da imagem.
    return publicUrl;

  } catch (erro) {
    // Em caso de qualquer erro no processo, exibe no console e lança para a UI.
    console.error('❌ Erro no upload:', erro.message);
    throw erro;
  }
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