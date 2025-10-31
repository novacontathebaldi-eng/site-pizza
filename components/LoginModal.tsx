import React, { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import * as firebaseService from '../services/firebaseService';
import firebase from 'firebase/compat/app';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGoogleSignIn: () => void;
    addToast: (message: string, type: 'success' | 'error') => void;
    onRegisterSuccess: () => void;
    onOpenPrivacyPolicy: () => void;
    onOpenTermsOfService: () => void;
    passwordResetCode: string | null;
}

type View = 'login' | 'register' | 'forgotPassword' | 'resetPassword';
type ResetStatus = 'idle' | 'verifying' | 'form' | 'success' | 'error';

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onGoogleSignIn, addToast, onRegisterSuccess, onOpenPrivacyPolicy, onOpenTermsOfService, passwordResetCode }) => {
    const [view, setView] = useState<View>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [feedback, setFeedback] = useState({ message: '', type: 'info' as 'success' | 'error' | 'info' });

    // State for the password reset flow
    const [resetStatus, setResetStatus] = useState<ResetStatus>('idle');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    const clearFormStates = () => {
        setEmail('');
        setPassword('');
        setName('');
        setPhone('');
        setAcceptedTerms(false);
        setError('');
        setFeedback({ message: '', type: 'info' });
        setNewPassword('');
        setConfirmNewPassword('');
    };

    useEffect(() => {
        if (isOpen) {
            clearFormStates();
            if (passwordResetCode) {
                setView('resetPassword');
                setResetStatus('verifying');
                verifyResetCode(passwordResetCode);
            } else {
                setView('login');
                setResetStatus('idle');
            }
        }
    }, [isOpen, passwordResetCode]);

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
            await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

            if (view === 'register') {
                if (name.trim().length < 2) throw { code: 'auth/invalid-name' };
                
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;
                if (user) {
                    await user.updateProfile({ displayName: name });
                    await firebaseService.createUserProfile(user, name, phone);
                    await user.sendEmailVerification();
                    addToast('Conta criada! Um e-mail de verificação foi enviado.', 'success');
                    onRegisterSuccess();
                }
            } else { // Login
                await auth.signInWithEmailAndPassword(email, password);
                addToast('Login efetuado com sucesso!', 'success');
                onClose();
            }
        } catch (err: any) {
            let friendlyMessage = 'Ocorreu um erro inesperado.';
            switch (err.code) {
                case 'auth/invalid-name': friendlyMessage = 'Por favor, insira um nome válido.'; break;
                case 'auth/invalid-cpf': friendlyMessage = 'O CPF inserido não é válido.'; break;
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
    
    const handlePasswordResetRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setFeedback({ message: '', type: 'info' });
        setIsLoading(true);
        if (!auth) {
            setError('Serviço de autenticação indisponível.');
            setIsLoading(false);
            return;
        }
        try {
            await auth.sendPasswordResetEmail(email);
            setFeedback({ message: 'Link enviado! Verifique sua caixa de entrada e spam.', type: 'success' });
        } catch (err: any) {
            let friendlyMessage = 'Ocorreu um erro.';
            if (err.code === 'auth/user-not-found') {
                friendlyMessage = 'E-mail não encontrado em nosso sistema.';
            }
            setError(friendlyMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const verifyResetCode = async (code: string) => {
        if (!auth) {
            setResetStatus('error');
            setError('Serviço de autenticação indisponível.');
            return;
        }
        try {
            await auth.verifyPasswordResetCode(code);
            setResetStatus('form');
        } catch (error) {
            setResetStatus('error');
            setError('Link inválido ou expirado. Por favor, solicite um novo link de redefinição.');
        }
    };

    const handleConfirmPasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (newPassword !== confirmNewPassword) {
            setError('As senhas não coincidem.');
            return;
        }
        if (!passwordResetCode) {
            setError('Código de redefinição inválido. Tente novamente.');
            return;
        }
        setIsLoading(true);
        try {
            await auth.confirmPasswordReset(passwordResetCode, newPassword);
            setResetStatus('success');
        } catch (err: any) {
            let friendlyMessage = 'Não foi possível redefinir a senha.';
            if (err.code === 'auth/weak-password') {
                friendlyMessage = 'A senha é muito fraca. Use pelo menos 6 caracteres.';
            }
            setError(friendlyMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleViewChange = (newView: View) => {
        setView(newView);
        clearFormStates();
    };

    const renderContent = () => {
        if (feedback.message) {
            return (
                <div className={`p-4 rounded-md text-center ${feedback.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    <p className="font-semibold">{feedback.message}</p>
                    {view === 'forgotPassword' && (
                        <button type="button" onClick={() => handleViewChange('login')} className="mt-4 font-bold text-accent hover:underline">
                            Voltar para o Login
                        </button>
                    )}
                </div>
            );
        }

        switch (view) {
            case 'login':
            case 'register':
                return (
                    <>
                        <form onSubmit={handleEmailPasswordSubmit} className="space-y-4">
                            {view === 'register' && (
                               <>
                                    <div>
                                        <label className="block text-sm font-semibold mb-1" htmlFor="name">Nome Completo *</label>
                                        <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border rounded-md" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-1" htmlFor="phone">WhatsApp *</label>
                                        <input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-3 py-2 border rounded-md" placeholder="(27) 99999-9999" required />
                                    </div>
                               </>
                            )}
                            <div>
                                <label className="block text-sm font-semibold mb-1" htmlFor="email">E-mail *</label>
                                <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 border rounded-md" required />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1" htmlFor="password">Senha *</label>
                                <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 border rounded-md" required />
                            </div>
                            {view === 'login' && (
                                <div className="text-right">
                                    <button type="button" onClick={() => handleViewChange('forgotPassword')} className="text-sm font-semibold text-accent hover:underline">Esqueci minha senha</button>
                                </div>
                            )}
                             {view === 'register' && (
                                <>
                                    
                                    <div className="pt-2">
                                        <label className="flex items-start gap-2 text-sm text-gray-600">
                                            <input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} className="mt-1 h-4 w-4 rounded border-gray-400 text-accent focus:ring-accent" />
                                            <span className="leading-snug">
                                                Eu li e aceito os{' '}
                                                <button type="button" onClick={onOpenTermsOfService} className="font-semibold text-accent hover:underline focus:outline-none">Termos de Serviço</button>
                                                {' '}e a{' '}
                                                <button type="button" onClick={onOpenPrivacyPolicy} className="font-semibold text-accent hover:underline focus:outline-none">Política de Privacidade</button>.
                                            </span>
                                        </label>
                                    </div>
                                </>
                            )}
                            {error && <p className="text-red-600 text-sm text-center bg-red-50 p-2 rounded-md">{error}</p>}
                            <button type="submit" disabled={isLoading || (view === 'register' && !acceptedTerms)} className="w-full bg-accent text-white font-bold py-3 px-4 rounded-lg hover:bg-opacity-90 flex items-center justify-center disabled:bg-opacity-70 disabled:cursor-not-allowed">
                                {isLoading ? <i className="fas fa-spinner fa-spin"></i> : (view === 'register' ? 'Criar Conta' : 'Entrar')}
                            </button>
                        </form>
                        {/* Botão de login com Google temporariamente desativado a pedido */}
                        {/*
                        <div className="relative my-6"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div><div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">ou</span></div></div>
                        <button onClick={onGoogleSignIn} className="w-full bg-white border border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-3">
                            <i className="fab fa-google text-red-500"></i>
                            <span>Continuar com o Google</span>
                        </button>
                        */}
                    </>
                );
            case 'forgotPassword':
                return (
                    <form onSubmit={handlePasswordResetRequest} className="space-y-4">
                        <p className="text-sm text-center text-gray-600">Digite seu e-mail e enviaremos um link seguro para você redefinir sua senha.</p>
                        <div>
                            <label className="block text-sm font-semibold mb-1" htmlFor="email-reset">E-mail *</label>
                            <input id="email-reset" type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 border rounded-md" required />
                        </div>
                        {error && <p className="text-red-600 text-sm text-center bg-red-50 p-2 rounded-md">{error}</p>}
                        <button type="submit" disabled={isLoading} className="w-full bg-accent text-white font-bold py-3 px-4 rounded-lg hover:bg-opacity-90 flex items-center justify-center disabled:bg-opacity-70">
                            {isLoading ? <i className="fas fa-spinner fa-spin"></i> : 'Enviar Link'}
                        </button>
                        <button type="button" onClick={() => handleViewChange('login')} className="w-full text-center mt-4 text-sm font-semibold text-gray-600 hover:underline">Voltar para o Login</button>
                    </form>
                );
            case 'resetPassword':
                switch (resetStatus) {
                    case 'verifying':
                        return <div className="text-center p-8"><i className="fas fa-spinner fa-spin text-3xl text-accent"></i><p className="mt-4 font-semibold">Verificando...</p></div>;
                    case 'error':
                        return <div className="text-center p-4 bg-red-50 text-red-800 rounded-md">
                            <p className="font-bold">{error}</p>
                            <button type="button" onClick={() => handleViewChange('forgotPassword')} className="mt-4 font-bold text-accent hover:underline">Solicitar Novo Link</button>
                        </div>;
                    case 'success':
                        return <div className="text-center p-4 bg-green-50 text-green-800 rounded-md">
                            <p className="font-bold">Senha redefinida com sucesso!</p>
                            <p className="text-sm mt-2">Você já pode entrar com sua nova senha.</p>
                            <button type="button" onClick={() => handleViewChange('login')} className="mt-4 w-full bg-accent text-white font-bold py-2 px-4 rounded-lg">Ir para Login</button>
                        </div>;
                    case 'form':
                        return (
                             <form onSubmit={handleConfirmPasswordReset} className="space-y-4">
                                <h3 className="font-bold text-lg text-center">Crie sua Nova Senha</h3>
                                <div>
                                    <label className="block text-sm font-semibold mb-1" htmlFor="new-password">Nova Senha *</label>
                                    <input id="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-3 py-2 border rounded-md" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-1" htmlFor="confirm-new-password">Confirme a Nova Senha *</label>
                                    <input id="confirm-new-password" type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} className="w-full px-3 py-2 border rounded-md" required />
                                </div>
                                {error && <p className="text-red-600 text-sm text-center bg-red-50 p-2 rounded-md">{error}</p>}
                                <button type="submit" disabled={isLoading} className="w-full bg-accent text-white font-bold py-3 px-4 rounded-lg hover:bg-opacity-90 flex items-center justify-center disabled:bg-opacity-70">
                                    {isLoading ? <i className="fas fa-spinner fa-spin"></i> : 'Redefinir Senha'}
                                </button>
                            </form>
                        );
                    default: return null;
                }
            default: return null;
        }
    };
    
    const modalTitle = {
        login: 'Acessar Conta',
        register: 'Criar Conta',
        forgotPassword: 'Recuperar Senha',
        resetPassword: 'Redefinir Senha'
    }[view];

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in-up">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-text-on-light"><i className="fas fa-user-circle mr-2"></i>{modalTitle}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {view !== 'resetPassword' && view !== 'forgotPassword' && feedback.message === '' && (
                        <div className="flex border-b mb-6">
                            <button onClick={() => handleViewChange('login')} className={`flex-1 font-semibold py-2 transition-colors ${view === 'login' ? 'text-accent border-b-2 border-accent' : 'text-gray-500'}`}>Entrar</button>
                            <button onClick={() => handleViewChange('register')} className={`flex-1 font-semibold py-2 transition-colors ${view === 'register' ? 'text-accent border-b-2 border-accent' : 'text-gray-500'}`}>Registrar</button>
                        </div>
                    )}
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};