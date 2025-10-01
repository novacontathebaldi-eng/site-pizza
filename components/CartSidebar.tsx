

import React, { useMemo } from 'react';
import { CartItem, Category, Product } from '../types';

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

export const CartSidebar: React.FC<CartSidebarProps> = ({ isOpen, onClose, cartItems, onUpdateQuantity, onCheckout, isStoreOnline, categories, products, setActiveCategoryId }) => {
    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    const suggestion = useMemo(() => {
        if (!products.length || !categories.length || !cartItems.length) {
            return null;
        }

        const productMap = new Map(products.map(p => [p.id, p]));

        const findCategoryByKeywords = (keywords: string[]) => {
            return categories.find(c => keywords.some(kw => c.name.toLowerCase().includes(kw)));
        };
        
        const foodCategoryIds = categories
            .filter(c => c.name.toLowerCase().includes('pizzas salgadas') || c.name.toLowerCase().includes('aperitivos'))
            .map(c => c.id);
        
        const drinksCategory = findCategoryByKeywords(['bebidas']);
        const dessertsCategory = findCategoryByKeywords(['sobremesas']);

        let hasFoodItem = false;
        let hasDrink = false;
        let hasDessert = false;

        for (const item of cartItems) {
            const product = productMap.get(item.productId);
            if (product) {
                if (foodCategoryIds.includes(product.categoryId)) {
                    hasFoodItem = true;
                }
                if (drinksCategory && product.categoryId === drinksCategory.id) {
                    hasDrink = true;
                }
                if (dessertsCategory && product.categoryId === dessertsCategory.id) {
                    hasDessert = true;
                }
            }
        }

        // Priority 1: Suggest drinks
        if (hasFoodItem && !hasDrink && drinksCategory) {
            return {
                text: "Que tal uma bebida para acompanhar?",
                buttonText: "Ver Bebidas",
                targetCategoryId: drinksCategory.id
            };
        }

        // Priority 2: Suggest desserts
        if (hasFoodItem && !hasDessert && dessertsCategory) {
             return {
                text: "Gostaria de uma sobremesa para finalizar?",
                buttonText: "Ver Sobremesas",
                targetCategoryId: dessertsCategory.id
            };
        }

        return null;
    }, [cartItems, products, categories]);
    
    const handleSuggestionClick = () => {
        if (suggestion) {
            onClose();
            setActiveCategoryId(suggestion.targetCategoryId);
            
            // Scroll to menu section after cart animation
            setTimeout(() => {
                const menuElement = document.getElementById('cardapio');
                if (menuElement) {
                    const headerOffset = 80; // Main header height
                    const elementPosition = menuElement.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                    
                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            }, 300); // 300ms to match cart transition duration
        }
    };


    return (
        <>
            <div className={`fixed inset-0 bg-black/60 z-50 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}></div>
            <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
                <div className="flex justify-between items-center p-5 border-b border-gray-200 bg-brand-ivory-50">
                    <h2 className="text-2xl font-bold text-text-on-light flex items-center gap-2"><i className="fas fa-shopping-cart"></i>Seu Pedido</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>

                {cartItems.length === 0 ? (
                    <div className="flex-grow flex flex-col items-center justify-center text-center p-8">
                        <i className="fas fa-shopping-cart text-6xl text-gray-300 mb-4"></i>
                        <h3 className="text-xl font-semibold text-gray-700">Seu carrinho está vazio</h3>
                        <p className="text-gray-500 mt-2">Adicione pizzas deliciosas para começar!</p>
                    </div>
                ) : (
                    <div className="flex-grow overflow-y-auto p-5 space-y-4">
                        {cartItems.map(item => (
                            <div key={item.id} className="flex items-center gap-4">
                                <img src={item.imageUrl} alt={item.name} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
                                <div className="flex-grow">
                                    <p className="font-bold text-text-on-light">{item.name}</p>
                                    <p className="text-sm text-gray-500">{item.size}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        {item.quantity > 1 ? (
                                            <button onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} className="w-7 h-7 bg-gray-200 rounded-md font-bold">-</button>
                                        ) : (
                                            <button onClick={() => onUpdateQuantity(item.id, 0)} className="w-7 h-7 bg-red-100 text-red-600 rounded-md flex items-center justify-center hover:bg-red-200 transition-colors" aria-label="Remover item">
                                                <i className="fas fa-trash-alt text-sm"></i>
                                            </button>
                                        )}
                                        <span className="w-8 text-center font-semibold">{item.quantity}</span>
                                        <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} className="w-7 h-7 bg-gray-200 rounded-md font-bold">+</button>
                                    </div>
                                </div>
                                <p className="font-bold text-lg text-accent">
                                    {(item.price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {cartItems.length > 0 && (
                    <div className="p-5 border-t border-gray-200 bg-brand-ivory-50">
                        {suggestion && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center mb-4">
                                <p className="text-sm text-yellow-800 font-medium mb-2">
                                    <i className="fas fa-lightbulb mr-2"></i>
                                    {suggestion.text}
                                </p>
                                <button
                                    onClick={handleSuggestionClick}
                                    className="bg-accent text-white font-bold py-2 px-4 rounded-lg text-sm transition-all transform hover:scale-105"
                                >
                                    {suggestion.buttonText}
                                </button>
                            </div>
                        )}
                        <div className="flex justify-between items-center mb-4 text-lg">
                            <span className="font-semibold text-gray-700">Total ({totalItems} {totalItems > 1 ? 'itens' : 'item'}):</span>
                            <span className="font-bold text-2xl text-accent">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                        <button 
                            onClick={onCheckout} 
                            disabled={!isStoreOnline}
                            className="w-full bg-accent text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-opacity-90 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            <i className={`fas ${isStoreOnline ? 'fa-check-circle' : 'fa-clock'} mr-2`}></i>
                            {isStoreOnline ? 'Finalizar Pedido' : 'Loja Fechada'}
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};