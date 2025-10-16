import React, { useState, useEffect, useRef } from 'react';
import { Order } from '../types';
import { db } from '../services/firebase';

interface PixPaymentModalProps {
    order: Order | null;
    onClose: () => void;
    onPaymentSuccess: (paidOrder: Order) => void;
    isProcessing: boolean;
}

const PIX_EXPIRATION_SECONDS = 300; // 5 minutes

export const PixPaymentModal: React.FC<PixPaymentModalProps> = ({ order, onClose, onPaymentSuccess, isProcessing }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pixData, setPixData] = useState<{ qrCodeBase64: string; copyPaste: string } | null>(null);
    const [timeLeft, setTimeLeft] = useState(PIX_EXPIRATION_SECONDS);
    const [isPaid, setIsPaid] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const timerRef = useRef<number | null>(null);

    // Effect to set up PIX data from the order prop when modal opens
    useEffect(() => {
        if (order) {
            setIsLoading(false); // Data is passed in via props, no async loading needed here.
            setError(null);
            setIsPaid(false);
            setTimeLeft(PIX_EXPIRATION_SECONDS);

            // FIX: The PIX data is now generated *before* this modal opens and passed in the `order` prop.
            // This removes the call to the non-existent `initiateMercadoPagoPixPayment` function.
            const qrCodeBase64 = order.mercadoPagoDetails?.qrCodeBase64;
            const copyPaste = order.mercadoPagoDetails?.qrCode;

            if (qrCodeBase64 && copyPaste) {
                setPixData({ qrCodeBase64, copyPaste });
            } else {
                setError('Não foi possível carregar os dados do PIX. Por favor, feche e tente novamente.');
            }
        }
    }, [order]);

    // Effect for countdown timer
    useEffect(() => {
        if (!isLoading && pixData && !isPaid) {
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
    }, [isLoading, pixData, isPaid]);

    // Effect to listen for payment confirmation in real-time
    useEffect(() => {
        if (!order || !db) return;

        const unsubscribe = db.collection('orders').doc(order.id)
            .onSnapshot(doc => {
                const updatedOrder = doc.data() as Order;
                if (updatedOrder && updatedOrder.paymentStatus === 'paid_online') {
                    setIsPaid(true);
                    if (timerRef.current) clearInterval(timerRef.current);
                    // Não chama mais onPaymentSuccess automaticamente.
                }
            });

        return () => unsubscribe();
    }, [order]);
    
    const handleCopyToClipboard = () => {
        if (pixData?.copyPaste) {
            navigator.clipboard.writeText(pixData.copyPaste).then(() => {
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 2000);
            });
        }
    };

    if (!order) return null;
    
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

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
                            <p className="mt-4 font-semibold text-gray-600">Gerando seu PIX seguro...</p>
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
                        <div className="py-8 text-center animate-fade-in-up space-y-5">
                            <div>
                                <i className="fas fa-check-circle text-6xl mb-4 text-green-500"></i>
                                <h3 className="text-2xl font-bold text-green-600">Pagamento Aprovado!</h3>
                            </div>
                            
                            <div className="text-left bg-gray-50 p-4 rounded-lg border text-gray-800 space-y-2 text-sm">
                                <p className="font-bold text-base text-center mb-2">Seu pedido já foi registrado em nosso sitema!</p>
                                <p><strong><i className="fas fa-receipt fa-fw mr-2 text-gray-400"></i>Pedido:</strong> #{order.orderNumber}</p>
                                <p><strong><i className="fas fa-user fa-fw mr-2 text-gray-400"></i>Nome:</strong> {order.customer.name}</p>
                                {order.total != null && (
                                    <p><strong><i className="fas fa-dollar-sign fa-fw mr-2 text-gray-400"></i>Total Pago:</strong> {order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                )}
                            </div>

                            <p className="text-gray-600 text-sm px-2">
                                Já estamos preparando tudo! Se precisar, você pode nos contatar pelo WhatsApp sobre este pedido.
                            </p>

                            <button
                                onClick={() => onPaymentSuccess(order)}
                                disabled={isProcessing}
                                className="w-full bg-green-500 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-green-600 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center min-h-[52px]"
                            >
                                {isProcessing ? (
                                    <><i className="fas fa-spinner fa-spin mr-2"></i> Aguarde...</>
                                ) : (
                                    <><i className="fab fa-whatsapp mr-2"></i> Enviar um WhatsApp sobre o pedido</>
                                )}
                            </button>
                        </div>
                    )}
                    {!isLoading && !error && !isPaid && pixData && (
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
                                    value={pixData.copyPaste} 
                                    readOnly 
                                    className="w-full text-xs text-center bg-gray-100 p-3 pr-12 border rounded-md"
                                />
                                <button onClick={handleCopyToClipboard} className="absolute top-1/2 right-2 -translate-y-1/2 bg-accent text-white w-8 h-8 rounded-md hover:bg-opacity-90">
                                    <i className={copySuccess ? "fas fa-check" : "fas fa-copy"}></i>
                                </button>
                            </div>
                            {copySuccess && <p className="text-sm text-green-600">Copiado para a área de transferência!</p>}
                            <p className="text-xs text-gray-500 pt-4">Após o pagamento, a confirmação será automática nesta tela.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};