import React from 'react';

interface CookieConsentBannerProps {
    onAccept: () => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({ onAccept }) => {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-brand-green-700 text-white p-4 z-50 shadow-lg animate-fade-in-up">
            <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-center sm:text-left">
                    <i className="fas fa-cookie-bite mr-2"></i>
                    Nosso site utiliza **somente** cookies essenciais para garantir o bom funcionamento do carrinho de compras e da sua conta. Ao continuar navegando, você concorda com nosso uso de cookies.
                </p>
                <button 
                    onClick={onAccept}
                    className="bg-brand-gold-600 text-text-on-dark font-bold py-2 px-6 rounded-lg hover:bg-opacity-90 transition-all flex-shrink-0"
                >
                    Entendi e aceito
                </button>
            </div>
        </div>
    );
};