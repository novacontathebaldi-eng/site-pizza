

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
    suggestedNextCategoryId: string | null;
    setSuggestedNextCategoryId: (id: string | null) => void;
    cartItemCount: number;
    onCartClick: () => void;
}

const categoryIcons: { [key: string]: string } = {
    'pizzas-salgadas': 'fas fa-pizza-slice',
    'pizzas-doces': 'fas fa-birthday-cake',
    'bebidas': 'fas fa-glass-water',
    'sobremesas': 'fas fa-ice-cream',
    'aperitivos': 'fas fa-drumstick-bite'
};

export const MenuSection: React.FC<MenuSectionProps> = ({ categories, products, onAddToCart, isStoreOnline, activeCategoryId, setActiveCategoryId, suggestedNextCategoryId, setSuggestedNextCategoryId, cartItemCount, onCartClick }) => {

    const filteredProducts = useMemo(() => 
        products.filter(p => p.categoryId === activeCategoryId && p.active),
        [products, activeCategoryId]
    );

    const sortedCategories = useMemo(() => 
        [...categories].sort((a, b) => a.order - b.order),
        [categories]
    );
    
    const sortedActiveCategories = useMemo(() => 
        sortedCategories.filter(c => c.active),
        [sortedCategories]
    );

    const lastCategoryId = sortedActiveCategories.length > 0 
        ? sortedActiveCategories[sortedActiveCategories.length - 1].id 
        : null;

    const showFinalizeButton = activeCategoryId === lastCategoryId && cartItemCount > 0 && !suggestedNextCategoryId;

    const scrollToProductList = () => {
        const productList = document.getElementById('category-product-list');
        const stickyHeader = document.getElementById('sticky-menu-header');
        if (productList && stickyHeader) {
            const headerOffset = stickyHeader.offsetHeight + 80; // 80 for main header
            const elementPosition = productList.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
        }
    };

    const handleCategoryClick = (id: string) => {
        setActiveCategoryId(id);
        setSuggestedNextCategoryId(null); // Clear suggestion on manual navigation
        setTimeout(scrollToProductList, 100); // Small delay to allow UI to update
    };

    const handleSuggestionClick = () => {
        if (suggestedNextCategoryId) {
            setActiveCategoryId(suggestedNextCategoryId);
            setSuggestedNextCategoryId(null);
            setTimeout(scrollToProductList, 100);
        }
    };


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
                
                <div id="sticky-menu-header" className="sticky top-20 bg-white/95 backdrop-blur-sm z-30 -mx-4 shadow-sm">
                    <div id="menu-filters-container" className="px-4 pt-4 pb-4">
                        <div className="flex justify-center flex-wrap gap-3">
                            {sortedCategories.filter(c => c.active).map(category => (
                                <button 
                                    key={category.id} 
                                    onClick={() => handleCategoryClick(category.id)}
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
                    
                    {(suggestedNextCategoryId || showFinalizeButton) && (
                        <div className="text-center py-3 border-t border-gray-200 animate-fade-in-up">
                            {suggestedNextCategoryId && (
                                <div className="relative inline-flex items-center group">
                                    <button
                                        onClick={handleSuggestionClick}
                                        className="bg-accent text-white font-bold py-2 pl-6 pr-12 rounded-lg shadow-lg transition-all transform hover:scale-105"
                                    >
                                        Avançar para a Próxima Etapa
                                        <i className="fas fa-arrow-right ml-2"></i>
                                    </button>
                                    <button
                                        onClick={() => setSuggestedNextCategoryId(null)}
                                        className="absolute top-1/2 -translate-y-1/2 right-0 w-10 h-full flex items-center justify-center text-white/70 hover:text-white rounded-r-lg opacity-50 group-hover:opacity-100 transition-opacity"
                                        aria-label="Dispensar sugestão"
                                    >
                                        &times;
                                    </button>
                                </div>
                            )}
                            {showFinalizeButton && (
                                <button
                                    onClick={onCartClick}
                                    className="bg-accent text-white font-bold py-2 px-6 rounded-lg shadow-lg transition-all transform hover:scale-105"
                                >
                                    <i className="fas fa-shopping-bag mr-2"></i>
                                    Finalizar e Ver Pedido
                                </button>
                            )}
                        </div>
                    )}
                </div>


                {filteredProducts.length > 0 ? (
                    <div id="category-product-list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-8">
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
                    <div id="category-product-list" className="text-center py-16 pt-8">
                         <i className="fas fa-utensils text-5xl text-gray-300 mb-4"></i>
                        <p className="text-xl text-gray-500">Nenhum item encontrado nesta categoria.</p>
                        <p className="text-gray-400 mt-2">Selecione outra categoria para ver mais delícias!</p>
                    </div>
                )}
            </div>
        </section>
    );
};