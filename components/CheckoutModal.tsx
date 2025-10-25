import React, { useState, useEffect } from 'react';
import { CartItem, OrderDetails, Order, UserProfile } from '../types';
import qrCodePix from '../assets/qrcode-pix.png';

// NOVO COMPONENTE DE QR CODE PIX
interface PixQrCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PixQrCodeModal: React.FC<PixQrCodeModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4 animate-fade-in-up">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-text-on-light"><i className="fas fa-qrcode mr-2"></i>Pagar com QR Code</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <div className="p-6 text-center space-y-4">
                    <p className="text-gray-600">Abra o aplicativo do seu banco e escaneie o código abaixo para pagar via PIX.</p>
                    <img src={qrCodePix} alt="PIX QR Code" className="w-64 h-64 mx-auto border-4 border-gray-200 rounded-lg" />
                     <button
                        onClick={onClose}
                        className="w-full bg-accent text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-opacity-90 transition-all mt-4"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};


// NOVO COMPONENTE DE CONFIRMAÇÃO
interface OrderConfirmationModalProps {
    order: Order | null;
    onClose: () => void;
    onSendWhatsApp: (order: Order) => void;
}

export const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({ order, onClose, onSendWhatsApp }) => {
    const [isQrCodeModalOpen, setIsQrCodeModalOpen] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [showPixHelp, setShowPixHelp] = useState(false);
    const pixCnpj = "62.247.199/0001-04";

    const handleCopyPix = () => {
        navigator.clipboard.writeText(pixCnpj).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2500);
        });
    };

    if (!order) return null;

    // FIX: The type 'PaymentStatus' does not include 'paid_online'. The correct check is for 'paid', which now represents a completed payment.
    const isPaidOnline = order.paymentStatus === 'paid';
    const title = isPaidOnline ? "Pagamento Aprovado!" : "Pedido Registrado!";
    const titleIcon = isPaidOnline ? "fa-check-circle text-green-500" : "fa-receipt text-green-500";
    const totalLabel = isPaidOnline ? "Total Pago:" : "Total do Pedido:";

    return (
        <>
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col animate-fade-in-up">
                    <div className="flex justify-between items-center p-5 border-b border-gray-200">
                        <h2 className="text-2xl font-bold text-text-on-light flex items-center gap-3">
                            <i className={`fas ${titleIcon}`}></i>
                            {title}
                        </h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                    </div>
                    <div className="overflow-y-auto p-6 text-center space-y-4">
                        <p className="text-gray-600 text-base">
                            Seu pedido foi registrado em nosso sistema! Para finalizá-lo, é necessário enviá-lo para nossa cozinha via WhatsApp. Se você já fez isso, ótimo! Agora é só aguardar.
                        </p>
                        
                        <div className="text-left bg-gray-50 p-4 rounded-lg border text-gray-800 space-y-2 text-sm">
                            <p><strong><i className="fas fa-receipt fa-fw mr-2 text-gray-400"></i>Pedido:</strong> #{order.orderNumber}</p>
                            <p><strong><i className="fas fa-user fa-fw mr-2 text-gray-400"></i>Nome:</strong> {order.customer.name}</p>
                            {order.total != null && (
                                <p><strong><i className="fas fa-dollar-sign fa-fw mr-2 text-gray-400"></i>{totalLabel}</strong> {order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                            )}
                        </div>

                        {order.paymentMethod === 'pix' && !isPaidOnline && (
                             <div className="p-4 bg-gray-50 rounded-md border text-left space-y-3 text-sm animate-fade-in-up">
                                <p className="text-center font-bold text-base text-gray-800">Opções de Pagamento PIX</p>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                    <strong className="text-sm">PIX CNPJ:</strong>
                                    <span className="font-mono text-sm bg-gray-200 px-2 py-1 rounded">{pixCnpj}</span>
                                    <div className="flex items-center gap-x-2">
                                        <button type="button" onClick={handleCopyPix} className="text-xs bg-accent text-white font-semibold py-1 px-3 rounded-md hover:bg-opacity-90 flex items-center gap-1.5">
                                            <i className={`fas ${copySuccess ? 'fa-check' : 'fa-copy'}`}></i>
                                            {copySuccess ? 'Copiado' : 'Copiar'}
                                        </button>
                                        <div className="relative">
                                            <button type="button" onMouseEnter={() => setShowPixHelp(true)} onMouseLeave={() => setShowPixHelp(false)} className="text-gray-400 hover:text-gray-600">
                                                <i className="fas fa-question-circle"></i>
                                            </button>
                                            {showPixHelp && (
                                                <div className="absolute bottom-full right-0 mb-2 w-64 bg-gray-800 text-white text-xs rounded-lg p-3 z-10 shadow-lg" style={{ animation: 'fadeInUp 0.2s ease-out' }}>
                                                    <p className="font-bold mb-1">Como Pagar com CNPJ:</p>
                                                    <ol className="list-decimal list-inside text-left space-y-1">
                                                        <li>No app do seu banco, acesse a área PIX.</li>
                                                        <li>Escolha "Pagar com Chave" ou "Transferir" e selecione CNPJ.</li>
                                                        <li>Cole o número copiado: "{pixCnpj}".</li>
                                                        <li>Insira o Valor: {order.total?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} e confirme.</li>
                                                    </ol>
                                                    <div className="absolute right-2 -bottom-1 w-2 h-2 bg-gray-800 rotate-45"></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <p className="text-gray-600 text-sm px-2">
                            Por favor, não se esqueça de enviar seu pedido pelo WhatsApp! Se precisar, pode nos contatar a qualquer momento.
                        </p>

                        <button
                            onClick={() => onSendWhatsApp(order)}
                            className="w-full bg-green-500 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-green-600 transition-all flex items-center justify-center min-h-[52px]"
                        >
                            <i className="fab fa-whatsapp mr-2"></i> Enviar WhatsApp
                        </button>
                    </div>
                </div>
            </div>
            <PixQrCodeModal isOpen={isQrCodeModalOpen} onClose={() => setIsQrCodeModalOpen(false)} />
        </>
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
                        <i className="fas fa-calendar-check text-green-500"></i>
                        Reserva Registrada!
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <div className="p-6 text-center space-y-4">
                    <p className="text-gray-600 text-base">
                        Sua solicitação de reserva foi enviada! Porém ainda não foi confirmada. Em breve, nossa equipe entrará em contato pelo WhatsApp informado para confirmar todos os detalhes.
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
                        Agradecemos a sua preferência! Se precisar, você pode nos contatar pelo WhatsApp.
                    </p>

                    <button
                        onClick={() => onSendWhatsApp(reservation)}
                        className="w-full bg-green-500 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-green-600 transition-all flex items-center justify-center min-h-[52px]"
                    >
                        <i className="fab fa-whatsapp mr-2"></i> Enviar WhatsApp
                    </button>
                </div>
            </div>
        </div>
    );
};


const DELIVERY_FEE = 3.00;
const LOCALIDADES = ['Centro', 'Olaria', 'Vila Nova', 'Moxafongo', 'Cocal', 'Funil'];

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    cartItems: CartItem[];
    onConfirmCheckout: (details: OrderDetails) => void;
    isProcessing: boolean;
    name: string;
    setName: (name: string) => void;
    phone: string;
    setPhone: (phone: string) => void;
    profile: UserProfile | null;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, cartItems, onConfirmCheckout, isProcessing, name, setName, phone, setPhone, profile }) => {
    const deliverableAddresses = profile?.addresses?.filter(a => a.isDeliveryArea) || [];
    const favoriteAddress = deliverableAddresses.find(a => a.isFavorite);

    const [orderType, setOrderType] = useState<'delivery' | 'pickup' | ''>('');
    
    const [neighborhood, setNeighborhood] = useState('');
    const [street, setStreet] = useState('');
    const [number, setNumber] = useState('');
    const [isNoNumber, setIsNoNumber] = useState(false);
    const [complement, setComplement] = useState('');

    const [paymentMethod, setPaymentMethod] = useState<'credit' | 'debit' | 'pix' | 'cash' | ''>('');
    const [changeNeeded, setChangeNeeded] = useState(false);
    const [changeAmount, setChangeAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedAddressId, setSelectedAddressId] = useState<string>(favoriteAddress ? favoriteAddress.id : 'manual');

    // Estados para a funcionalidade PIX
    const [isQrCodeModalOpen, setIsQrCodeModalOpen] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [showPixHelp, setShowPixHelp] = useState(false);
    const pixCnpj = "62.247.199/0001-04";


    // Reset state when modal opens/closes or profile changes
    useEffect(() => {
        if (isOpen) {
            const fav = profile?.addresses?.filter(a => a.isDeliveryArea).find(a => a.isFavorite);
            setSelectedAddressId(fav ? fav.id : 'manual');
        } else {
            // Full reset when closing
            setOrderType('');
            setNeighborhood(''); setStreet(''); setNumber(''); setIsNoNumber(false); setComplement('');
            setPaymentMethod(''); setChangeNeeded(false); setChangeAmount('');
            setNotes('');
            setSelectedAddressId(favoriteAddress ? favoriteAddress.id : 'manual');
        }
    }, [isOpen, profile]);
    
    useEffect(() => {
        if (isNoNumber) setNumber('S/N');
        else if (number === 'S/N') setNumber('');
    }, [isNoNumber]);
    
    useEffect(() => {
        if (orderType !== 'delivery') {
            setSelectedAddressId('manual');
            setNeighborhood(''); setStreet(''); setNumber(''); setComplement('');
        }
    }, [orderType]);
    
    useEffect(() => {
        if (selectedAddressId === 'manual') {
            if(orderType === 'delivery' && !profile) { // Only clear for non-logged-in users wanting to type manually
                setNeighborhood(''); setStreet(''); setNumber(''); setComplement('');
            }
        } else {
            const selectedAddr = deliverableAddresses.find(a => a.id === selectedAddressId);
            if (selectedAddr) {
                setNeighborhood(selectedAddr.localidade);
                setStreet(selectedAddr.street);
                setNumber(selectedAddr.number);
                setComplement(selectedAddr.complement || '');
                setIsNoNumber(selectedAddr.number === 'S/N');
            }
        }
    }, [selectedAddressId, profile, orderType]);


    if (!isOpen) return null;

    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const deliveryFee = orderType === 'delivery' ? DELIVERY_FEE : 0;
    const total = subtotal + deliveryFee;

    const getOrderDetails = (): OrderDetails => ({
        name, phone, orderType: orderType as 'delivery' | 'pickup' | 'local',
        neighborhood, street, number, complement,
        paymentMethod: paymentMethod as 'credit' | 'debit' | 'pix' | 'cash',
        changeNeeded: paymentMethod === 'cash' && changeNeeded,
        changeAmount, notes, deliveryFee
    });
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const details = getOrderDetails();
        onConfirmCheckout(details);
    };
    
    const submitButtonText = 'Enviar Pedido';
    const submitButtonIconClass = 'fas fa-check-circle';

    const isAddressLocked = selectedAddressId !== 'manual';

    const handleCopyPix = () => {
        navigator.clipboard.writeText(pixCnpj).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2500);
        });
    };


    return (
        <>
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
                                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border rounded-md disabled:bg-gray-100" required disabled={!!profile} />
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

                                    {profile && deliverableAddresses.length > 0 && (
                                         <div>
                                            <label className="block text-sm font-semibold mb-1">Endereço de Entrega</label>
                                            <select value={selectedAddressId} onChange={e => setSelectedAddressId(e.target.value)} className="w-full px-3 py-2 border rounded-md bg-white">
                                                <option value="manual">Digitar endereço manualmente</option>
                                                {deliverableAddresses.map(addr => (
                                                    <option key={addr.id} value={addr.id}>{addr.label} ({addr.street}, {addr.number})</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <p className="text-sm p-2 bg-gray-200 rounded-md"><strong>CEP:</strong> 29640-000</p>
                                        <p className="text-sm p-2 bg-gray-200 rounded-md"><strong>Cidade:</strong> Santa Leopoldina - ES</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-1">Localidade *</label>
                                        <select value={neighborhood} onChange={e => setNeighborhood(e.target.value)} className="w-full px-3 py-2 border rounded-md bg-white disabled:bg-gray-100" required disabled={isAddressLocked}>
                                            <option value="" disabled>Selecione sua localidade...</option>
                                            {LOCALIDADES.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4 items-end">
                                        <div>
                                            <label className="block text-sm font-semibold mb-1">Rua *</label>
                                            <input type="text" value={street} onChange={e => setStreet(e.target.value)} className="w-full px-3 py-2 border rounded-md disabled:bg-gray-100" required disabled={isAddressLocked} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold mb-1">Número *</label>
                                            <input type="text" value={number} onChange={e => setNumber(e.target.value)} className="w-full px-3 py-2 border rounded-md disabled:bg-gray-100" required disabled={isNoNumber || isAddressLocked} />
                                        </div>
                                    </div>
                                    <div className="flex justify-end -mt-2">
                                         <label className="flex items-center gap-2 text-sm">
                                            <input type="checkbox" checked={isNoNumber} onChange={e => setIsNoNumber(e.target.checked)} disabled={isAddressLocked} />
                                            <span>Sem número</span>
                                        </label>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-1">Complemento (opcional)</label>
                                        <input type="text" value={complement} onChange={e => setComplement(e.target.value)} className="w-full px-3 py-2 border rounded-md disabled:bg-gray-100" placeholder="Casa, apartamento, ponto de referência..." disabled={isAddressLocked} />
                                    </div>
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
                            
                            {paymentMethod === 'pix' && (
                                <div className="p-4 bg-gray-50 rounded-md border animate-fade-in-up space-y-3">
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                        <strong className="text-sm">PIX CNPJ:</strong>
                                        <span className="font-mono text-sm bg-gray-200 px-2 py-1 rounded">{pixCnpj}</span>
                                        <button type="button" onClick={handleCopyPix} className="text-xs bg-accent text-white font-semibold py-1 px-3 rounded-md hover:bg-opacity-90 flex items-center gap-1.5">
                                            <i className={`fas ${copySuccess ? 'fa-check' : 'fa-copy'}`}></i>
                                            {copySuccess ? 'Copiado' : 'Copiar'}
                                        </button>
                                        <div className="relative">
                                            <button type="button" onMouseEnter={() => setShowPixHelp(true)} onMouseLeave={() => setShowPixHelp(false)} className="text-gray-400 hover:text-gray-600">
                                                <i className="fas fa-question-circle"></i>
                                            </button>
                                            {showPixHelp && (
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-800 text-white text-xs rounded-lg p-3 z-10 shadow-lg" style={{ animation: 'fadeInUp 0.2s ease-out' }}>
                                                    <p className="font-bold mb-1">Como Pagar com CNPJ:</p>
                                                    <ol className="list-decimal list-inside text-left space-y-1">
                                                        <li>Primeiro envie seu pedido clicando em "Enviar Pedido" abaixo.</li>
                                                        <li>No app do seu banco, acesse a área PIX.</li>
                                                        <li>Escolha "Pagar com Chave" ou "Tranferir" e selecione CNPJ.</li>
                                                        <li>Cole o número copiado: "62.247.199/0001-04".</li>
                                                        <li>Insira o Valor: R$ ${total.toFixed(2).replace('.', ',')} e confirme.</li>
                                                        <li>Envie o comprovamte para o nosso WhatsApp e então é só aguardar 🍕.</li>
                                                    </ol>
                                                    <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-gray-800 rotate-45"></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-center pt-2">
                                        <button type="button" onClick={() => setIsQrCodeModalOpen(true)} className="text-sm font-semibold text-accent hover:underline">
                                            <i className="fas fa-qrcode mr-1"></i> Pagar usando QR CODE
                                        </button>
                                        <span className="block mt-1">Insira o valor total: R$ {total.toFixed(2).replace('.', ',')}</span>
                                        <span className="block mt-1">Não esqueça de enviar seu pedido clicando em "Enviar Pedido" abaixo.</span>
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
                                disabled={isProcessing}
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
            <PixQrCodeModal isOpen={isQrCodeModalOpen} onClose={() => setIsQrCodeModalOpen(false)} />
        </>
    );
};