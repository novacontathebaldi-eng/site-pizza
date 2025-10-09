
import React, { useState, useMemo } from 'react';
import { Order, OrderStatus, PaymentStatus } from '../types';
import { ContactModal } from './ContactModal';

interface OrderCardProps {
    order: Order;
    onUpdateStatus: (orderId: string, status: OrderStatus, payload?: Partial<Pick<Order, 'pickupTimeEstimate'>>) => Promise<void>;
    onUpdatePaymentStatus: (orderId: string, paymentStatus: PaymentStatus) => Promise<void>;
    onUpdateReservationTime: (orderId: string, reservationTime: string) => Promise<void>;
    onDelete: (orderId: string) => Promise<void>;
    onPermanentDelete: (orderId: string) => Promise<void>;
}

// Helper to format currency
const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Helper to format dates
const formatTimestamp = (timestamp: any): string => {
    if (!timestamp || !timestamp.toDate) return 'N/A';
    return timestamp.toDate().toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const OrderCard: React.FC<OrderCardProps> = ({
    order,
    onUpdateStatus,
    onUpdatePaymentStatus,
    onUpdateReservationTime,
    onDelete,
    onPermanentDelete
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [pickupEstimate, setPickupEstimate] = useState(order.pickupTimeEstimate || '');
    const [reservationTime, setReservationTime] = useState(order.customer.reservationTime || '');

    // Mappings for display text
    const orderTypeMap = { delivery: 'Entrega', pickup: 'Retirada', local: 'Consumo Local' };
    const paymentStatusMap: { [key in PaymentStatus]: { text: string; color: string } } = {
        pending: { text: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
        paid: { text: 'Pago', color: 'bg-green-100 text-green-800' },
        paid_online: { text: 'Pago Online', color: 'bg-blue-100 text-blue-800' },
    };
    const orderStatusMap: { [key in OrderStatus]?: { text: string; color: string; icon: string } } = {
        pending: { text: 'Pendente', color: 'bg-yellow-500', icon: 'fas fa-clock' },
        accepted: { text: 'Aceito', color: 'bg-blue-500', icon: 'fas fa-check' },
        reserved: { text: 'Reservado', color: 'bg-purple-500', icon: 'fas fa-calendar-check' },
        ready: { text: 'Pronto', color: 'bg-green-500', icon: 'fas fa-bell' },
        completed: { text: 'Finalizado', color: 'bg-gray-500', icon: 'fas fa-check-double' },
        cancelled: { text: 'Cancelado', color: 'bg-red-500', icon: 'fas fa-times' },
        deleted: { text: 'Na Lixeira', color: 'bg-gray-700', icon: 'fas fa-trash-alt' },
        'awaiting-payment': { text: 'Aguardando Pgto', color: 'bg-orange-500', icon: 'fas fa-hourglass-half' },
    };

    const statusInfo = orderStatusMap[order.status] || { text: order.status, color: 'bg-gray-400', icon: 'fas fa-question-circle' };
    const paymentInfo = paymentStatusMap[order.paymentStatus] || { text: order.paymentStatus, color: 'bg-gray-100 text-gray-800' };

    const handleUpdatePickupEstimate = () => {
        onUpdateStatus(order.id, 'ready', { pickupTimeEstimate: pickupEstimate });
    };

    const handleUpdateReservationTime = () => {
        onUpdateOrderReservationTime(order.id, reservationTime);
    };
    
    // Define available actions based on current status
    const availableActions = useMemo(() => {
        const actions: {label: string, handler?: () => void, status?: OrderStatus, color: string}[] = [];
        switch(order.status) {
            case 'pending':
                actions.push({ label: 'Aceitar Pedido', status: 'accepted', color: 'bg-green-500 hover:bg-green-600' });
                actions.push({ label: 'Cancelar', status: 'cancelled', color: 'bg-red-500 hover:bg-red-600' });
                break;
            case 'accepted':
                actions.push({ label: 'Pedido Pronto', status: 'ready', color: 'bg-blue-500 hover:bg-blue-600' });
                actions.push({ label: 'Cancelar', status: 'cancelled', color: 'bg-red-500 hover:bg-red-600' });
                break;
            case 'reserved':
                 actions.push({ label: 'Pedido Pronto', status: 'ready', color: 'bg-blue-500 hover:bg-blue-600' });
                 actions.push({ label: 'Finalizar', status: 'completed', color: 'bg-green-500 hover:bg-green-600' });
                 actions.push({ label: 'Cancelar', status: 'cancelled', color: 'bg-red-500 hover:bg-red-600' });
                break;
            case 'ready':
                actions.push({ label: 'Finalizar Pedido', status: 'completed', color: 'bg-green-500 hover:bg-green-600' });
                break;
            case 'deleted':
                 actions.push({ label: 'Apagar p/ Sempre', handler: () => onPermanentDelete(order.id), color: 'bg-red-700 hover:bg-red-800' });
                 actions.push({ label: 'Restaurar', status: 'pending', color: 'bg-blue-500 hover:bg-blue-600' });
                break;
        }
        return actions;
    }, [order.status, onPermanentDelete, order.id]);


    return (
        <>
            <div className={`bg-white rounded-lg shadow-md border overflow-hidden transition-all duration-300 ${isExpanded ? 'shadow-xl' : 'shadow-sm'}`}>
                {/* Header */}
                <div className={`p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 cursor-pointer`} onClick={() => setIsExpanded(!isExpanded)}>
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${statusInfo.color}`}><i className={statusInfo.icon}></i></span>
                            <div>
                                <p className="font-bold text-lg">{order.customer.name}</p>
                                <p className="text-sm text-gray-500">
                                    {orderTypeMap[order.customer.orderType]} &bull; {formatTimestamp(order.createdAt)}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                         <span className={`px-3 py-1 text-sm font-semibold rounded-full ${paymentInfo.color}`}>{paymentInfo.text}</span>
                         <span className="font-bold text-xl text-accent">{formatCurrency(order.total)}</span>
                         <button className="text-gray-500 hover:text-gray-800 w-8 h-8">
                             <i className={`fas fa-chevron-down transition-transform ${isExpanded ? 'rotate-180' : ''}`}></i>
                         </button>
                    </div>
                </div>

                {/* Collapsible Body */}
                {isExpanded && (
                    <div className="p-4 border-t bg-gray-50/50 animate-fade-in-up">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Order Details */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-md text-gray-800 border-b pb-1">Detalhes do Pedido</h4>
                                <div>
                                    <p className="text-sm font-semibold">Cliente:</p>
                                    <p>{order.customer.name}</p>
                                    <p className="text-sm text-gray-600">{order.customer.phone}</p>
                                    <button onClick={() => setIsContactModalOpen(true)} className="text-sm text-accent hover:underline">Entrar em contato</button>
                                </div>
                                {order.customer.orderType === 'delivery' && order.customer.address && (
                                     <div>
                                        <p className="text-sm font-semibold">Endereço:</p>
                                        <p>{order.customer.address}</p>
                                    </div>
                                )}
                                {order.customer.orderType === 'local' && (
                                     <div>
                                        <p className="text-sm font-semibold">Horário da Reserva:</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <input type="text" value={reservationTime} onChange={e => setReservationTime(e.target.value)} className="px-2 py-1 border rounded-md text-sm w-24" />
                                            <button onClick={handleUpdateReservationTime} className="bg-blue-500 text-white px-2 py-1 text-xs rounded-md hover:bg-blue-600">Salvar</button>
                                        </div>
                                    </div>
                                )}
                                {order.notes && (
                                    <div>
                                        <p className="text-sm font-semibold">Observações:</p>
                                        <p className="text-sm bg-yellow-50 p-2 rounded-md border border-yellow-200">{order.notes}</p>
                                    </div>
                                )}
                            </div>

                            {/* Items */}
                            <div className="space-y-2">
                                <h4 className="font-bold text-md text-gray-800 border-b pb-1">Itens</h4>
                                {order.items.map(item => (
                                    <div key={item.id} className="flex justify-between text-sm">
                                        <span>{item.quantity}x {item.name} ({item.size})</span>
                                        <span className="font-semibold">{formatCurrency(item.price * item.quantity)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between font-bold text-md pt-2 border-t">
                                    <span>Total:</span>
                                    <span>{formatCurrency(order.total)}</span>
                                </div>
                            </div>
                            
                             {/* Actions */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-md text-gray-800 border-b pb-1">Ações</h4>
                                {order.status !== 'deleted' && (
                                    <div className="flex flex-wrap gap-2">
                                        {availableActions.map(action => (
                                             <button key={action.label} onClick={() => action.handler ? action.handler() : onUpdateStatus(order.id, action.status!)} className={`text-white font-bold py-2 px-3 rounded-md text-sm flex-grow ${action.color}`}>
                                                {action.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {order.status === 'deleted' && (
                                    <div className="flex flex-wrap gap-2">
                                        {availableActions.map(action => (
                                             <button key={action.label} onClick={() => action.handler ? action.handler() : onUpdateStatus(order.id, action.status!)} className={`text-white font-bold py-2 px-3 rounded-md text-sm flex-grow ${action.color}`}>
                                                {action.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                 {order.status !== 'deleted' && order.paymentStatus === 'pending' && (
                                    <div>
                                        <p className="text-sm font-semibold mb-1">Pagamento:</p>
                                        <button onClick={() => onUpdatePaymentStatus(order.id, 'paid')} className="w-full bg-green-500 text-white font-bold py-2 px-3 rounded-md text-sm hover:bg-green-600">
                                            Marcar como Pago
                                        </button>
                                    </div>
                                )}
                                {order.customer.orderType === 'pickup' && order.status === 'ready' && (
                                    <div>
                                        <label className="block text-sm font-semibold mb-1">Tempo Estimado para Retirada:</label>
                                        <div className="flex items-center gap-2">
                                            <input type="text" value={pickupEstimate} onChange={e => setPickupEstimate(e.target.value)} className="px-2 py-1 border rounded-md text-sm w-full" placeholder="Ex: 15 minutos"/>
                                            <button onClick={handleUpdatePickupEstimate} className="bg-blue-500 text-white px-2 py-1 text-xs rounded-md hover:bg-blue-600">Salvar</button>
                                        </div>
                                    </div>
                                )}
                                {order.status !== 'deleted' && (
                                <button onClick={() => onDelete(order.id)} className="w-full bg-gray-200 text-gray-700 font-bold py-2 px-3 rounded-md text-sm hover:bg-gray-300 mt-4">
                                    <i className="fas fa-trash-alt mr-2"></i>Mover para Lixeira
                                </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <ContactModal 
                isOpen={isContactModalOpen} 
                onClose={() => setIsContactModalOpen(false)} 
                customerName={order.customer.name} 
                customerPhone={order.customer.phone} 
            />
        </>
    );
};
