
import React, { useState, useEffect } from 'react';
import { Order } from '../types';
import { OrderCardClient } from './OrderCardClient';
import * as firebaseService from '../services/firebaseService';
import firebase from 'firebase/compat/app';

interface MyOrdersPageProps {
    currentUser: firebase.User | null;
}

export const MyOrdersPage: React.FC<MyOrdersPageProps> = ({ currentUser }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (currentUser) {
            setIsLoading(true);
            const unsubscribe = firebaseService.onUserOrdersChange(currentUser.uid, (userOrders) => {
                setOrders(userOrders);
                setIsLoading(false);
            });
            return () => unsubscribe();
        } else {
            setIsLoading(false);
        }
    }, [currentUser]);

    const goHome = () => window.location.hash = '#inicio';

    if (isLoading) {
        return (
            <section id="meus-pedidos" className="py-20 bg-brand-ivory-50 min-h-screen">
                <div className="container mx-auto px-4 text-center">
                    <i className="fas fa-spinner fa-spin text-4xl text-accent"></i>
                </div>
            </section>
        );
    }
    
    if (!currentUser) {
        return (
             <section id="meus-pedidos" className="py-20 bg-brand-ivory-50 min-h-screen">
                <div className="container mx-auto px-4 text-center max-w-lg">
                     <i className="fas fa-sign-in-alt text-5xl text-gray-300 mb-4"></i>
                    <h2 className="text-3xl font-bold text-text-on-light mb-4">Acesse sua Conta</h2>
                    <p className="text-gray-600 mb-6">Para ver seus pedidos, você precisa estar logado.</p>
                    <button onClick={goHome} className="bg-accent text-white font-bold py-3 px-8 rounded-xl text-lg hover:bg-opacity-90 transition-all">
                        Voltar para o Início
                    </button>
                </div>
            </section>
        );
    }

    return (
        <section id="meus-pedidos" className="py-20 bg-brand-ivory-50 min-h-screen">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-4xl font-bold text-text-on-light">Meus Pedidos</h2>
                     <a href="#inicio" onClick={goHome} className="text-accent font-semibold hover:underline">
                        <i className="fas fa-arrow-left mr-2"></i>Voltar
                    </a>
                </div>

                {orders.length > 0 ? (
                    <div className="space-y-6">
                        {orders.map(order => (
                            <OrderCardClient key={order.id} order={order} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-white rounded-lg shadow-md">
                        <i className="fas fa-receipt text-6xl text-gray-300 mb-4"></i>
                        <h3 className="text-2xl font-semibold text-gray-700">Nenhum pedido encontrado</h3>
                        <p className="text-gray-500 mt-2">Você ainda não fez nenhum pedido. Que tal uma pizza?</p>
                    </div>
                )}
            </div>
        </section>
    );
};
