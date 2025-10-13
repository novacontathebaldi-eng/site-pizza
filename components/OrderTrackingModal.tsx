import React, { useState, useEffect } from 'react';
import { Order, CartItem, OrderStatus } from '../types';

const getStatusStep = (status: OrderStatus): number => {
    switch (status) {
        case 'pending':
        case 'awaiting-payment':
            return 1;
        case 'accepted':
        case 'reserved':
            return 2;
        case 'ready':
            return 3;
        case 'completed':
            return 4;
        case 'cancelled':
        case 'deleted':
            return -1; // Cancelled state
        default:
            return 0;
    }
};

const OrderStatusStepper: React.FC<{ order: Order }> = ({ order }) => {
    const currentStep = getStatusStep(order.status);

    const isDelivery = order.customer.orderType === 'delivery';
    const isPickup = order.customer.orderType === 'pickup';
    const isLocal = order.customer.orderType === 'local';

    const steps = [
        { name: 'Pedido Recebido', icon: 'fas fa-receipt' },
        { name: isLocal ? 'Reserva Confirmada' : 'Em Preparo', icon: 'fas fa-utensils' },
        { name: isDelivery ? 'Saiu para Entrega' : (isPickup ? 'Pronto para Retirada' : 'Aguardando'), icon: isDelivery ? 'fas fa-motorcycle' : 'fas fa-box-open' },
        { name: 'Finalizado', icon: 'fas fa-check-circle' }
    ];

    if (currentStep === -1) {
        return (
            <div className="text-center p-6 bg-red-50 border border-red-200 rounded-lg">
                <i className="fas fa-times-circle text-5xl text-red-500 mb-3"></i>
                <h3 className="text-xl font-bold text-red-700">Pedido Cancelado</h3>
                <p className="text-red-600 mt-1">Este pedido foi cancelado.</p>
            </div>
        );
    }

    return (
        <div className="flex items-start justify-center space-x-2 sm:space-x-4">
            {steps.map((step, index) => {
                const stepNumber = index + 1;
                const isCompleted = currentStep > stepNumber;
                const isActive = currentStep === stepNumber;

                return (
                    <React.Fragment key={step.name}>
                        <div className="flex flex-col items-center text-center w-1/4 max-w-[100px]">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                                isCompleted ? 'bg-green-500 border-green-500 text-white' : 
                                isActive ? 'bg-accent border-accent text-white animate-pulse' : 
                                'bg-gray-200 border-gray-300 text-gray-500'
                            }`}>
                                <i className={`${step.icon} text-xl`}></i>
                            </div>
                            <p className={`mt-2 text-xs font-semibold leading-tight ${
                                isCompleted ? 'text-green-600' : isActive ? 'text-accent' : 'text-gray-500'
                            }`}>{step.name}</p>
                        </div>
                        {index < steps.length - 1 && (
                             <div className={`flex-1 h-1 mt-6 transition-all duration-300 ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

const OrderItemsAccordion: React.FC<{ items: CartItem[], total: number }> = ({ items, total }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border rounded-md mt-6">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-md">
                <span className="font-semibold text-sm">Ver itens do pedido</span>
                <i className={`fas fa-chevron-down transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
            </button>
            {isOpen && (
                <div className="p-4 border-t animate-fade-in-up">
                    <ul className="space-y-2 text-sm">
                        {items.map(item => (
                            <li key={item.id} className="flex justify-between pb-1 border-b border-gray-100">
                                <span>{item.quantity}x {item.name} ({item.size})</span>
                                <span className="font-medium">{(item.price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </li>
                        ))}
                    </ul>
                    <div className="flex justify-between font-bold text-md mt-2 pt-2 border-t">
                        <span>Total:</span>
                        <span>{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

interface OrderTrackingModalProps {
    isOpen: boolean;
    onClose: () => void;
    orders: Order[];
}


export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({ isOpen, onClose, orders }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setSearchTerm('');
                setTrackedOrder(null);
                setError(null);
                setIsLoading(false);
            }, 300);
        }
    }, [isOpen]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchTerm) return;
        setIsLoading(true);
        setError(null);
        setTrackedOrder(null);

        setTimeout(() => {
            const cleanedSearch = searchTerm.trim().replace('#', '');
            
            let foundOrder = orders.find(o => String(o.orderNumber) === cleanedSearch);

            if (!foundOrder) {
                const phoneDigits = cleanedSearch.replace(/\D/g, '');
                if (phoneDigits.length >= 8) {
                    const customerOrders = orders
                        .filter(o => o.customer.phone.replace(/\D/g, '').includes(phoneDigits))
                        .sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
                    
                    foundOrder = customerOrders.find(o => o.status !== 'completed' && o.status !== 'cancelled' && o.status !== 'deleted') || customerOrders[0];
                }
            }

            if (foundOrder) {
                setTrackedOrder(foundOrder);
            } else {
                setError('Pedido não encontrado. Verifique os dados e tente novamente.');
            }
            setIsLoading(false);
        }, 500);
    };

    const resetSearch = () => {
        setTrackedOrder(null);
        setError(null);
        setSearchTerm('');
    }

    const address = "Rua Porfilio Furtado, 178, Centro - Santa Leopoldina, ES";
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in-up">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-text-on-light"><i className="fas fa-truck-loading mr-2"></i>Rastrear Pedido</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <div className="overflow-y-auto p-6">
                    {!trackedOrder ? (
                        <div className="text-center">
                            <h3 className="text-xl font-semibold mb-2">Acompanhe seu Pedido</h3>
                            <p className="text-gray-600 mb-4">Digite o número do seu pedido (ex: #1024) ou o telefone usado na compra.</p>
                            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
                                <input 
                                    type="text" 
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-accent"
                                    placeholder="Número do pedido ou telefone"
                                    required
                                />
                                <button type="submit" className="bg-accent text-white font-bold py-3 px-6 rounded-md hover:bg-opacity-90 flex items-center justify-center min-w-[140px]" disabled={isLoading}>
                                    {isLoading ? <i className="fas fa-spinner fa-spin"></i> : "Buscar"}
                                </button>
                            </form>
                            {error && <p className="text-red-600 mt-4 animate-fade-in-up">{error}</p>}
                        </div>
                    ) : (
                        <div className="animate-fade-in-up">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-2xl font-bold">Pedido #{trackedOrder.orderNumber}</h3>
                                    <p className="text-gray-600">Cliente: {trackedOrder.customer.name}</p>
                                </div>
                                <button onClick={resetSearch} className="text-sm text-blue-600 hover:underline font-semibold">
                                    <i className="fas fa-search mr-1"></i>Buscar outro
                                </button>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-lg">
                                <OrderStatusStepper order={trackedOrder} />
                            </div>

                            {trackedOrder.status === 'ready' && trackedOrder.customer.orderType === 'pickup' && (
                                <div className="mt-4">
                                    <a 
                                        href={googleMapsUrl}
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="w-full block text-center bg-green-600 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-green-700 transition-all"
                                    >
                                        <i className="fas fa-map-marked-alt mr-2"></i>
                                        Ver Rota no Mapa para Retirada
                                    </a>
                                </div>
                            )}

                            <OrderItemsAccordion items={trackedOrder.items} total={trackedOrder.total} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
