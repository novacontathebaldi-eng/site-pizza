import React from 'react';
import { Order, OrderStatus } from '../types';

const statusConfig: { [key in OrderStatus]?: { text: string; icon: string; color: string; } } = {
    pending: { text: 'Pendente', icon: 'fas fa-hourglass-start', color: 'text-yellow-500' },
    accepted: { text: 'Em Preparo', icon: 'fas fa-cogs', color: 'text-blue-500' },
    reserved: { text: 'Reserva Confirmada', icon: 'fas fa-chair', color: 'text-teal-500' },
    ready: { text: 'Pronto / Em Rota', icon: 'fas fa-shipping-fast', color: 'text-purple-500' },
    completed: { text: 'Finalizado', icon: 'fas fa-check-circle', color: 'text-green-500' },
    cancelled: { text: 'Cancelado', icon: 'fas fa-times-circle', color: 'text-red-500' },
    deleted: { text: 'Excluído', icon: 'fas fa-trash-alt', color: 'text-gray-500' },
    'awaiting-payment': { text: 'Aguardando Pgto', icon: 'fas fa-clock', color: 'text-gray-500' },
};

export const formatTimestamp = (timestamp: any, includeTime: boolean = false): string => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const options: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    };
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    return new Intl.DateTimeFormat('pt-BR', options).format(date);
};

export const OrderStatusTracker: React.FC<{ order: Order }> = ({ order }) => {
    if (order.customer.orderType === 'local') {
        const config = statusConfig[order.status === 'pending' ? 'pending' : 'reserved'] || statusConfig[order.status];
        if (!config) return null;
        return (
             <div className="bg-blue-50 border-l-4 border-blue-400 text-blue-800 p-3 my-2 rounded-r-lg text-sm">
                <div className="flex">
                    <div className="py-1"><i className={`text-xl mr-3 ${config.icon}`}></i></div>
                    <div>
                        <p className="font-bold">{config.text}</p>
                        <p className="text-xs">Sua reserva para {order.numberOfPeople} pessoa(s) em {formatTimestamp(order.createdAt, true)}.</p>
                    </div>
                </div>
            </div>
        );
    }

    const steps = [
        { id: 'pending', label: 'Pedido Recebido', icon: 'fas fa-receipt' },
        { id: 'accepted', label: 'Em Preparo', icon: 'fas fa-utensils' },
        { id: 'ready', label: order.customer.orderType === 'delivery' ? 'Saiu p/ Entrega' : 'Pronto p/ Retirada', icon: order.customer.orderType === 'delivery' ? 'fas fa-motorcycle' : 'fas fa-box-open' },
        { id: 'completed', label: 'Finalizado', icon: 'fas fa-check' }
    ];

    const statusOrder: OrderStatus[] = ['pending', 'accepted', 'ready', 'completed'];
    let currentStatusIndex = statusOrder.indexOf(order.status);
    
    if (order.status === 'awaiting-payment') {
        currentStatusIndex = 0;
    }
    
    if (order.status === 'cancelled') {
        return (
            <div className="bg-red-50 border-l-4 border-red-400 text-red-800 p-3 my-4 rounded-r-lg">
                <p className="font-bold text-sm"><i className="fas fa-times-circle mr-2"></i>Pedido Cancelado</p>
            </div>
        );
   }

    if (currentStatusIndex < 0 && order.status !== 'completed') {
        return null; 
    }

    if(order.status === 'completed') {
      currentStatusIndex = 3;
    }

    const progressPercent = currentStatusIndex < 0 ? 0 : (currentStatusIndex / (steps.length - 1)) * 100;

    return (
        <div className="w-full py-4">
            <div className="relative h-20">
                {/* Lines Container */}
                <div className="absolute top-5 left-5 right-5 h-1">
                    {/* Gray Line */}
                    <div className="w-full h-full bg-gray-200 rounded-full" />
                    {/* Green Line */}
                    <div
                        className="absolute top-0 left-0 h-full bg-green-500 rounded-full transition-all duration-500 ease-in-out"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                {/* Icons & Labels Container */}
                <div className="absolute top-0 left-0 w-full h-full flex justify-between items-start">
                    {steps.map((step, index) => {
                        const isCompleted = currentStatusIndex >= index;
                        const isActive = currentStatusIndex === index;

                        let circleClass = 'bg-white border-2 border-gray-300 text-gray-400';
                        let textClass = 'text-gray-500';

                        if (isActive) {
                            circleClass = 'bg-green-500 text-white scale-110 shadow-lg border-2 border-green-600';
                            textClass = 'font-bold text-green-600';
                        } else if (isCompleted) {
                            circleClass = 'bg-green-500 text-white border-2 border-green-600';
                            textClass = 'text-green-600';
                        }

                        return (
                            <div key={step.id} className="z-10 flex flex-col items-center text-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-300 ${circleClass}`}>
                                    <i className={step.icon}></i>
                                </div>
                                <p className={`mt-2 text-xs font-semibold leading-tight w-20 ${textClass} transition-colors duration-300`}>
                                    {steps[index].label}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
