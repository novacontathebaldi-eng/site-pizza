import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat, FunctionDeclaration, Type, GenerateContentResponse } from '@google/genai';
import { ChatMessage } from '../types';

export const Chatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [chat, setChat] = useState<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!process.env.GEMINI_API_KEY) {
            console.error("Chave da API do Gemini não encontrada.");
            return;
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const redirectToWhatsappFunction: FunctionDeclaration = {
            name: 'redirectToWhatsapp',
            description: 'Encaminha o cliente para o atendimento humano via WhatsApp quando solicitado ou necessário.',
            parameters: { type: Type.OBJECT, properties: {} },
        };
        
        try {
            const chatSession = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: `Você é um assistente virtual amigável e prestativo para uma pizzaria chamada Santa Sensação. Sua função é responder perguntas dos clientes sobre o cardápio, horários de funcionamento (Quarta a Domingo, 19h às 22h), localização (Santa Leopoldina, ES) e áreas de entrega (Centro, Olaria, Vila Nova, Moxafongo, Cocal, Funil). Seja conciso e direto. Se o cliente perguntar algo que você não sabe, peça desculpas e ofereça encaminhá-lo para um atendente. Se o cliente expressar frustração, quiser fazer uma reclamação, ou pedir explicitamente para falar com uma pessoa, você DEVE OBRIGATORIAMENTE usar a função 'redirectToWhatsapp' para encaminhá-lo ao atendimento humano. Não invente informações.`,
                    tools: [{ functionDeclarations: [redirectToWhatsappFunction] }],
                },
            });
            setChat(chatSession);

            setMessages([{
                role: 'model',
                parts: "Olá! Sou o assistente virtual da Santa Sensação. Como posso te ajudar hoje?",
            }]);

        } catch (error) {
            console.error("Erro ao inicializar o chat do Gemini:", error);
            setMessages([{
                role: 'model',
                parts: "Desculpe, meu serviço de inteligência está offline no momento. Tente novamente mais tarde.",
            }]);
        }
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isLoading || !chat) return;

        const userMessage: ChatMessage = { role: 'user', parts: userInput };
        setMessages(prev => [...prev, userMessage]);
        setUserInput('');
        setIsLoading(true);

        try {
            const result: GenerateContentResponse = await chat.sendMessage({ message: userInput });
            
            if (result.functionCalls && result.functionCalls.length > 0) {
                 if (result.functionCalls[0].name === 'redirectToWhatsapp') {
                    const functionCallMessage: ChatMessage = {
                        role: 'model',
                        parts: 'Entendi. Para questões mais específicas ou para falar com um de nossos atendentes, por favor, clique no botão abaixo para iniciar uma conversa no WhatsApp.',
                        isFunctionCall: true,
                    };
                    setMessages(prev => [...prev, functionCallMessage]);
                }
            } else {
                const botMessage: ChatMessage = { role: 'model', parts: result.text };
                setMessages(prev => [...prev, botMessage]);
            }
        } catch (error) {
            console.error("Erro ao enviar mensagem para o Gemini:", error);
            const errorMessage: ChatMessage = { role: 'model', parts: 'Desculpe, não consegui processar sua solicitação. Tente novamente.' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Floating Action Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-5 right-5 z-40 bg-accent text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center transform transition-transform hover:scale-110"
                aria-label="Abrir chat de ajuda"
            >
                <i className="fas fa-question text-xl"></i>
            </button>

            {/* Chat Modal */}
            <div className={`fixed bottom-20 right-5 z-50 w-[calc(100%-40px)] max-w-sm h-[60vh] max-h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b bg-brand-ivory-50 rounded-t-2xl">
                    <h3 className="font-bold text-lg text-text-on-light flex items-center gap-2">
                        <i className="fas fa-robot text-accent"></i>
                        Assistente Virtual
                    </h3>
                    <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>

                {/* Messages */}
                <div className="flex-grow overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-xl ${msg.role === 'user' ? 'bg-accent/20 text-text-on-light' : 'bg-gray-100 text-gray-800'}`}>
                                <p className="text-sm">{msg.parts}</p>
                                {msg.isFunctionCall && (
                                    <a 
                                        href="https://wa.me/5527996500341" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="mt-3 inline-block bg-green-500 text-white font-bold py-2 px-4 rounded-lg text-sm"
                                    >
                                        <i className="fab fa-whatsapp mr-2"></i>Falar com Atendente
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                             <div className="max-w-[80%] p-3 rounded-xl bg-gray-100 text-gray-800">
                                 <div className="flex items-center space-x-1">
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></span>
                                 </div>
                             </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSendMessage} className="p-4 border-t">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={userInput}
                            onChange={e => setUserInput(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md focus:ring-accent focus:border-accent"
                            placeholder="Digite sua dúvida..."
                            disabled={isLoading}
                        />
                        <button type="submit" disabled={isLoading || !userInput.trim()} className="bg-accent text-white w-10 h-10 rounded-md flex-shrink-0 flex items-center justify-center disabled:bg-gray-300">
                            <i className="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};
