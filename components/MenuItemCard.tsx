
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
        <div className="bg-brand-ivory-50 rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col overflow-hidden border border-brand-green-300/50">
            <div className="relative">
                <img src={product.imageUrl} alt={product.name} className="w-full h-52 object-cover" />
                {product.badge && (
                    <span className="absolute top-3 right-3 bg-accent text-white px-3 py-1 text-xs font-bold rounded-full">{product.badge}</span>
                )}
            </div>
            <div className="p-5 flex flex-col flex-grow">
                <h3 className="text-xl font-bold text-text-on-light mb-2">{product.name}</h3>
                <p className="text-gray-600 text-sm flex-grow mb-4">{product.description}</p>
                
                {sortedSizes.length > 1 && (
                    <div className="mb-4">
                        <p className="text-sm font-semibold mb-2 text-gray-700">Tamanhos:</p>
                        <div className="flex flex-wrap gap-2">
                            {sortedSizes.map(size => (
                                <button
                                    key={size}
                                    onClick={() => setSelectedSize(size)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border-2 transition-colors ${
                                        selectedSize === size
                                            ? 'bg-brand-olive-600 text-white border-brand-olive-600'
                                            : 'bg-white text-gray-700 border-gray-300 hover:border-brand-olive-600'
                                    }`}
                                >
                                    {size} - {formatPrice(product.prices[size])}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-auto pt-4 flex justify-between items-center">
                    <span className="text-2xl font-bold text-accent">
                        {formatPrice(product.prices[selectedSize] || Object.values(product.prices)[0])}
                    </span>
                    <button 
                        onClick={handleAddToCart}
                        disabled={!isStoreOnline}
                        className="bg-accent text-white font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:scale-100"
                    >
                        <i className={`fas ${isStoreOnline ? 'fa-plus' : 'fa-clock'} mr-2`}></i>
                        {isStoreOnline ? 'Adicionar' : 'Fechado'}
                    </button>
                </div>
            </div>
        </div>
    );
};