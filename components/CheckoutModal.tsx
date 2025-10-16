import React, { useState, useEffect } from 'react';
import { CartItem, OrderDetails, Order } from '../types';

// NOVO COMPONENTE DE CONFIRMAÇÃO
interface OrderConfirmationModalProps {
    order: Order | null;
    onClose: () => void;
    onSendWhatsApp: (order: Order) => void;
}

export const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({ order, onClose, onSendWhatsApp }) => {
    if (!order) return null;

    const isPaidOnline = order.paymentStatus === 'paid_online';
    const title = isPaidOnline ? "Pagamento Aprovado!" : "Pedido Registrado!";
    const titleIcon = isPaidOnline ? "fa-check-circle text-green-500" : "fa-receipt text-blue-500";
    const totalLabel = isPaidOnline ? "Total Pago:" : "Total do Pedido:";

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col animate-fade-in-up">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-text-on-light flex items-center gap-3">
                        <i className={`fas ${titleIcon}`}></i>
                        {title}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <div className="p-6 text-center space-y-5">
                    <p className="text-gray-600 text-base">
                        Seu pedido já foi registrado em nosso sistema!
                    </p>
                    
                    <div className="text-left bg-gray-50 p-4 rounded-lg border text-gray-800 space-y-2 text-sm">
                        <p><strong><i className="fas fa-receipt fa-fw mr-2 text-gray-400"></i>Pedido:</strong> #{order.orderNumber}</p>
                        <p><strong><i className="fas fa-user fa-fw mr-2 text-gray-400"></i>Nome:</strong> {order.customer.name}</p>
                        {order.total != null && (
                            <p><strong><i className="fas fa-dollar-sign fa-fw mr-2 text-gray-400"></i>{totalLabel}</strong> {order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        )}
                    </div>

                    <p className="text-gray-600 text-sm px-2">
                        Já estamos preparando tudo! Se precisar, você pode nos contatar pelo WhatsApp sobre este pedido.
                    </p>

                    <button
                        onClick={() => onSendWhatsApp(order)}
                        className="w-full bg-green-500 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-green-600 transition-all flex items-center justify-center min-h-[52px]"
                    >
                        <i className="fab fa-whatsapp mr-2"></i> Enviar um WhatsApp sobre o pedido
                    </button>
                </div>
            </div>
        </div>
    );
};


// NOVA CONFIRMAÇÃO DE RESERVA
interface ReservationConfirmationModalProps {
    reservation: Order | null;
    onClose: () => void;
    onSendWhatsApp: (reservation: Order) => void;
}

const formatDateForDisplay = (dateString?: string): string => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return new Intl.DateTimeFormat('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC'
    }).format(date);
};

export const ReservationConfirmationModal: React.FC<ReservationConfirmationModalProps> = ({ reservation, onClose, onSendWhatsApp }) => {
    if (!reservation) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col animate-fade-in-up">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-text-on-light flex items-center gap-3">
                        <i className="fas fa-calendar-check text-blue-500"></i>
                        Reserva Registrada!
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <div className="p-6 text-center space-y-5">
                    <p className="text-gray-600 text-base">
                        Sua solicitação de reserva foi enviada! Em breve, nossa equipe entrará em contato pelo WhatsApp informado para confirmar todos os detalhes.
                    </p>
                    
                    <div className="text-left bg-gray-50 p-4 rounded-lg border text-gray-800 space-y-2 text-sm">
                        <p><strong><i className="fas fa-receipt fa-fw mr-2 text-gray-400"></i>Reserva:</strong> #{reservation.orderNumber}</p>
                        <p><strong><i className="fas fa-user fa-fw mr-2 text-gray-400"></i>Nome:</strong> {reservation.customer.name}</p>
                        {reservation.customer.reservationDate && (
                            <p className="capitalize"><strong><i className="fas fa-calendar-alt fa-fw mr-2 text-gray-400"></i>Data:</strong> {formatDateForDisplay(reservation.customer.reservationDate)}</p>
                        )}
                        {reservation.customer.reservationTime && (
                            <p><strong><i className="fas fa-clock fa-fw mr-2 text-gray-400"></i>Horário:</strong> {reservation.customer.reservationTime}</p>
                        )}
                        {reservation.numberOfPeople != null && (
                            <p><strong><i className="fas fa-users fa-fw mr-2 text-gray-400"></i>Pessoas:</strong> {reservation.numberOfPeople}</p>
                        )}
                    </div>

                    <p className="text-gray-600 text-sm px-2">
                        Agradecemos a sua preferência! Se precisar, você pode nos contatar pelo WhatsApp sobre esta reserva.
                    </p>

                    <button
                        onClick={() => onSendWhatsApp(reservation)}
                        className="w-full bg-green-500 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-green-600 transition-all flex items-center justify-center min-h-[52px]"
                    >
                        <i className="fab fa-whatsapp mr-2"></i> Enviar um WhatsApp sobre a reserva
                    </button>
                </div>
            </div>
        </div>
    );
};


const DELIVERY_FEE = 3.00;
const LOCALIDADES = ['Centro', 'Olaria', 'Vila Nova', 'Moxafongo', 'Cocal', 'Funil'];

// FIX: Added missing interface definition for component props.
interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    cartItems: CartItem[];
    onConfirmCheckout: (details: OrderDetails) => void;
    onInitiatePixPayment: (details: OrderDetails, pixOption: 'payNow' | 'payLater') => void;
    isProcessing: boolean;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, cartItems, onConfirmCheckout, onInitiatePixPayment, isProcessing }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [cpf, setCpf] = useState('');
    const [orderType, setOrderType] = useState<'delivery' | 'pickup' | ''>('');
    
    // Novos estados para endereço detalhado
    const [neighborhood, setNeighborhood] = useState('');
    const [street, setStreet] = useState('');
    const [number, setNumber] = useState('');
    const [isNoNumber, setIsNoNumber] = useState(false);
    const [complement, setComplement] = useState('');
    const [allergies, setAllergies] = useState('');

    const [paymentMethod, setPaymentMethod] = useState<'credit' | 'debit' | 'pix' | 'cash' | ''>('');
    const [changeNeeded, setChangeNeeded] = useState(false);
    const [changeAmount, setChangeAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [pixPaymentOption, setPixPaymentOption] = useState<'payNow' | 'payLater' | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setName(''); setPhone(''); setCpf(''); setOrderType('');
            setNeighborhood(''); setStreet(''); setNumber(''); setIsNoNumber(false); setComplement(''); setAllergies('');
            setPaymentMethod(''); setChangeNeeded(false); setChangeAmount('');
            setNotes(''); setPixPaymentOption(null);
        }
    }, [isOpen]);
    
    useEffect(() => {
        if (isNoNumber) {
            setNumber('S/N');
        } else {
            if (number === 'S/N') {
                setNumber('');
            }
        }
    }, [isNoNumber]);


    if (!isOpen) return null;

    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const deliveryFee = orderType === 'delivery' ? DELIVERY_FEE : 0;
    const total = subtotal + deliveryFee;

    const getOrderDetails = (): OrderDetails => ({
        name, phone, cpf, orderType: orderType as 'delivery' | 'pickup' | 'local',
        neighborhood, street, number, complement,
        paymentMethod: paymentMethod as 'credit' | 'debit' | 'pix' | 'cash',
        changeNeeded: paymentMethod === 'cash' && changeNeeded,
        changeAmount, allergies, notes, deliveryFee
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
                onInitiatePixPayment(details, 'payNow');
            } else if (pixPaymentOption === 'payLater') {
                onConfirmCheckout(details);
            } else {
                alert("Por favor, escolha se deseja pagar agora ou depois.");
            }
        } else {
            onConfirmCheckout(details);
        }
    };
    
    const isSubmitDisabled = (paymentMethod === 'pix' && !pixPaymentOption) || (paymentMethod === 'pix' && pixPaymentOption === 'payNow' && !cpf);
    
    const submitButtonText = (paymentMethod === 'pix' && pixPaymentOption === 'payNow')
        ? 'Pagar e Finalizar Pedido'
        : 'Enviar Pedido';
        
    const submitButtonIconClass = (paymentMethod === 'pix' && pixPaymentOption === 'payNow')
        ? 'fab fa-pix'
        : 'fas fa-check-circle';


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
                            </select>
                        </div>

                        {orderType === 'delivery' && (
                            <div className="p-4 bg-gray-50 rounded-md border animate-fade-in-up space-y-4">
                                <div className="text-center bg-blue-50 border border-blue-200 text-blue-800 text-sm font-semibold p-2 rounded-md">
                                    <i className="fas fa-motorcycle mr-2"></i>Taxa de Entrega: R$ {DELIVERY_FEE.toFixed(2).replace('.', ',')}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <p className="text-sm p-2 bg-gray-200 rounded-md"><strong>CEP:</strong> 29640-000</p>
                                    <p className="text-sm p-2 bg-gray-200 rounded-md"><strong>Cidade:</strong> Santa Leopoldina - ES</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-1">Localidade *</label>
                                    <select value={neighborhood} onChange={e => setNeighborhood(e.target.value)} className="w-full px-3 py-2 border rounded-md bg-white" required>
                                        <option value="" disabled>Selecione sua localidade...</option>
                                        {LOCALIDADES.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4 items-end">
                                    <div>
                                        <label className="block text-sm font-semibold mb-1">Rua *</label>
                                        <input type="text" value={street} onChange={e => setStreet(e.target.value)} className="w-full px-3 py-2 border rounded-md" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-1">Número *</label>
                                        <input type="text" value={number} onChange={e => setNumber(e.target.value)} className="w-full px-3 py-2 border rounded-md" required disabled={isNoNumber} />
                                    </div>
                                </div>
                                <div className="flex justify-end -mt-2">
                                     <label className="flex items-center gap-2 text-sm">
                                        <input type="checkbox" checked={isNoNumber} onChange={e => setIsNoNumber(e.target.checked)} />
                                        <span>Sem número</span>
                                    </label>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-1">Complemento (opcional)</label>
                                    <input type="text" value={complement} onChange={e => setComplement(e.target.value)} className="w-full px-3 py-2 border rounded-md" placeholder="Casa, apartamento, ponto de referência..." />
                                </div>
                            </div>
                        )}
                        
                        <div>
                             <label className="block text-sm font-semibold mb-1">Possui alguma alergia ou restrição alimentar? (opcional)</label>
                            <textarea value={allergies} onChange={e => setAllergies(e.target.value)} className="w-full px-3 py-2 border rounded-md" rows={2} placeholder="Ex: alergia a camarão, intolerância à lactose..."/>
                        </div>

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
                            <div className="p-4 bg-blue-50 rounded-md border border-blue-200 animate-fade-in-up space-y-3">
                                <div className="text-center">
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
                                {pixPaymentOption === 'payNow' && (
                                     <div className="animate-fade-in-up">
                                        <label className="block text-sm font-semibold mb-1" htmlFor="cpf">CPF (para o PIX) *</label>
                                        <input id="cpf" type="text" value={cpf} onChange={e => setCpf(e.target.value.replace(/\D/g, ''))} className="w-full px-3 py-2 border rounded-md" placeholder="000.000.000-00" required />
                                        <p className="text-xs text-gray-500 mt-1">Necessário para gerar a cobrança PIX.</p>
                                    </div>
                                )}
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
                            <div className="space-y-1">
                                {cartItems.map(item => (
                                    <div key={item.id} className="flex justify-between text-sm">
                                        <span>
                                            {item.quantity}x {item.name} ({item.size})
                                            {item.quantity > 1 && <span className="text-gray-500 ml-2">({(item.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/un)</span>}
                                        </span>
                                        <span className="font-semibold">{(item.price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                    </div>
                                ))}
                            </div>
                            {deliveryFee > 0 && (
                                <div className="flex justify-between text-sm mt-2 pt-2 border-t">
                                    <span>Taxa de Entrega:</span>
                                    <span className="font-semibold">{deliveryFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t">
                                <span>Total:</span>
                                <span>{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                        </div>

                         <button 
                            type="submit" 
                            disabled={isSubmitDisabled || isProcessing}
                            className="w-full bg-accent text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-opacity-90 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center min-h-[52px]"
                        >
                            {isProcessing ? (
                                <><i className="fas fa-spinner fa-spin mr-2"></i> Enviando...</>
                            ) : (
                                <><i className={`${submitButtonIconClass} mr-2`}></i> {submitButtonText}</>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};