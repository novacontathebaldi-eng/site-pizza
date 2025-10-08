import React, { useState } from 'react';
import { auth, googleProvider } from '../services/firebase';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    addToast: (message: string, type: 'success' | 'error') => void;
}

type AuthView = 'login' | 'signup' | 'reset';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, addToast }) => {
    const [view, setView] = useState<AuthView>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleAuthError = (err: any) => {
        setIsLoading(false);
        switch (err.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                setError('E-mail ou senha incorretos.');
                break;
            case 'auth/email-already-in-use':
                setError('Este e-mail já está cadastrado.');
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
    };

    const handleGoogleSignIn = async () => {
        if (!auth || !googleProvider) return;
        setIsLoading(true);
        setError('');
        try {
            await auth.signInWithPopup(googleProvider);
            addToast('Login com Google bem-sucedido!', 'success');
            onClose();
        } catch (error) {
            handleAuthError(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmailPasswordAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth) return;
        setIsLoading(true);
        setError('');

        try {
            if (view === 'signup') {
                await auth.createUserWithEmailAndPassword(email, password);
                addToast('Conta criada com sucesso!', 'success');
            } else {
                await auth.signInWithEmailAndPassword(email, password);
                addToast('Login bem-sucedido!', 'success');
            }
            onClose();
        } catch (error) {
            handleAuthError(error);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth) return;
        setIsLoading(true);
        setError('');

        try {
            await auth.sendPasswordResetEmail(email);
            addToast('E-mail de redefinição de senha enviado!', 'success');
            setView('login');
        } catch (error) {
            handleAuthError(error);
        } finally {
            setIsLoading(false);
        }
    };


    const title = view === 'login' ? 'Entrar na sua conta' : view === 'signup' ? 'Criar uma nova conta' : 'Redefinir Senha';
    const buttonText = view === 'login' ? 'Entrar' : view === 'signup' ? 'Criar Conta' : 'Enviar E-mail';
    const switchViewText = view === 'login' ? 'Não tem uma conta? Cadastre-se' : view === 'signup' ? 'Já tem uma conta? Entre' : 'Voltar para o login';
    
    const handleSwitchView = () => {
        setError('');
        if (view === 'reset') {
            setView('login');
        } else {
            setView(view === 'login' ? 'signup' : 'login');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-text-on-light">{title}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <div className="overflow-y-auto p-6">
                    {view !== 'reset' && (
                        <>
                        <button onClick={handleGoogleSignIn} disabled={isLoading} className="w-full flex items-center justify-center gap-3 py-3 border rounded-lg hover:bg-gray-50 font-semibold mb-4 disabled:opacity-50">
                            <i className="fab fa-google text-red-500"></i>
                            Continuar com Google
                        </button>
                        <div className="flex items-center my-4">
                            <hr className="flex-grow border-t" />
                            <span className="mx-4 text-sm text-gray-500">OU</span>
                            <hr className="flex-grow border-t" />
                        </div>
                        </>
                    )}

                    <form onSubmit={view === 'reset' ? handlePasswordReset : handleEmailPasswordAuth} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold mb-1" htmlFor="auth-email">E-mail</label>
                            <input id="auth-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 border rounded-md" required />
                        </div>
                        {view !== 'reset' && (
                            <div>
                                <label className="block text-sm font-semibold mb-1" htmlFor="auth-password">Senha</label>
                                <input id="auth-password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 border rounded-md" required />
                            </div>
                        )}
                        {error && <p className="text-red-600 text-sm">{error}</p>}
                        
                        <button type="submit" disabled={isLoading} className="w-full bg-accent text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-opacity-90 transition-all disabled:bg-opacity-70 flex items-center justify-center">
                            {isLoading ? <i className="fas fa-spinner fa-spin"></i> : buttonText}
                        </button>
                    </form>

                    <div className="text-center mt-4">
                        <button onClick={handleSwitchView} className="text-sm text-brand-olive-600 hover:underline">
                            {switchViewText}
                        </button>
                        {view === 'login' && (
                            <button onClick={() => { setView('reset'); setError('') }} className="block mx-auto mt-2 text-sm text-gray-500 hover:underline">
                                Esqueceu sua senha?
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
