import React, { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import { UserProfile, Order, OrderStatus } from '../types';
import { db } from '../services/firebase';
import * as firebaseService from '../services/firebaseService';
import defaultProfilePic from '../assets/perfil.png';

interface UserAreaModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: firebase.User | null;
    profile: UserProfile | null;
    onLogout: () => void;
    addToast: (message: string, type: 'success' | 'error') => void;
}

const statusConfig: { [key in OrderStatus]?: { text: string; icon: string; color: string; } } = {
    pending: { text: 'Pendente', icon: 'fas fa-hourglass-start', color: 'text-yellow-500' },
    accepted: { text: 'Em Preparo', icon: 'fas fa-cogs', color: 'text-blue-500' },
    reserved: { text: 'Reserva Confirmada', icon: 'fas fa-chair', color: 'text-teal-500' },
    ready: { text: 'Pronto / Em Rota', icon: 'fas fa-shipping-fast', color: 'text-purple-500' },
    completed: { text: 'Finalizado', icon: 'fas fa-check-circle', color: 'text-green-500' },
    cancelled: { text: 'Cancelado', icon: 'fas fa-times-circle', color: 'text-red-500' },
    'awaiting-payment': { text: 'Aguardando Pgto', icon: 'fas fa-clock', color: 'text-gray-500' },
};

export const UserAreaModal: React.FC<UserAreaModalProps> = ({ isOpen, onClose, user, profile, onLogout, addToast }) => {
    const [localidade, setLocalidade] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [myOrders, setMyOrders] = useState<Order[]>([]);
    const [isLoadingOrders, setIsLoadingOrders] = useState(true);

    useEffect(() => {
        if (profile) {
            setLocalidade(profile.localidade || '');
        }
    }, [profile]);

    useEffect(() => {
        if (!isOpen || !user || !db) {
            setMyOrders([]);
            return;
        }

        setIsLoadingOrders(true);
        const query = db.collection('orders')
                      .where('userId', '==', user.uid)
                      .limit(15);

        const unsubscribe = query.onSnapshot(snapshot => {
            const fetchedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
            
            // Sort client-side by creation date, newest first
            fetchedOrders.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                return dateB - dateA;
            });

            setMyOrders(fetchedOrders);
            setIsLoadingOrders(false);
        }, error => {
            console.error("Error fetching user orders:", error);
            addToast("Erro ao buscar seus pedidos.", 'error');
            setIsLoadingOrders(false);
        });

        return () => unsubscribe();
    }, [isOpen, user, addToast]);


    if (!isOpen || !user || !profile) return null;

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await firebaseService.updateUserProfile(user.uid, { localidade });
            addToast('Sua localidade foi salva!', 'success');
        } catch (error) {
            addToast('Erro ao salvar sua localidade.', 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const formatTimestamp = (timestamp: any): string => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in-up">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-text-on-light"><i className="fas fa-user-circle mr-2"></i>Área do Cliente</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <div className="overflow-y-auto p-6 space-y-6">
                    <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg border">
                        <img src={profile.photoURL || defaultProfilePic} alt="Foto de perfil" className="w-16 h-16 rounded-full" />
                        <div>
                            <h3 className="font-bold text-xl">{profile.name}</h3>
                            <p className="text-gray-600 text-sm">{profile.email}</p>
                        </div>
                        <button onClick={onLogout} className="ml-auto bg-red-100 text-red-600 font-semibold py-2 px-3 rounded-lg text-sm hover:bg-red-200">
                           <i className="fas fa-sign-out-alt mr-2"></i>Sair
                        </button>
                    </div>

                    <form onSubmit={handleProfileUpdate} className="space-y-3">
                         <h4 className="font-bold text-lg">Meu Endereço</h4>
                         <p className="text-sm text-gray-500 -mt-2">Salve sua localidade para agilizar pedidos de entrega.</p>
                         <div>
                            <label className="block text-sm font-semibold mb-1">Localidade *</label>
                            <select value={localidade} onChange={e => setLocalidade(e.target.value)} className="w-full px-3 py-2 border rounded-md bg-white" required>
                                <option value="" disabled>Selecione sua localidade...</option>
                                {['Centro', 'Olaria', 'Vila Nova', 'Moxafongo', 'Cocal', 'Funil'].map(loc => <option key={loc} value={loc}>{loc}</option>)}
                            </select>
                        </div>
                        <div className="text-right">
                             <button type="submit" disabled={isSaving} className="bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 flex items-center justify-center min-w-[120px] disabled:bg-opacity-70">
                                {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-save mr-2"></i><span>Salvar</span></>}
                            </button>
                        </div>
                    </form>

                    <div>
                        <h4 className="font-bold text-lg mb-3">Meus Pedidos Recentes</h4>
                        {isLoadingOrders ? (
                            <div className="text-center p-8"><i className="fas fa-spinner fa-spin text-3xl text-accent"></i></div>
                        ) : myOrders.length === 0 ? (
                            <p className="text-center text-gray-500 p-8">Você ainda não fez nenhum pedido.</p>
                        ) : (
                            <div className="space-y-3">
                                {myOrders.map(order => {
                                    const status = statusConfig[order.status] || { text: 'Desconhecido', icon: 'fas fa-question-circle', color: 'text-gray-500' };
                                    return (
                                    <div key={order.id} className="bg-gray-50 border rounded-lg p-3 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold">Pedido #{order.orderNumber}</p>
                                            <p className="text-sm text-gray-500">{formatTimestamp(order.createdAt)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-semibold text-sm flex items-center gap-2 ${status.color}`}>
                                                <i className={status.icon}></i>{status.text}
                                            </p>
                                            {order.total != null && <p className="font-bold text-accent">{order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};