import React from 'react';
import { Order, OrderStatus } from '../types';

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
        const isReserved = order.status === 'reserved';
        const config = {
            'pending': { text: 'Aguardando Confirmação', icon: 'fas fa-hourglass-half' },
            'reserved': { text: 'Reserva Confirmada', icon: 'fas fa-calendar-check' }
        }[isReserved ? 'reserved' : 'pending'];

        return (
             <div className="bg-blue-50 border-l-4 border-blue-400 text-blue-800 p-4 my-2 rounded-r-lg">
                <div className="flex items-center">
                    <div className="w-10 text-center text-xl mr-3 flex items-center justify-center">
                        <i className={config.icon}></i>
                    </div>
                    <div>
                        <p className="font-bold">{config.text}</p>
                        <p className="text-xs">Sua reserva para {order.numberOfPeople} pessoa(s) em {formatTimestamp(order.customer.reservationDate || order.createdAt)} às {order.customer.reservationTime}.</p>
                    </div>
                </div>
            </div>
        );
    }

    const steps: { id: OrderStatus, label: string, icon: string }[] = [
        { id: 'pending', label: 'Pedido Recebido', icon: 'fas fa-receipt' },
        { id: 'accepted', label: 'Em Preparo', icon: 'fas fa-utensils' },
        { 
            id: 'ready', 
            label: order.customer.orderType === 'delivery' ? 'Saiu p/ Entrega' : 'Pronto p/ Retirada', 
            icon: order.customer.orderType === 'delivery' ? 'fas fa-motorcycle' : 'fas fa-box-open'
        },
        { id: 'completed', label: 'Finalizado', icon: 'fas fa-flag-checkered' }
    ];

    const statusOrder: OrderStatus[] = ['pending', 'accepted', 'ready', 'completed'];
    
    let currentStatusIndex = statusOrder.indexOf(order.status);
    if (order.status === 'awaiting-payment') currentStatusIndex = -1; // Before 'pending'
    if (order.status === 'completed') currentStatusIndex = 3;

    if (order.status === 'cancelled') {
        return (
            <div className="bg-red-50 border-l-4 border-red-400 text-red-800 p-3 my-4 rounded-r-lg">
                <p className="font-bold text-sm"><i className="fas fa-times-circle mr-2"></i>Pedido Cancelado</p>
            </div>
        );
   }
   
    if (order.status === 'awaiting-payment') {
        return (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 p-3 my-4 rounded-r-lg">
                <p className="font-bold text-sm"><i className="fas fa-clock mr-2"></i>Aguardando Pagamento</p>
                 <p className="text-xs mt-1">Seu pedido entrará em preparo assim que o pagamento for confirmado.</p>
            </div>
        );
   }


    return (
        <div className="w-full py-4">
            <div className="flex justify-between">
                {steps.map((step, index) => {
                    const isCompleted = currentStatusIndex >= index;
                    const isActive = currentStatusIndex === index;

                    return (
                        <div key={step.id} className="flex-1 flex flex-col items-center relative">
                            {/* Line */}
                            {index > 0 && (
                                <div className={`absolute w-full h-1 top-[14px] right-1/2 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                            )}
                            
                            {/* Circle & Icon */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white z-10 transition-colors duration-300 ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}`}>
                                {isActive ? <i className={`${step.icon} fa-beat`}></i> : <i className={step.icon}></i>}
                            </div>
                            
                            {/* Label */}
                            <p className={`mt-2 text-xs font-semibold text-center leading-tight w-20 transition-colors duration-300 ${isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                                {step.label}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
