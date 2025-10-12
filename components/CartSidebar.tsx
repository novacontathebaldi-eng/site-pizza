import React from 'react';
import { CartItem } from '../types';

interface CartSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    cartItems: CartItem[];
    onUpdateQuantity: (cartItemId: string, newQuantity: number) => void;
    onRemoveItem: (cartItemId: string) => void;
    onCheckout: () => void;
    isStoreOnline: boolean;
}

export const CartSidebar: React.FC<CartSidebarProps> = ({ isOpen, onClose, cartItems, onUpdateQuantity, onRemoveItem, onCheckout, isStoreOnline }) => {
    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const handleQuantityChange = (item: CartItem, delta: number) => {
        const newQuantity = item.quantity + delta;
        if (newQuantity > 0) {
            onUpdateQuantity(item.id, newQuantity);
        } else {
            onRemoveItem(item.id);
        }
    };

    return (
        <>
            <div 
                className={`fixed inset-0 bg-black/60 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            ></div>
            <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-brand-ivory-50 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    <div className="flex justify-between items-center p-5 border-b bg-white">
                        <h2 className="text-2xl font-bold text-text-on-light"><i className="fas fa-shopping-cart mr-2"></i>Seu Pedido</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                    </div>

                    {cartItems.length === 0 ? (
                        <div className="flex-grow flex flex-col items-center justify-center text-center p-6">
                            <i className="fas fa-shopping-bag text-6xl text-gray-300 mb-4"></i>
                            <p className="text-lg font-semibold text-gray-700">Seu carrinho está vazio</p>
                            <p className="text-gray-500">Adicione itens do cardápio para começar.</p>
                            <button onClick={onClose} className="mt-6 bg-accent text-white font-bold py-2 px-6 rounded-lg hover:bg-opacity-90">
                                Ver Cardápio
                            </button>
                        </div>
                    ) : (
                        <div className="flex-grow overflow-y-auto p-4 space-y-4">
                            {cartItems.map(item => (
                                <div key={item.id} className="flex items-center gap-4 bg-white p-3 rounded-lg shadow-sm">
                                    <img src={item.imageUrl} alt={item.name} className="w-20 h-20 object-cover rounded-md flex-shrink-0" />
                                    <div className="flex-grow">
                                        <p className="font-bold">{item.name}</p>
                                        <p className="text-sm text-gray-500">{item.size}</p>
                                        <p className="font-semibold text-accent mt-1">{item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="flex items-center border rounded-md">
                                            <button onClick={() => handleQuantityChange(item, -1)} className="w-7 h-7 font-bold text-lg text-gray-600 hover:bg-gray-100">-</button>
                                            <span className="w-8 text-center font-semibold">{item.quantity}</span>
                                            <button onClick={() => handleQuantityChange(item, 1)} className="w-7 h-7 font-bold text-lg text-gray-600 hover:bg-gray-100">+</button>
                                        </div>
                                        <button onClick={() => onRemoveItem(item.id)} className="text-xs text-red-500 hover:underline">Remover</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {cartItems.length > 0 && (
                        <div className="p-5 border-t bg-white">
                            <div className="flex justify-between font-bold text-xl mb-4">
                                <span>Total:</span>
                                <span>{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                            <button 
                                onClick={onCheckout}
                                disabled={!isStoreOnline}
                                className="w-full bg-accent text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-opacity-90 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {isStoreOnline ? (
                                    <>
                                        <i className="fas fa-check-circle mr-2"></i>
                                        Finalizar Pedido
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-clock mr-2"></i>
                                        Pizzaria Fechada
                                    </>
                                )}
                            </button>
                             <button onClick={onClose} className="w-full text-center mt-3 text-gray-600 font-semibold hover:underline">
                                Continuar Comprando
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
