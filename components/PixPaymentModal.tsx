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
    const [copySuccess, setCopySuccess] = useState(false);
    const timerRef = useRef<number | null>(null);

    // Effect to set up PIX data from the order prop when modal opens
    useEffect(() => {
        if (order) {
            setIsLoading(false); // Data is passed in via props, no async loading needed here.
            setError(null);
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
        if (!isLoading && pixData) {
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
    }, [isLoading, pixData]);

    // Effect to listen for payment confirmation in real-time
    useEffect(() => {
        if (!order || !db || !onPaymentSuccess) return;

        const unsubscribe = db.collection('orders').doc(order.id)
            .onSnapshot(doc => {
                const updatedOrderData = doc.data();
                if (updatedOrderData && updatedOrderData.paymentStatus === 'paid_online') {
                    const fullOrder: Order = { id: doc.id, ...updatedOrderData } as Order;
                    onPaymentSuccess(fullOrder);
                    if (timerRef.current) clearInterval(timerRef.current);
                }
            });

        return () => unsubscribe();
    }, [order, onPaymentSuccess]);
    
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
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <div className="overflow-y-auto p-6 text-center">
                    {isLoading && (
                        <div className="py-12">
                            <i className="fas fa-spinner fa-spin text-5xl text-accent"></i>
                            <p className="mt-4 font-semibold text-gray-600">Gerando seu PIX seguro...</p>
                        </div>
                    )}
                    {error && (
                         <div className="py-12 text-red-600">
                            <i className="fas fa-exclamation-triangle text-5xl mb-4"></i>
                            <p className="font-bold">Ocorreu um erro</p>
                            <p>{error}</p>
                        </div>
                    )}
                    
                    {!isLoading && !error && pixData && (
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