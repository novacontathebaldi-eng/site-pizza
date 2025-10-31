import React from 'react';

interface PrivacyPolicyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-text-on-light"><i className="fas fa-user-shield mr-2"></i>Política de Privacidade</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <div className="overflow-y-auto p-6 space-y-4 text-gray-700">
                    <p className="text-sm"><strong>Última atualização:</strong> 30 de Julho de 2024</p>
                    
                    <h3 className="text-lg font-bold text-text-on-light pt-2">1. Introdução</h3>
                    <p>A Pizzaria Santa Sensação ("nós", "nosso") está comprometida em proteger a privacidade de seus clientes ("você"). Esta Política de Privacidade explica como coletamos, usamos, compartilhamos e protegemos suas informações pessoais quando você utiliza nosso site e serviços.</p>

                    <h3 className="text-lg font-bold text-text-on-light pt-2">2. Informações que Coletamos</h3>
                    <p>Coletamos as seguintes informações pessoais para processar seus pedidos e melhorar sua experiência:</p>
                    <ul className="list-disc list-inside space-y-1 pl-4">
                        <li><strong>Informações de Identificação:</strong> Nome completo, CPF (para pagamentos com PIX online).</li>
                        <li><strong>Informações de Contato:</strong> Número de telefone/WhatsApp, endereço de e-mail (para criação de conta).</li>
                        <li><strong>Informações de Entrega:</strong> Endereço completo (rua, número, bairro, cidade, CEP, complemento).</li>
                        <li><strong>Informações do Pedido:</strong> Itens do pedido, histórico de pedidos, observações e restrições alimentares.</li>
                        <li><strong>Informações de Pagamento:</strong> Método de pagamento escolhido. Não armazenamos dados de cartão de crédito; estes são processados de forma segura por nosso parceiro de pagamentos (Mercado Pago).</li>
                    </ul>

                    <h3 className="text-lg font-bold text-text-on-light pt-2">3. Como Usamos Suas Informações</h3>
                    <p>Utilizamos suas informações para as seguintes finalidades:</p>
                    <ul className="list-disc list-inside space-y-1 pl-4">
                        <li><strong>Processamento de Pedidos:</strong> Para receber, preparar, entregar ou disponibilizar para retirada seus pedidos e reservas.</li>
                        <li><strong>Comunicação:</strong> Para entrar em contato com você sobre seu pedido, confirmar reservas ou responder a solicitações de suporte.</li>
                        <li><strong>Personalização:</strong> Para salvar seus dados e endereços em sua conta, facilitando pedidos futuros.</li>
                        <li><strong>Segurança:</strong> Para prevenir fraudes e garantir a segurança de nossos serviços.</li>
                        <li><strong>Obrigações Legais:</strong> Para cumprir com requisitos fiscais e legais.</li>
                    </ul>

                    <h3 className="text-lg font-bold text-text-on-light pt-2">4. Compartilhamento de Informações</h3>
                    <p>Não vendemos ou alugamos suas informações pessoais. Podemos compartilhar suas informações com:</p>
                    <ul className="list-disc list-inside space-y-1 pl-4">
                        <li><strong>Provedores de Serviço:</strong> Empresas que nos auxiliam na operação, como o gateway de pagamento (Mercado Pago) para processar transações.</li>
                        <li><strong>Autoridades Legais:</strong> Se exigido por lei ou para proteger nossos direitos.</li>
                    </ul>

                    <h3 className="text-lg font-bold text-text-on-light pt-2">5. Armazenamento e Segurança</h3>
                    <p>Suas informações são armazenadas de forma segura em servidores do Google Firebase. Implementamos medidas de segurança técnicas e organizacionais para proteger seus dados contra acesso não autorizado, alteração ou destruição.</p>
                    
                    <h3 className="text-lg font-bold text-text-on-light pt-2">6. Uso de Cookies</h3>
                    <p>Nosso site utiliza cookies essenciais para o seu funcionamento. Cookies são pequenos arquivos de texto armazenados em seu dispositivo que nos ajudam a:</p>
                    <ul className="list-disc list-inside space-y-1 pl-4">
                        <li>Manter seu carrinho de compras ativo durante a navegação.</li>
                        <li>Lembrar se você já consentiu com nossa política de cookies.</li>
                        <li>Manter você conectado à sua conta.</li>
                    </ul>
                    <p>Ao utilizar nosso site, você concorda com o uso desses cookies essenciais.</p>

                    <h3 className="text-lg font-bold text-text-on-light pt-2">7. Seus Direitos (LGPD)</h3>
                    <p>De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem o direito de:</p>
                    <ul className="list-disc list-inside space-y-1 pl-4">
                        <li>Confirmar a existência de tratamento de seus dados.</li>
                        <li>Acessar seus dados.</li>
                        <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
                        <li>Solicitar a eliminação de dados desnecessários ou tratados em desconformidade com a LGPD.</li>
                        <li>Solicitar a portabilidade dos dados a outro fornecedor de serviço.</li>
                    </ul>
                    <p>Para exercer seus direitos, entre em contato conosco.</p>

                    <h3 className="text-lg font-bold text-text-on-light pt-2">8. Contato</h3>
                    <p>Se você tiver alguma dúvida sobre esta Política de Privacidade, entre em contato conosco através do nosso WhatsApp ou da seção de ajuda do site.</p>
                </div>
                 <div className="p-4 bg-gray-50 border-t flex justify-end">
                    <button onClick={onClose} className="bg-accent text-white font-semibold py-2 px-6 rounded-lg hover:bg-opacity-90">
                       Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};