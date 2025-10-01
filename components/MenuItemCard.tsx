
import React, { useState, useMemo } from 'react';
import { Product } from '../types';

interface MenuItemCardProps {
    product: Product;
    onAddToCart: (product: Product, size: string, price: number) => void;
    isStoreOnline: boolean;
}

const sizeOrder = ['P', 'M', 'G', 'Única'];

export const MenuItemCard: React.FC<MenuItemCardProps> = ({ product, onAddToCart, isStoreOnline }) => {
    const sortedSizes = useMemo(() => {
        return Object.keys(product.prices).sort((a, b) => {
            const indexA = sizeOrder.indexOf(a);
            const indexB = sizeOrder.indexOf(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
    }, [product.prices]);

    const [selectedSize, setSelectedSize] = useState<string>(sortedSizes[0] || '');
    
    const handleAddToCart = () => {
        if (!isStoreOnline || !selectedSize) return;
        const price = product.prices[selectedSize];
        onAddToCart(product, selectedSize, price);
    };

    const formatPrice = (price: number) => {
        return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    return (
        <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col overflow-hidden border border-gray-200">
            <div className="relative">
                <img src={product.imageUrl} alt={product.name} className="w-full h-40 object-cover" />
                {product.badge && (
                    <span className="absolute top-2 right-2 bg-accent text-white px-2 py-0.5 text-xs font-bold rounded-full">{product.badge}</span>
                )}
            </div>
            <div className="p-4 flex flex-col flex-grow">
                <h3 className="text-lg font-bold text-text-on-light mb-1">{product.name}</h3>
                <p className="text-gray-500 text-xs flex-grow mb-3 line-clamp-2">{product.description}</p>
                
                {sortedSizes.length > 1 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                        {sortedSizes.map(size => (
                            <button
                                key={size}
                                onClick={() => setSelectedSize(size)}
                                className={`px-2 py-1 text-[11px] font-semibold rounded-md border transition-colors ${
                                    selectedSize === size
                                        ? 'bg-brand-olive-600 text-white border-brand-olive-600'
                                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:border-brand-olive-600'
                                }`}
                            >
                                {size}
                            </button>
                        ))}
                    </div>
                )}

                <div className="mt-auto pt-2 flex justify-between items-center">
                    <span className="text-xl font-bold text-accent">
                        {formatPrice(product.prices[selectedSize] || Object.values(product.prices)[0])}
                    </span>
                    <button 
                        onClick={handleAddToCart}
                        disabled={!isStoreOnline}
                        className="bg-accent text-white font-bold py-2 px-3 rounded-lg text-sm transition-all transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        <i className="fas fa-plus mr-1"></i>
                        Adicionar
                    </button>
                </div>
            </div>
        </div>
    );
};