import React from 'react';
import { Order, OrderStatus } from '../types';

interface OrderCardProps {
    order: Order;
    onUpdateStatus: (orderId: string, status: OrderStatus) => void;
    onDelete: (orderId: string) => void;
}

const statusConfig: { [key in OrderStatus]: { text: string; icon: string; color: string; nextAction?: { text: string, status: OrderStatus, icon: string, color: string } } } = {
    pending: { text: 'Pendente', icon: 'fas fa-hourglass-start', color: 'border-yellow-500' },
    accepted: { text: 'Aceito / Em Preparo', icon: 'fas fa-cogs', color: 'border-blue-500' },
    ready: { text: 'Pronto / Saiu p/ Entrega', icon: 'fas fa-shipping-fast', color: 'border-purple-500' },
    completed: { text: 'Finalizado', icon: 'fas fa-check-circle', color: 'border-green-500' },
    cancelled: { text: 'Cancelado', icon: 'fas fa-times-circle', color: 'border-red-500' },
};

export const OrderCard: React.FC<OrderCardProps> = ({ order, onUpdateStatus, onDelete }) => {
    const { id, customer, items, total, paymentMethod, changeNeeded, changeAmount, notes, status, createdAt } = order;
    const config = statusConfig[status];

    const formatTimestamp = (timestamp: any): string => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate();
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const isArchived = status === 'completed' || status === 'cancelled';

    return (
        <div className={`bg-white rounded-lg shadow-md border-l-4 ${config.color} overflow-hidden transition-opacity ${isArchived ? 'opacity-60' : ''}`}>
            <div className="p-4">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <div className="flex items-center gap-3 text-lg font-bold">
                            <i className={`${config.icon} ${config.color.replace('border', 'text')}`}></i>
                            <span>{config.text}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Pedido recebido em: {formatTimestamp(createdAt)}</p>
                    </div>
                    <div className="text-right">
                         <p className="font-bold text-2xl text-accent">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                         <p className="text-sm text-gray-600">{items.reduce((acc, item) => acc + item.quantity, 0)} itens</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                    {/* Customer Details */}
                    <div className="bg-gray-50 p-3 rounded-md">
                        <h4 className="font-bold mb-2"><i className="fas fa-user mr-2"></i>Cliente</h4>
                        <p><strong>Nome:</strong> {customer.name}</p>
                        <p><strong>Telefone:</strong> {customer.phone}</p>
                        <p><strong>Pedido:</strong> {customer.orderType}</p>
                        {customer.orderType === 'delivery' && <p><strong>Endereço:</strong> {customer.address}</p>}
                    </div>
                     {/* Payment Details */}
                    <div className="bg-gray-50 p-3 rounded-md">
                         <h4 className="font-bold mb-2"><i className="fas fa-credit-card mr-2"></i>Pagamento</h4>
                        <p><strong>Método:</strong> {paymentMethod}</p>
                        {paymentMethod === 'cash' && (
                             <p><strong>Troco:</strong> {changeNeeded ? `para R$ ${changeAmount}` : 'Não precisa'}</p>
                        )}
                        {notes && <p className="mt-2 pt-2 border-t"><strong>Obs:</strong> {notes}</p>}
                    </div>
                </div>

                {/* Items */}
                <div>
                    <h4 className="font-bold mb-2"><i className="fas fa-shopping-basket mr-2"></i>Itens do Pedido</h4>
                    <ul className="space-y-1 text-sm">
                        {items.map(item => (
                            <li key={item.id} className="flex justify-between p-2 bg-gray-50 rounded">
                                <span>{item.quantity}x {item.name} ({item.size})</span>
                                <span>{(item.price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Actions */}
                {!isArchived && (
                    <div className="flex flex-wrap items-center justify-end gap-2 mt-4 pt-4 border-t">
                        {status === 'pending' && (
                            <button onClick={() => onUpdateStatus(id, 'accepted')} className="bg-green-500 text-white font-semibold py-2 px-3 rounded-lg text-sm hover:bg-green-600"><i className="fas fa-check mr-2"></i>Aceitar Pedido</button>
                        )}
                         {status === 'accepted' && (
                            <button onClick={() => onUpdateStatus(id, 'pending')} className="bg-yellow-500 text-white font-semibold py-2 px-3 rounded-lg text-sm hover:bg-yellow-600"><i className="fas fa-undo mr-2"></i>Reverter p/ Pendente</button>
                        )}
                        {status === 'accepted' && (
                            <button onClick={() => onUpdateStatus(id, 'ready')} className="bg-blue-500 text-white font-semibold py-2 px-3 rounded-lg text-sm hover:bg-blue-600"><i className="fas fa-box-open mr-2"></i>Marcar como Pronto/Enviado</button>
                        )}
                         {status === 'ready' && (
                            <button onClick={() => onUpdateStatus(id, 'completed')} className="bg-purple-500 text-white font-semibold py-2 px-3 rounded-lg text-sm hover:bg-purple-600"><i className="fas fa-flag-checkered mr-2"></i>Finalizar Pedido</button>
                        )}
                        <div className="flex-grow"></div>
                        <button onClick={() => onUpdateStatus(id, 'cancelled')} className="bg-gray-400 text-white font-semibold py-2 px-3 rounded-lg text-sm hover:bg-gray-500"><i className="fas fa-ban mr-2"></i>Cancelar</button>
                    </div>
                )}
                 {isArchived && (
                    <div className="flex justify-end mt-4 pt-4 border-t">
                         <button onClick={() => onDelete(id)} className="text-red-500 font-semibold py-2 px-3 rounded-lg text-xs hover:bg-red-50"><i className="fas fa-trash mr-2"></i>Apagar Registro</button>
                    </div>
                )}

            </div>
        </div>
    );
};
