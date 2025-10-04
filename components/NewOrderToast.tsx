import React from 'react';
import { Order } from '../types';

interface NewOrderToastProps {
    order: Order | null;
    onNavigate: () => void;
    onDismiss: () => void;
    onStopSound: () => void;
}

export const NewOrderToast: React.FC<NewOrderToastProps> = ({ order, onNavigate, onDismiss, onStopSound }) => {
    if (!order) {
        return null;
    }

    const handleNavigateClick = () => {
        onStopSound();
        onNavigate();
    };
    
    const handleDismissClick = () => {
        onStopSound();
        onDismiss();
    };

    return (
        <div 
            aria-live="assertive" 
            className="fixed bottom-5 right-5 z-[101] w-full max-w-sm"
        >
            <div
                className="bg-white shadow-2xl rounded-xl pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden animate-fade-in-up"
            >
                <div className="p-4">
                    <div className="flex items-start">
                        <div className="flex-shrink-0 pt-0.5">
                            <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-yellow-800">
                                <i className="fas fa-receipt text-xl animate-pulse"></i>
                            </div>
                        </div>
                        <div className="ml-3 w-0 flex-1">
                            <p className="text-sm font-bold text-gray-900">Novo Pedido Recebido!</p>
                            <p className="mt-1 text-sm text-gray-600">
                                Cliente: <span className="font-semibold">{order.customer.name}</span>
                            </p>
                             <p className="text-sm text-gray-600">
                                Total: <span className="font-semibold">{order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </p>
                            <div className="mt-3 flex gap-3">
                                <button
                                    onClick={handleNavigateClick}
                                    className="flex-1 bg-green-500 text-white font-bold py-2 px-3 rounded-lg text-sm hover:bg-green-600 transition-colors"
                                >
                                    <i className="fas fa-eye mr-2"></i>Ver Pedidos
                                </button>
                            </div>
                        </div>
                         <div className="ml-4 flex-shrink-0 flex">
                            <button
                                onClick={handleDismissClick}
                                className="inline-flex text-gray-400 rounded-md hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                <span className="sr-only">Fechar</span>
                                <i className="fas fa-times h-5 w-5"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};