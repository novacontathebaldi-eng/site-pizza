import React, { useState, useEffect, useRef } from 'react';
// FIX: Corrected the import path for the `ChatMessage` type. It is defined in `../types` not `../App`.
import { ChatMessage } from '../types';

interface ChatbotProps {
    isOpen: boolean;
    onClose: () => void;
    messages: ChatMessage[];
    onSendMessage: (message: string) => void;
    isSending: boolean;
}

const parseMessage = (content: string) => {
    // Regex para encontrar links markdown [texto](url) ou texto em negrito **texto**
    const combinedRegex = /\[([^\]]+)\]\(([^)]+)\)|\*\*(.+?)\*\*/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = combinedRegex.exec(content)) !== null) {
        // Adiciona o texto simples antes da correspondência atual
        if (match.index > lastIndex) {
            parts.push(content.substring(lastIndex, match.index));
        }

        const [fullMatch, linkText, linkUrl, boldText] = match;

        // Verifica se a correspondência é um link
        if (linkText && linkUrl) {
            parts.push(<a key={`${linkUrl}-${lastIndex}`} href={linkUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold hover:underline">{linkText}</a>);
        } 
        // Verifica se a correspondência é um texto em negrito
        else if (boldText) {
            parts.push(<strong key={`bold-${lastIndex}`}>{boldText}</strong>);
        }
        
        lastIndex = match.index + fullMatch.length;
    }

    // Adiciona o texto restante após a última correspondência
    if (lastIndex < content.length) {
        parts.push(content.substring(lastIndex));
    }

    return parts.map((part, index) => <React.Fragment key={index}>{part}</React.Fragment>);
};


export const Chatbot: React.FC<ChatbotProps> = ({ isOpen, onClose, messages, onSendMessage, isSending }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isSending]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            onSendMessage(input);
            setInput('');
        }
    };

    return (
        <div 
            aria-hidden={!isOpen}
            className={`fixed bottom-4 right-4 left-4 sm:left-auto sm:w-full sm:max-w-sm h-[70vh] max-h-[600px] bg-white rounded-2xl shadow-2xl z-50 flex flex-col transform transition-all duration-300 ease-in-out ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0 pointer-events-none'}`}
        >
            <header className="flex justify-between items-center p-4 bg-brand-green-700 text-text-on-dark rounded-t-2xl flex-shrink-0">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <i className="fas fa-robot"></i>
                    Sensação - O Assistente Inteligente
                </h2>
                <button onClick={onClose} className="text-text-on-dark/70 hover:text-white text-2xl" aria-label="Fechar chat">&times;</button>
            </header>

            <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`whitespace-pre-wrap max-w-[85%] rounded-2xl px-4 py-2 ${msg.role === 'user' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                            {parseMessage(msg.content)}
                        </div>
                    </div>
                ))}
                 {isSending && (
                    <div className="flex justify-start">
                        <div className="bg-gray-200 text-gray-800 rounded-2xl rounded-bl-none px-4 py-2">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            
            <form onSubmit={handleSend} className="p-4 border-t border-gray-200 flex items-center gap-2 flex-shrink-0">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Digite sua pergunta..."
                    className="w-full px-4 py-2 border rounded-full focus:ring-2 focus:ring-accent"
                    disabled={isSending}
                />
                <button 
                    type="submit" 
                    disabled={!input.trim() || isSending}
                    className="bg-accent text-white w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    aria-label="Enviar mensagem"
                >
                    <i className="fas fa-paper-plane"></i>
                </button>
            </form>
        </div>
    );
};