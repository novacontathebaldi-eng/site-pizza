import React, { useState, useEffect } from 'react';

interface SupportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
    // --- ESTADOS DO FORMULÁRIO ---
    // Armazenam os dados inseridos pelo usuário.
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState(''); // Novo campo de telefone
    const [subject, setSubject] = useState('Access Difficulty');
    const [customSubject, setCustomSubject] = useState('');
    const [message, setMessage] = useState('');

    // --- ESTADOS DE CONTROLE DE ENVIO E FEEDBACK ---
    // Controlam o estado visual do formulário durante e após o envio.
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [responseMessage, setResponseMessage] = useState({ type: '', text: '' });

    // Efeito para limpar o formulário e as mensagens de feedback quando o modal é fechado.
    // Isso garante que o usuário sempre encontre um formulário limpo ao abri-lo.
    useEffect(() => {
        if (!isOpen) {
            setName('');
            setEmail('');
            setPhone('');
            setSubject('Access Difficulty');
            setCustomSubject('');
            setMessage('');
            setResponseMessage({ type: '', text: '' });
            setIsSubmitting(false);
        }
    }, [isOpen]);

    // Efeito para limpar a mensagem de feedback (sucesso ou erro) após 5 segundos.
    useEffect(() => {
        if (responseMessage.text) {
            const timer = setTimeout(() => {
                setResponseMessage({ type: '', text: '' });
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [responseMessage]);

    if (!isOpen) return null;

    // --- FUNÇÃO DE ENVIO DO FORMULÁRIO ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); // Previne o comportamento padrão do formulário (recarregar a página).
        setIsSubmitting(true);
        setResponseMessage({ type: '', text: '' });

        const finalSubject = subject === 'Other' ? customSubject : subject;

        // Monta o objeto de dados que será enviado para a API.
        const formData = {
            access_key: "51bd2086-744f-4eb0-961f-c6ff1d490fed", // Sua chave de acesso Web3Forms.
            name: name,
            email: email,
            phone: phone || "Não informado", // Adiciona o telefone ou um valor padrão se estiver vazio.
            subject: finalSubject,
            message: message,
            botcheck: "" // Campo "honeypot" para proteção contra spam.
        };

        try {
            // Realiza a chamada para a API usando Fetch.
            const res = await fetch("https://api.web3forms.com/submit", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(formData)
            });

            const jsonResponse = await res.json();

            if (jsonResponse.success) {
                // Se o envio for bem-sucedido:
                setResponseMessage({ type: 'success', text: 'Obrigado! Sua mensagem foi enviada com sucesso.' });
                // Limpa todos os campos do formulário.
                setName('');
                setEmail('');
                setPhone('');
                setSubject('Access Difficulty');
                setMessage('');
                setCustomSubject('');
            } else {
                // Se a API retornar um erro:
                console.error("Erro da API Web3Forms:", jsonResponse);
                setResponseMessage({ type: 'error', text: 'Erro ao enviar mensagem. Tente novamente.' });
            }
        } catch (error) {
            // Se ocorrer um erro de rede (ex: sem internet):
            console.error("Erro de rede ao enviar formulário:", error);
            setResponseMessage({ type: 'error', text: 'Erro ao enviar mensagem. Verifique sua conexão.' });
        } finally {
            // Garante que o estado de "enviando" seja desativado ao final do processo.
            setIsSubmitting(false);
        }
    };

    // Define a classe CSS para a mensagem de feedback com base no tipo (sucesso ou erro).
    const feedbackClass = responseMessage.type === 'success'
        ? 'bg-green-100 text-green-700'
        : 'bg-red-100 text-red-700';

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-text-on-light"><i className="fas fa-envelope-open-text mr-2"></i>Contato com Suporte</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl" disabled={isSubmitting}>&times;</button>
                </div>
                <div className="overflow-y-auto p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1" htmlFor="support-name">Seu Nome *</label>
                                <input id="support-name" type="text" name="name" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border rounded-md" required />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1" htmlFor="support-email">Seu E-mail *</label>
                                <input id="support-email" type="email" name="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 border rounded-md" required />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1" htmlFor="support-phone">Telefone (opcional)</label>
                            <input id="support-phone" type="tel" name="phone" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1" htmlFor="support-subject">Assunto *</label>
                            <select id="support-subject" name="subject" value={subject} onChange={e => setSubject(e.target.value)} className="w-full px-3 py-2 border rounded-md bg-white" required>
                                <option value="Access Difficulty">Dificuldade de Acesso</option>
                                <option value="Order Inquiry">Dúvida sobre Pedido</option>
                                <option value="Feature Suggestion">Sugestão de Funcionalidade</option>
                                <option value="Other">Outro</option>
                            </select>
                        </div>
                        {subject === 'Other' && (
                            <div className="animate-fade-in-up">
                                <label className="block text-sm font-semibold mb-1" htmlFor="support-custom-subject">Assunto Personalizado *</label>
                                <input
                                    id="support-custom-subject"
                                    type="text"
                                    name="custom_subject"
                                    value={customSubject}
                                    onChange={e => setCustomSubject(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md"
                                    placeholder="Digite o assunto"
                                    required
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-semibold mb-1" htmlFor="support-message">Mensagem *</label>
                            <textarea id="support-message" name="message" value={message} onChange={e => setMessage(e.target.value)} className="w-full px-3 py-2 border rounded-md" rows={5} required />
                        </div>
                        
                        {/* Container para o botão e a mensagem de feedback */}
                        <div className="pt-4 space-y-3">
                            {/* Mensagem de Feedback (Sucesso/Erro) */}
                            {responseMessage.text && (
                                <div className={`p-3 rounded-md text-center text-sm font-semibold animate-fade-in-up ${feedbackClass}`} role="alert">
                                    {responseMessage.text}
                                </div>
                            )}

                            <div className="flex justify-end">
                                <button type="submit" disabled={isSubmitting} className="w-full md:w-auto bg-accent text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-opacity-90 transition-all flex items-center justify-center disabled:bg-opacity-70 disabled:cursor-not-allowed">
                                    {isSubmitting ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin mr-2"></i>
                                            Enviando...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-paper-plane mr-2"></i>
                                            Enviar Mensagem
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};