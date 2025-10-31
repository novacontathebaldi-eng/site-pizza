// Esta função de servidor (serverless function) foi desativada.
// O upload de imagens agora é feito diretamente do navegador (cliente) para o Supabase Storage
// para evitar limites de tamanho de arquivo do servidor (4.5MB no plano Vercel Hobby).
// O novo método está implementado em 'src/utils/uploadImagem.js'.
// Manter este arquivo aqui com um erro explícito ajuda a diagnosticar se o código antigo
// ainda está sendo chamado por engano no frontend.

export default async function handler(req, res) {
  res.status(410).json({ 
    erro: 'API Desativada (Gone)',
    detalhe: 'O método de upload de imagens foi migrado para o lado do cliente para maior eficiência. Por favor, verifique se seu código frontend está usando a função de upload direto para o Supabase Storage.'
  });
}
