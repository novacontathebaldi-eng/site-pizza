import React from 'react';
import firebase from 'firebase/compat/app';
import { Order } from '../types';
import { CustomerOrderCard } from './CustomerOrderCard';

interface CustomerPortalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLogout: () => void;
    onHelp: () => void;
    user: firebase.User | null;
    orders: Order[];
}

export const CustomerPortalModal: React.FC<CustomerPortalModalProps> = ({ isOpen, onClose, onLogout, onHelp, user, orders }) => {
    if (!isOpen || !user) return null;

    const handleLogout = () => {
        onLogout();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-brand-ivory-50 rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <div>
                        <h2 className="text-2xl font-bold text-text-on-light"><i className="fas fa-user-circle mr-2"></i>Minha Conta</h2>
                        <p className="text-sm text-gray-600">Olá, {user.displayName || user.email}!</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <div className="overflow-y-auto p-6 flex-grow">
                    <h3 className="text-xl font-bold mb-4">Meus Pedidos</h3>
                    {orders.length === 0 ? (
                        <div className="text-center py-12">
                            <i className="fas fa-receipt text-5xl text-gray-300 mb-4"></i>
                            <p className="text-lg font-semibold text-gray-600">Nenhum pedido encontrado.</p>
                            <p className="text-gray-500">Que tal uma pizza hoje?</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {orders.map(order => (
                                <CustomerOrderCard key={order.id} order={order} />
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex justify-between items-center p-4 bg-white border-t rounded-b-2xl">
                    <button onClick={onHelp} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">
                        <i className="fas fa-question-circle mr-2"></i>Ajuda
                    </button>
                    <button onClick={handleLogout} className="bg-red-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-600">
                        <i className="fas fa-sign-out-alt mr-2"></i>Sair
                    </button>
                </div>
            </div>
        </div>
    );
};
