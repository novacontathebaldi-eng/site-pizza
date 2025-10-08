
import React, { useState, useEffect, useMemo } from 'react';
import { CartItem, OrderDetails, UserProfile } from '../types';

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    cartItems: CartItem[];
    total: number;
    onSubmit: (orderDetails: OrderDetails) => void;
    currentUserProfile: UserProfile | null;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, cartItems, total, onSubmit, currentUserProfile }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<OrderDetails>({
        name: '',
        phone: '',
        orderType: 'delivery',
        address: '',
        paymentMethod: 'pix',
        changeNeeded: false,
        changeAmount: '',
        notes: '',
        reservationTime: '',
    });

    useEffect(() => {
        if (currentUserProfile) {
            setFormData(prev => ({
                ...prev,
                name: currentUserProfile.name || '',
                phone: currentUserProfile.phone || '',
                address: currentUserProfile.addresses.find(a => a.isDefault)?.street || '',
            }));
        }
    }, [currentUserProfile, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData({ ...formData, [name]: checked });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const isStep1Valid = useMemo(() => {
        if (!formData.name.trim() || !formData.phone.trim()) return false;
        if (formData.orderType === 'delivery' && !formData.address.trim()) return false;
        if (formData.orderType === 'local' && !formData.reservationTime.trim()) return false;
        return true;
    }, [formData]);

    const isStep2Valid = useMemo(() => {
        if (formData.paymentMethod === 'cash' && formData.changeNeeded && !formData.changeAmount?.trim()) return false;
        return true;
    }, [formData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isStep1Valid && isStep2Valid) {
            onSubmit(formData);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-4 animate-fade-in-up">
                        <h3 className="text-xl font-semibold text-center">Seus Dados</h3>
                        <div>
                            <label className="block text-sm font-semibold mb-1">Nome Completo *</label>
                            <input name="name" value={formData.name} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" required />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1">Telefone (WhatsApp) *</label>
                            <input name="phone" value={formData.phone} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" required />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1">Como você quer receber? *</label>
                            <select name="orderType" value={formData.orderType} onChange={handleChange} className="w-full px-3 py-2 border rounded-md bg-white">
                                <option value="delivery">Delivery (Entrega)</option>
                                <option value="pickup">Retirar no Local</option>
                                <option value="local">Consumir no Local</option>
                            </select>
                        </div>
                        {formData.orderType === 'delivery' && (
                            <div className="animate-fade-in-up">
                                <label className="block text-sm font-semibold mb-1">Endereço de Entrega *</label>
                                <textarea name="address" value={formData.address} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" rows={2} placeholder="Rua, número, bairro, referência..." required />
                            </div>
                        )}
                        {formData.orderType === 'local' && (
                            <div className="animate-fade-in-up">
                                <label className="block text-sm font-semibold mb-1">Horário da Reserva *</label>
                                <input name="reservationTime" value={formData.reservationTime} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" placeholder="Ex: 20:30" required />
                            </div>
                        )}
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-4 animate-fade-in-up">
                        <h3 className="text-xl font-semibold text-center">Pagamento</h3>
                        <div>
                            <label className="block text-sm font-semibold mb-1">Forma de Pagamento *</label>
                            <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="w-full px-3 py-2 border rounded-md bg-white">
                                <option value="pix">PIX</option>
                                <option value="credit">Cartão de Crédito</option>
                                <option value="debit">Cartão de Débito</option>
                                <option value="cash">Dinheiro</option>
                            </select>
                        </div>
                        {formData.paymentMethod === 'cash' && (
                            <div className="animate-fade-in-up space-y-3 p-3 bg-gray-50 rounded-md border">
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="changeNeeded" name="changeNeeded" checked={formData.changeNeeded} onChange={handleChange} className="h-4 w-4" />
                                    <label htmlFor="changeNeeded">Precisa de troco?</label>
                                </div>
                                {formData.changeNeeded && (
                                    <div className="animate-fade-in-up">
                                        <label className="block text-sm font-semibold mb-1">Troco para quanto?</label>
                                        <input name="changeAmount" value={formData.changeAmount} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" placeholder="Ex: 50,00" />
                                    </div>
                                )}
                            </div>
                        )}
                         <div>
                            <label className="block text-sm font-semibold mb-1">Observações (opcional)</label>
                            <textarea name="notes" value={formData.notes} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" rows={2} placeholder="Ex: Pizza sem cebola, etc." />
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-text-on-light">Finalizar Pedido</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <div className="overflow-y-auto p-6">
                    <form onSubmit={handleSubmit}>
                        {renderStep()}
                        <div className="flex justify-between items-center mt-6 pt-4 border-t">
                            {step > 1 ? (
                                <button type="button" onClick={() => setStep(step - 1)} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Voltar</button>
                            ) : <div></div>}
                            
                            {step === 1 && (
                                <button type="button" onClick={() => setStep(2)} disabled={!isStep1Valid} className="bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 disabled:bg-gray-400">Avançar</button>
                            )}

                            {step === 2 && (
                                <button type="submit" disabled={!isStep2Valid} className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400">Confirmar Pedido</button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
