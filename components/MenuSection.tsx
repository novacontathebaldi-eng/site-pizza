
import React, { useMemo } from 'react';
import { Product, Category } from '../types';
import { MenuItemCard } from './MenuItemCard';

interface MenuSectionProps {
    categories: Category[];
    products: Product[];
    onAddToCart: (product: Product, size: string, price: number) => void;
    isStoreOnline: boolean;
    activeCategoryId: string;
    setActiveCategoryId: (id: string) => void;
}

const categoryIcons: { [key: string]: string } = {
    'pizzas-salgadas': 'fas fa-pizza-slice',
    'pizzas-doces': 'fas fa-birthday-cake',
    'bebidas': 'fas fa-glass-water',
    'sobremesas': 'fas fa-ice-cream',
    'aperitivos': 'fas fa-drumstick-bite'
};

export const MenuSection: React.FC<MenuSectionProps> = ({ categories, products, onAddToCart, isStoreOnline, activeCategoryId, setActiveCategoryId }) => {

    const filteredProducts = useMemo(() => 
        products.filter(p => p.categoryId === activeCategoryId && p.active),
        [products, activeCategoryId]
    );

    const sortedCategories = useMemo(() => 
        [...categories].sort((a, b) => a.order - b.order),
        [categories]
    );

    return (
        <section id="cardapio" className="py-20 bg-white">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                     <span className="inline-block bg-brand-green-300 text-brand-green-700 px-4 py-2 rounded-full font-semibold text-sm mb-4">
                        <i className="fas fa-pizza-slice mr-2"></i>Nosso Cardápio
                    </span>
                    <h2 className="text-4xl font-bold text-text-on-light">Sabores Únicos</h2>
                    <p className="text-lg text-gray-600 mt-2 max-w-2xl mx-auto">Descubra nossa seleção especial de pizzas artesanais, bebidas e sobremesas.</p>
                </div>
                
                <div id="menu-filters-container" className="sticky top-20 bg-white z-30 py-4 -mx-4 px-4 shadow-sm mb-10">
                    <div className="flex justify-center flex-wrap gap-3">
                        {sortedCategories.filter(c => c.active).map(category => (
                            <button 
                                key={category.id} 
                                onClick={() => setActiveCategoryId(category.id)}
                                className={`px-6 py-3 rounded-full font-semibold text-sm transition-all duration-300 flex items-center gap-2
                                    ${activeCategoryId === category.id 
                                        ? 'bg-brand-green-700 text-text-on-dark shadow-md' 
                                        : 'bg-brand-ivory-50 text-text-on-light hover:bg-brand-green-300'
                                    }`}
                            >
                                <i className={categoryIcons[category.id] || 'fas fa-utensils'}></i>
                                {category.name}
                            </button>
                        ))}
                    </div>
                </div>


                {filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredProducts.map(product => (
                            <MenuItemCard 
                                key={product.id} 
                                product={product} 
                                onAddToCart={onAddToCart}
                                isStoreOnline={isStoreOnline}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                         <i className="fas fa-utensils text-5xl text-gray-300 mb-4"></i>
                        <p className="text-xl text-gray-500">Nenhum item encontrado nesta categoria.</p>
                        <p className="text-gray-400 mt-2">Selecione outra categoria para ver mais delícias!</p>
                    </div>
                )}
            </div>
        </section>
    );
};