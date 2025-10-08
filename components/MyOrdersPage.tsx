import React, { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import * as firebaseService from '../services/firebaseService.ts';
import { Order } from '../types.ts';
import { OrderCardClient } from './OrderCardClient.tsx';

interface MyOrdersPageProps {
    currentUser: firebase.User | null;
}

export const MyOrdersPage: React.FC<MyOrdersPageProps> = ({ currentUser }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (currentUser) {
            setIsLoading(true);
            const unsubscribe = firebaseService.getOrdersByUserId(
                currentUser.uid,
                (fetchedOrders) => {
                    setOrders(fetchedOrders);
                    setIsLoading(false);
                },
                (err) => {
                    console.error(err);
                    setError("Não foi possível carregar seus pedidos.");
                    setIsLoading(false);
                }
            );
            return () => unsubscribe();
        } else {
            setIsLoading(false);
        }
    }, [currentUser]);

    const renderContent = () => {
        if (isLoading) {
            return <div className="text-center py-16"><i className="fas fa-spinner fa-spin text-4xl text-accent"></i></div>;
        }
        if (error) {
            return <div className="text-center py-16 text-red-500">{error}</div>;
        }
        if (orders.length === 0) {
            return (
                <div className="text-center py-16">
                    <i className="fas fa-receipt text-6xl text-gray-300 mb-4"></i>
                    <h3 className="text-2xl font-semibold text-gray-700">Nenhum pedido encontrado</h3>
                    <p className="text-gray-500 mt-2">Você ainda não fez nenhum pedido. Que tal uma pizza hoje?</p>
                    <a href="#cardapio" className="mt-6 inline-block bg-accent text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-opacity-90 transition-all">
                        Ver Cardápio
                    </a>
                </div>
            );
        }
        return (
            <div className="space-y-6">
                {orders.map(order => (
                    <OrderCardClient key={order.id} order={order} />
                ))}
            </div>
        );
    };

    return (
        <section id="meus-pedidos" className="py-20 bg-brand-ivory-50 min-h-screen">
            <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-bold text-text-on-light">Meus Pedidos</h2>
                        <p className="text-lg text-gray-600 mt-2">Acompanhe seu histórico e o status dos seus pedidos atuais.</p>
                    </div>
                    {renderContent()}
                </div>
            </div>
        </section>
    );
};
