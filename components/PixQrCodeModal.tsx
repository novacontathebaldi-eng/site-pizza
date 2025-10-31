import React from 'react';
import qrCodePix from '../assets/qrcode-pix.png';

interface PixQrCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const PixQrCodeModal: React.FC<PixQrCodeModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4 animate-fade-in-up">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-text-on-light"><i className="fas fa-qrcode mr-2"></i>Pagar com QR Code</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <div className="p-6 text-center space-y-4">
                    <p className="text-gray-600">Abra o aplicativo do seu banco e escaneie o código abaixo para pagar via PIX.</p>
                    <img src={qrCodePix} alt="PIX QR Code" className="w-64 h-64 mx-auto border-4 border-gray-200 rounded-lg" />
                     <button
                        onClick={onClose}
                        className="w-full bg-accent text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-opacity-90 transition-all mt-4"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};