import React, { useState } from 'react';
import * as firebaseService from '../services/firebaseService.ts';
import { Order } from '../types.ts';
import { OrderCardClient } from './OrderCardClient.tsx';

export const TrackOrderPage: React.FC = () => {
    const [orderId, setOrderId] = useState('');
    const [searchedOrder, setSearchedOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orderId.trim()) return;

        setIsLoading(true);
        setError(null);
        setSearchedOrder(null);
        
        try {
            const order = await firebaseService.getOrderById(orderId.trim());
            if (order) {
                setSearchedOrder(order);
            } else {
                setError("Pedido não encontrado. Verifique o código e tente novamente.");
            }
        } catch (err) {
            console.error(err);
            setError("Ocorreu um erro ao buscar seu pedido. Tente novamente mais tarde.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <section id="acompanhar-pedido" className="py-20 bg-brand-ivory-50 min-h-screen">
            <div className="container mx-auto px-4">
                <div className="max-w-2xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-bold text-text-on-light">Acompanhar Pedido</h2>
                        <p className="text-lg text-gray-600 mt-2">Insira o código do seu pedido para ver o status em tempo real.</p>
                    </div>

                    <div className="bg-white p-8 rounded-2xl shadow-lg border">
                        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-6">
                            <input
                                type="text"
                                value={orderId}
                                onChange={(e) => setOrderId(e.target.value)}
                                placeholder="Digite o código do pedido"
                                className="flex-grow w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-accent"
                                required
                            />
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="bg-accent text-white font-bold py-3 px-8 rounded-lg hover:bg-opacity-90 disabled:bg-opacity-70 flex items-center justify-center"
                            >
                                {isLoading ? (
                                    <i className="fas fa-spinner fa-spin"></i>
                                ) : (
                                    <><i className="fas fa-search mr-2"></i> Buscar</>
                                )}
                            </button>
                        </form>

                        {error && (
                             <div className="text-center p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
                                {error}
                            </div>
                        )}
                        
                        {searchedOrder && (
                            <div className="mt-8 animate-fade-in-up">
                                <OrderCardClient order={searchedOrder} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};
