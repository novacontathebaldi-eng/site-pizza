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

const formatTimestamp = (timestamp: any, includeTime: boolean = false): string => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const options: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    };
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    return new Intl.DateTimeFormat('pt-BR', options).format(date);
};

const OrderStatusTracker: React.FC<{ order: Order }> = ({ order }) => {
    if (order.customer.orderType === 'local') {
        const config = statusConfig[order.status === 'pending' ? 'pending' : 'reserved'] || statusConfig[order.status];
        if (!config) return null;
        return (
             <div className="bg-blue-50 border-l-4 border-blue-400 text-blue-800 p-3 my-2 rounded-r-lg text-sm">
                <div className="flex">
                    <div className="py-1"><i className={`text-xl mr-3 ${config.icon}`}></i></div>
                    <div>
                        <p className="font-bold">{config.text}</p>
                        <p className="text-xs">Sua reserva para {order.numberOfPeople} pessoa(s) em {formatTimestamp(order.createdAt, true)}.</p>
                    </div>
                </div>
            </div>
        );
    }

    const steps = [
        { id: 'pending', label: 'Pedido Recebido', icon: 'fas fa-receipt' },
        { id: 'accepted', label: 'Em Preparo', icon: 'fas fa-utensils' },
        { id: 'ready', label: order.customer.orderType === 'delivery' ? 'Saiu p/ Entrega' : 'Pronto p/ Retirada', icon: order.customer.orderType === 'delivery' ? 'fas fa-motorcycle' : 'fas fa-box-open' },
        { id: 'completed', label: 'Finalizado', icon: 'fas fa-check' }
    ];

    const statusOrder: OrderStatus[] = ['pending', 'accepted', 'ready', 'completed'];
    let currentStatusIndex = statusOrder.indexOf(order.status);
    
    if (order.status === 'awaiting-payment') {
        currentStatusIndex = 0;
    }
    
    if (order.status === 'cancelled') {
        return (
            <div className="bg-red-50 border-l-4 border-red-400 text-red-800 p-3 my-4 rounded-r-lg">
                <p className="font-bold text-sm"><i className="fas fa-times-circle mr-2"></i>Pedido Cancelado</p>
            </div>
        );
   }

    if (currentStatusIndex < 0 && order.status !== 'completed') {
        return null; 
    }

    if(order.status === 'completed') {
      currentStatusIndex = 3;
    }

    return (
        <div className="w-full pt-4 pb-2">
            <div className="flex items-start relative px-4 sm:px-0">
                <div className="absolute top-5 left-0 w-full h-1 bg-gray-200" style={{ transform: 'translateY(-50%)' }} />
                
                <div className="absolute top-5 left-0 h-1 bg-green-500 transition-all duration-500 ease-in-out"
                    style={{
                        width: `calc(${(currentStatusIndex / (steps.length - 1)) * 100}% - 2rem)`,
                        marginLeft: '1rem',
                        marginRight: '1rem',
                    }}
                />

                {steps.map((step, index) => {
                    const isCompleted = currentStatusIndex >= index;
                    const isActive = currentStatusIndex === index;

                    let circleClass = 'bg-gray-200 text-gray-400';
                    let textClass = 'text-gray-500';

                    if (isActive) {
                        circleClass = 'bg-green-500 text-white scale-110 shadow-lg';
                        textClass = 'font-bold text-green-600';
                    } else if (isCompleted) {
                        circleClass = 'bg-green-500 text-white';
                        textClass = 'text-green-600';
                    }
                    
                    return (
                        <div key={step.id} className="flex-1 flex flex-col items-center text-center z-10 px-1">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-300 ${circleClass}`}>
                                <i className={step.icon}></i>
                            </div>
                            <p className={`mt-2 text-xs leading-tight min-h-[2.5em] ${textClass} transition-colors duration-300`}>
                                {steps[index].label}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const OrderDetailsModal: React.FC<{ order: Order | null; onClose: () => void; }> = ({ order, onClose }) => {
    if (!order) return null;

    const isOngoing = ['pending', 'accepted', 'ready', 'awaiting-payment'].includes(order.status);
    const paymentMethodMap = { credit: 'Crédito', debit: 'Débito', pix: 'PIX', cash: 'Dinheiro' };
    const orderTypeMap = { delivery: 'Entrega', pickup: 'Retirada', local: 'Consumo no Local' };
    
     const paymentStatusInfo = {
        'pending': { text: 'Pendente', color: 'text-yellow-600' },
        'paid': { text: 'Pago', color: 'text-green-600' },
        'paid_online': { text: 'Pago Pelo Site', color: 'text-green-600 font-bold' },
        'refunded': { text: 'Estornado', color: 'text-orange-500' }
    }[order.paymentStatus] || { text: 'Pendente', color: 'text-yellow-600' };

    const fullAddress = order.customer.orderType === 'delivery' ? `${order.customer.street || ''}, ${order.customer.number || ''} - ${order.customer.neighborhood || ''}` : null;


    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 animate-fade-in-up">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                 <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h3 className="text-xl font-bold text-text-on-light">Detalhes do Pedido #{order.orderNumber}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                 <div className="overflow-y-auto p-4 sm:p-6 space-y-4">
                    {isOngoing && <OrderStatusTracker order={order} />}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="bg-gray-50 p-3 rounded-md border">
                            <h4 className="font-bold mb-2 text-base"><i className="fas fa-user mr-2 text-gray-400"></i>Cliente</h4>
                            <p><strong>Nome:</strong> {order.customer.name}</p>
                            <p><strong>Telefone:</strong> {order.customer.phone}</p>
                            <p><strong>Pedido:</strong> {orderTypeMap[order.customer.orderType]}</p>
                            {fullAddress && <p><strong>Endereço:</strong> {fullAddress}</p>}
                            {order.customer.orderType === 'local' && (
                                <>
                                    <p><strong>Pessoas:</strong> {order.numberOfPeople}</p>
                                    <p><strong>Reserva:</strong> {order.customer.reservationTime}</p>
                                </>
                            )}
                        </div>
                        <div className="bg-gray-50 p-3 rounded-md border">
                            <h4 className="font-bold mb-2 text-base"><i className="fas fa-credit-card mr-2 text-gray-400"></i>Pagamento</h4>
                             <p><strong>Método:</strong> {order.paymentMethod ? paymentMethodMap[order.paymentMethod] : 'N/A'}</p>
                            <p><strong>Status:</strong> <span className={`font-semibold ${paymentStatusInfo.color}`}>{paymentStatusInfo.text}</span></p>
                            {order.paymentMethod === 'cash' && ( <p><strong>Troco:</strong> {order.changeNeeded ? `para R$ ${order.changeAmount}` : 'Não precisa'}</p> )}
                            {order.deliveryFee > 0 && (<p><strong>Taxa de Entrega:</strong> {order.deliveryFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>)}
                            <p className="mt-2 pt-2 border-t font-bold"><strong>Total:</strong> {order.total?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                    </div>

                    {order.items && order.items.length > 0 && (
                        <div>
                            <h4 className="font-bold mb-2 text-base"><i className="fas fa-shopping-basket mr-2 text-gray-400"></i>Itens do Pedido</h4>
                            <ul className="space-y-1 text-sm">
                                {order.items.map(item => (<li key={item.id} className="flex justify-between p-2 bg-gray-50 rounded"><span>{item.quantity}x {item.name} ({item.size})</span><span className="font-semibold">{(item.price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></li>))}
                            </ul>
                        </div>
                    )}
                     {order.allergies && <p className="text-sm mt-3 p-2 bg-red-50 rounded-md border border-red-200"><strong>Alergias/Restrições:</strong> {order.allergies}</p>}
                     {order.notes && <p className="text-sm mt-3 p-2 bg-yellow-50 rounded-md border border-yellow-200"><strong>Obs:</strong> {order.notes}</p>}
                 </div>
            </div>
        </div>
    );
};


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
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i);
  let resto = 11 - (soma % 11);
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(9))) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i);
  resto = 11 - (soma % 11);
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(10))) return false;
  return true;
}


interface UserProfileTabProps {
    profile: UserProfile;
    user: firebase.User;
    onLogout: () => void;
    handleResendVerification: () => Promise<void>;
    handleProfileUpdate: (e: React.FormEvent) => Promise<void>;
    name: string;
    setName: (name: string) => void;
    phone: string;
    setPhone: (phone: string) => void;
    cpf: string;
    setCpf: (cpf: string) => void;
    isSaving: boolean;
}

const UserProfileTab: React.FC<UserProfileTabProps> = ({
    profile, user, onLogout, handleResendVerification, handleProfileUpdate,
    name, setName, phone, setPhone, cpf, setCpf, isSaving
}) => (
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

interface MyOrdersTabProps {
    myOrders: Order[];
    isLoadingOrders: boolean;
    onViewDetails: (order: Order) => void;
}

const MyOrdersTab: React.FC<MyOrdersTabProps> = ({ myOrders, isLoadingOrders, onViewDetails }) => {
    const [isArchiveOpen, setIsArchiveOpen] = useState(false);

    const currentOrders = myOrders.filter(order =>
        ['pending', 'accepted', 'reserved', 'ready', 'awaiting-payment'].includes(order.status)
    );
    const archivedOrders = myOrders.filter(order =>
        ['completed', 'cancelled', 'deleted'].includes(order.status)
    );

    const renderOrderSummaryCard = (order: Order) => {
        const orderTypeMap = { delivery: 'Entrega', pickup: 'Retirada', local: 'Consumo no Local' };
        const paymentStatusInfo = {
            'pending': { text: 'Pendente', color: 'text-yellow-600' },
            'paid': { text: 'Pago', color: 'text-green-600' },
            'paid_online': { text: 'Pago Pelo Site', color: 'text-green-600' },
            'refunded': { text: 'Estornado', color: 'text-orange-500' }
        }[order.paymentStatus] || { text: 'Pendente', color: 'text-yellow-600' };

        return (
             <div key={order.id} className="bg-white border rounded-lg p-4 flex flex-col shadow-sm">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <p className="font-bold text-lg text-text-on-light">Pedido #{order.orderNumber}</p>
                        <p className="text-xs text-gray-500">{formatTimestamp(order.createdAt, true)}</p>
                    </div>
                    {order.total != null && <p className="font-bold text-xl text-accent">{order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}
                </div>
                <div className="text-sm space-y-1 mb-4">
                     <p><strong>Cliente:</strong> {order.customer.name}</p>
                     <p><strong>Tipo:</strong> {orderTypeMap[order.customer.orderType]}</p>
                     <p><strong>Pagamento:</strong> <span className={`font-semibold ${paymentStatusInfo.color}`}>{paymentStatusInfo.text}</span></p>
                </div>
                 <button onClick={() => onViewDetails(order)} className="mt-auto w-full bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90">
                    <i className="fas fa-receipt mr-2"></i>Ver Detalhes do Pedido
                </button>
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
                            {currentOrders.map(renderOrderSummaryCard)}
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
                                     archivedOrders.map(renderOrderSummaryCard)
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

interface MyAddressesTabProps {
    profile: UserProfile;
    isAddressFormVisible: boolean;
    setIsAddressFormVisible: (visible: boolean) => void;
    editingAddress: Partial<Address> | null;
    setEditingAddress: (address: Partial<Address> | null) => void;
    handleSaveAddress: (address: Address) => Promise<void>;
    handleDeleteAddress: (addressId: string) => Promise<void>;
    isSaving: boolean;
}

const MyAddressesTab: React.FC<MyAddressesTabProps> = ({
    profile, isAddressFormVisible, setIsAddressFormVisible, editingAddress, setEditingAddress,
    handleSaveAddress, handleDeleteAddress, isSaving
}) => (
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
    const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);

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
            setActiveTab('orders');
            setIsAddressFormVisible(false);
            setEditingAddress(null);
            setSelectedOrderDetails(null);
        }
    }, [isOpen, initialTab, showAddAddressForm, profile]);


    useEffect(() => {
        if (!isOpen || !user || !db) {
            setMyOrders([]);
            return;
        }

        if (activeTab === 'orders') {
            setIsLoadingOrders(true);
            const query = db.collection('orders').where('userId', '==', user.uid).orderBy('createdAt', 'desc').limit(25);
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

    return (
        <>
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
                            {activeTab === 'profile' && (
                                <UserProfileTab
                                    profile={profile}
                                    user={user}
                                    onLogout={onLogout}
                                    handleResendVerification={handleResendVerification}
                                    handleProfileUpdate={handleProfileUpdate}
                                    name={name}
                                    setName={setName}
                                    phone={phone}
                                    setPhone={setPhone}
                                    cpf={cpf}
                                    setCpf={setCpf}
                                    isSaving={isSaving}
                                />
                            )}
                            {activeTab === 'orders' && <MyOrdersTab myOrders={myOrders} isLoadingOrders={isLoadingOrders} onViewDetails={setSelectedOrderDetails} />}
                            {activeTab === 'addresses' && (
                                <MyAddressesTab
                                    profile={profile}
                                    isAddressFormVisible={isAddressFormVisible}
                                    setIsAddressFormVisible={setIsAddressFormVisible}
                                    editingAddress={editingAddress}
                                    setEditingAddress={setEditingAddress}
                                    handleSaveAddress={handleSaveAddress}
                                    handleDeleteAddress={handleDeleteAddress}
                                    isSaving={isSaving}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <OrderDetailsModal order={selectedOrderDetails} onClose={() => setSelectedOrderDetails(null)} />
        </>
    );
};