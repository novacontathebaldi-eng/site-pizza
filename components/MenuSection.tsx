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
    cartItemCount: number;
    onCartClick: () => void;
}

export const MenuSection: React.FC<MenuSectionProps> = ({
    categories,
    products,
    onAddToCart,
    isStoreOnline,
    activeCategoryId,
    setActiveCategoryId,
}) => {
    const activeCategories = useMemo(() => categories.filter(c => c.active), [categories]);

    const filteredProducts = useMemo(() => {
        if (!activeCategoryId) return [];
        return products
            .filter(p => p.categoryId === activeCategoryId && p.active)
            .sort((a, b) => a.orderIndex - b.orderIndex);
    }, [products, activeCategoryId]);

    const handleCategoryClick = (id: string) => {
        setActiveCategoryId(id);
        const element = document.getElementById('cardapio');
        if (element) {
            const headerOffset = 80 + 50; // Main header + sticky tabs header
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            // Only scroll if the category tabs are already out of view
            if (element.getBoundingClientRect().top < headerOffset) {
                 window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        }
    }

    return (
        <section id="cardapio" className="py-20 bg-brand-ivory-50">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <span className="inline-block bg-brand-green-300 text-brand-green-700 px-4 py-2 rounded-full font-semibold text-sm mb-4">
                        <i className="fas fa-utensils mr-2"></i>Nosso Cardápio
                    </span>
                    <h2 className="text-4xl font-bold text-text-on-light">Pizzas Artesanais</h2>
                    <p className="text-lg text-gray-600 mt-2 max-w-2xl mx-auto">
                        Descubra os sabores que nos tornaram campeões.
                    </p>
                </div>

                {/* Sticky Category Tabs */}
                <div className="sticky top-20 bg-brand-ivory-50/95 backdrop-blur-sm z-30 mb-8 -mx-4 shadow-sm">
                    <div className="border-b border-gray-200">
                        <div className="flex overflow-x-auto whitespace-nowrap scrollbar-hide px-4">
                            {activeCategories.map(category => (
                                <button
                                    key={category.id}
                                    onClick={() => handleCategoryClick(category.id)}
                                    className={`flex-shrink-0 py-3 px-5 font-semibold text-sm transition-colors ${
                                        activeCategoryId === category.id
                                            ? 'border-b-2 border-accent text-accent'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    {category.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Products Grid */}
                {filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
                        <i className="fas fa-search text-4xl text-gray-400 mb-4"></i>
                        <p className="text-gray-600 font-semibold">Nenhum produto encontrado nesta categoria.</p>
                        <p className="text-gray-500 mt-1">Tente selecionar outra categoria.</p>
                    </div>
                )}
            </div>
        </section>
    );
};
