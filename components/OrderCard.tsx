import React from 'react';
import { Order, OrderStatus, PaymentStatus } from '../types';

interface OrderCardProps {
    order: Order;
    onUpdateStatus: (orderId: string, status: OrderStatus, payload?: Partial<Pick<Order, 'pickupTimeEstimate'>>) => void;
    onUpdatePaymentStatus: (orderId: string, paymentStatus: PaymentStatus) => void;
    onDelete: (orderId: string) => void;
}

const statusConfig: { [key in OrderStatus]: { text: string; icon: string; color: string; } } = {
    pending: { text: 'Pendente', icon: 'fas fa-hourglass-start', color: 'border-yellow-500' },
    accepted: { text: 'Aceito / Em Preparo', icon: 'fas fa-cogs', color: 'border-blue-500' },
    ready: { text: 'Pronto / Saiu p/ Entrega', icon: 'fas fa-shipping-fast', color: 'border-purple-500' },
    completed: { text: 'Finalizado', icon: 'fas fa-check-circle', color: 'border-green-500' },
    cancelled: { text: 'Cancelado', icon: 'fas fa-times-circle', color: 'border-red-500' },
};

export const OrderCard: React.FC<OrderCardProps> = ({ order, onUpdateStatus, onUpdatePaymentStatus, onDelete }) => {
    const { id, customer, items, total, paymentMethod, changeNeeded, changeAmount, notes, status, paymentStatus, createdAt, pickupTimeEstimate } = order;
    const config = statusConfig[status];

    const formatTimestamp = (timestamp: any): string => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate();
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
    };
    
    const handleAccept = () => {
        let payload = {};
        if (customer.orderType === 'pickup') {
            const now = new Date();
            const pickupTime = new Date(now.getTime() + 30 * 60000); // 30 minutes estimate
            const formattedTime = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(pickupTime);
            payload = { pickupTimeEstimate: `~${formattedTime}` };
        }
        onUpdateStatus(id, 'accepted', payload);
    };
    
    const handleTogglePaymentStatus = () => {
        const newStatus = paymentStatus === 'pending' ? 'paid' : 'pending';
        onUpdatePaymentStatus(id, newStatus);
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
                    <div className="bg-gray-50 p-3 rounded-md">
                        <h4 className="font-bold mb-2"><i className="fas fa-user mr-2"></i>Cliente</h4>
                        <p><strong>Nome:</strong> {customer.name}</p>
                        <p><strong>Telefone:</strong> {customer.phone}</p>
                        <p><strong>Pedido:</strong> {customer.orderType}</p>
                        {customer.orderType === 'delivery' && customer.address && <p><strong>Endereço:</strong> {customer.address}</p>}
                        {customer.orderType === 'local' && customer.reservationTime && <p><strong>Reserva:</strong> {customer.reservationTime}</p>}
                        {customer.orderType === 'pickup' && pickupTimeEstimate && <p><strong>Retirada:</strong> <span className="font-bold text-accent">{pickupTimeEstimate}</span></p>}
                    </div>
                    <div className="bg-gray-50 p-3 rounded-md">
                         <h4 className="font-bold mb-2"><i className="fas fa-credit-card mr-2"></i>Pagamento</h4>
                        <p><strong>Método:</strong> {paymentMethod}</p>
                        <p>
                            <strong>Status Pgto:</strong>
                            <span className={`font-bold ml-1 ${paymentStatus === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                                {paymentStatus === 'paid' ? 'Pago' : 'Pendente'}
                            </span>
                        </p>
                        {paymentMethod === 'cash' && ( <p><strong>Troco:</strong> {changeNeeded ? `para R$ ${changeAmount}` : 'Não precisa'}</p> )}
                        {notes && <p className="mt-2 pt-2 border-t"><strong>Obs:</strong> {notes}</p>}
                    </div>
                </div>

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

                <div className="flex flex-wrap items-center justify-end gap-2 mt-4 pt-4 border-t">
                    {!isArchived ? (
                        <>
                            {paymentStatus === 'pending' ? (
                                <button onClick={handleTogglePaymentStatus} className="bg-orange-400 text-white font-semibold py-2 px-3 rounded-lg text-sm hover:bg-orange-500"><i className="fas fa-dollar-sign mr-2"></i>Marcar como Pago</button>
                            ) : (
                                <button onClick={handleTogglePaymentStatus} className="bg-green-600 text-white font-semibold py-2 px-3 rounded-lg text-sm hover:bg-green-700"><i className="fas fa-check mr-2"></i>Pago</button>
                            )}

                            <div className="flex-grow"></div>

                            {status === 'pending' && <button onClick={handleAccept} className="bg-green-500 text-white font-semibold py-2 px-3 rounded-lg text-sm hover:bg-green-600"><i className="fas fa-check mr-2"></i>Aceitar</button>}
                            {status === 'accepted' && <button onClick={() => onUpdateStatus(id, 'pending')} className="bg-yellow-500 text-white font-semibold py-2 px-3 rounded-lg text-sm hover:bg-yellow-600"><i className="fas fa-undo mr-2"></i>Reverter</button>}
                            {status === 'accepted' && <button onClick={() => onUpdateStatus(id, 'ready')} className="bg-blue-500 text-white font-semibold py-2 px-3 rounded-lg text-sm hover:bg-blue-600"><i className="fas fa-box-open mr-2"></i>Pronto</button>}
                            {status === 'ready' && <button onClick={() => onUpdateStatus(id, 'completed')} className="bg-purple-500 text-white font-semibold py-2 px-3 rounded-lg text-sm hover:bg-purple-600"><i className="fas fa-flag-checkered mr-2"></i>Finalizar</button>}
                            <button onClick={() => onUpdateStatus(id, 'cancelled')} className="bg-gray-400 text-white font-semibold py-2 px-3 rounded-lg text-sm hover:bg-gray-500"><i className="fas fa-ban mr-2"></i>Cancelar</button>
                        </>
                    ) : (
                        <div className="flex items-center gap-4">
                            <label htmlFor={`status-revert-${id}`} className="text-sm font-semibold">Alterar Status:</label>
                            <select id={`status-revert-${id}`} onChange={(e) => onUpdateStatus(id, e.target.value as OrderStatus)} value={status} className="bg-white border rounded-md px-3 py-1.5 text-sm">
                                <option value="completed">Finalizado</option>
                                <option value="cancelled">Cancelado</option>
                                <option disabled>---</option>
                                <option value="pending">Pendente</option>
                                <option value="accepted">Aceito</option>
                                <option value="ready">Pronto</option>
                            </select>
                            <button onClick={() => onDelete(id)} className="text-red-500 font-semibold py-2 px-3 rounded-lg text-xs hover:bg-red-50"><i className="fas fa-trash mr-2"></i>Apagar</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};