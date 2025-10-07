import React from 'react';

interface PendingOrderAlertProps {
    onDismiss: () => void;
    onViewOrder: () => void;
}

export const PendingOrderAlert: React.FC<PendingOrderAlertProps> = ({ onDismiss, onViewOrder }) => {
    return (
        <div className="fixed bottom-5 left-5 z-50 bg-red-600 text-white font-bold py-3 px-4 rounded-lg shadow-2xl flex items-center gap-4 animate-fade-in-up">
            <div className="flex-shrink-0">
                <i className="fas fa-bell fa-shake text-2xl"></i>
            </div>
            <div className="flex-grow text-left">
                <span className="font-semibold text-lg block leading-tight">Novo Pedido!</span>
                <button 
                    onClick={onViewOrder}
                    className="text-sm underline hover:text-yellow-300"
                >
                    Ver Pedido Pendente
                </button>
            </div>
             <button 
                onClick={onDismiss}
                className="w-8 h-8 rounded-full bg-red-700/50 hover:bg-red-700 flex items-center justify-center transition-colors"
                aria-label="Dispensar alerta"
            >
                <i className="fas fa-times"></i>
            </button>
        </div>
    );
};
