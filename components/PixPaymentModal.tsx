import React, { useState, useEffect, useRef } from 'react';

interface PixPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    qrCodeUrl: string;
    orderId: string;
    total: number;
    onPaymentSuccess: () => void;
    onPaymentFailure: () => void;
}

export const PixPaymentModal: React.FC<PixPaymentModalProps> = ({ isOpen, onClose, qrCodeUrl, orderId, total, onPaymentSuccess, onPaymentFailure }) => {
    const [status, setStatus] = useState<'pending' | 'checking' | 'success' | 'failure'>('pending');
    const [countdown, setCountdown] = useState(300); // 5 minutes
    const intervalRef = useRef<number | null>(null);

    // This simulates polling a backend to check for payment status
    useEffect(() => {
        if (isOpen) {
            setStatus('checking');
            // In a real app, you would poll your backend. Here we simulate a random outcome.
            const timeout = setTimeout(() => {
                if (Math.random() > 0.2) { // 80% success rate for demo
                    setStatus('success');
                    setTimeout(onPaymentSuccess, 1500); // Wait a bit before closing
                } else {
                    setStatus('failure');
                    setTimeout(onPaymentFailure, 1500);
                }
            }, 5000); // Check after 5 seconds for demo purposes

            return () => clearTimeout(timeout);
        }
    }, [isOpen, orderId, onPaymentSuccess, onPaymentFailure]);
    
    // Countdown timer
    useEffect(() => {
       if (isOpen) {
           intervalRef.current = window.setInterval(() => {
               setCountdown(prev => (prev > 0 ? prev - 1 : 0));
           }, 1000);
       }
       return () => {
           if(intervalRef.current) clearInterval(intervalRef.current);
       }
    }, [isOpen]);

    if (!isOpen) return null;
    
    const minutes = Math.floor(countdown / 60);
    const seconds = countdown % 60;

    const renderStatus = () => {
        switch (status) {
            case 'checking':
                return <p className="text-yellow-600 font-semibold flex items-center justify-center"><i className="fas fa-spinner fa-spin mr-2"></i>Aguardando confirmação...</p>;
            case 'success':
                return <p className="text-green-600 font-semibold flex items-center justify-center"><i className="fas fa-check-circle mr-2"></i>Pagamento Confirmado!</p>;
            case 'failure':
                return <p className="text-red-600 font-semibold flex items-center justify-center"><i className="fas fa-times-circle mr-2"></i>Falha no Pagamento</p>;
            default:
                return <p className="text-gray-600">Escaneie o QR Code para pagar.</p>;
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-text-on-light"><i className="fas fa-qrcode mr-2"></i>Pague com PIX</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <div className="p-6 text-center space-y-4">
                    <div className="flex justify-center">
                        <img src={qrCodeUrl} alt="PIX QR Code" className="w-64 h-64 border-4 border-gray-200 rounded-lg"/>
                    </div>
                    <p className="text-lg">
                        Total a pagar: <span className="font-bold text-accent">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </p>
                    <div className="p-3 bg-gray-100 rounded-lg">
                        {renderStatus()}
                    </div>
                    <p className="text-sm text-gray-500">
                        O QR Code expira em: <span className="font-semibold">{minutes}:{seconds < 10 ? '0' : ''}{seconds}</span>
                    </p>
                    <button type="button" onClick={onClose} className="w-full bg-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-lg hover:bg-gray-300">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};
