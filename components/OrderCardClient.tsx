import React from 'react';
import { Order, OrderStatus } from '../types.ts';

interface OrderCardClientProps {
    order: Order;
}

const getStatusDetails = (status: OrderStatus, orderType: 'delivery' | 'pickup' | 'local') => {
    const details: { [key in OrderStatus]?: { title: string, description: string, icon: string } } = {
        pending: { title: 'Pedido Recebido', description: 'Aguardando confirmação da pizzaria.', icon: 'fas fa-receipt' },
        reserved: { title: 'Reserva Confirmada', description: 'Sua mesa está reservada. Aguardamos você!', icon: 'fas fa-chair' },
        accepted: { title: 'Em Preparo', description: 'Sua pizza já está no forno!', icon: 'fas fa-cogs' },
        ready: { 
            title: orderType === 'delivery' ? 'Saiu para Entrega' : 'Pronto para Retirada', 
            description: orderType === 'delivery' ? 'O motoboy está a caminho.' : 'Pode vir buscar seu pedido!', 
            icon: orderType === 'delivery' ? 'fas fa-shipping-fast' : 'fas fa-store-alt' 
        },
        completed: { title: 'Pedido Finalizado', description: 'Bom apetite! Agradecemos a preferência.', icon: 'fas fa-check-circle' },
        cancelled: { title: 'Pedido Cancelado', description: 'Seu pedido foi cancelado.', icon: 'fas fa-times-circle' },
    };
    return details[status] || details.pending;
};

const getTimelineSteps = (orderType: 'delivery' | 'pickup' | 'local'): OrderStatus[] => {
    if (orderType === 'local') {
        return ['reserved', 'completed'];
    }
    return ['accepted', 'ready', 'completed'];
};

export const OrderCardClient: React.FC<OrderCardClientProps> = ({ order }) => {
    const currentStatusDetails = getStatusDetails(order.status, order.customer.orderType);
    const timelineSteps = getTimelineSteps(order.customer.orderType);
    
    // Determine which step is active. 'pending' and 'reserved' count as before the first step.
    const activeStepIndex = order.status === 'pending' || order.status === 'deleted'
        ? -1 
        : timelineSteps.indexOf(order.status);

    const formatTimestamp = (timestamp: any): string => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate();
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
    };

    return (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <header className="bg-gray-50 p-4 border-b flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                    <p className="text-sm text-gray-500">Pedido #{order.id.substring(0, 8)}</p>
                    <p className="font-bold text-lg">{formatTimestamp(order.createdAt)}</p>
                </div>
                <div className="text-right">
                    <p className="font-bold text-2xl text-accent">{order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
            </header>
            <div className="p-6">
                {order.status === 'cancelled' ? (
                     <div className="text-center text-red-500">
                        <i className="fas fa-times-circle text-5xl mb-3"></i>
                        <h3 className="text-xl font-bold">Pedido Cancelado</h3>
                     </div>
                ) : (
                    <>
                    {/* Timeline */}
                    <div className="flex justify-between items-start mb-6">
                        {timelineSteps.map((step, index) => {
                            const details = getStatusDetails(step, order.customer.orderType);
                            const isCompleted = index <= activeStepIndex;
                            const isNext = index === activeStepIndex + 1;
                            
                            return (
                                <div key={step} className="text-center w-1/3">
                                    <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center text-2xl border-4 transition-colors ${
                                        isCompleted ? 'bg-accent text-white border-accent' : 'bg-gray-200 text-gray-500 border-gray-300'
                                    }`}>
                                        <i className={details?.icon}></i>
                                    </div>
                                    <p className={`mt-2 font-semibold text-sm ${isCompleted ? 'text-accent' : 'text-gray-500'}`}>{details?.title}</p>
                                </div>
                            );
                        })}
                    </div>
                    {/* Progress Bar */}
                    <div className="relative w-full h-2 bg-gray-200 rounded-full mb-8">
                         <div 
                            className="absolute top-0 left-0 h-2 bg-accent rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(0, (activeStepIndex / (timelineSteps.length - 1)) * 100)}%` }}
                        ></div>
                    </div>
                    </>
                )}

                {/* Items */}
                <div>
                    <h4 className="font-bold mb-2">Itens do Pedido</h4>
                    <ul className="space-y-1 text-sm">
                        {order.items.map(item => (
                            <li key={item.id} className="flex justify-between p-2 bg-gray-50 rounded">
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
