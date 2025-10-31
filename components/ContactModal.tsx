import React from 'react';

interface ContactModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerName: string;
    customerPhone: string;
}

const formatPhoneNumberForWhatsApp = (phone: string): string => {
    if (!phone) return '';
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');

    // Case 1: Number has 9 digits (e.g., 996658582) -> Add country and area code
    if (digitsOnly.length === 9) {
        return `5527${digitsOnly}`;
    }
    // Case 2: Number has 11 digits (e.g., 27996658582) -> Add country code
    if (digitsOnly.length === 11) {
        return `55${digitsOnly}`;
    }
    // Case 3: Number already has country code (e.g., 5527996658582) -> Return as is
    if (digitsOnly.length === 13 && digitsOnly.startsWith('55')) {
        return digitsOnly;
    }
    // Fallback for other formats (might not work perfectly but it's a safe default)
    return digitsOnly;
};


export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose, customerName, customerPhone }) => {
    if (!isOpen) return null;

    const formattedPhone = formatPhoneNumberForWhatsApp(customerPhone);
    const whatsappUrl = `https://wa.me/${formattedPhone}`;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-text-on-light"><i className="fas fa-address-book mr-2"></i>Contato do Cliente</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <div className="p-6 text-center space-y-4">
                    <p className="text-lg">
                        <span className="font-semibold block">Nome:</span>
                        <span className="text-gray-700">{customerName}</span>
                    </p>
                    <p className="text-lg">
                        <span className="font-semibold block">Telefone:</span>
                        <span className="text-gray-700">{customerPhone}</span>
                    </p>
                     <p className="text-xs text-gray-500">
                        Número formatado para WhatsApp: +{formattedPhone}
                    </p>
                    <a 
                        href={whatsappUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full inline-block bg-green-500 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-green-600 transition-all"
                    >
                        <i className="fab fa-whatsapp mr-2"></i>Iniciar Conversa
                    </a>
                </div>
            </div>
        </div>
    );
};