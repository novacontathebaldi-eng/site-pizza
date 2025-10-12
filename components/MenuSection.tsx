import React, { useMemo, useEffect, useRef } from 'react';
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

const categoryIcons: { [key: string]: string } = {
    'pizzas-salgadas': 'fas fa-pizza-slice',
    'pizzas-doces': 'fas fa-birthday-cake',
    'bebidas': 'fas fa-glass-water',
    'sobremesas': 'fas fa-ice-cream',
    'aperitivos': 'fas fa-drumstick-bite'
};

export const MenuSection: React.FC<MenuSectionProps> = ({ 
    categories, products, onAddToCart, isStoreOnline, 
    activeCategoryId, setActiveCategoryId, 
    cartItemCount, onCartClick
}) => {
    const categoryRefs = useRef<Map<string, HTMLElement | null>>(new Map());
    const tabRefs = useRef<Map<string, HTMLAnchorElement | null>>(new Map());

    const sortedActiveCategories = useMemo(() => 
        [...categories].filter(c => c.active).sort((a, b) => a.order - b.order),
        [categories]
    );

    // Effect for the main scroll-spy functionality (updates active tab based on page scroll)
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveCategoryId(entry.target.id.replace('category-section-', ''));
                    }
                });
            },
            {
                rootMargin: '-120px 0px -50% 0px', // Top offset for sticky header, bottom to trigger earlier
                threshold: 0,
            }
        );

        const currentRefs = categoryRefs.current;
        currentRefs.forEach((el) => {
            if (el) observer.observe(el);
        });

        return () => {
            currentRefs.forEach((el) => {
                if (el) observer.unobserve(el);
            });
            observer.disconnect();
        };
    }, [sortedActiveCategories, setActiveCategoryId]);

    // New Effect: Automatically scrolls the active tab to the center of the tab bar
    useEffect(() => {
        const activeTab = tabRefs.current.get(activeCategoryId);
        if (activeTab) {
            activeTab.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }, [activeCategoryId]);

    const handleTabClick = (e: React.MouseEvent<HTMLAnchorElement>, categoryId: string) => {
        e.preventDefault();
        const element = document.getElementById(`category-section-${categoryId}`);
        const stickyHeader = document.getElementById('sticky-menu-header');
        
        if (element && stickyHeader) {
            const headerOffset = stickyHeader.offsetHeight + 80; // Main header + sticky menu header
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
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
                    <div className="border-b border-gray-200">
                        <div className="flex overflow-x-auto whitespace-nowrap scrollbar-hide px-2 sm:px-4 lg:flex-wrap lg:justify-center lg:overflow-x-visible">
                            {sortedActiveCategories.map(category => (
                                <a 
                                    key={category.id} 
                                    // FIX: The ref callback was incorrectly returning a Map object.
                                    // It has been wrapped in a block body `{}` to ensure it returns `void`,
                                    // which is the expected return type for a ref callback.
                                    ref={(el) => { tabRefs.current.set(category.id, el); }}
                                    href={`#category-section-${category.id}`}
                                    onClick={(e) => handleTabClick(e, category.id)}
                                    className={`flex-shrink-0 inline-flex items-center gap-2 py-3 px-4 font-semibold text-sm transition-colors
                                        ${activeCategoryId === category.id 
                                            ? 'border-b-2 border-accent text-accent' 
                                            : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    <i className={`${categoryIcons[category.id] || 'fas fa-utensils'} w-5 text-center`}></i>
                                    <span>{category.name}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="pt-8 space-y-12">
                    {sortedActiveCategories.map(category => {
                        const categoryProducts = products.filter(p => p.categoryId === category.id && p.active);
                        if (categoryProducts.length === 0) return null;

                        return (
                            <div 
                                key={category.id} 
                                id={`category-section-${category.id}`} 
                                ref={(el) => { categoryRefs.current.set(category.id, el); }}
                            >
                                <h3 className="text-3xl font-bold text-brand-olive-600 mb-6 border-l-4 border-accent pl-4">{category.name}</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {categoryProducts.map(product => (
                                        <MenuItemCard 
                                            key={product.id} 
                                            product={product} 
                                            onAddToCart={onAddToCart}
                                            isStoreOnline={isStoreOnline}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {cartItemCount > 0 && (
                     <div className="mt-16 text-center">
                        <button
                            onClick={onCartClick}
                            className="bg-accent text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-all transform hover:scale-105 text-lg"
                        >
                            <i className="fas fa-shopping-bag mr-2"></i>
                            Ver e Finalizar o Pedido ({cartItemCount})
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
};