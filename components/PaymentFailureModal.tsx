import React from 'react';

interface PaymentFailureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTryAgain: () => void;
    onPayLater: () => void;
}

export const PaymentFailureModal: React.FC<PaymentFailureModalProps> = ({ isOpen, onClose, onTryAgain, onPayLater }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-text-on-light"><i className="fas fa-exclamation-triangle text-yellow-500 mr-2"></i>Falha no Pagamento</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <div className="p-6 text-center space-y-4">
                    <p className="text-gray-700">
                        Desculpe, mas não conseguimos confirmar o seu pagamento. Por favor, tente novamente.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                        <button 
                            type="button" 
                            onClick={onTryAgain} 
                            className="font-bold py-3 px-6 rounded-lg transition-all bg-accent text-white border-2 border-accent hover:bg-opacity-90">
                            <i className="fas fa-redo mr-2"></i>Tentar Pagar Novamente
                        </button>
                        <button 
                            type="button" 
                            onClick={onPayLater} 
                            className="font-bold py-3 px-6 rounded-lg transition-all bg-white text-gray-600 border-2 border-gray-400 hover:bg-gray-100">
                            <i className="fas fa-hand-holding-usd mr-2"></i>Pagar Depois
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};