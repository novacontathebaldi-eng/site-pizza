import React, { useState, useMemo } from 'react';
import { CartItem, OrderCustomerDetails } from '../types';

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    cartItems: CartItem[];
    onConfirmCheckout: (details: any) => void;
    onInitiatePixPayment: (details: any) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, cartItems, onConfirmCheckout, onInitiatePixPayment }) => {
    const [details, setDetails] = useState<Omit<OrderCustomerDetails, 'orderType'>>({ name: '', phone: '', address: '' });
    const [orderType, setOrderType] = useState<'delivery' | 'pickup' | 'local'>('delivery');
    const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cash' | 'credit' | 'debit'>('pix');
    const [pixChoice, setPixChoice] = useState<'now' | 'later'>('now');
    const [changeNeeded, setChangeNeeded] = useState(false);
    const [changeAmount, setChangeAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [reservationTime, setReservationTime] = useState('');

    const total = useMemo(() => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0), [cartItems]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setDetails({ ...details, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const fullDetails = {
            ...details,
            orderType,
            paymentMethod,
            changeNeeded: paymentMethod === 'cash' && changeNeeded,
            changeAmount: paymentMethod === 'cash' && changeNeeded ? changeAmount : '',
            notes,
            reservationTime: orderType === 'local' ? reservationTime : '',
        };

        if (paymentMethod === 'pix' && pixChoice === 'now') {
            onInitiatePixPayment(fullDetails);
        } else {
            onConfirmCheckout(fullDetails);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-text-on-light"><i className="fas fa-check-circle mr-2"></i>Finalizar Pedido</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <div className="overflow-y-auto p-6">
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Left Side: Form */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold border-b pb-2">Seus Dados</h3>
                            <div>
                                <label className="block text-sm font-semibold mb-1" htmlFor="name">Nome Completo *</label>
                                <input id="name" name="name" type="text" value={details.name} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" required />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1" htmlFor="phone">Telefone (WhatsApp) *</label>
                                <input id="phone" name="phone" type="tel" value={details.phone} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" required placeholder="(XX) XXXXX-XXXX"/>
                            </div>

                            <h3 className="text-lg font-semibold border-b pb-2 pt-2">Opções de Pedido</h3>
                             <div className="flex flex-wrap gap-2">
                                {(['delivery', 'pickup', 'local'] as const).map(type => (
                                    <button key={type} type="button" onClick={() => setOrderType(type)} className={`flex-1 p-3 border-2 rounded-lg text-center text-sm font-semibold ${orderType === type ? 'border-accent bg-yellow-50' : 'border-gray-300'}`}>
                                       { {delivery: 'Receber em Casa', pickup: 'Retirar no Local', local: 'Comer no Local'}[type] }
                                    </button>
                                ))}
                            </div>
                            {orderType === 'delivery' && (
                                <div className="animate-fade-in-up">
                                    <label className="block text-sm font-semibold mb-1" htmlFor="address">Endereço de Entrega *</label>
                                    <textarea id="address" name="address" value={details.address} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" rows={3} required={orderType === 'delivery'} placeholder="Rua, Número, Bairro, Referência..."></textarea>
                                </div>
                            )}
                            {orderType === 'local' && (
                                <div className="animate-fade-in-up">
                                    <label className="block text-sm font-semibold mb-1" htmlFor="reservationTime">Horário da Reserva (opcional)</label>
                                    <input id="reservationTime" type="text" value={reservationTime} onChange={e => setReservationTime(e.target.value)} className="w-full px-3 py-2 border rounded-md" placeholder="Ex: Mesa para 2 às 20h"/>
                                </div>
                            )}
                             <div>
                                <label className="block text-sm font-semibold mb-1" htmlFor="notes">Observações (opcional)</label>
                                <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-3 py-2 border rounded-md" rows={2} placeholder="Ex: Pizza sem cebola, etc."></textarea>
                            </div>
                        </div>

                        {/* Right Side: Order Summary & Payment */}
                        <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold border-b pb-2">Resumo do Pedido</h3>
                            <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                                {cartItems.map(item => (
                                    <div key={item.id} className="flex justify-between items-center text-sm">
                                        <div><span>{item.quantity}x </span><span className="font-semibold">{item.name}</span> <span className="text-gray-500">({item.size})</span></div>
                                        <span className="font-medium">{(item.price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="border-t pt-3 flex justify-between items-center text-xl font-bold">
                                <span>Total:</span>
                                <span className="text-accent">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>

                            <h3 className="text-lg font-semibold border-b pb-2 pt-2">Forma de Pagamento</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {(['pix', 'credit', 'debit', 'cash'] as const).map(method => (
                                    <button key={method} type="button" onClick={() => setPaymentMethod(method)} className={`p-3 border-2 rounded-lg text-center text-sm font-semibold ${paymentMethod === method ? 'border-accent bg-yellow-50' : 'border-gray-300'}`}>
                                        {{pix: 'PIX', credit: 'Crédito', debit: 'Débito', cash: 'Dinheiro'}[method]}
                                    </button>
                                ))}
                            </div>

                             {paymentMethod === 'pix' && (
                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg animate-fade-in-up">
                                    <div className="flex items-center justify-around">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="pixChoice" value="now" checked={pixChoice === 'now'} onChange={() => setPixChoice('now')} className="h-4 w-4 text-accent focus:ring-accent"/>
                                            <span className="font-semibold">Pagar Agora</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="pixChoice" value="later" checked={pixChoice === 'later'} onChange={() => setPixChoice('later')} className="h-4 w-4 text-accent focus:ring-accent"/>
                                            <span className="font-semibold">Pagar na Entrega</span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {paymentMethod === 'cash' && (
                                <div className="p-3 bg-gray-100 border rounded-lg space-y-2 animate-fade-in-up">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={changeNeeded} onChange={() => setChangeNeeded(!changeNeeded)} className="h-4 w-4 rounded text-accent focus:ring-accent"/>
                                        <span className="font-semibold">Precisa de troco?</span>
                                    </label>
                                    {changeNeeded && (
                                        <input type="text" value={changeAmount} onChange={e => setChangeAmount(e.target.value)} className="w-full px-3 py-2 border rounded-md" placeholder="Troco para quanto?" required={changeNeeded}/>
                                    )}
                                </div>
                            )}

                            <button type="submit" className="w-full bg-accent text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-opacity-90 transition-all">
                                <i className="fas fa-paper-plane mr-2"></i>
                                {paymentMethod === 'pix' && pixChoice === 'now' ? 'Finalizar e Pagar com PIX' : 'Enviar Pedido'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
