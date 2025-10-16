import React from 'react';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGoogleSignIn: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onGoogleSignIn }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in-up">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-text-on-light"><i className="fas fa-user-circle mr-2"></i>Acessar Conta</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <div className="p-8 text-center space-y-6">
                    <p className="text-gray-600">Entre ou crie sua conta para acompanhar seus pedidos e agilizar suas próximas compras!</p>
                    <button
                        onClick={onGoogleSignIn}
                        className="w-full bg-white border border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 text-lg"
                    >
                        <i className="fab fa-google text-red-500"></i>
                        <span>Entrar com o Google</span>
                    </button>
                </div>
            </div>
        </div>
    );
};