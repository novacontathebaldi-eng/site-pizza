import React from 'react';
import { Order, OrderStatus } from '../types';

// Simplified customer-facing status mapping
const statusMap: { [key in OrderStatus]?: { text: string; step: number; icon: string; isError?: boolean } } = {
    'awaiting-payment': { text: 'Aguardando Pagamento', step: 0, icon: 'fas fa-clock' },
    'pending': { text: 'Pedido Recebido', step: 1, icon: 'fas fa-receipt' },
    'accepted': { text: 'Em Preparo', step: 2, icon: 'fas fa-cogs' },
    'reserved': { text: 'Reserva Confirmada', step: 2, icon: 'fas fa-chair' },
    'ready': { text: 'Pronto / Em Rota', step: 3, icon: 'fas fa-shipping-fast' },
    'completed': { text: 'Entregue', step: 4, icon: 'fas fa-check-circle' },
    'cancelled': { text: 'Cancelado', step: 0, icon: 'fas fa-times-circle', isError: true },
    'deleted': { text: 'Cancelado', step: 0, icon: 'fas fa-times-circle', isError: true },
};

const STEPS = [
    { text: 'Recebido', icon: 'fas fa-receipt' },
    { text: 'Em Preparo', icon: 'fas fa-cogs' },
    { text: 'Saiu para Entrega', icon: 'fas fa-shipping-fast' },
    { text: 'Entregue', icon: 'fas fa-check-circle' }
];

export const CustomerOrderCard: React.FC<{ order: Order }> = ({ order }) => {
    const { orderNumber, createdAt, items, total, status } = order;
    const currentStatus = statusMap[status] || { text: 'Status Desconhecido', step: 0, icon: 'fas fa-question-circle' };
    
    const formatTimestamp = (timestamp: any): string => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
    };

    const renderSteps = () => {
        if (currentStatus.isError) {
            return (
                <div className="flex justify-center items-center gap-2 p-4 bg-red-50 text-red-600 rounded-md">
                    <i className={currentStatus.icon}></i>
                    <span className="font-bold">{currentStatus.text}</span>
                </div>
            )
        }
        
        const adjustedSteps = [...STEPS];
        if(order.customer.orderType === 'pickup') {
            adjustedSteps[2].text = 'Pronto p/ Retirada';
            adjustedSteps[2].icon = 'fas fa-store';
            adjustedSteps[3].text = 'Retirado';
        } else if (order.customer.orderType === 'local') {
            adjustedSteps[0].text = 'Reserva Feita';
            adjustedSteps[1].text = 'Confirmada';
            adjustedSteps[2] = { text: 'Aguardando', icon: 'fas fa-clock' };
            adjustedSteps[3].text = 'Finalizado';
        }


        return (
            <div className="flex justify-between items-start text-xs text-center px-2">
                {adjustedSteps.map((step, index) => {
                    const stepNumber = index + 1;
                    const isActive = stepNumber <= currentStatus.step;
                    const isCurrent = stepNumber === currentStatus.step;

                    return (
                        <React.Fragment key={step.text}>
                            <div className="flex flex-col items-center w-16">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${isActive ? 'bg-accent border-accent text-white' : 'bg-gray-100 border-gray-300 text-gray-400'}`}>
                                    <i className={step.icon}></i>
                                </div>
                                <span className={`mt-2 font-semibold ${isCurrent ? 'text-accent' : isActive ? 'text-gray-700' : 'text-gray-400'}`}>{step.text}</span>
                            </div>
                            {index < adjustedSteps.length - 1 && (
                                <div className={`flex-1 h-1 mt-5 rounded ${isActive && currentStatus.step > stepNumber ? 'bg-accent' : 'bg-gray-300'}`}></div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        )
    }

    return (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">Pedido #{orderNumber}</h3>
                    <p className="text-sm text-gray-500">{formatTimestamp(createdAt)}</p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-bold text-accent">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    <p className="text-sm text-gray-500">{items.reduce((acc, i) => acc + i.quantity, 0)} itens</p>
                </div>
            </div>
            <div className="my-6">
                {renderSteps()}
            </div>
            <details className="text-sm">
                <summary className="cursor-pointer font-semibold text-gray-600 hover:text-accent">Ver itens do pedido</summary>
                <ul className="mt-2 space-y-1 pl-4 border-l-2">
                    {items.map(item => (
                        <li key={item.id} className="flex justify-between p-1">
                            <span>{item.quantity}x {item.name} ({item.size})</span>
                            <span>{(item.price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </li>
                    ))}
                </ul>
            </details>
        </div>
    );
};
