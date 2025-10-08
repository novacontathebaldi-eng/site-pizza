
import React from 'react';
import { Order, OrderStatus } from '../types';

interface OrderCardClientProps {
    order: Order;
}

const getStatusConfig = (order: Order): { text: string; icon: string; color: string; } => {
    const config: { [key in OrderStatus]: { text: string; icon: string; color: string; } } = {
        pending: { text: 'Aguardando Confirmação', icon: 'fas fa-hourglass-start', color: 'text-yellow-500' },
        accepted: { text: 'Em Preparo', icon: 'fas fa-cogs', color: 'text-blue-500' },
        reserved: { text: 'Reserva Confirmada', icon: 'fas fa-chair', color: 'text-teal-500' },
        ready: { text: 'Pronto para Retirada', icon: 'fas fa-box-open', color: 'text-purple-500' },
        completed: { text: 'Pedido Finalizado', icon: 'fas fa-check-circle', color: 'text-green-500' },
        cancelled: { text: 'Pedido Cancelado', icon: 'fas fa-times-circle', color: 'text-red-500' },
        deleted: { text: 'Pedido Excluído', icon: 'fas fa-trash-alt', color: 'text-gray-500' },
    };

    if (order.status === 'ready' && order.customer.orderType === 'delivery') {
        return { ...config.ready, text: 'Saiu para Entrega', icon: 'fas fa-shipping-fast' };
    }
    
    return config[order.status] || config.pending;
};

const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    }).format(date);
};

export const OrderCardClient: React.FC<OrderCardClientProps> = ({ order }) => {
    const statusConfig = getStatusConfig(order);
    const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="bg-white rounded-lg shadow-md border overflow-hidden">
            <header className="bg-gray-50 p-4 border-b flex justify-between items-center">
                <div>
                    <p className="text-sm text-gray-500">Pedido realizado em</p>
                    <p className="font-semibold">{formatTimestamp(order.createdAt)}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-500">Total</p>
                    <p className="font-bold text-xl text-accent">
                        {order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                </div>
            </header>
            <div className="p-4 space-y-4">
                <div className={`p-3 rounded-lg flex items-center gap-3 bg-opacity-10 ${statusConfig.color.replace('text', 'bg').replace('-500', '-100')}`}>
                    <i className={`${statusConfig.icon} ${statusConfig.color} text-2xl w-8 text-center`}></i>
                    <div>
                        <p className="font-bold text-lg">{statusConfig.text}</p>
                        {order.status === 'ready' && order.customer.orderType === 'pickup' && order.pickupTimeEstimate && (
                             <p className="text-sm text-gray-600">Horário estimado para retirada: <span className="font-bold">{order.pickupTimeEstimate}</span></p>
                        )}
                    </div>
                </div>

                <div>
                    <h4 className="font-semibold mb-2">Resumo do Pedido ({itemCount} {itemCount > 1 ? 'itens' : 'item'}):</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                        {order.items.map(item => (
                            <li key={item.id} className="flex justify-between">
                                <span>{item.quantity}x {item.name} ({item.size})</span>
                                <span>{(item.price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};
