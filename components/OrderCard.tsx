import React, { useState } from 'react';
import { Order } from '../types';
import * as firebaseService from '../services/firebaseService';
import { ContactModal } from './ContactModal';

interface OrderCardProps {
    order: Order;
}

const statusConfig = {
    pending: { label: 'Pendente', color: 'bg-yellow-500', icon: 'fas fa-clock' },
    preparing: { label: 'Preparando', color: 'bg-blue-500', icon: 'fas fa-blender' },
    delivering: { label: 'Em Entrega', color: 'bg-purple-500', icon: 'fas fa-motorcycle' },
    completed: { label: 'Concluído', color: 'bg-green-500', icon: 'fas fa-check-circle' },
    cancelled: { label: 'Cancelado', color: 'bg-red-500', icon: 'fas fa-times-circle' },
};

// FIX: Added all possible `OrderStatus` keys to satisfy the type `{ [key in Order['status']]: Order['status'] | null }`.
const nextStatus: { [key in Order['status']]: Order['status'] | null } = {
    pending: 'preparing',
    preparing: 'delivering',
    delivering: 'completed',
    completed: null,
    cancelled: null,
    // --- Added missing keys to satisfy the type ---
    'awaiting-payment': null, // Should be updated programmatically on payment, not by admin.
    accepted: 'preparing',
    reserved: 'accepted',
    ready: 'completed',
    deleted: null,
};

export const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    
    const currentStatus = statusConfig[order.status];
    const next = nextStatus[order.status];
    const nextStatusInfo = next ? statusConfig[next] : null;

    const handleUpdateStatus = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!next || isUpdating) return;
        
        setIsUpdating(true);
        try {
            await firebaseService.updateOrderStatus(order.id, next);
        } catch (error) {
            console.error("Failed to update status", error);
            alert("Falha ao atualizar status do pedido.");
        } finally {
            setIsUpdating(false);
        }
    };
    
    const handleCancelOrder = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isUpdating) return;
        if (window.confirm("Tem certeza que deseja cancelar este pedido?")) {
            setIsUpdating(true);
            try {
                await firebaseService.updateOrderStatus(order.id, 'cancelled');
            } catch (error) {
                console.error("Failed to cancel order", error);
                alert("Falha ao cancelar o pedido.");
            } finally {
                setIsUpdating(false);
            }
        }
    };

    return (
        <>
            <div className="bg-white rounded-lg shadow-md border transition-shadow hover:shadow-lg">
                <div className="p-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <div className="flex-grow">
                             <div className="flex items-center gap-3">
                                <span className={`flex-shrink-0 text-white text-xs font-bold py-1 px-3 rounded-full ${currentStatus?.color ?? 'bg-gray-500'}`}>
                                    <i className={`${currentStatus?.icon ?? 'fas fa-question-circle'} mr-1.5`}></i>
                                    {currentStatus?.label ?? order.status}
                                </span>
                                 <p className="text-sm text-gray-500">
                                    Pedido #{order.id.substring(0, 6)} - {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                            {/* FIX: Access customer name from the nested 'customer' object. */}
                            <h3 className="font-bold text-lg mt-2">{order.customer.name}</h3>
                        </div>
                        <div className="flex flex-col sm:items-end sm:text-right flex-shrink-0">
                            <p className="text-2xl font-bold text-accent">{order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                            <p className="text-sm text-gray-500">{order.items.reduce((sum, item) => sum + item.quantity, 0)} itens</p>
                        </div>
                         <div className="flex items-center justify-end text-xl text-gray-400">
                            <i className={`fas fa-chevron-down transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}></i>
                        </div>
                    </div>
                </div>

                {isExpanded && (
                    <div className="border-t p-4 space-y-4 animate-fade-in-up">
                        <div>
                            <h4 className="font-semibold mb-2">Itens do Pedido:</h4>
                            <ul className="space-y-1 text-sm list-disc list-inside">
                                {order.items.map(item => (
                                    <li key={item.id}>{item.quantity}x {item.name} ({item.size})</li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">Detalhes da Entrega:</h4>
                            {/* FIX: Access customer address from the nested 'customer' object. */}
                            <p className="text-sm">{order.customer.address || `${order.customer.orderType}`}</p>
                            <button onClick={() => setIsContactModalOpen(true)} className="text-sm text-blue-600 hover:underline mt-1">Ver Telefone</button>
                        </div>
                        
                        {(order.status !== 'completed' && order.status !== 'cancelled') && (
                            <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t">
                                {nextStatusInfo && (
                                     <button 
                                        onClick={handleUpdateStatus} 
                                        disabled={isUpdating}
                                        className="flex-1 bg-accent text-white font-bold py-2 px-4 rounded-lg hover:bg-opacity-90 disabled:bg-gray-400 flex items-center justify-center">
                                         {isUpdating ? <i className="fas fa-spinner fa-spin"></i> : (
                                            <>
                                                <i className={`${nextStatusInfo.icon} mr-2`}></i> Mover para "{nextStatusInfo.label}"
                                            </>
                                         )}
                                    </button>
                                )}
                                <button
                                    onClick={handleCancelOrder}
                                    disabled={isUpdating}
                                    className="flex-1 bg-red-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600 disabled:bg-gray-400">
                                    <i className="fas fa-times mr-2"></i>Cancelar Pedido
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
            {/* FIX: Access customer name and phone from the nested 'customer' object. */}
            {isContactModalOpen && <ContactModal isOpen={true} onClose={() => setIsContactModalOpen(false)} customerName={order.customer.name} customerPhone={order.customer.phone} />}
        </>
    );
};
