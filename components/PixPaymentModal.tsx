import React, { useState, useEffect, useRef } from 'react';
import { Order } from '../types';
import * as firebaseService from '../services/firebaseService';
import { db } from '../services/firebase';

interface PixPaymentModalProps {
    order: Order | null;
    onClose: () => void;
    onPaymentSuccess: (paidOrder: Order) => void;
}

export const PixPaymentModal: React.FC<PixPaymentModalProps> = ({ order, onClose, onPaymentSuccess }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pixData, setPixData] = useState<{ qrCodeBase64: string; copyPaste: string; dateOfExpiration: string; } | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isPaid, setIsPaid] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [refreshMessage, setRefreshMessage] = useState('');
    const timerRef = useRef<number | null>(null);

    // Effect to generate PIX charge when modal opens or order changes
    useEffect(() => {
        if (order) {
            setIsLoading(true);
            setError(null);
            setIsPaid(false);
            setPixData(null);
            setTimeLeft(0);

            firebaseService.initiateMercadoPagoPixPayment(order.id)
                .then(data => {
                    if (data && data.qrCodeBase64 && data.copyPaste && data.dateOfExpiration) {
                        setPixData(data);
                    } else {
                        throw new Error('Dados PIX inválidos recebidos.');
                    }
                    setIsLoading(false);
                })
                .catch(err => {
                    setError(err.message || 'Erro desconhecido ao gerar PIX.');
                    setIsLoading(false);
                });
        }
    }, [order]);

    // Effect for countdown timer, synchronized with expiration date
    useEffect(() => {
        if (timerRef.current) clearInterval(timerRef.current);

        if (!isLoading && pixData && !isPaid && pixData.dateOfExpiration) {
            const expirationDate = new Date(pixData.dateOfExpiration);
            const now = new Date();
            const initialTimeLeft = Math.max(0, Math.floor((expirationDate.getTime() - now.getTime()) / 1000));

            if (initialTimeLeft <= 0) {
                setError("O código PIX expirou. Por favor, feche e tente novamente.");
                setTimeLeft(0);
                return;
            }

            setTimeLeft(initialTimeLeft);

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
                    setTimeout(() => {
                        onPaymentSuccess({ ...updatedOrder, id: doc.id });
                    }, 2500); // Wait a bit to show success message
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

    const handleRefreshStatus = async () => {
        if (!order || isRefreshing || isPaid) return;
    
        setIsRefreshing(true);
        setRefreshMessage('');
        try {
            const status = await firebaseService.getPixPaymentStatus(order.id);
            if (status === 'approved') {
                // The onSnapshot listener will handle the full success flow.
                // We just update the UI here for immediate user feedback.
                setIsPaid(true);
            } else {
                setRefreshMessage('Pagamento ainda pendente.');
                setTimeout(() => setRefreshMessage(''), 2500);
            }
        } catch (error: any) {
            setRefreshMessage(error.message || 'Erro ao verificar.');
            setTimeout(() => setRefreshMessage(''), 2500);
        } finally {
            setIsRefreshing(false);
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
                        <div className="py-12 text-green-600 animate-fade-in-up">
                            <i className="fas fa-check-circle text-6xl mb-4"></i>
                            <p className="text-2xl font-bold">Pagamento Aprovado!</p>
                            <p className="text-gray-700">Seu pedido será finalizado em instantes...</p>
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
                            
                            <div className="pt-2 text-center">
                                <button onClick={handleRefreshStatus} disabled={isRefreshing || isPaid} className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-wait font-semibold py-1 px-3 rounded-md hover:bg-blue-50 transition-colors">
                                    {isRefreshing ? <><i className="fas fa-spinner fa-spin mr-2"></i>Verificando...</> : <><i className="fas fa-sync-alt mr-2"></i>Atualizar Status</>}
                                </button>
                                {refreshMessage && <p className="text-sm text-gray-600 mt-1 animate-fade-in-up">{refreshMessage}</p>}
                            </div>

                            <p className="text-xs text-gray-500 pt-2">Após o pagamento, a confirmação será automática nesta tela.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
