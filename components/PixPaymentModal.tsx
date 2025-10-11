
import React, { useState, useEffect } from 'react';

interface PixPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    pixData: {
        qrCodeBase64: string;
        qrCode: string; // The copy-paste code
    };
    orderNumber: number;
}

export const PixPaymentModal: React.FC<PixPaymentModalProps> = ({ isOpen, onClose, pixData, orderNumber }) => {
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        if (isCopied) {
            const timer = setTimeout(() => setIsCopied(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [isCopied]);
    
    if (!isOpen) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(pixData.qrCode);
        setIsCopied(true);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-text-on-light"><i className="fab fa-pix mr-2"></i>Pagar com PIX</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <div className="overflow-y-auto p-6 text-center">
                    <p className="text-gray-700 mb-4">
                        Aponte a câmera do seu celular para o QR Code ou use o "Copia e Cola" para pagar o Pedido <strong>#{orderNumber}</strong>.
                    </p>
                    <div className="flex justify-center my-4">
                        <img 
                            src={`data:image/png;base64,${pixData.qrCodeBase64}`} 
                            alt="PIX QR Code" 
                            className="w-64 h-64 border-4 border-gray-200 rounded-lg"
                        />
                    </div>
                    <div className="relative">
                        <input 
                            type="text" 
                            readOnly 
                            value={pixData.qrCode} 
                            className="w-full bg-gray-100 border rounded-md p-3 text-sm pr-12 text-gray-600"
                        />
                         <button 
                            onClick={handleCopy}
                            className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-500 hover:text-accent p-2"
                        >
                            {isCopied ? <i className="fas fa-check text-green-500"></i> : <i className="fas fa-copy"></i>}
                        </button>
                    </div>
                    <button 
                        onClick={handleCopy}
                        className="mt-3 w-full bg-accent text-white font-bold py-2 px-4 rounded-lg hover:bg-opacity-90"
                    >
                        {isCopied ? 'Copiado!' : 'Copiar Código PIX'}
                    </button>
                    <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                        <p>
                            <i className="fas fa-info-circle mr-2"></i>
                            Após o pagamento, seu pedido será confirmado automaticamente e começará a ser preparado.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
