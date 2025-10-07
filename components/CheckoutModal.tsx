
import React, { useState, useEffect } from 'react';
import { CartItem, OrderDetails } from '../types';

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    cartItems: CartItem[];
    onConfirmCheckout: (details: OrderDetails) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, cartItems, onConfirmCheckout }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [orderType, setOrderType] = useState<'delivery' | 'pickup' | 'local' | ''>('');
    const [address, setAddress] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'credit' | 'debit' | 'pix' | 'cash' | ''>('');
    const [changeNeeded, setChangeNeeded] = useState(false);
    const [changeAmount, setChangeAmount] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (!isOpen) {
            // Reset form on close
            setName('');
            setPhone('');
            setOrderType('');
            setAddress('');
            setPaymentMethod('');
            setChangeNeeded(false);
            setChangeAmount('');
            setNotes('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirmCheckout({
            name,
            phone,
            orderType: orderType as 'delivery' | 'pickup' | 'local',
            address,
            paymentMethod: paymentMethod as 'credit' | 'debit' | 'pix' | 'cash',
            changeNeeded: paymentMethod === 'cash' && changeNeeded,
            changeAmount,
            notes
        });
    };

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
                            <div>
                                <label className="block text-sm font-semibold mb-1">Endereço de Entrega *</label>
                                <textarea value={address} onChange={e => setAddress(e.target.value)} className="w-full px-3 py-2 border rounded-md" rows={2} required />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-semibold mb-1">Método de Pagamento *</label>
                            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} className="w-full px-3 py-2 border rounded-md bg-white" required>
                                <option value="" disabled>Selecione...</option>
                                <option value="credit">Cartão de Crédito</option>
                                <option value="debit">Cartão de Débito</option>
                                <option value="pix">PIX</option>
                                <option value="cash">Dinheiro</option>
                            </select>
                        </div>
                        {paymentMethod === 'cash' && (
                            <div className="p-3 bg-gray-50 rounded-md border">
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

                        <button type="submit" className="w-full bg-accent text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-opacity-90 transition-all">
                            <i className="fab fa-whatsapp mr-2"></i>Enviar Pedido
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
