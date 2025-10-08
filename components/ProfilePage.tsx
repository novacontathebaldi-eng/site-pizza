
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import * as firebaseService from '../services/firebaseService';
import firebase from 'firebase/compat/app';

interface ProfilePageProps {
    currentUser: firebase.User | null;
    userProfile: UserProfile | null;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ currentUser, userProfile }) => {
    const [formData, setFormData] = useState<Partial<UserProfile>>({});
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        if (userProfile) {
            setFormData({
                name: userProfile.name || '',
                phone: userProfile.phone || '',
            });
        }
    }, [userProfile]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        setIsSaving(true);
        setFeedback('');
        try {
            await firebaseService.updateUserProfile(currentUser.uid, formData);
            setFeedback('Perfil atualizado com sucesso!');
            setIsEditing(false);
            setTimeout(() => setFeedback(''), 3000);
        } catch (error) {
            console.error("Failed to save profile", error);
            setFeedback('Falha ao salvar. Tente novamente.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const goHome = () => window.location.hash = '#inicio';

    if (!currentUser || !userProfile) {
        return (
            <section id="meu-perfil" className="py-20 bg-brand-ivory-50 min-h-screen flex items-center justify-center">
                 <div className="text-center">
                     <i className="fas fa-spinner fa-spin text-4xl text-accent"></i>
                </div>
            </section>
        );
    }
    
    return (
        <section id="meu-perfil" className="py-20 bg-brand-ivory-50 min-h-screen">
            <div className="container mx-auto px-4 max-w-2xl">
                 <div className="flex justify-between items-center mb-8">
                    <h2 className="text-4xl font-bold text-text-on-light">Meu Perfil</h2>
                     <a href="#inicio" onClick={goHome} className="text-accent font-semibold hover:underline">
                        <i className="fas fa-arrow-left mr-2"></i>Voltar
                    </a>
                </div>

                <div className="bg-white p-8 rounded-2xl shadow-lg border">
                    <form onSubmit={handleSave}>
                        <div className="space-y-6">
                             <div>
                                <label className="block text-sm font-semibold mb-1" htmlFor="profile-name">Nome</label>
                                <input id="profile-name" name="name" value={formData.name || ''} onChange={handleChange} disabled={!isEditing} className="w-full px-4 py-2 border rounded-lg bg-gray-50 disabled:bg-gray-200 disabled:cursor-not-allowed"/>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1" htmlFor="profile-email">Email</label>
                                <input id="profile-email" name="email" value={userProfile.email} disabled className="w-full px-4 py-2 border rounded-lg bg-gray-200 cursor-not-allowed" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1" htmlFor="profile-phone">Telefone</label>
                                <input id="profile-phone" name="phone" value={formData.phone || ''} onChange={handleChange} disabled={!isEditing} className="w-full px-4 py-2 border rounded-lg bg-gray-50 disabled:bg-gray-200 disabled:cursor-not-allowed"/>
                            </div>
                        </div>

                        {feedback && <div className="mt-4 text-center text-green-600 font-semibold">{feedback}</div>}

                        <div className="mt-8 pt-6 border-t flex justify-end gap-4">
                            {isEditing ? (
                                <>
                                    <button type="button" onClick={() => setIsEditing(false)} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Cancelar</button>
                                    <button type="submit" disabled={isSaving} className="bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 disabled:bg-opacity-70">
                                        {isSaving ? <i className="fas fa-spinner fa-spin"></i> : 'Salvar'}
                                    </button>
                                </>
                            ) : (
                                <button type="button" onClick={() => setIsEditing(true)} className="bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600">
                                    <i className="fas fa-edit mr-2"></i>Editar Perfil
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                 <div className="mt-8 bg-white p-8 rounded-2xl shadow-lg border">
                    <h3 className="text-2xl font-bold mb-4">Meus Endereços</h3>
                    <p className="text-gray-600">Funcionalidade de endereços em breve!</p>
                </div>
            </div>
        </section>
    );
};
