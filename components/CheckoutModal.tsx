
import React, { useState, useEffect } from 'react';
// FIX: Added '.ts' extension to fix module resolution error.
import { CartItem, OrderDetails, UserProfile } from '../types.ts';
import firebase from 'firebase/compat/app';

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    cartItems: CartItem[];
    onConfirmCheckout: (details: OrderDetails) => void;
    onInitiatePixPayment: (details: OrderDetails) => void;
    currentUser: firebase.User | null;
    userProfile: UserProfile | null;
}

const getSuggestedTimes = () => {
    const now = new Date();
    const suggestions = [];
    for (let i = 1; i <= 4; i++) {
        const suggestionTime = new Date(now.getTime() + i * 15 * 60000);
        const hours = suggestionTime.getHours().toString().padStart(2, '0');
        const minutes = suggestionTime.getMinutes().toString().padStart(2, '0');
        suggestions.push(`${hours}:${minutes}`);
    }
    return suggestions;
};

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, cartItems, onConfirmCheckout, onInitiatePixPayment, currentUser, userProfile }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [orderType, setOrderType] = useState<'delivery' | 'pickup' | 'local' | ''>('');
    const [address, setAddress] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'credit' | 'debit' | 'pix' | 'cash' | ''>('');
    const [changeNeeded, setChangeNeeded] = useState(false);
    const [changeAmount, setChangeAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [reservationTime, setReservationTime] = useState('');
    const [pixPaymentOption, setPixPaymentOption] = useState<'payNow' | 'payLater' | null>(null);


    const suggestedTimes = getSuggestedTimes();

    // Pre-fill user data if available
    useEffect(() => {
        if (isOpen && userProfile) {
            setName(userProfile.displayName || '');
            setPhone(userProfile.phone || '');
        }
    }, [isOpen, userProfile]);

    useEffect(() => {
        if (!isOpen) {
            // Reset all fields on close
            setName(''); setPhone(''); setOrderType(''); setAddress('');
            setPaymentMethod(''); setChangeNeeded(false); setChangeAmount('');
            setNotes(''); setReservationTime(''); setPixPaymentOption(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const getOrderDetails = (): OrderDetails => ({
        name, phone, orderType: orderType as 'delivery' | 'pickup' | 'local',
        address, paymentMethod: paymentMethod as 'credit' | 'debit' | 'pix' | 'cash',
        changeNeeded: paymentMethod === 'cash' && changeNeeded,
        changeAmount, notes, reservationTime
    });

    const handlePaymentMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newMethod = e.target.value as any;
        setPaymentMethod(newMethod);
        if (newMethod !== 'pix') {
            setPixPaymentOption(null);
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const details = getOrderDetails();

        if (paymentMethod === 'pix') {
            if (pixPaymentOption === 'payNow') {
                onInitiatePixPayment(details);
            } else if (pixPaymentOption === 'payLater') {
                onConfirmCheckout(details);
            } else {
                // This case should be prevented by the disabled button state
                alert("Por favor, escolha se deseja pagar agora ou depois.");
            }
        } else {
            onConfirmCheckout(details);
        }
    };
    
    const isSubmitDisabled = paymentMethod === 'pix' && !pixPaymentOption;
    
    const submitButtonText = (paymentMethod === 'pix' && pixPaymentOption === 'payNow')
        ? 'Pagar e Finalizar Pedido'
        : 'Enviar Pedido';
        
    const submitButtonIconClass = (paymentMethod === 'pix' && pixPaymentOption === 'payNow')
        ? 'fab fa-pix'
        : 'fab fa-whatsapp';


    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-text-on-light"><i className="fas fa-clipboard-check mr-2"></i>Finalizar Pedido</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <div className="overflow-y-auto p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1">Nome Completo *</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border rounded-md" required />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Telefone/WhatsApp *</label>
                                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-3 py-2 border rounded-md" required />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1">Tipo de Pedido *</label>
                            <select value={orderType} onChange={e => setOrderType(e.target.value as any)} className="w-full px-3 py-2 border rounded-md bg-white" required>
                                <option value="" disabled>Selecione...</option>
                                <option value="delivery">Entrega</option>
                                <option value="pickup">Retirada na loja</option>
                                <option value="local">Consumir no local</option>
                            </select>
                        </div>
                        {orderType === 'delivery' && (
                            <div className="animate-fade-in-up">
                                <label className="block text-sm font-semibold mb-1">Endereço de Entrega *</label>
                                <textarea value={address} onChange={e => setAddress(e.target.value)} className="w-full px-3 py-2 border rounded-md" rows={2} required />
                            </div>
                        )}
                        {orderType === 'local' && (
                             <div className="p-3 bg-gray-50 rounded-md border animate-fade-in-up">
                                 <label className="block text-sm font-semibold mb-2">Horário da Reserva *</label>
                                 <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <p className="text-xs text-gray-600">Sugestões:</p>
                                    {suggestedTimes.map(time => (
                                        <button type="button" key={time} onClick={() => setReservationTime(time)} className="px-2 py-1 text-xs font-semibold rounded-md bg-accent/20 text-accent hover:bg-accent/30">
                                            {time}
                                        </button>
                                    ))}
                                 </div>
                                <input type="text" value={reservationTime} onChange={e => setReservationTime(e.target.value)} className="w-full px-3 py-2 border rounded-md" placeholder="Ou digite o horário (ex: 20:30)" required />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-semibold mb-1">Método de Pagamento *</label>
                            <select value={paymentMethod} onChange={handlePaymentMethodChange} className="w-full px-3 py-2 border rounded-md bg-white" required>
                                <option value="" disabled>Selecione...</option>
                                <option value="credit">Cartão de Crédito</option>
                                <option value="debit">Cartão de Débito</option>
                                <option value="pix">PIX</option>
                                <option value="cash">Dinheiro</option>
                            </select>
                        </div>
                        
                        {paymentMethod === 'pix' && (
                            <div className="p-4 bg-blue-50 rounded-md border border-blue-200 animate-fade-in-up text-center">
                                <p className="font-semibold mb-3">Como você prefere pagar com PIX?</p>
                                <div className="flex justify-center gap-4">
                                    <button 
                                        type="button" 
                                        onClick={() => setPixPaymentOption('payNow')} 
                                        className={`font-bold py-2 px-6 rounded-lg transition-all border-2 ${pixPaymentOption === 'payNow' ? 'bg-accent text-white border-accent' : 'bg-white text-accent border-accent hover:bg-accent/10'}`}>
                                        <i className="fas fa-qrcode mr-2"></i>Pagar Agora
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setPixPaymentOption('payLater')} 
                                        className={`font-bold py-2 px-6 rounded-lg transition-all border-2 ${pixPaymentOption === 'payLater' ? 'bg-gray-600 text-white border-gray-600' : 'bg-white text-gray-600 border-gray-400 hover:bg-gray-100'}`}>
                                        <i className="fas fa-hand-holding-usd mr-2"></i>Pagar Depois
                                    </button>
                                </div>
                            </div>
                        )}

                        {paymentMethod === 'cash' && (
                            <div className="p-3 bg-gray-50 rounded-md border animate-fade-in-up">
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" checked={changeNeeded} onChange={e => setChangeNeeded(e.target.checked)} />
                                    <span>Precisa de troco?</span>
                                </label>
                                {changeNeeded && (
                                    <div className="mt-2">
                                        <label className="block text-sm font-semibold mb-1">Pagar com qual valor?</label>
                                        <input type="number" value={changeAmount} onChange={e => setChangeAmount(e.target.value)} className="w-full px-3 py-2 border rounded-md" placeholder="Ex: 100" required />
                                        <p className="text-xs text-gray-500 mt-1">Informe para que o entregador leve o troco correto.</p>
                                    </div>
                                )}
                            </div>
                        )}
                         <div>
                            <label className="block text-sm font-semibold mb-1">Observações (opcional)</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-3 py-2 border rounded-md" rows={2} />
                        </div>
                        <div className="p-4 bg-brand-ivory-50 rounded-lg my-4">
                            <h3 className="font-bold mb-2">Resumo do Pedido</h3>
                            {cartItems.map(item => (
                                <div key={item.id} className="flex justify-between text-sm">
                                    <span>{item.quantity}x {item.name} ({item.size})</span>
                                    <span>{(item.price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </div>
                            ))}
                            <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t">
                                <span>Total:</span>
                                <span>{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                        </div>

                         <button 
                            type="submit" 
                            disabled={isSubmitDisabled}
                            className="w-full bg-accent text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-opacity-90 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            <i className={`${submitButtonIconClass} mr-2`}></i>
                            {submitButtonText}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};