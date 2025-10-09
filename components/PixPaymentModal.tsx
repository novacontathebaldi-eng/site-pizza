
import React, { useState, useEffect, useRef } from 'react';
import { Order } from '../types';
import * as firebaseService from '../services/firebaseService';
import { db } from '../services/firebase';

interface PixPaymentModalProps {
    order: Order | null;
    onClose: () => void;
    onPaymentSuccess: (order: Order) => void;
}

export const PixPaymentModal: React.FC<PixPaymentModalProps> = ({ order, onClose, onPaymentSuccess }) => {
    const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
    const [copyPaste, setCopyPaste] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const copyTimeoutRef = useRef<number | null>(null);
    
    // Unsubscribe from Firestore listener on unmount
    useEffect(() => {
        if (!order || !db) return;

        const unsubscribe = db.collection('orders').doc(order.id)
            .onSnapshot(doc => {
                const updatedOrder = doc.data() as Order;
                if (updatedOrder && (updatedOrder.paymentStatus === 'paid_online' || updatedOrder.paymentStatus === 'paid')) {
                    onPaymentSuccess({ ...updatedOrder, id: doc.id });
                }
            });
        
        return () => unsubscribe();
    }, [order, onPaymentSuccess]);

    useEffect(() => {
        if (order) {
            setIsLoading(true);
            setError(null);
            setQrCodeBase64(null);
            setCopyPaste(null);

            firebaseService.initiateMercadoPagoPixPayment(order.id)
                .then(result => {
                    setQrCodeBase64(result.qrCodeBase64);
                    setCopyPaste(result.copyPaste);
                })
                .catch(err => {
                    console.error("PIX Generation Error:", err);
                    setError(err.message || "Não foi possível gerar a cobrança PIX. Tente novamente mais tarde.");
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }

        return () => {
            if (copyTimeoutRef.current) {
                clearTimeout(copyTimeoutRef.current);
            }
        };
    }, [order]);

    if (!order) return null;

    const handleCopyToClipboard = () => {
        if (copyPaste) {
            navigator.clipboard.writeText(copyPaste).then(() => {
                setIsCopied(true);
                copyTimeoutRef.current = window.setTimeout(() => {
                    setIsCopied(false);
                }, 2000);
            });
        }
    };

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
                            <i className="fas fa-spinner fa-spin text-4xl text-accent mb-4"></i>
                            <p className="text-lg font-semibold">Gerando seu PIX...</p>
                            <p className="text-gray-500">Aguarde um instante.</p>
                        </div>
                    )}
                    {error && (
                        <div className="py-12 text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
                            <i className="fas fa-exclamation-triangle text-3xl mb-3"></i>
                            <p className="font-bold">Ocorreu um erro</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    )}
                    {!isLoading && !error && qrCodeBase64 && copyPaste && (
                        <div className="space-y-4">
                            <p className="text-gray-700">Escaneie o QR Code abaixo com o app do seu banco para pagar.</p>
                            <img 
                                src={`data:image/jpeg;base64,${qrCodeBase64}`} 
                                alt="PIX QR Code"
                                className="w-64 h-64 mx-auto border-4 border-gray-200 rounded-lg"
                            />
                            <p className="text-gray-600">Ou use o PIX Copia e Cola:</p>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    readOnly 
                                    value={copyPaste}
                                    className="w-full bg-gray-100 border rounded-md p-3 pr-28 text-sm text-gray-700 break-all"
                                />
                                <button 
                                    onClick={handleCopyToClipboard}
                                    className="absolute top-1/2 right-2 -translate-y-1/2 bg-accent text-white font-semibold py-2 px-3 rounded-md text-xs hover:bg-opacity-90"
                                >
                                    {isCopied ? <><i className="fas fa-check mr-1"></i>Copiado!</> : <><i className="fas fa-copy mr-1"></i>Copiar</>}
                                </button>
                            </div>
                             <div className="pt-4 text-center">
                                <i className="fas fa-sync-alt fa-spin text-accent mr-2"></i>
                                <span className="font-semibold text-gray-700">Aguardando confirmação do pagamento...</span>
                                <p className="text-sm text-gray-500 mt-1">
                                    Assim que o pagamento for confirmado, seu pedido será enviado.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
