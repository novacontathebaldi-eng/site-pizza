import React, { useState, useEffect, useRef } from 'react';
import { Order } from '../types';
import { db } from '../services/firebase';

interface PixPaymentModalProps {
    order: Order | null;
    onClose: () => void;
    onPaymentSuccess: (paidOrder: Order) => void;
}

const PIX_EXPIRATION_SECONDS = 300; // 5 minutes

export const PixPaymentModal: React.FC<PixPaymentModalProps> = ({ order, onClose, onPaymentSuccess }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(PIX_EXPIRATION_SECONDS);
    const [isPaid, setIsPaid] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const timerRef = useRef<number | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    // Effect to detect mobile device on client-side
    useEffect(() => {
        const userAgent = typeof window.navigator === "undefined" ? "" : navigator.userAgent;
        const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
        setIsMobile(mobileRegex.test(userAgent));
    }, []);

    // Effect to set up PIX data from the order prop when modal opens
    useEffect(() => {
        if (order) {
            setIsLoading(false);
            setError(null);
            setIsPaid(false);
            setTimeLeft(PIX_EXPIRATION_SECONDS);

            const qrCodeBase64 = order.mercadoPagoDetails?.qrCodeBase64;
            const copyPaste = order.mercadoPagoDetails?.qrCode;

            if (!qrCodeBase64 || !copyPaste) {
                setError('Não foi possível carregar os dados do PIX. Por favor, feche e tente novamente.');
            }
        }
    }, [order]);

    // Effect for countdown timer
    useEffect(() => {
        if (!isLoading && order?.mercadoPagoDetails?.qrCode && !isPaid) {
            timerRef.current = window.setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current!);
                        setError("O código PIX expirou. Por favor, feche e tente novamente.");
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isLoading, order, isPaid]);

    // Effect to listen for payment confirmation in real-time
    useEffect(() => {
        if (!order || !db) return;

        const unsubscribe = db.collection('orders').doc(order.id)
            .onSnapshot(doc => {
                const updatedOrder = doc.data() as Order;
                if (updatedOrder && updatedOrder.paymentStatus === 'paid_online') {
                    setIsPaid(true);
                    if (timerRef.current) clearInterval(timerRef.current);
                    setTimeout(() => {
                        onPaymentSuccess({ ...updatedOrder, id: doc.id });
                    }, 2500); // Wait a bit to show success message
                }
            });

        return () => unsubscribe();
    }, [order, onPaymentSuccess]);
    
    const handleCopyToClipboard = () => {
        const copyPaste = order?.mercadoPagoDetails?.qrCode;
        if (copyPaste) {
            navigator.clipboard.writeText(copyPaste).then(() => {
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 2000);
            });
        }
    };

    if (!order) return null;
    
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    
    // CORREÇÃO: O deep link não deve ser codificado. O sistema operacional espera a string "crua".
    const pixDeepLink = order.mercadoPagoDetails?.qrCode ? `pix://qr/${order.mercadoPagoDetails.qrCode.trim()}` : '#';
    const pixData = order.mercadoPagoDetails;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-text-on-light"><i className="fab fa-pix mr-2"></i>Pagar com PIX</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl" disabled={isPaid}>&times;</button>
                </div>
                <div className="overflow-y-auto p-6 text-center">
                    {isLoading && (
                        <div className="py-12">
                            <i className="fas fa-spinner fa-spin text-5xl text-accent"></i>
                            <p className="mt-4 font-semibold text-gray-600">Carregando PIX...</p>
                        </div>
                    )}
                    {error && !isPaid && (
                         <div className="py-12 text-red-600">
                            <i className="fas fa-exclamation-triangle text-5xl mb-4"></i>
                            <p className="font-bold">Ocorreu um erro</p>
                            <p>{error}</p>
                        </div>
                    )}
                    {isPaid && (
                        <div className="py-12 text-green-600 animate-fade-in-up">
                            <i className="fas fa-check-circle text-6xl mb-4"></i>
                            <p className="text-2xl font-bold">Pagamento Aprovado!</p>
                            <p className="text-gray-700">Seu pedido será finalizado em instantes...</p>
                        </div>
                    )}
                    {!isLoading && !error && !isPaid && pixData?.qrCodeBase64 && (
                        <div className="space-y-4">
                            <p>Escaneie o QR Code abaixo com o app do seu banco:</p>
                            <div className="flex justify-center">
                                <img src={`data:image/png;base64,${pixData.qrCodeBase64}`} alt="PIX QR Code" className="w-56 h-56 border-4 border-gray-200 rounded-lg" />
                            </div>
                            <div className="text-lg font-mono p-2 bg-gray-100 rounded">
                                <span>{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}</span>
                            </div>
                            <p className="text-sm text-gray-500">Ou use o PIX Copia e Cola:</p>
                             <div className="relative">
                                <input 
                                    type="text" 
                                    value={pixData.qrCode} 
                                    readOnly 
                                    className="w-full text-xs text-center bg-gray-100 p-3 pr-12 border rounded-md"
                                />
                                <button onClick={handleCopyToClipboard} className="absolute top-1/2 right-2 -translate-y-1/2 bg-accent text-white w-8 h-8 rounded-md hover:bg-opacity-90">
                                    <i className={copySuccess ? "fas fa-check" : "fas fa-copy"}></i>
                                </button>
                            </div>
                            {copySuccess && <p className="text-sm text-green-600">Copiado para a área de transferência!</p>}

                            {isMobile && (
                                <div className="animate-fade-in-up pt-4 space-y-4">
                                    <div className="relative flex py-2 items-center">
                                        <div className="flex-grow border-t border-gray-200"></div>
                                        <span className="flex-shrink mx-4 text-gray-400 text-sm font-bold">OU</span>
                                        <div className="flex-grow border-t border-gray-200"></div>
                                    </div>

                                    {/* Botão Principal para Mobile (Deep Link) */}
                                    <a 
                                        href={pixDeepLink} 
                                        className="w-full inline-block bg-accent text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-opacity-90 transition-all transform hover:scale-105"
                                    >
                                        <i className="fas fa-mobile-alt mr-2"></i>
                                        Pagar com App do Banco
                                    </a>
                                    <p className="text-xs text-gray-500">Clique para ser redirecionado ao seu app e finalizar o pagamento.</p>
                                    
                                    {/* Botão de Fallback (Plano B) */}
                                    {pixData.ticketUrl && (
                                        <a href={pixData.ticketUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                                            Se o botão acima não funcionar, clique aqui para abrir a página de pagamento.
                                        </a>
                                    )}
                                </div>
                            )}

                            <p className="text-xs text-gray-500 pt-4">Após o pagamento, a confirmação será automática nesta tela.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};