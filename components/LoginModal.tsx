import React, { useState } from 'react';
import { auth } from '../services/firebase';
import * as firebaseService from '../services/firebaseService';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGoogleSignIn: () => void;
    addToast: (message: string, type: 'success' | 'error') => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onGoogleSignIn, addToast }) => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!auth) {
            setError('Serviço de autenticação indisponível.');
            setIsLoading(false);
            return;
        }

        try {
            if (isRegistering) {
                // Processo de Registro
                if (name.trim().length < 2) {
                    setError('Por favor, insira um nome válido.');
                    setIsLoading(false);
                    return;
                }
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;
                if (user) {
                    await user.updateProfile({ displayName: name });
                    await firebaseService.createUserProfile(user, name); // Cria o perfil no Firestore
                    await user.sendEmailVerification();
                    addToast('Conta criada! Um e-mail de verificação foi enviado.', 'success');
                    onClose();
                }
            } else {
                // Processo de Login
                await auth.signInWithEmailAndPassword(email, password);
                addToast('Login efetuado com sucesso!', 'success');
                onClose();
            }
        } catch (err: any) {
            let friendlyMessage = 'Ocorreu um erro inesperado.';
            switch (err.code) {
                case 'auth/email-already-in-use': friendlyMessage = 'Este e-mail já está em uso.'; break;
                case 'auth/invalid-email': friendlyMessage = 'O formato do e-mail é inválido.'; break;
                case 'auth/weak-password': friendlyMessage = 'A senha deve ter pelo menos 6 caracteres.'; break;
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential': friendlyMessage = 'E-mail ou senha incorretos.'; break;
            }
            setError(friendlyMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in-up">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-text-on-light"><i className="fas fa-user-circle mr-2"></i>{isRegistering ? 'Criar Conta' : 'Acessar Conta'}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <div className="flex border-b mb-6">
                        <button onClick={() => { setIsRegistering(false); setError(''); }} className={`flex-1 font-semibold py-2 transition-colors ${!isRegistering ? 'text-accent border-b-2 border-accent' : 'text-gray-500'}`}>Entrar</button>
                        <button onClick={() => { setIsRegistering(true); setError(''); }} className={`flex-1 font-semibold py-2 transition-colors ${isRegistering ? 'text-accent border-b-2 border-accent' : 'text-gray-500'}`}>Registrar</button>
                    </div>

                    <form onSubmit={handleEmailPasswordSubmit} className="space-y-4">
                        {isRegistering && (
                            <div>
                                <label className="block text-sm font-semibold mb-1" htmlFor="name">Nome Completo *</label>
                                <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border rounded-md" required />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-semibold mb-1" htmlFor="email">E-mail *</label>
                            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 border rounded-md" required />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1" htmlFor="password">Senha *</label>
                            <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 border rounded-md" required />
                        </div>

                        {error && <p className="text-red-600 text-sm text-center bg-red-50 p-2 rounded-md">{error}</p>}

                        <button type="submit" disabled={isLoading} className="w-full bg-accent text-white font-bold py-3 px-4 rounded-lg hover:bg-opacity-90 flex items-center justify-center disabled:bg-opacity-70">
                            {isLoading ? <i className="fas fa-spinner fa-spin"></i> : (isRegistering ? 'Criar Conta' : 'Entrar')}
                        </button>
                    </form>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">ou</span>
                        </div>
                    </div>

                    <button onClick={onGoogleSignIn} className="w-full bg-white border border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-3">
                        <i className="fab fa-google text-red-500"></i>
                        <span>Continuar com o Google</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
