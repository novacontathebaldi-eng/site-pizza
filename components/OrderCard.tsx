import React, { useState, useEffect, useMemo } from 'react';
import { Order, OrderStatus, PaymentStatus } from '../types';
import { ContactModal } from './ContactModal';

interface OrderCardProps {
    order: Order;
    onUpdateStatus: (orderId: string, status: OrderStatus, payload?: Partial<Pick<Order, 'pickupTimeEstimate'>>) => void;
    onUpdatePaymentStatus: (orderId: string, paymentStatus: PaymentStatus) => void;
    onUpdateReservationTime: (orderId: string, reservationTime: string) => void;
    onDelete: (orderId: string) => void;
    onPermanentDelete: (orderId: string) => void;
    onRefund: (orderId: string) => void;
    isRefunding?: boolean;
    isSelectable?: boolean;
    isSelected?: boolean;
    onSelect?: (orderId: string) => void;
}

// This is now a function to provide dynamic text based on the order type
const getStatusConfig = (order: Order): { text: string; icon: string; color: string; } => {
    const staticConfig: { [key in OrderStatus]: { text: string; icon: string; color: string; } } = {
        pending: { text: 'Pendente', icon: 'fas fa-hourglass-start', color: 'border-yellow-500' },
        accepted: { text: 'Aceito / Em Preparo', icon: 'fas fa-cogs', color: 'border-blue-500' },
        reserved: { text: 'Reserva (No Local)', icon: 'fas fa-chair', color: 'border-teal-500' },
        ready: { text: 'Pronto / Em Rota', icon: 'fas fa-shipping-fast', color: 'border-purple-500' }, // Default text
        completed: { text: 'Finalizado', icon: 'fas fa-check-circle', color: 'border-green-500' },
        cancelled: { text: 'Cancelado', icon: 'fas fa-times-circle', color: 'border-red-500' },
        deleted: { text: 'Na Lixeira', icon: 'fas fa-trash-alt', color: 'border-gray-500' },
        'awaiting-payment': { text: 'Aguardando Pgto', icon: 'fas fa-clock', color: 'border-gray-400' },
    };

    if (order.status === 'ready') {
        if (order.customer.orderType === 'pickup') {
            return { ...staticConfig.ready, text: 'Pronto para Retirada' };
        }
        if (order.customer.orderType === 'delivery') {
            return { ...staticConfig.ready, text: 'Saiu para Entrega' };
        }
    }
    
    return staticConfig[order.status] || staticConfig.pending;
};

const paymentMethodMap = { credit: 'Crédito', debit: 'Débito', pix: 'PIX', cash: 'Dinheiro' };
const orderTypeMap = { delivery: 'Entrega', pickup: 'Retirada', local: 'Consumo no Local' };

const getPaymentStatusInfo = (order: Order): { text: string; isPaid: boolean; isRefunded: boolean } => {
    if (order.paymentStatus === 'refunded') {
        return { text: 'Estornado', isPaid: false, isRefunded: true };
    }
    switch (order.paymentStatus) {
        case 'paid_online':
            return { text: 'Pago pelo SITE', isPaid: true, isRefunded: false };
        case 'paid':
            return { text: 'Pago', isPaid: true, isRefunded: false };
        case 'pending':
        default:
            return { text: 'Pendente', isPaid: false, isRefunded: false };
    }
};


export const OrderCard: React.FC<OrderCardProps> = ({ order, onUpdateStatus, onUpdatePaymentStatus, onUpdateReservationTime, onDelete, onPermanentDelete, onRefund, isRefunding, isSelectable, isSelected, onSelect }) => {
    const { id, orderNumber, customer, items, total, paymentMethod, changeNeeded, changeAmount, notes, status, paymentStatus, createdAt, pickupTimeEstimate, mercadoPagoDetails, numberOfPeople, deliveryFee, allergies } = order;
    const config = getStatusConfig(order);
    const { text: paymentStatusText, isPaid, isRefunded } = getPaymentStatusInfo(order);

    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [isEditingTime, setIsEditingTime] = useState(false);
    const [newTime, setNewTime] = useState(customer.reservationTime || '');

    useEffect(() => {
        setNewTime(customer.reservationTime || '');
    }, [customer.reservationTime]);

    const formatTimestamp = (timestamp: any): string => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
    };
    
    const handleAccept = () => {
        // Se o pedido for uma reserva, 'Aceitar' muda o status para 'reserved'.
        if (customer.orderType === 'local' && status === 'pending') {
            onUpdateStatus(id, 'reserved');
            return;
        }

        // Lógica padrão para outros tipos de pedido
        let payload = {};
        if (customer.orderType === 'pickup') {
            const now = new Date();
            const pickupTime = new Date(now.getTime() + 30 * 60000); // 30 minutes estimate
            const formattedTime = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(pickupTime);
            payload = { pickupTimeEstimate: `~${formattedTime}` };
        }
        onUpdateStatus(id, 'accepted', payload);
    };

    const handleRefuse = () => {
        if (paymentStatus === 'paid_online') {
            alert("Este pedido já foi pago via PIX pelo site. Só é permitido recusar pedidos pagos após efetuar o reembolso.");
            return;
        }
        onUpdateStatus(id, 'cancelled');
    };
    
    const handleTimeSave = () => {
        if (newTime !== customer.reservationTime) {
            onUpdateReservationTime(id, newTime);
        }
        setIsEditingTime(false);
    };

    const handlePaymentStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value as PaymentStatus;
        const currentStatus = order.paymentStatus;

        if (newStatus === currentStatus) {
            return; // Nenhuma alteração
        }

        let confirmationMessage = '';
        if (currentStatus === 'pending' && newStatus === 'paid') {
            confirmationMessage = "Tem certeza que deseja alterar o status do pagamento para 'Pago'?";
        } else if (currentStatus === 'paid' && newStatus === 'pending') {
            confirmationMessage = "ATENÇÃO: Tem certeza que deseja reverter o status do pagamento para 'Pendente'?";
        }

        if (confirmationMessage) {
            if (window.confirm(confirmationMessage)) {
                onUpdatePaymentStatus(id, newStatus);
            }
            // Se o usuário cancelar, não faz nada. O select voltará ao valor original no re-render.
        } else {
            onUpdatePaymentStatus(id, newStatus);
        }
    };

    const isArchived = status === 'completed' || status === 'cancelled';

    // Logic for the status changer dropdown
    const statusOptionsMap: { [key in OrderStatus]?: string } = {
        pending: 'Pendente',
        accepted: 'Aceito',
        reserved: 'Reserva',
        ready: 'Pronto/Em Rota',
        completed: 'Finalizado',
        cancelled: 'Cancelado',
    };

    const allowedStatusesForOrderType = useMemo<OrderStatus[]>(() => {
        if (customer.orderType === 'local') {
            return ['pending', 'reserved', 'completed', 'cancelled'];
        }
        return ['pending', 'accepted', 'ready', 'completed', 'cancelled'];
    }, [customer.orderType]);
    
    // Helper function to get the correct label for the dropdown based on order type.
    const getStatusLabelForDropdown = (status: OrderStatus, orderType: 'delivery' | 'pickup' | 'local'): string => {
        if (status === 'ready') {
            if (orderType === 'delivery') return 'Em Rota';
            if (orderType === 'pickup') return 'Pronto';
        }
        return statusOptionsMap[status] || status; // Fallback to the default map
    };

    const canRefund = paymentStatus === 'paid_online' && !isRefunded;

    const statusChanger = (
        <div className="flex items-center gap-2">
            <label htmlFor={`status-select-${order.id}`} className="text-sm font-semibold text-gray-700 whitespace-nowrap">Alterar status:</label>
            <select
                id={`status-select-${order.id}`}
                value={order.status}
                onChange={(e) => onUpdateStatus(id, e.target.value as OrderStatus)}
                className="px-3 py-2 border rounded-md bg-white text-sm focus:ring-accent focus:border-accent"
            >
                {Object.keys(statusOptionsMap)
                    .filter((key): key is OrderStatus => allowedStatusesForOrderType.includes(key as OrderStatus))
                    .map((key) => (
                        <option key={key} value={key}>{getStatusLabelForDropdown(key, customer.orderType)}</option>
                    ))}
            </select>
        </div>
    );
    
    const paymentStatusChanger = !isArchived && !isRefunded && order.paymentStatus !== 'paid_online' && (
        <div className="flex items-center gap-2">
            <label htmlFor={`payment-status-select-${order.id}`} className="text-sm font-semibold text-gray-700 whitespace-nowrap">Pgto:</label>
            <select
                id={`payment-status-select-${order.id}`}
                value={order.paymentStatus}
                onChange={handlePaymentStatusChange}
                className={`px-2 py-1 border rounded-md bg-white text-sm focus:ring-accent focus:border-accent font-semibold ${
                    isPaid ? 'text-green-600' : 'text-yellow-600'
                }`}
            >
                <option value="pending">Pendente</option>
                <option value="paid">Pago</option>
            </select>
        </div>
    );

    const fullAddress = customer.orderType === 'delivery' ? `${customer.street || ''}, ${customer.number || ''} - ${customer.neighborhood || ''}` : customer.address;


    return (
        <>
            <div className={`flex items-start gap-3 p-1 rounded-lg transition-colors duration-200 ${isSelected ? 'bg-blue-50' : ''}`}>
                {isSelectable && (
                    <div className="pt-5">
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onSelect?.(order.id)}
                            className="h-5 w-5 rounded border-gray-400 text-accent focus:ring-accent cursor-pointer"
                            aria-label={`Selecionar pedido #${order.orderNumber}`}
                        />
                    </div>
                )}
                <div className={`flex-grow relative bg-white rounded-lg shadow-md border-l-4 ${config.color} overflow-hidden transition-opacity ${isArchived || status === 'deleted' ? 'opacity-70' : ''}`}>
                    <div className="p-4">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="flex items-center gap-3 text-lg font-bold">
                                    <i className={`${config.icon} ${config.color.replace('border', 'text')}`}></i>
                                    <span>{config.text}</span>
                                </div>
                                <p className="text-sm font-bold text-gray-500 mt-1">Pedido #{orderNumber}</p>
                                <p className="text-xs text-gray-500">Recebido em: {formatTimestamp(createdAt)}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <div className="flex items-start gap-2">
                                    <div className="text-right">
                                        {total != null && (
                                            <p className="font-bold text-2xl text-accent">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                        )}
                                        {items && items.length > 0 && (
                                            <p className="text-sm text-gray-600">{items.reduce((acc, item) => acc + item.quantity, 0)} itens</p>
                                        )}
                                    </div>
                                    <button onClick={() => setIsContactModalOpen(true)} className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center hover:bg-green-200 transition-colors flex-shrink-0" aria-label="Contato com cliente">
                                        <i className="fab fa-whatsapp text-2xl"></i>
                                    </button>
                                </div>
                                {isPaid && paymentStatus === 'paid_online' && (
                                    <div className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full animate-pulse border border-green-200 inline-flex items-center justify-center whitespace-nowrap">
                                        <i className="fas fa-check-circle mr-1"></i> PAGO PELO SITE
                                    </div>
                                )}
                                {isRefunded && (
                                    <div className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full border border-yellow-200">
                                       <i className="fas fa-undo-alt mr-1"></i> ESTORNADO
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                            <div className="bg-gray-50 p-3 rounded-md">
                                <h4 className="font-bold mb-2"><i className="fas fa-user mr-2"></i>Cliente</h4>
                                <p><strong>Nome:</strong> {customer.name}</p>
                                <p><strong>Telefone:</strong> {customer.phone}</p>
                                <p><strong>Pedido:</strong> {orderTypeMap[customer.orderType]}</p>
                                {customer.orderType === 'delivery' && fullAddress && <p><strong>Endereço:</strong> {fullAddress}</p>}
                                {customer.orderType === 'local' && (
                                    <>
                                        <p><strong>Pessoas:</strong> {numberOfPeople}</p>
                                        <div className="flex items-center gap-2">
                                            <strong>Reserva:</strong> 
                                            {isEditingTime ? (
                                                <input 
                                                    type="text" 
                                                    value={newTime} 
                                                    onChange={(e) => setNewTime(e.target.value)} 
                                                    onBlur={handleTimeSave}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleTimeSave()}
                                                    className="px-2 py-0.5 border rounded-md w-24" 
                                                    autoFocus
                                                />
                                            ) : (
                                                <>
                                                    <span>{customer.reservationTime}</span>
                                                    <button onClick={() => setIsEditingTime(true)} className="text-xs text-blue-600 hover:underline"><i className="fas fa-edit"></i></button>
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}
                                {customer.orderType === 'pickup' && pickupTimeEstimate && <p><strong>Retirada:</strong> <span className="font-bold text-accent">{pickupTimeEstimate}</span></p>}
                            </div>
                            {paymentMethod && (
                             <div className="bg-gray-50 p-3 rounded-md flex flex-col">
                                <h4 className="font-bold mb-2"><i className="fas fa-credit-card mr-2"></i>Pagamento</h4>
                                <div className="space-y-1 flex-grow">
                                    <p><strong>Método:</strong> {paymentMethodMap[paymentMethod]}</p>
                                    <p><strong>Status:</strong>
                                        <span className={`font-bold ml-1 ${
                                            isRefunded ? 'text-yellow-800' : isPaid ? 'text-green-600' : 'text-yellow-600'
                                        }`}>
                                            {paymentStatusText}
                                        </span>
                                    </p>
                                    {paymentMethod === 'cash' && ( <p><strong>Troco:</strong> {changeNeeded ? `para R$ ${changeAmount}` : 'Não precisa'}</p> )}
                                    {deliveryFee > 0 && (<p><strong>Taxa de Entrega:</strong> {deliveryFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>)}
                                </div>

                                 {mercadoPagoDetails?.paymentId && (
                                    <div className="mt-2 pt-2 border-t border-gray-200 space-y-2">
                                        <div className="text-xs space-y-1">
                                             <p><strong>ID Pagamento:</strong> {mercadoPagoDetails.paymentId}</p>
                                        </div>
                                        <a 
                                            href={`https://www.mercadopago.com.br/money-out/transfer/api/receipt/pix_pdf/${mercadoPagoDetails.paymentId}/pix_account/pix_payment.pdf`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-sm bg-blue-100 text-blue-700 font-semibold py-1 px-2 rounded-md hover:bg-blue-200"
                                        >
                                            <i className="fas fa-receipt"></i>
                                            <span>Ver Comprovante</span>
                                        </a>
                                    </div>
                                )}
                            </div>
                            )}
                        </div>

                        {items && items.length > 0 && (
                            <div>
                                <h4 className="font-bold mb-2"><i className="fas fa-shopping-basket mr-2"></i>Itens do Pedido</h4>
                                <ul className="space-y-1 text-sm">
                                    {items.map(item => (<li key={item.id} className="flex justify-between p-2 bg-gray-50 rounded"><span>{item.quantity}x {item.name} ({item.size})</span><span>{(item.price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></li>))}
                                </ul>
                            </div>
                        )}
                         {allergies && <p className="text-sm mt-3 p-2 bg-red-50 rounded-md border border-red-200"><strong>Alergias/Restrições:</strong> {allergies}</p>}
                         {notes && <p className="text-sm mt-3 p-2 bg-yellow-50 rounded-md border border-yellow-200"><strong>Obs:</strong> {notes}</p>}

                        <div className="flex flex-wrap items-center justify-end gap-2 mt-4 pt-4 border-t">
                            {status === 'deleted' ? (
                                 <>
                                    <button onClick={() => onUpdateStatus(id, 'completed')} className="bg-blue-500 text-white font-semibold py-2 px-3 rounded-lg text-sm hover:bg-blue-600"><i className="fas fa-undo mr-2"></i>Restaurar</button>
                                    <button onClick={() => onPermanentDelete(id)} className="bg-red-500 text-white font-semibold py-2 px-3 rounded-lg text-sm hover:bg-red-600"><i className="fas fa-trash-alt mr-2"></i>Apagar Perm.</button>
                                </>
                            ) : status === 'pending' ? (
                                <div className="flex items-center gap-2 w-full">
                                    {canRefund && (
                                         <button 
                                            onClick={() => onRefund(id)} 
                                            disabled={isRefunding}
                                            className="bg-yellow-500 text-white font-semibold py-2 px-3 rounded-lg text-sm hover:bg-yellow-600 disabled:bg-yellow-300 disabled:cursor-not-allowed flex items-center justify-center min-w-[110px]"
                                         >
                                            {isRefunding ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-undo-alt mr-2"></i>Estornar</>}
                                         </button>
                                    )}
                                    <div className="flex-grow"></div>
                                    <button onClick={handleAccept} className="bg-green-500 text-white font-semibold py-2 px-3 rounded-lg text-sm hover:bg-green-600"><i className="fas fa-check mr-2"></i>Aceitar</button>
                                    <button onClick={handleRefuse} className="bg-gray-400 text-white font-semibold py-2 px-3 rounded-lg text-sm hover:bg-gray-500"><i className="fas fa-ban mr-2"></i>Recusar</button>
                                </div>
                            ) : (
                                 <div className="flex flex-wrap items-center justify-end gap-3 w-full">
                                    {paymentStatusChanger}
                                    {canRefund && (
                                         <button 
                                            onClick={() => onRefund(id)} 
                                            disabled={isRefunding}
                                            className="bg-yellow-500 text-white font-semibold py-2 px-3 rounded-lg text-sm hover:bg-yellow-600 disabled:bg-yellow-300 disabled:cursor-not-allowed flex items-center justify-center min-w-[110px]"
                                         >
                                            {isRefunding ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-undo-alt mr-2"></i>Estornar</>}
                                         </button>
                                    )}
                                    <div className="flex-grow"></div>
                                    
                                    {/* Next-step buttons */}
                                    {status === 'accepted' && customer.orderType !== 'local' && <button onClick={() => onUpdateStatus(id, 'ready')} className="bg-blue-500 text-white font-semibold py-2 px-3 rounded-lg text-sm hover:bg-blue-600"><i className="fas fa-box-open mr-2"></i>Pronto</button>}
                                    {(status === 'ready' || status === 'reserved') && <button onClick={() => onUpdateStatus(id, 'completed')} className="bg-purple-500 text-white font-semibold py-2 px-3 rounded-lg text-sm hover:bg-purple-600"><i className="fas fa-flag-checkered mr-2"></i>Finalizar</button>}
                                    
                                    {status === 'reserved' && !isRefunded && <button onClick={() => onUpdateStatus(id, 'cancelled')} className="bg-gray-400 text-white font-semibold py-2 px-3 rounded-lg text-sm hover:bg-gray-500"><i className="fas fa-ban mr-2"></i>Cancelar</button>}

                                    {statusChanger}

                                    {isArchived && <button onClick={() => onDelete(id)} className="text-red-500 font-semibold py-2 px-3 rounded-lg text-xs hover:bg-red-50"><i className="fas fa-trash mr-2"></i>Mover p/ Lixeira</button>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} customerName={customer.name} customerPhone={customer.phone} />
        </>
    );
};