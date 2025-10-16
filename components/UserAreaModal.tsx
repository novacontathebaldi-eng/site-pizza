import React, { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import { UserProfile, Order, OrderStatus, Address } from '../types';
import { db } from '../services/firebase';
import * as firebaseService from '../services/firebaseService';
import defaultProfilePic from '../assets/perfil.png';
import userAreaBackground from '../assets/fundocliente.png';

interface UserAreaModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: firebase.User | null;
    profile: UserProfile | null;
    onLogout: () => void;
    addToast: (message: string, type: 'success' | 'error') => void;
    initialTab?: 'orders' | 'profile' | 'addresses';
    showAddAddressForm?: boolean;
}

const statusConfig: { [key in OrderStatus]?: { text: string; icon: string; color: string; } } = {
    pending: { text: 'Pendente', icon: 'fas fa-hourglass-start', color: 'text-yellow-500' },
    accepted: { text: 'Em Preparo', icon: 'fas fa-cogs', color: 'text-blue-500' },
    reserved: { text: 'Reserva Confirmada', icon: 'fas fa-chair', color: 'text-teal-500' },
    ready: { text: 'Pronto / Em Rota', icon: 'fas fa-shipping-fast', color: 'text-purple-500' },
    completed: { text: 'Finalizado', icon: 'fas fa-check-circle', color: 'text-green-500' },
    cancelled: { text: 'Cancelado', icon: 'fas fa-times-circle', color: 'text-red-500' },
    deleted: { text: 'Excluído', icon: 'fas fa-trash-alt', color: 'text-gray-500' },
    'awaiting-payment': { text: 'Aguardando Pgto', icon: 'fas fa-clock', color: 'text-gray-500' },
};

const LOCALIDADES = ['Centro', 'Olaria', 'Vila Nova', 'Moxafongo', 'Cocal', 'Funil'];

const AddressForm: React.FC<{
    address: Partial<Address> | null;
    onSave: (address: Address) => Promise<void>;
    onCancel: () => void;
    isSaving: boolean;
    totalAddresses: number;
}> = ({ address, onSave, onCancel, isSaving, totalAddresses }) => {
    const [formData, setFormData] = useState<Partial<Address>>({
        label: '', localidade: 'Centro', street: '', number: '', complement: '', isFavorite: false,
        bairro: '', cep: '29640-000', city: 'Santa Leopoldina',
        ...address
    });
    
    useEffect(() => {
        const isOther = formData.localidade === 'Outra';
        setFormData(prev => ({
            ...prev,
            cep: isOther ? '' : '29640-000',
            city: isOther ? '' : 'Santa Leopoldina'
        }));
    }, [formData.localidade]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const isOtherLocality = formData.localidade === 'Outra';
        const finalAddress: Address = {
            id: formData.id || '',
            label: formData.label || 'Endereço',
            localidade: formData.localidade || '',
            street: formData.street || '',
            number: formData.number || '',
            complement: formData.complement || '',
            bairro: isOtherLocality ? formData.bairro : '',
            isDeliveryArea: LOCALIDADES.includes(formData.localidade || ''),
            city: isOtherLocality ? formData.city || '' : 'Santa Leopoldina',
            cep: isOtherLocality ? formData.cep || '' : '29640-000',
            state: 'ES',
            isFavorite: isOtherLocality ? false : formData.isFavorite || false,
        };
        onSave(finalAddress);
    };
    
    const isOnlyAddress = totalAddresses === 1 && !!address?.id;
    const isOtherLocality = formData.localidade === 'Outra';
    const isFavoriteDisabled = isOtherLocality || isOnlyAddress;

    return (
        <form onSubmit={handleSubmit} className="space-y-3 p-4 border rounded-lg bg-gray-50 mt-4 animate-fade-in-up">
            <h5 className="font-bold">{formData.id ? 'Editar Endereço' : 'Novo Endereço'}</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold mb-1">Rótulo (Ex: Casa, Trabalho)</label>
                    <input type="text" value={formData.label} onChange={e => setFormData({ ...formData, label: e.target.value })} className="w-full px-3 py-2 border rounded-md" required />
                </div>
                <div>
                    <label className="block text-sm font-semibold mb-1">Localidade *</label>
                    <select value={formData.localidade} onChange={e => setFormData({ ...formData, localidade: e.target.value })} className="w-full px-3 py-2 border rounded-md bg-white" required>
                        <option value="" disabled>Selecione...</option>
                        {LOCALIDADES.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                         <option value="Outra">Outra (Fora da área de entrega)</option>
                    </select>
                </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-semibold mb-1">CEP</label>
                    <input type="text" value={formData.cep} onChange={e => setFormData({ ...formData, cep: e.target.value })} className="w-full px-3 py-2 border rounded-md disabled:bg-gray-200" required disabled={!isOtherLocality} />
                </div>
                <div className="col-span-2">
                    <label className="block text-sm font-semibold mb-1">Cidade</label>
                    <input type="text" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} className="w-full px-3 py-2 border rounded-md disabled:bg-gray-200" required disabled={!isOtherLocality} />
                </div>
            </div>
             <div className={`grid grid-cols-1 md:grid-cols-[${isOtherLocality ? '1fr_2fr_1fr' : '2fr_1fr'}] gap-4`}>
                 {isOtherLocality && (
                     <div>
                        <label className="block text-sm font-semibold mb-1">Bairro *</label>
                        <input type="text" value={formData.bairro} onChange={e => setFormData({ ...formData, bairro: e.target.value })} className="w-full px-3 py-2 border rounded-md" required={isOtherLocality} />
                    </div>
                 )}
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
                <label className={`flex items-center gap-2 text-sm ${isFavoriteDisabled ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer'}`}>
                    <input type="checkbox" checked={formData.isFavorite || isOnlyAddress} onChange={e => !isFavoriteDisabled && setFormData({ ...formData, isFavorite: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent disabled:opacity-50" disabled={isFavoriteDisabled} />
                    Tornar este o endereço favorito
                </label>
                 {isOtherLocality && <p className="text-xs text-red-500 mt-1">Endereços fora da área de entrega não podem ser favoritos.</p>}
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

function validarCPF(cpf: string): boolean {
  // Remove pontos, traços e espaços
  cpf = cpf.replace(/[^\d]+/g, '');
  
  // Verifica se tem 11 dígitos
  if (cpf.length !== 11) return false;
  
  // Elimina CPFs inválidos conhecidos (todos dígitos iguais)
  if (/^(\d)\1+$/.test(cpf)) {
    return false;
  }
  
  // Valida primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let resto = 11 - (soma % 11);
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(9))) return false;
  
  // Valida segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }
  resto = 11 - (soma % 11);
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(10))) return false;
  
  return true;
}


export const UserAreaModal: React.FC<UserAreaModalProps> = ({ isOpen, onClose, user, profile, onLogout, addToast, initialTab = 'orders', showAddAddressForm = false }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [cpf, setCpf] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [myOrders, setMyOrders] = useState<Order[]>([]);
    const [isLoadingOrders, setIsLoadingOrders] = useState(true);
    const [activeTab, setActiveTab] = useState(initialTab);

    const [editingAddress, setEditingAddress] = useState<Partial<Address> | null>(null);
    const [isAddressFormVisible, setIsAddressFormVisible] = useState(showAddAddressForm);

    useEffect(() => {
        if (isOpen) {
            if (profile) {
                setName(profile.name || '');
                setPhone(profile.phone || '');
                setCpf(profile.cpf || '');
            }
             setActiveTab(initialTab);
             setIsAddressFormVisible(showAddAddressForm);
        } else {
            // Reset to default when modal closes
            setActiveTab('orders');
            setIsAddressFormVisible(false);
            setEditingAddress(null);
        }
    }, [isOpen, initialTab, showAddAddressForm, profile]);


    useEffect(() => {
        if (!isOpen || !user || !db) {
            setMyOrders([]);
            return;
        }

        if (activeTab === 'orders') {
            setIsLoadingOrders(true);
            const query = db.collection('orders').where('userId', '==', user.uid).limit(25);
            const unsubscribe = query.onSnapshot(snapshot => {
                const fetchedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
                fetchedOrders.sort((a, b) => (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0) - (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0));
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
        if (cpf.trim() && !validarCPF(cpf)) {
            addToast('O CPF inserido não é válido.', 'error');
            setIsSaving(false);
            return;
        }
        try {
            await firebaseService.updateUserProfile(user.uid, { name, phone, cpf });
            addToast('Seu perfil foi salvo!', 'success');
        } catch (error) {
            addToast('Erro ao salvar seu perfil.', 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleSaveAddress = async (address: Address) => {
        setIsSaving(true);
        try {
            if (address.id) {
                await firebaseService.updateAddress(user.uid, address);
                addToast('Endereço atualizado!', 'success');
            } else {
                await firebaseService.addAddress(user.uid, address);
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
                await firebaseService.deleteAddress(user.uid, addressId);
                addToast('Endereço excluído.', 'success');
            } catch (error) {
                addToast('Erro ao excluir endereço.', 'error');
            }
        }
    };

    const formatTimestamp = (timestamp: any): string => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
    };

    const UserProfileTab = () => (
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
             <div>
                <label className="block text-sm font-semibold mb-1">CPF (opcional)</label>
                <input type="text" value={cpf} onChange={e => setCpf(e.target.value)} className="w-full px-3 py-2 border rounded-md" placeholder="000.000.000-00" />
                 <p className="text-xs text-gray-500 mt-1">Seu CPF é usado para agilizar o pagamento com PIX.</p>
            </div>
            <div className="text-right pt-2">
                 <button type="submit" disabled={isSaving} className="bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 flex items-center justify-center min-w-[120px] disabled:bg-opacity-70">
                    {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-save mr-2"></i><span>Salvar Perfil</span></>}
                </button>
            </div>
        </form>
    );

    const MyOrdersTab = () => {
        const [isArchiveOpen, setIsArchiveOpen] = useState(false);
    
        const currentOrders = myOrders.filter(order =>
            ['pending', 'accepted', 'reserved', 'ready'].includes(order.status)
        );
        const archivedOrders = myOrders.filter(order =>
            ['completed', 'cancelled', 'deleted'].includes(order.status)
        );
    
        const renderOrderCard = (order: Order) => {
            const config = statusConfig[order.status] || { text: 'Desconhecido', icon: 'fas fa-question-circle', color: 'text-gray-500' };
            const isDeleted = order.status === 'deleted';

            return (
                <div key={order.id} className={`bg-white border rounded-lg p-3 flex justify-between items-center shadow-sm transition-opacity ${isDeleted ? 'opacity-60' : ''}`}>
                    <div>
                        <p className="font-bold">Pedido #{order.orderNumber}</p>
                        <p className="text-sm text-gray-500">{formatTimestamp(order.createdAt)}</p>
                    </div>
                    <div className="text-right">
                        <p className={`font-semibold text-sm flex items-center justify-end gap-2 ${config.color}`}>
                            <i className={config.icon}></i>{config.text}
                        </p>
                        {order.total != null && <p className="font-bold text-accent">{order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}
                    </div>
                </div>
            );
        };
    
        return (
            <div>
                {isLoadingOrders ? (
                    <div className="text-center p-8"><i className="fas fa-spinner fa-spin text-3xl text-accent"></i></div>
                ) : (
                    <>
                        <h3 className="text-lg font-bold text-text-on-light mb-3">Pedidos em Andamento</h3>
                        {currentOrders.length === 0 ? (
                            <p className="text-center text-gray-500 py-8 px-4 bg-gray-50 rounded-lg">Você não tem pedidos em andamento.</p>
                        ) : (
                            <div className="space-y-3">
                                {currentOrders.map(renderOrderCard)}
                            </div>
                        )}
    
                        <div className="mt-8 border-t pt-6">
                            <button
                                onClick={() => setIsArchiveOpen(!isArchiveOpen)}
                                className="w-full flex justify-between items-center text-left p-4 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                                aria-expanded={isArchiveOpen}
                            >
                                <span className="text-lg font-bold text-text-on-light">Histórico de Pedidos</span>
                                <i className={`fas fa-chevron-down text-gray-600 transition-transform duration-300 ${isArchiveOpen ? 'rotate-180' : ''}`}></i>
                            </button>
                            
                            {isArchiveOpen && (
                                <div className="mt-4 space-y-3 animate-fade-in-up">
                                    {archivedOrders.length === 0 ? (
                                        <p className="text-center text-gray-500 py-8 px-4">Seu histórico de pedidos está vazio.</p>
                                    ) : (
                                        archivedOrders.map(renderOrderCard)
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        );
    };
    
    const MyAddressesTab = () => (
        <div>
            {(profile.addresses || []).map(addr => (
                <div key={addr.id} className="bg-gray-50 border rounded-lg p-3 mb-3 flex justify-between items-start">
                    <div>
                        <p className="font-bold flex items-center gap-2">
                            {addr.label}
                            {addr.isFavorite && <span className="text-yellow-500 text-xs font-semibold flex items-center gap-1"><i className="fas fa-star"></i>Favorito</span>}
                        </p>
                        <p className="text-sm text-gray-600">{addr.street}, {addr.number} - {addr.bairro ? `${addr.bairro}, ` : ''}{addr.localidade}</p>
                        <p className="text-sm text-gray-600">{addr.city}, {addr.cep}</p>
                        {!addr.isDeliveryArea && <p className="text-xs text-red-500 font-semibold mt-1">Fora da área de entrega</p>}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => { setEditingAddress(addr); setIsAddressFormVisible(true); }} className="bg-blue-100 text-blue-600 w-8 h-8 rounded-md hover:bg-blue-200"><i className="fas fa-edit"></i></button>
                        <button onClick={() => handleDeleteAddress(addr.id)} className="bg-red-100 text-red-600 w-8 h-8 rounded-md hover:bg-red-200"><i className="fas fa-trash"></i></button>
                    </div>
                </div>
            ))}
            {!isAddressFormVisible && (
                <button onClick={() => { setEditingAddress(null); setIsAddressFormVisible(true); }} className="mt-4 w-full bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90">
                    <i className="fas fa-plus mr-2"></i>Adicionar Endereço
                </button>
            )}
            {isAddressFormVisible && <AddressForm address={editingAddress} onSave={handleSaveAddress} onCancel={() => { setIsAddressFormVisible(false); setEditingAddress(null); }} isSaving={isSaving} totalAddresses={(profile.addresses || []).length} />}
        </div>
    );

    return (
        <div
            className="fixed inset-0 bg-cover bg-center z-50 animate-fade-in-up"
            style={{ backgroundImage: `url(${userAreaBackground})` }}
        >
            <div className="w-full h-full flex flex-col">
                <header className="sticky top-0 bg-brand-green-700 z-10 flex-shrink-0 shadow-md">
                    <div className="max-w-4xl mx-auto flex justify-between items-center p-4">
                        <h2 className="text-xl sm:text-2xl font-bold text-text-on-dark flex items-center gap-3">
                            <i className="fas fa-user-circle"></i>
                            <span>Área do Cliente</span>
                        </h2>
                        <button onClick={onClose} className="text-text-on-dark font-semibold py-2 px-3 rounded-lg hover:bg-brand-olive-600 transition-colors flex items-center gap-2">
                            <i className="fas fa-arrow-left"></i>
                            <span className="hidden sm:inline">Voltar</span>
                        </button>
                    </div>
                </header>

                <div className="flex-grow overflow-y-auto">
                    <div className="max-w-4xl mx-auto p-4 sm:p-6 my-4 sm:my-6 bg-brand-ivory-50/90 backdrop-blur-sm rounded-xl shadow-lg">
                        <div className="border-b mb-6">
                            <nav className="flex -mb-px space-x-4">
                                <button onClick={() => setActiveTab('profile')} className={`py-2 px-3 font-semibold text-sm transition-colors ${activeTab === 'profile' ? 'border-b-2 border-accent text-accent' : 'text-gray-500 hover:text-gray-800'}`}>Perfil</button>
                                <button onClick={() => setActiveTab('orders')} className={`py-2 px-3 font-semibold text-sm transition-colors ${activeTab === 'orders' ? 'border-b-2 border-accent text-accent' : 'text-gray-500 hover:text-gray-800'}`}>Meus Pedidos</button>
                                <button onClick={() => setActiveTab('addresses')} className={`py-2 px-3 font-semibold text-sm transition-colors ${activeTab === 'addresses' ? 'border-b-2 border-accent text-accent' : 'text-gray-500 hover:text-gray-800'}`}>Meus Endereços</button>
                            </nav>
                        </div>
                        {activeTab === 'profile' && <UserProfileTab />}
                        {activeTab === 'orders' && <MyOrdersTab />}
                        {activeTab === 'addresses' && <MyAddressesTab />}
                    </div>
                </div>
            </div>
        </div>
    );
};
