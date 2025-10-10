import React, { useState } from 'react';
import { CartItem } from '../types';
import * as firebaseService from '../services/firebaseService';
import { PixPaymentModal } from './PixPaymentModal';
import { PaymentFailureModal } from './PaymentFailureModal';

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    cartItems: CartItem[];
    onOrderPlaced: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, cartItems, onOrderPlaced }) => {
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cash'>('pix');
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [pixData, setPixData] = useState<{ qrCode: string, orderId: string } | null>(null);
    const [isPaymentFailureModalOpen, setIsPaymentFailureModalOpen] = useState(false);

    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cartItems.length === 0) return;
        
        setIsProcessing(true);
        try {
            const orderData = {
                customerName,
                customerPhone,
                customerAddress,
                items: cartItems,
                total,
                paymentMethod,
                paymentStatus: 'pending' as const,
            };
            
            const newOrder = await firebaseService.placeOrder(orderData);
            
            if (paymentMethod === 'pix') {
                // In a real app, you would call your payment provider's API to generate a PIX charge.
                // For this example, we'll simulate it with a placeholder QR code.
                const simulatedPixQRCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=pix-charge-for-order-${newOrder.id}-total-${total}`;
                setPixData({ qrCode: simulatedPixQRCode, orderId: newOrder.id });
            } else {
                // For cash payments, the order is placed and we're done.
                alert('Pedido recebido! O pagamento será feito na entrega.');
                onOrderPlaced();
            }

        } catch (error) {
            console.error("Failed to place order:", error);
            alert("Não foi possível finalizar o pedido. Tente novamente.");
        } finally {
            setIsProcessing(false);
        }
    };
    
    if (pixData) {
        return (
            <PixPaymentModal 
                isOpen={true}
                onClose={() => { setPixData(null); onClose(); }}
                qrCodeUrl={pixData.qrCode}
                orderId={pixData.orderId}
                total={total}
                onPaymentSuccess={() => {
                    alert('Pagamento confirmado! Seu pedido está sendo preparado.');
                    setPixData(null);
                    onOrderPlaced();
                }}
                onPaymentFailure={() => {
                    setPixData(null);
                    setIsPaymentFailureModalOpen(true);
                }}
            />
        );
    }
    
    if (isPaymentFailureModalOpen) {
        return (
            <PaymentFailureModal 
                isOpen={true}
                onClose={() => setIsPaymentFailureModalOpen(false)}
                onTryAgain={() => {
                    // This would regenerate the PIX QR code
                    setIsPaymentFailureModalOpen(false);
                    // For simplicity, we just reopen the checkout form. A real app might regenerate the pix.
                }}
                onPayLater={() => {
                    alert('Seu pedido foi salvo. O pagamento pode ser feito na entrega.');
                    setIsPaymentFailureModalOpen(false);
                    onOrderPlaced();
                }}
            />
        )
    }

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
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
                                <label className="block text-sm font-semibold mb-1" htmlFor="customer-name">Nome Completo *</label>
                                <input id="customer-name" type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full px-3 py-2 border rounded-md" required />
                            </div>
                             <div>
                                <label className="block text-sm font-semibold mb-1" htmlFor="customer-phone">Telefone (WhatsApp) *</label>
                                <input id="customer-phone" type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full px-3 py-2 border rounded-md" required placeholder="(XX) XXXXX-XXXX"/>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1" htmlFor="customer-address">Endereço de Entrega *</label>
                                <textarea id="customer-address" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} className="w-full px-3 py-2 border rounded-md" rows={3} required placeholder="Rua, Número, Bairro, Referência..."></textarea>
                            </div>
                            
                            <h3 className="text-lg font-semibold border-b pb-2 pt-4">Pagamento</h3>
                             <div className="flex gap-4">
                                <button type="button" onClick={() => setPaymentMethod('pix')} className={`flex-1 p-4 border-2 rounded-lg text-center ${paymentMethod === 'pix' ? 'border-accent bg-yellow-50' : 'border-gray-300'}`}>
                                    <i className="fas fa-qrcode text-2xl mb-2"></i><span className="block font-semibold">PIX</span>
                                </button>
                                <button type="button" onClick={() => setPaymentMethod('cash')} className={`flex-1 p-4 border-2 rounded-lg text-center ${paymentMethod === 'cash' ? 'border-accent bg-yellow-50' : 'border-gray-300'}`}>
                                    <i className="fas fa-money-bill-wave text-2xl mb-2"></i><span className="block font-semibold">Dinheiro</span>
                                </button>
                            </div>
                        </div>

                        {/* Right Side: Order Summary */}
                        <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold border-b pb-2">Resumo do Pedido</h3>
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                {cartItems.map(item => (
                                    <div key={item.id} className="flex justify-between items-center text-sm">
                                        <div className="flex-grow">
                                            <span>{item.quantity}x </span>
                                            <span className="font-semibold">{item.name}</span>
                                            <span className="text-gray-500 text-xs block">{item.size}</span>
                                        </div>
                                        <span className="font-medium">{(item.price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="border-t pt-3 flex justify-between items-center text-xl font-bold">
                                <span>Total:</span>
                                <span className="text-accent">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                             <button type="submit" disabled={isProcessing} className="w-full bg-accent text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-opacity-90 transition-all disabled:bg-gray-400">
                                {isProcessing ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-paper-plane mr-2"></i>}
                                {paymentMethod === 'pix' ? 'Gerar PIX e Enviar' : 'Enviar Pedido'}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
};
