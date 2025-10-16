import React, { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import { UserProfile, Order, OrderStatus, Address } from '../types';
import { db } from '../services/firebase';
import * as firebaseService from '../services/firebaseService';
import defaultProfilePic from '../assets/perfil.png';

const statusConfig: { [key in OrderStatus]?: { text: string; icon: string; color: string; } } = {
    pending: { text: 'Pendente', icon: 'fas fa-hourglass-start', color: 'text-yellow-500' },
    accepted: { text: 'Em Preparo', icon: 'fas fa-cogs', color: 'text-blue-500' },
    reserved: { text: 'Reserva Confirmada', icon: 'fas fa-chair', color: 'text-teal-500' },
    ready: { text: 'Pronto / Em Rota', icon: 'fas fa-shipping-fast', color: 'text-purple-500' },
    completed: { text: 'Finalizado', icon: 'fas fa-check-circle', color: 'text-green-500' },
    cancelled: { text: 'Cancelado', icon: 'fas fa-times-circle', color: 'text-red-500' },
    'awaiting-payment': { text: 'Aguardando Pgto', icon: 'fas fa-clock', color: 'text-gray-500' },
};

const LOCALIDADES = ['Centro', 'Olaria', 'Vila Nova', 'Moxafongo', 'Cocal', 'Funil'];

const AddressForm: React.FC<{
    address: Partial<Address> | null;
    onSave: (address: Address) => Promise<void>;
    onCancel: () => void;
    isSaving: boolean;
    isOnlyAddress: boolean;
}> = ({ address, onSave, onCancel, isSaving, isOnlyAddress }) => {
    
    const [formData, setFormData] = useState({
        id: address?.id || undefined,
        label: address?.label || '',
        localidade: address?.localidade || '',
        street: address?.street || '',
        number: address?.number || '',
        complement: address?.complement || '',
        cep: address?.cep || '29640-000',
        city: address?.city || 'Santa Leopoldina',
        state: address?.state || 'ES',
        isFavorite: address?.isFavorite || false,
        bairro: address?.isDeliveryArea === false ? address.localidade : ''
    });
    
    const isOutsideArea = formData.localidade === 'Outra';

    useEffect(() => {
        if (isOutsideArea) {
            // Se for a primeira vez que seleciona "Outra" e os dados são padrão, limpa.
            if (formData.cep === '29640-000') {
                 setFormData(f => ({ ...f, cep: '', city: '', state: '', isFavorite: false }));
            }
        } else {
             setFormData(f => ({ ...f, cep: '29640-000', city: 'Santa Leopoldina', state: 'ES' }));
        }
    }, [isOutsideArea]);

    const handleLocalidadeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newLocalidade = e.target.value;
        setFormData({ ...formData, localidade: newLocalidade });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalAddress: Address = {
            id: formData.id || '',
            label: formData.label || 'Endereço',
            localidade: isOutsideArea ? formData.bairro : formData.localidade,
            street: formData.street,
            number: formData.number,
            complement: formData.complement,
            isDeliveryArea: !isOutsideArea,
            city: formData.city,
            state: formData.state,
            cep: formData.cep,
            isFavorite: isOutsideArea ? false : formData.isFavorite,
        };
        onSave(finalAddress);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-gray-50 mt-4 animate-fade-in-up">
            <h5 className="font-bold">{formData.id ? 'Editar Endereço' : 'Novo Endereço'}</h5>
            
            <div>
                <label className="block text-sm font-semibold mb-1">Rótulo (Ex: Casa, Trabalho) *</label>
                <input type="text" value={formData.label} onChange={e => setFormData({ ...formData, label: e.target.value })} className="w-full px-3 py-2 border rounded-md" required />
            </div>

            <div>
                <label className="block text-sm font-semibold mb-1">Localidade *</label>
                <select value={formData.localidade} onChange={handleLocalidadeChange} className="w-full px-3 py-2 border rounded-md bg-white" required>
                    <option value="" disabled>Selecione...</option>
                    {LOCALIDADES.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                    <option value="Outra">Outra (Fora da área de entrega)</option>
                </select>
            </div>
            
            {isOutsideArea ? (
                <div className='animate-fade-in-up space-y-4 p-3 border rounded-md bg-white'>
                     <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-1">Bairro *</label>
                            <input name="bairro" value={formData.bairro} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" required />
                        </div>
                        <div>
                             <label className="block text-sm font-semibold mb-1">CEP *</label>
                            <input name="cep" value={formData.cep} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" required />
                        </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-1">Cidade *</label>
                            <input name="city" value={formData.city} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" required />
                        </div>
                         <div>
                            <label className="block text-sm font-semibold mb-1">Estado *</label>
                            <input name="state" value={formData.state} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" required />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <p className="text-sm p-2 bg-gray-200 rounded-md"><strong>CEP:</strong> 29640-000</p>
                    <p className="text-sm p-2 bg-gray-200 rounded-md"><strong>Cidade:</strong> Santa Leopoldina - ES</p>
                </div>
            )}
             <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
                <div>
                    <label className="block text-sm font-semibold mb-1">Rua *</label>
                    <input type="text" value={formData.street} onChange={e => setFormData({ ...formData, street: e.target.value })} className="w-full px-3 py-2 border rounded-md" required />
                </div>
                <div>
                    <label className="block text-sm font-semibold mb-1">Número *</label>
                    <input type="text" value={formData.number} onChange={e => setFormData({ ...formData, number: e.target.value })} className="w-full px-3 py-2 border rounded-md" required />
                </div>
            </div>
            <div>
                <label className="block text-sm font-semibold mb-1">Complemento (opcional)</label>
                <input type="text" value={formData.complement} onChange={e => setFormData({ ...formData, complement: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
                <label className={`flex items-center gap-2 cursor-pointer text-sm ${isOutsideArea || isOnlyAddress ? 'cursor-not-allowed opacity-50' : ''}`}>
                    <input type="checkbox" checked={formData.isFavorite} disabled={isOutsideArea || isOnlyAddress} onChange={e => setFormData({ ...formData, isFavorite: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent disabled:bg-gray-200" />
                    Tornar este o endereço favorito
                </label>
                {isOnlyAddress && <p className="text-xs text-gray-500 mt-1">Você não pode desmarcar seu único endereço como favorito.</p>}
                 {isOutsideArea && <p className="text-xs text-red-500 mt-1">Endereços fora da área de entrega não podem ser favoritos.</p>}
            </div>
            <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Cancelar</button>
                <button type="submit" disabled={isSaving} className="bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 flex items-center justify-center min-w-[100px] disabled:bg-opacity-70">
                    {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-save mr-2"></i>Salvar</>}
                </button>
            </div>
        </form>
    );
};


const UserProfileTab: React.FC<{
    user: firebase.User;
    profile: UserProfile;
    onLogout: () => void;
    addToast: (message: string, type: 'success' | 'error') => void;
}> = ({ user, profile, onLogout, addToast }) => {
    const [name, setName] = useState(profile.name || '');
    const [phone, setPhone] = useState(profile.phone || '');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setName(profile.name || '');
        setPhone(profile.phone || '');
    }, [profile]);

    const handleResendVerification = async () => {
        try {
            await user.sendEmailVerification();
            addToast('E-mail de verificação reenviado!', 'success');
        } catch (error) {
            addToast('Erro ao reenviar e-mail. Tente mais tarde.', 'error');
        }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await firebaseService.updateUserProfile(user.uid, { name, phone });
            addToast('Seu perfil foi salvo!', 'success');
        } catch (error) {
            addToast('Erro ao salvar seu perfil.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg border">
                <img src={profile.photoURL || defaultProfilePic} alt="Foto de perfil" className="w-16 h-16 rounded-full" />
                <div className="flex-grow">
                    <h3 className="font-bold text-xl">{profile.name}</h3>
                    <p className="text-gray-600 text-sm">{profile.email}</p>
                </div>
                <button type="button" onClick={onLogout} className="ml-auto bg-red-100 text-red-600 font-semibold py-2 px-3 rounded-lg text-sm hover:bg-red-200">
                   <i className="fas fa-sign-out-alt mr-2"></i>Sair
                </button>
            </div>
            {!user.emailVerified && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 p-4 text-sm" role="alert">
                    <p className="font-bold">Verifique seu e-mail!</p>
                    <p>Enviamos um link de confirmação para você. Verifique sua caixa de entrada ou spam.</p>
                    <button onClick={handleResendVerification} className="font-bold underline mt-2">Reenviar e-mail</button>
                </div>
            )}
            <div>
                <label className="block text-sm font-semibold mb-1">Nome Completo</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
            </div>
             <div>
                <label className="block text-sm font-semibold mb-1">Telefone/WhatsApp</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div className="text-right pt-2">
                 <button type="submit" disabled={isSaving} className="bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 flex items-center justify-center min-w-[120px] disabled:bg-opacity-70">
                    {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-save mr-2"></i><span>Salvar Perfil</span></>}
                </button>
            </div>
        </form>
    );
};

const MyOrdersTab: React.FC<{
    isLoading: boolean;
    orders: Order[];
}> = ({ isLoading, orders }) => {
    const formatTimestamp = (timestamp: any): string => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
    };

    return (
        <div>
            {isLoading ? (
                <div className="text-center p-8"><i className="fas fa-spinner fa-spin text-3xl text-accent"></i></div>
            ) : orders.length === 0 ? (
                <p className="text-center text-gray-500 p-8">Você ainda não fez nenhum pedido.</p>
            ) : (
                <div className="space-y-3">
                    {orders.map(order => {
                        const status = statusConfig[order.status] || { text: 'Desconhecido', icon: 'fas fa-question-circle', color: 'text-gray-500' };
                        return (
                        <div key={order.id} className="bg-gray-50 border rounded-lg p-3 flex justify-between items-center">
                            <div>
                                <p className="font-bold">Pedido #{order.orderNumber}</p>
                                <p className="text-sm text-gray-500">{formatTimestamp(order.createdAt)}</p>
                            </div>
                            <div className="text-right">
                                <p className={`font-semibold text-sm flex items-center justify-end gap-2 ${status.color}`}>
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
    );
};

const MyAddressesTab: React.FC<{
    profile: UserProfile;
    userUid: string;
    addToast: (message: string, type: 'success' | 'error') => void;
    initialShowForm: boolean;
}> = ({ profile, userUid, addToast, initialShowForm }) => {
    const [isSaving, setIsSaving] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Partial<Address> | null>(null);
    const [isAddressFormVisible, setIsAddressFormVisible] = useState(initialShowForm);
    const addresses = profile.addresses || [];

    useEffect(() => {
        setIsAddressFormVisible(initialShowForm);
        if (initialShowForm) {
             setEditingAddress({ isFavorite: addresses.length === 0 });
        }
    }, [initialShowForm, addresses.length]);

    const handleSaveAddress = async (address: Address) => {
        setIsSaving(true);
        try {
            if (address.id) {
                await firebaseService.updateAddress(userUid, address);
                addToast('Endereço atualizado!', 'success');
            } else {
                await firebaseService.addAddress(userUid, address);
                addToast('Endereço adicionado!', 'success');
            }
            setIsAddressFormVisible(false);
            setEditingAddress(null);
        } catch (error) {
            addToast('Erro ao salvar endereço.', 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDeleteAddress = async (addressId: string) => {
        if (window.confirm('Tem certeza que deseja excluir este endereço?')) {
            try {
                await firebaseService.deleteAddress(userUid, addressId);
                addToast('Endereço excluído.', 'success');
            } catch (error) {
                addToast('Erro ao excluir endereço.', 'error');
            }
        }
    };

    return (
        <div>
            {addresses.map(addr => (
                <div key={addr.id} className="bg-gray-50 border rounded-lg p-3 mb-3 flex justify-between items-start">
                    <div>
                        <p className="font-bold flex items-center gap-2">
                            {addr.label}
                            {addr.isFavorite && <span className="text-yellow-500 text-xs font-semibold flex items-center gap-1"><i className="fas fa-star"></i>Favorito</span>}
                        </p>
                        <p className="text-sm text-gray-600">{addr.street}, {addr.number} - {addr.localidade}</p>
                        {!addr.isDeliveryArea && <p className="text-xs text-red-500 font-semibold mt-1">Fora da área de entrega</p>}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => { setEditingAddress(addr); setIsAddressFormVisible(true); }} className="bg-blue-100 text-blue-600 w-8 h-8 rounded-md hover:bg-blue-200"><i className="fas fa-edit"></i></button>
                        <button onClick={() => handleDeleteAddress(addr.id)} className="bg-red-100 text-red-600 w-8 h-8 rounded-md hover:bg-red-200"><i className="fas fa-trash"></i></button>
                    </div>
                </div>
            ))}
            {!isAddressFormVisible && (
                <button onClick={() => { setEditingAddress({ isFavorite: addresses.length === 0 }); setIsAddressFormVisible(true); }} className="mt-4 w-full bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90">
                    <i className="fas fa-plus mr-2"></i>Adicionar Endereço
                </button>
            )}
            {isAddressFormVisible && <AddressForm address={editingAddress} onSave={handleSaveAddress} onCancel={() => { setIsAddressFormVisible(false); setEditingAddress(null); }} isSaving={isSaving} isOnlyAddress={addresses.length === 1 && !!addresses.find(a => a.id === editingAddress?.id)} />}
        </div>
    );
};

// FIX: Added the missing UserAreaModalProps interface definition.
interface UserAreaModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: firebase.User | null;
    profile: UserProfile | null;
    onLogout: () => void;
    addToast: (message: string, type: 'success' | 'error') => void;
    initialTab?: 'profile' | 'orders' | 'addresses';
    showAddAddressForm?: boolean;
}

export const UserAreaModal: React.FC<UserAreaModalProps> = ({ isOpen, onClose, user, profile, onLogout, addToast, initialTab = 'orders', showAddAddressForm = false }) => {
    const [myOrders, setMyOrders] = useState<Order[]>([]);
    const [isLoadingOrders, setIsLoadingOrders] = useState(true);
    const [activeTab, setActiveTab] = useState(initialTab);

    useEffect(() => {
        if (isOpen) {
             setActiveTab(initialTab);
        } else {
            setActiveTab('orders'); // Reset to default when modal closes
        }
    }, [isOpen, initialTab]);


    useEffect(() => {
        if (!isOpen || !user || !db) {
            setMyOrders([]);
            return;
        }

        if (activeTab === 'orders') {
            setIsLoadingOrders(true);
            const query = db.collection('orders').where('userId', '==', user.uid).orderBy('createdAt', 'desc').limit(15);
            const unsubscribe = query.onSnapshot(snapshot => {
                const fetchedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
                setMyOrders(fetchedOrders);
                setIsLoadingOrders(false);
            }, error => {
                console.error("Error fetching user orders:", error);
                addToast("Erro ao buscar seus pedidos.", 'error');
                setIsLoadingOrders(false);
            });
            return () => unsubscribe();
        }
    }, [isOpen, user, addToast, activeTab]);

    if (!isOpen || !user || !profile) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in-up">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-text-on-light"><i className="fas fa-user-circle mr-2"></i>Área do Cliente</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <div className="overflow-y-auto p-6">
                    <div className="border-b mb-4">
                        <nav className="flex -mb-px">
                            <button onClick={() => setActiveTab('profile')} className={`py-2 px-4 font-semibold text-sm ${activeTab === 'profile' ? 'border-b-2 border-accent text-accent' : 'text-gray-500'}`}>Perfil</button>
                            <button onClick={() => setActiveTab('orders')} className={`py-2 px-4 font-semibold text-sm ${activeTab === 'orders' ? 'border-b-2 border-accent text-accent' : 'text-gray-500'}`}>Meus Pedidos</button>
                            <button onClick={() => setActiveTab('addresses')} className={`py-2 px-4 font-semibold text-sm ${activeTab === 'addresses' ? 'border-b-2 border-accent text-accent' : 'text-gray-500'}`}>Meus Endereços</button>
                        </nav>
                    </div>
                    {activeTab === 'profile' && <UserProfileTab user={user} profile={profile} onLogout={onLogout} addToast={addToast} />}
                    {activeTab === 'orders' && <MyOrdersTab isLoading={isLoadingOrders} orders={myOrders} />}
                    {activeTab === 'addresses' && <MyAddressesTab profile={profile} userUid={user.uid} addToast={addToast} initialShowForm={showAddAddressForm} />}
                </div>
            </div>
        </div>
    );
};