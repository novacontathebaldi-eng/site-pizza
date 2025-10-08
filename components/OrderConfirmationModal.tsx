import React, { useState } from 'react';
import { OrderConfirmation } from '../types';

interface OrderConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: OrderConfirmation | null;
}

export const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({ isOpen, onClose, order }) => {
    const [copySuccess, setCopySuccess] = useState(false);

    if (!isOpen || !order) return null;

    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(order.id).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
    };

    const handleTrackOrder = () => {
        onClose();
        window.location.hash = '#/acompanhar-pedido';
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col text-center">
                <div className="p-8">
                    <div className="text-green-500 mb-4">
                        <i className="fas fa-check-circle text-6xl"></i>
                    </div>
                    <h2 className="text-3xl font-bold text-text-on-light mb-2">Pedido Enviado!</h2>
                    <p className="text-gray-600 mb-6">Obrigado, {order.customerName}! Seu pedido foi recebido e já estamos preparando tudo.</p>
                    
                    <div className="bg-gray-100 p-4 rounded-lg">
                        <p className="text-sm text-gray-700 mb-2">Use este código para acompanhar seu pedido:</p>
                        <div className="relative">
                            <input
                                type="text"
                                value={order.id}
                                readOnly
                                className="w-full text-lg font-bold text-center bg-white p-3 pr-12 border rounded-md"
                            />
                            <button onClick={handleCopyToClipboard} className="absolute top-1/2 right-2 -translate-y-1/2 bg-accent text-white w-9 h-9 rounded-md hover:bg-opacity-90">
                                <i className={copySuccess ? "fas fa-check" : "fas fa-copy"}></i>
                            </button>
                        </div>
                        {copySuccess && <p className="text-xs text-green-600 mt-1">Código copiado!</p>}
                    </div>

                    <div className="mt-6 flex flex-col sm:flex-row gap-3">
                        <button onClick={handleTrackOrder} className="flex-1 bg-accent text-white font-bold py-3 px-6 rounded-lg hover:bg-opacity-90 transition-all">
                            <i className="fas fa-map-marker-alt mr-2"></i>Acompanhar Pedido
                        </button>
                         <button onClick={onClose} className="flex-1 bg-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-lg hover:bg-gray-300">
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};