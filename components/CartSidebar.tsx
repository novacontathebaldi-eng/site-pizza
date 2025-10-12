import React, { useMemo } from 'react';
import { CartItem, Product, Category } from '../types';

interface CartSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    cartItems: CartItem[];
    onUpdateQuantity: (itemId: string, newQuantity: number) => void;
    onCheckout: () => void;
    isStoreOnline: boolean;
    categories: Category[];
    products: Product[];
    setActiveCategoryId: (id: string) => void;
}

const CartItemRow: React.FC<{ item: CartItem; onUpdateQuantity: (itemId: string, newQuantity: number) => void }> = ({ item, onUpdateQuantity }) => {
    return (
        <div className="flex items-center gap-4 py-3 border-b">
            <img src={item.imageUrl} alt={item.name} className="w-16 h-16 object-cover rounded-md" />
            <div className="flex-grow">
                <p className="font-bold">{item.name}</p>
                <p className="text-sm text-gray-600">{item.size}</p>
                <div className="flex items-center gap-2 mt-1">
                    <button onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} className="w-6 h-6 border rounded-md text-gray-700 hover:bg-gray-100">-</button>
                    <span className="font-semibold w-6 text-center">{item.quantity}</span>
                    <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} className="w-6 h-6 border rounded-md text-gray-700 hover:bg-gray-100">+</button>
                </div>
            </div>
            <p className="font-semibold">{(item.price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        </div>
    );
};

export const CartSidebar: React.FC<CartSidebarProps> = ({
    isOpen,
    onClose,
    cartItems,
    onUpdateQuantity,
    onCheckout,
    isStoreOnline,
    categories,
    products,
    setActiveCategoryId
}) => {
    const total = useMemo(() => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0), [cartItems]);

    const handleContinueShopping = (categoryId: string) => {
        setActiveCategoryId(categoryId);
        onClose();
        const menuSection = document.getElementById('cardapio');
        if (menuSection) {
            const headerOffset = 80 + 50; // Main header + sticky tabs
            const elementPosition = menuSection.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
    };

    const popularProducts = useMemo(() => {
        return products.filter(p => p.badge === 'Popular' && p.active).slice(0, 3);
    }, [products]);


    return (
        <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {/* Overlay */}
            <div onClick={onClose} className="absolute inset-0 bg-black/60"></div>

            {/* Sidebar */}
            <div className={`absolute top-0 right-0 h-full w-full max-w-md bg-brand-ivory-50 shadow-2xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
                <header className="flex justify-between items-center p-5 border-b bg-white">
                    <h2 className="text-2xl font-bold text-text-on-light"><i className="fas fa-shopping-cart mr-2"></i>Seu Pedido</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </header>

                <div className="flex-grow overflow-y-auto p-5">
                    {cartItems.length > 0 ? (
                        <div>
                            {cartItems.map(item => (
                                <CartItemRow key={item.id} item={item} onUpdateQuantity={onUpdateQuantity} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10">
                            <i className="fas fa-shopping-bag text-5xl text-gray-300 mb-4"></i>
                            <h3 className="text-xl font-semibold text-gray-700">Sua sacola está vazia</h3>
                            <p className="text-gray-500 mt-2">Adicione itens do nosso cardápio para começar.</p>
                             {popularProducts.length > 0 && (
                                <div className="mt-8 pt-6 border-t">
                                    <h4 className="font-bold text-lg mb-4 text-left">Sugestões para você:</h4>
                                    <div className="space-y-3 text-left">
                                        {popularProducts.map(p => (
                                             <div key={p.id} onClick={() => handleContinueShopping(p.categoryId)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors border">
                                                <img src={p.imageUrl} alt={p.name} className="w-12 h-12 object-cover rounded-md"/>
                                                <div>
                                                    <p className="font-semibold">{p.name}</p>
                                                    <p className="text-sm text-gray-500">A partir de {Object.values(p.prices)[0].toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {cartItems.length > 0 && (
                    <footer className="p-5 border-t bg-white shadow-inner">
                        <div className="flex justify-between font-bold text-lg mb-4">
                            <span>Subtotal:</span>
                            <span>{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                        <button 
                            onClick={onCheckout}
                            disabled={!isStoreOnline}
                            className="w-full bg-accent text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-opacity-90 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                             <i className="fab fa-whatsapp mr-2"></i>
                            {isStoreOnline ? 'Finalizar Pedido' : 'Loja Fechada'}
                        </button>
                    </footer>
                )}
            </div>
        </div>
    );
};
