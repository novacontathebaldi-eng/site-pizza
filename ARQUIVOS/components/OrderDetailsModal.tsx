import React from 'react';
import { Order } from '../types';

interface OrderDetailsModalProps {
    order: Order | null;
    onClose: () => void;
    title?: string;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ order, onClose, title }) => {
    if (!order) return null;

    const isReservation = order.customer.orderType === 'local';
    const paymentMethodMap = { credit: 'Crédito', debit: 'Débito', pix: 'PIX', cash: 'Dinheiro' };
    const orderTypeMap = { delivery: 'Entrega', pickup: 'Retirada', local: 'Consumo no Local' };
    
    const fullAddress = order.customer.orderType === 'delivery' ? `${order.customer.street || ''}, ${order.customer.number || ''} - ${order.customer.neighborhood || ''}` : null;

    const CompletedStatusBanner = () => {
        if (order.status !== 'completed') return null;

        const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
        const today = new Date();
        
        // Normalize dates to midnight to compare days correctly
        orderDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        const diffTime = today.getTime() - orderDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        let message: string;
        let iconClass: string;

        if (isReservation) { // 'local'
            if (diffDays >= 3) {
                message = "O cheirinho do forno aquecendo ainda nos lembra da sua visita. Quando quiser reviver o momento, a casa é sua! Obrigado novamente!";
                iconClass = 'fas fa-mug-hot';
            } else {
                message = "Você faz nossa casa ficar mais alegre. Valeu pela visita e até a próxima rodada de sabor!";
                iconClass = 'fas fa-glass-cheers';
            }
        } else { // 'delivery' or 'pickup'
            if (diffDays >= 1) {
                message = "Partiu mais uma pizza hoje? A próxima pizza tá a um clique!";
                iconClass = 'fas fa-pizza-slice';
            } else { // same day
                message = "Pedido Finalizado. Bom apetite!";
                iconClass = 'fas fa-pizza-slice';
            }
        }

        return (
            <div className="bg-green-50 border border-green-200 text-green-800 text-sm font-semibold p-3 rounded-lg flex items-center gap-3">
                <i className={iconClass}></i>
                <span>{message}</span>
            </div>
        );
    };


    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 animate-fade-in-up">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                 <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h3 className="text-xl font-bold text-text-on-light">{title || 'Detalhes do Pedido'} #{order.orderNumber}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                 <div className="overflow-y-auto p-4 sm:p-6 space-y-4">
                    
                    <div className="mb-4">
                        <CompletedStatusBanner />
                        {order.status === 'cancelled' && (
                            <div className="bg-red-50 border border-red-200 text-red-800 text-sm font-semibold p-3 rounded-lg flex items-center gap-3">
                                <i className="fas fa-ban"></i>
                                <span>Pedido Cancelado</span>
                            </div>
                        )}
                    </div>

                    <div className={`grid grid-cols-1 ${!isReservation ? 'md:grid-cols-2' : ''} gap-4 text-sm`}>
                        <div className="bg-gray-50 p-3 rounded-md border">
                            <h4 className="font-bold mb-2 text-base"><i className="fas fa-user mr-2 text-gray-400"></i>Cliente</h4>
                            <p><strong>Nome:</strong> {order.customer.name}</p>
                            <p><strong>Telefone:</strong> {order.customer.phone}</p>
                            <p><strong>Pedido:</strong> {orderTypeMap[order.customer.orderType]}</p>
                            {fullAddress && <p><strong>Endereço:</strong> {fullAddress}</p>}
                            {isReservation && (
                                <>
                                    <p><strong>Pessoas:</strong> {order.numberOfPeople}</p>
                                    <p><strong>Reserva:</strong> {order.customer.reservationTime}</p>
                                </>
                            )}
                        </div>
                        {!isReservation && (
                            <div className="bg-gray-50 p-3 rounded-md border">
                                <h4 className="font-bold mb-2 text-base"><i className="fas fa-credit-card mr-2 text-gray-400"></i>Pagamento</h4>
                                <p><strong>Método:</strong> {order.paymentMethod ? paymentMethodMap[order.paymentMethod] : 'N/A'}</p>
                                {order.deliveryFee > 0 && (<p><strong>Taxa de Entrega:</strong> {order.deliveryFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>)}
                                <p className="mt-2 pt-2 border-t font-bold"><strong>Total:</strong> {order.total?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                            </div>
                        )}
                    </div>

                    {order.items && order.items.length > 0 && (
                        <div>
                            <h4 className="font-bold mb-2 text-base"><i className="fas fa-shopping-basket mr-2 text-gray-400"></i>Itens do Pedido</h4>
                            <ul className="space-y-1 text-sm">
                                {order.items.map(item => (<li key={item.id} className="flex justify-between p-2 bg-gray-50 rounded"><span>{item.quantity}x {item.name} ({item.size})</span><span className="font-semibold">{(item.price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></li>))}
                            </ul>
                        </div>
                    )}
                     {order.notes && <p className="text-sm mt-3 p-2 bg-yellow-50 rounded-md border border-yellow-200"><strong>Obs:</strong> {order.notes}</p>}
                 </div>
            </div>
        </div>
    );
};