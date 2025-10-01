import React, { useState, useEffect } from 'react';

interface SupportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [subject, setSubject] = useState('Access Difficulty');
    const [customSubject, setCustomSubject] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!isOpen) {
            // Reset form state when modal closes for a better UX
            setName('');
            setEmail('');
            setSubject('Access Difficulty');
            setCustomSubject('');
            setMessage('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const finalSubject = subject === 'Other' ? customSubject : subject;
        const body = `
Nome: ${name}
Email: ${email}
--------------------
Mensagem:
${message}
        `.trim();

        const mailtoLink = `mailto:th3.suporte@gmail.com?subject=${encodeURIComponent(finalSubject)}&body=${encodeURIComponent(body)}`;

        window.location.href = mailtoLink;
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-text-on-light"><i className="fas fa-envelope-open-text mr-2"></i>Contato com Suporte</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <div className="overflow-y-auto p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1">Seu Nome *</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border rounded-md" required />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Seu E-mail *</label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 border rounded-md" required />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1">Assunto *</label>
                            <select value={subject} onChange={e => setSubject(e.target.value)} className="w-full px-3 py-2 border rounded-md bg-white" required>
                                <option value="Access Difficulty">Dificuldade de Acesso</option>
                                <option value="Order Inquiry">Dúvida sobre Pedido</option>
                                <option value="Feature Suggestion">Sugestão de Funcionalidade</option>
                                <option value="Other">Outro</option>
                            </select>
                        </div>
                        {subject === 'Other' && (
                            <div className="animate-fade-in-up">
                                <label className="block text-sm font-semibold mb-1">Assunto Personalizado *</label>
                                <input 
                                    type="text" 
                                    value={customSubject} 
                                    onChange={e => setCustomSubject(e.target.value)} 
                                    className="w-full px-3 py-2 border rounded-md" 
                                    placeholder="Digite o assunto"
                                    required 
                                />
                            </div>
                        )}
                         <div>
                            <label className="block text-sm font-semibold mb-1">Mensagem *</label>
                            <textarea value={message} onChange={e => setMessage(e.target.value)} className="w-full px-3 py-2 border rounded-md" rows={5} required />
                        </div>

                        <div className="flex justify-end pt-4">
                            <button type="submit" className="w-full md:w-auto bg-accent text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-opacity-90 transition-all">
                                <i className="fas fa-paper-plane mr-2"></i>Enviar Mensagem
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};