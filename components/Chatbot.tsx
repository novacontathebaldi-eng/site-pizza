import React, { useState, useEffect, useRef } from 'react';
// FIX: Corrected the import path for the `ChatMessage` type. It is defined in `../types` not `../App`.
import { ChatMessage, OrderDetails, CartItem, ReservationDetails } from '../types';

interface ChatbotProps {
    isOpen: boolean;
    onClose: () => void;
    messages: ChatMessage[];
    onSendMessage: (message: string) => void;
    isSending: boolean;
    onCreateOrder: (details: OrderDetails, cart: CartItem[]) => void;
    onCreateReservation: (details: ReservationDetails) => void;
    onShowPixQRCode: () => void;
}

interface ParsedMessage {
    nodes: React.ReactNode[];
    action?: {
        type: 'CREATE_ORDER';
        payload: {
            details: OrderDetails;
            cart: CartItem[];
        };
    } | {
        type: 'CREATE_RESERVATION';
        payload: {
            details: ReservationDetails;
        };
    };
}


const parseMessage = (content: string): ParsedMessage => {
    // Regex para os blocos de ação
    const orderActionRegex = /<ACTION_CREATE_ORDER>([\s\S]*?)<\/ACTION_CREATE_ORDER>/;
    const reservationActionRegex = /<ACTION_CREATE_RESERVATION>([\s\S]*?)<\/ACTION_CREATE_RESERVATION>/;
    const orderMatch = content.match(orderActionRegex);
    const reservationMatch = content.match(reservationActionRegex);

    let action: ParsedMessage['action'] = undefined;
    
    // Remove os blocos de ação do conteúdo principal
    const cleanContent = content.replace(orderActionRegex, '').replace(reservationActionRegex, '').trim();

    if (orderMatch && orderMatch[1]) {
        try {
            const payload = JSON.parse(orderMatch[1]);
            // Validação básica do payload
            if (payload.details && payload.cart) {
                action = {
                    type: 'CREATE_ORDER',
                    payload: payload
                };
            }
        } catch (e) {
            console.error("Falha ao analisar o JSON da ação de pedido do chatbot:", e);
        }
    } else if (reservationMatch && reservationMatch[1]) {
        try {
            const payload = JSON.parse(reservationMatch[1]);
            if (payload.details) {
                action = {
                    type: 'CREATE_RESERVATION',
                    payload: payload
                };
            }
        } catch (e) {
            console.error("Falha ao analisar o JSON da ação de reserva do chatbot:", e);
        }
    }


    // Regex para encontrar links markdown [texto](url) ou texto em negrito **texto**
    const combinedRegex = /\[([^\]]+)\]\(([^)]+)\)|\*\*(.+?)\*\*/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = combinedRegex.exec(cleanContent)) !== null) {
        // Adiciona o texto simples antes da correspondência atual
        if (match.index > lastIndex) {
            parts.push(cleanContent.substring(lastIndex, match.index));
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
    if (lastIndex < cleanContent.length) {
        parts.push(cleanContent.substring(lastIndex));
    }

    const nodes = parts.map((part, index) => <React.Fragment key={index}>{part}</React.Fragment>);

    return { nodes, action };
};


export const Chatbot: React.FC<ChatbotProps> = ({ isOpen, onClose, messages, onSendMessage, isSending, onCreateOrder, onCreateReservation, onShowPixQRCode }) => {
    const [input, setInput] = useState('');
    const lastElementRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const prevIsSending = useRef(isSending);
    const [completedActions, setCompletedActions] = useState<Set<number>>(new Set());

    useEffect(() => {
        // Guarda o valor anterior de `isSending` para detectar quando o bot termina de responder.
        prevIsSending.current = isSending;
    });
    
    // Limpa o estado de ações concluídas quando o chat é fechado para que os botões reapareçam se o chat for reaberto.
    useEffect(() => {
        if (!isOpen) {
            setCompletedActions(new Set());
        }
    }, [isOpen]);

    useEffect(() => {
        if (lastElementRef.current) {
            const lastMessage = messages[messages.length - 1];
            
            // Quando uma nova mensagem do bot chega (isSending é falso e a última mensagem é do bot),
            // rola para o topo dessa mensagem.
            if (lastMessage && lastMessage.role === 'bot' && !isSending) {
                lastElementRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                // Para mensagens do usuário ou o indicador 'digitando', rola para o final para mantê-los visíveis.
                lastElementRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }
        }
    }, [messages, isSending]);

    useEffect(() => {
        // Foca o input apenas depois que o bot termina de responder, não na abertura inicial.
        // Isso evita que o teclado do celular apareça inesperadamente.
        const justFinishedReplying = prevIsSending.current && !isSending;
        if (isOpen && justFinishedReplying) {
            inputRef.current?.focus();
        }
    }, [isOpen, isSending]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isSending) {
            onSendMessage(input);
            setInput('');
        }
    };
    
    const calculateTotal = (payload: { details: OrderDetails, cart: CartItem[] }) => {
        const subtotal = payload.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const deliveryFee = payload.details.orderType === 'delivery' ? 3.00 : 0;
        return subtotal + deliveryFee;
    };

    return (
        <div 
            aria-hidden={!isOpen}
            className={`fixed bottom-4 right-4 left-4 sm:left-auto sm:w-full sm:max-w-sm h-[70vh] max-h-[600px] bg-white rounded-2xl shadow-2xl z-50 flex flex-col transform transition-all duration-300 ease-in-out ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0 pointer-events-none'}`}
        >
            <header className="flex justify-between items-center p-4 bg-brand-green-700 text-text-on-dark rounded-t-2xl flex-shrink-0">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <i className="fas fa-robot"></i>
                    Sensação - Assistente Virtual
                </h2>
                <button onClick={onClose} className="text-text-on-dark/70 hover:text-white text-2xl" aria-label="Fechar chat">&times;</button>
            </header>

            <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => {
                    const { nodes, action } = parseMessage(msg.content);
                    const isLastMessage = index === messages.length - 1;

                    return (
                        <div 
                            key={index} 
                            // Anexa a ref à última mensagem apenas se o bot NÃO estiver digitando.
                            ref={isLastMessage && !isSending ? lastElementRef : null}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`whitespace-pre-wrap max-w-[85%] rounded-2xl px-4 py-2 ${msg.role === 'user' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                                {nodes}
                                {!completedActions.has(index) && action && (
                                    <div className="mt-4 border-t border-gray-300 pt-3 space-y-4 text-gray-800">
                                        {action.type === 'CREATE_ORDER' && (
                                            <>
                                                {action.payload.details.paymentMethod === 'pix' && (
                                                    <div className="p-3 bg-blue-50 rounded-md text-sm text-blue-800 text-center space-y-2">
                                                        <p>Para pagar com PIX, use nosso CNPJ ou clique abaixo para ver o QR Code.</p>
                                                        <p className="font-bold">CNPJ: 62.247.199/0001-04</p>
                                                        <button
                                                            onClick={onShowPixQRCode}
                                                            className="w-full bg-accent text-white font-semibold py-2 px-3 rounded-lg mt-1 hover:bg-opacity-90 transition-all text-sm"
                                                        >
                                                            <i className="fas fa-qrcode mr-2"></i> Ver QR CODE PIX
                                                        </button>
                                                    </div>
                                                )}
                                                
                                                <button
                                                    onClick={() => {
                                                        const deliveryFee = action.payload.details.orderType === 'delivery' ? 3.00 : 0;
                                                        const detailsWithFee = { ...action.payload.details, deliveryFee };
                                                        onCreateOrder(detailsWithFee, action.payload.cart);
                                                        setCompletedActions(prev => new Set(prev).add(index));
                                                    }}
                                                    className="w-full bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600 transition-all flex items-center justify-center text-center"
                                                >
                                                    <i className="fab fa-whatsapp mr-2"></i>
                                                    <span>Confirmar Pedido</span>
                                                </button>
                                            </>
                                        )}
                                        {action.type === 'CREATE_RESERVATION' && (
                                             <button
                                                onClick={() => {
                                                    onCreateReservation(action.payload.details);
                                                    setCompletedActions(prev => new Set(prev).add(index));
                                                }}
                                                className="w-full bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600 transition-all flex items-center justify-center text-center"
                                            >
                                                <i className="fab fa-whatsapp mr-2"></i>
                                                <span>Confirmar Reserva</span>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                 {isSending && (
                    <div ref={lastElementRef} className="flex justify-start"> {/* Anexa a ref ao indicador de carregamento */}
                        <div className="bg-gray-200 text-gray-800 rounded-2xl rounded-bl-none px-4 py-2">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            <form onSubmit={handleSend} className="p-4 border-t border-gray-200 flex items-center gap-2 flex-shrink-0">
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isSending ? "Sensação está digitando..." : "Digite sua pergunta..."}
                    className="w-full px-4 py-2 border rounded-full focus:ring-2 focus:ring-accent"
                    readOnly={isSending}
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