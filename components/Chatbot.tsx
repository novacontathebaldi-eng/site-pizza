import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';

type Message = {
    role: 'user' | 'model';
    text: string;
};

export const Chatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const chatRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const initChat = () => {
            try {
                if (!process.env.API_KEY) {
                    console.error("API Key do Gemini não encontrada.");
                    setError("A configuração do assistente virtual está indisponível.");
                    return;
                }
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                chatRef.current = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: {
                      systemInstruction: "Você é um atendente virtual amigável e prestativo da pizzaria 'Santa Sensação'. Seu nome é Santo. Sua principal função é ajudar os clientes com dúvidas sobre o cardápio, sabores de pizza, horário de funcionamento, endereço e como fazer um pedido. Seja sempre cordial. Se o cliente perguntar se você é um robô, diga que é o assistente virtual da casa. Se em algum momento o cliente pedir para falar com um humano, um representante, um atendente, ou expressar frustração, você DEVE oferecer o contato via WhatsApp. A mensagem deve ser: 'Entendo. Para falar com um de nossos atendentes, por favor, clique no link a seguir: [Falar no WhatsApp](https://wa.me/5527996500341)'. Não forneça o link para outros fins. O horário de funcionamento é de Quarta a Domingo, das 19h às 22h. O endereço é Rua Porfilio Furtado, 178, Centro - Santa Leopoldina, ES.",
                    },
                });
                setMessages([{ role: 'model', text: 'Olá! Eu sou o Santo, seu assistente virtual da Santa Sensação. Como posso ajudar?' }]);
            } catch (e) {
                console.error("Erro ao inicializar o chatbot:", e);
                setError("Não foi possível iniciar o assistente virtual.");
            }
        };
        initChat();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading || !chatRef.current) return;

        const userMessage: Message = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);
        
        // Add a placeholder for the streaming response
        setMessages(prev => [...prev, { role: 'model', text: '' }]);

        try {
            const stream = await chatRef.current.sendMessageStream({ message: userMessage.text });

            for await (const chunk of stream) {
                 setMessages(prev => {
                    const lastMessage = prev[prev.length - 1];
                    if (lastMessage.role === 'model') {
                        const updatedMessages = [...prev];
                        updatedMessages[prev.length - 1] = { ...lastMessage, text: lastMessage.text + chunk.text };
                        return updatedMessages;
                    }
                    return prev; // Should not happen if placeholder is added correctly
                });
            }
        } catch (e) {
            console.error("Erro ao enviar mensagem para o Gemini:", e);
            setError("Desculpe, não consegui processar sua mensagem. Tente novamente.");
            setMessages(prev => prev.slice(0, -1)); // Remove placeholder
        } finally {
            setIsLoading(false);
        }
    };
    
    // Function to render text with markdown links
    const renderMessageText = (text: string) => {
        const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
        const parts = text.split(linkRegex);

        return parts.map((part, index) => {
            if (index % 3 === 1) { // This is the link text
                const url = parts[index + 1];
                return (
                    <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 font-bold hover:underline">
                       <i className="fab fa-whatsapp mr-1"></i> {part}
                    </a>
                );
            } else if (index % 3 === 2) { // This is the URL, which we don't render directly
                return null;
            } else { // This is regular text
                return part;
            }
        });
    };


    return (
        <>
            {/* FAB */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 bg-brand-green-700 text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center text-3xl z-40 transition-transform transform hover:scale-110"
                aria-label="Abrir chat de ajuda"
            >
                <i className="fas fa-headset"></i>
            </button>

            {/* Chat Widget */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-full max-w-sm h-[70vh] max-h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 animate-fade-in-up">
                    {/* Header */}
                    <header className="bg-brand-green-700 text-white p-4 rounded-t-2xl flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <i className="fas fa-robot text-xl"></i>
                            <h3 className="font-bold text-lg">Santa Ajuda 🍕</h3>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-2xl hover:opacity-80">&times;</button>
                    </header>

                    {/* Messages */}
                    <div className="flex-1 p-4 overflow-y-auto bg-brand-ivory-50/50 space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-lg whitespace-pre-wrap ${msg.role === 'user' ? 'bg-brand-green-300 text-brand-green-700' : 'bg-gray-200 text-gray-800'}`}>
                                    {renderMessageText(msg.text)}
                                    {isLoading && msg.role === 'model' && index === messages.length -1 && <span className="inline-block w-2 h-4 bg-gray-600 animate-pulse ml-1"></span>}
                                </div>
                            </div>
                        ))}
                        {error && <div className="text-center text-red-500 text-sm">{error}</div>}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSendMessage} className="p-4 border-t bg-white rounded-b-2xl">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Digite sua dúvida..."
                                className="flex-1 px-4 py-2 border rounded-full focus:ring-2 focus:ring-accent"
                                disabled={isLoading}
                                aria-label="Sua mensagem"
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className="w-10 h-10 bg-accent text-white rounded-full flex-shrink-0 flex items-center justify-center disabled:bg-gray-400"
                                aria-label="Enviar mensagem"
                            >
                                {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
};
