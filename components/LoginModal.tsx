import React, { useState } from 'react';
import { auth } from '../services/firebase';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [resetPasswordSent, setResetPasswordSent] = useState(false);


    if (!isOpen) return null;

    const handleAuthAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        setResetPasswordSent(false);

        if (!auth) {
            setError("Serviço de autenticação indisponível.");
            setIsLoading(false);
            return;
        }

        try {
            if (isLoginView) {
                await auth.signInWithEmailAndPassword(email, password);
                onLoginSuccess();
            } else {
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                await userCredential.user?.updateProfile({ displayName: name });
                onLoginSuccess();
            }
        } catch (err: any) {
            switch (err.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    setError('E-mail ou senha inválidos.');
                    break;
                case 'auth/email-already-in-use':
                    setError('Este e-mail já está em uso.');
                    break;
                case 'auth/weak-password':
                    setError('A senha deve ter pelo menos 6 caracteres.');
                    break;
                case 'auth/invalid-email':
                    setError('O formato do e-mail é inválido.');
                    break;
                default:
                    setError('Ocorreu um erro. Tente novamente.');
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    const handlePasswordReset = async () => {
        if (!email) {
            setError("Por favor, insira seu e-mail para redefinir a senha.");
            return;
        }
        setError('');
        setIsLoading(true);
        try {
            if (!auth) throw new Error("Serviço de autenticação indisponível.");
            await auth.sendPasswordResetEmail(email);
            setResetPasswordSent(true);
        } catch (err: any) {
             setError("Não foi possível enviar o e-mail de redefinição. Verifique o e-mail e tente novamente.");
        } finally {
             setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-text-on-light">{isLoginView ? 'Entrar na sua Conta' : 'Criar Nova Conta'}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <div className="overflow-y-auto p-6">
                    <form onSubmit={handleAuthAction} className="space-y-4">
                        {!isLoginView && (
                            <div>
                                <label className="block text-sm font-semibold mb-1" htmlFor="name">Seu Nome *</label>
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

                        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}
                        {resetPasswordSent && <p className="text-sm text-green-600 bg-green-50 p-3 rounded-md">E-mail de redefinição de senha enviado! Verifique sua caixa de entrada.</p>}

                        <button type="submit" disabled={isLoading} className="w-full bg-accent text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-opacity-90 transition-all disabled:bg-opacity-70 flex items-center justify-center">
                            {isLoading ? <i className="fas fa-spinner fa-spin"></i> : (isLoginView ? 'Entrar' : 'Criar Conta')}
                        </button>
                    </form>
                    <div className="text-center mt-4">
                        <button onClick={() => setIsLoginView(!isLoginView)} className="text-sm text-accent hover:underline">
                            {isLoginView ? 'Não tem uma conta? Crie uma agora!' : 'Já tem uma conta? Faça login.'}
                        </button>
                         {isLoginView && (
                            <button onClick={handlePasswordReset} className="block w-full text-center text-xs text-gray-500 hover:underline mt-2">
                                Esqueceu sua senha?
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
