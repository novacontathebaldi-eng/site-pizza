
import React, { useState } from 'react';
import { auth, googleProvider } from '../services/firebase';
import * as firebaseService from '../services/firebaseService';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        setError(null);
        try {
            if (!auth || !googleProvider) {
                throw new Error("Serviço de autenticação não inicializado.");
            }
            const result = await auth.signInWithPopup(googleProvider);
            if (result.user) {
                // Check for or create a user profile in Firestore
                await firebaseService.getOrCreateUserProfile(result.user);
                onClose(); // Close modal on success
            }
        } catch (err: any) {
            console.error("Erro no login com Google: ", err);
            let friendlyMessage = 'Ocorreu um erro ao tentar fazer login.';
            if (err.code === 'auth/popup-closed-by-user') {
                friendlyMessage = 'A janela de login foi fechada antes da conclusão.';
            } else if (err.code === 'auth/network-request-failed') {
                friendlyMessage = 'Erro de rede. Verifique sua conexão e tente novamente.';
            }
            setError(friendlyMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-text-on-light">Acessar Conta</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl" disabled={isLoading}>&times;</button>
                </div>
                <div className="p-6 text-center">
                    <p className="text-gray-600 mb-6">Entre com sua conta para salvar seus endereços e visualizar o histórico de pedidos.</p>
                    
                    {error && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">
                            {error}
                        </div>
                    )}
                    
                    <button 
                        onClick={handleGoogleSignIn}
                        disabled={isLoading}
                        className="w-full bg-blue-500 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-blue-600 transition-all flex items-center justify-center disabled:bg-blue-300"
                    >
                        {isLoading ? (
                            <i className="fas fa-spinner fa-spin"></i>
                        ) : (
                            <>
                                <i className="fab fa-google mr-3"></i>
                                Entrar com Google
                            </>
                        )}
                    </button>
                    
                    <p className="text-xs text-gray-400 mt-4">
                        Ao continuar, você concorda com nossos Termos de Serviço e Política de Privacidade.
                    </p>
                </div>
            </div>
        </div>
    );
};
