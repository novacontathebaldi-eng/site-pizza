import React from 'react';

interface TermsOfServiceModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-text-on-light"><i className="fas fa-file-contract mr-2"></i>Termos de Serviço</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <div className="overflow-y-auto p-6 space-y-4 text-gray-700">
                    <p className="text-sm"><strong>Última atualização:</strong> 30 de Julho de 2024</p>
                    
                    <h3 className="text-lg font-bold text-text-on-light pt-2">1. Aceitação dos Termos</h3>
                    <p>Ao criar uma conta e utilizar o site da Pizzaria Santa Sensação, você concorda em cumprir e estar vinculado a estes Termos de Serviço. Se você não concordar com estes termos, não deverá criar uma conta ou utilizar nossos serviços.</p>

                    <h3 className="text-lg font-bold text-text-on-light pt-2">2. Conta do Usuário</h3>
                    <p>Para acessar certas funcionalidades, você pode ser solicitado a criar uma conta. Você concorda em:</p>
                    <ul className="list-disc list-inside space-y-1 pl-4">
                        <li>Fornecer informações verdadeiras, precisas, atuais e completas sobre si mesmo conforme solicitado pelo formulário de registro.</li>
                        <li>Manter a segurança de sua senha e identificação.</li>
                        <li>Ser o único responsável por todas as atividades que ocorram em sua conta.</li>
                    </ul>

                    <h3 className="text-lg font-bold text-text-on-light pt-2">3. Pedidos e Pagamentos</h3>
                    <p>Ao realizar um pedido em nosso site, você concorda que:</p>
                    <ul className="list-disc list-inside space-y-1 pl-4">
                        <li>Todas as informações fornecidas para o pedido (contato, endereço, etc.) são precisas.</li>
                        <li>O cálculo do valor total, incluindo itens e taxa de entrega, é realizado no momento do checkout e deve ser pago conforme o método selecionado.</li>
                        <li>Para pagamentos online (PIX), a confirmação do pagamento é necessária para que o pedido entre em produção. Caso o pagamento expire, o pedido não será processado.</li>
                        <li>Para pagamentos na entrega, você se compromete a efetuar o pagamento integral ao receber seu pedido.</li>
                    </ul>
                    
                    <h3 className="text-lg font-bold text-text-on-light pt-2">4. Entregas e Retiradas</h3>
                    <p>Nossa área de entrega é limitada. Certifique-se de que seu endereço está dentro da nossa área de cobertura antes de selecionar a opção de entrega. O tempo de entrega é uma estimativa e pode variar. Para retiradas, o pedido estará pronto no tempo estimado informado.</p>

                    <h3 className="text-lg font-bold text-text-on-light pt-2">5. Cancelamentos e Estornos</h3>
                    <p>Pedidos podem ser cancelados pela nossa equipe caso haja algum problema com o pagamento ou com a entrega. Se você precisar cancelar um pedido, entre em contato conosco o mais rápido possível. Pedidos que já entraram em produção não poderão ser cancelados. Estornos de pagamentos online serão processados conforme as políticas do nosso provedor de pagamentos e podem levar alguns dias para serem concluídos.</p>
                    
                    <h3 className="text-lg font-bold text-text-on-light pt-2">6. Conduta do Usuário</h3>
                    <p>Você concorda em não usar o site para fins ilegais ou fraudulentos. Qualquer tentativa de manipular preços, fornecer informações falsas ou interferir no funcionamento do site resultará no encerramento de sua conta.</p>

                    <h3 className="text-lg font-bold text-text-on-light pt-2">7. Alterações nos Termos</h3>
                    <p>Reservamo-nos o direito de modificar estes Termos de Serviço a qualquer momento. Notificaremos sobre alterações significativas, mas é sua responsabilidade revisar os termos periodicamente. O uso continuado do serviço após qualquer alteração constitui sua aceitação dos novos termos.</p>
                    
                    <h3 className="text-lg font-bold text-text-on-light pt-2">8. Contato</h3>
                    <p>Se tiver alguma dúvida sobre estes Termos de Serviço, entre em contato conosco através dos canais de atendimento disponíveis no site.</p>
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