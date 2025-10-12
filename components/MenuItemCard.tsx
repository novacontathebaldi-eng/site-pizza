import React, { useState, useMemo } from 'react';
import { Product } from '../types';

interface MenuItemCardProps {
    product: Product;
    onAddToCart: (product: Product, size: string, price: number) => void;
    isStoreOnline: boolean;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({ product, onAddToCart, isStoreOnline }) => {
    const isOutOfStock = product.stockStatus === 'out_of_stock';
    const sizes = useMemo(() => Object.keys(product.prices), [product.prices]);
    const [selectedSize, setSelectedSize] = useState(sizes[0] || '');

    const price = product.prices[selectedSize];

    const handleAddToCart = () => {
        if (!isStoreOnline || isOutOfStock || price === undefined) return;
        onAddToCart(product, selectedSize, price);
    };

    const formatPrice = (value: number) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    return (
        <div className={`bg-brand-ivory-50 rounded-2xl shadow-md hover:shadow-lg transition-shadow flex flex-col border border-brand-green-300/50 ${isOutOfStock ? 'opacity-50' : ''}`}>
            <div className="relative">
                <img src={product.imageUrl} alt={product.name} className="w-full h-48 object-cover rounded-t-2xl" loading="lazy" />
                {product.badge && (
                    <span className="absolute top-3 right-3 bg-accent text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                        {product.badge}
                    </span>
                )}
                 {isOutOfStock && (
                    <div className="absolute inset-0 bg-black/60 rounded-t-2xl flex items-center justify-center">
                        <span className="text-white font-bold text-lg bg-red-600 px-4 py-2 rounded-lg transform -rotate-6">ESGOTADO</span>
                    </div>
                )}
            </div>
            <div className="p-4 flex-grow flex flex-col">
                <h3 className="text-lg font-bold text-text-on-light mb-2">{product.name}</h3>
                <p className="text-sm text-gray-600 mb-4 flex-grow">{product.description}</p>

                {sizes.length > 1 && (
                    <div className="mb-4">
                        <p className="text-sm font-semibold mb-2">Tamanho:</p>
                        <div className="flex flex-wrap gap-2">
                            {sizes.map(size => (
                                <button
                                    key={size}
                                    onClick={() => setSelectedSize(size)}
                                    className={`px-3 py-1 text-sm font-semibold rounded-full border-2 transition-colors ${
                                        selectedSize === size
                                            ? 'bg-accent text-white border-accent'
                                            : 'bg-white text-gray-700 border-gray-300 hover:border-accent'
                                    }`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center mt-auto pt-4 border-t border-brand-green-300/30">
                    <span className="text-2xl font-bold text-accent">
                        {price !== undefined ? formatPrice(price) : '...'}
                    </span>
                    <button
                        onClick={handleAddToCart}
                        disabled={!isStoreOnline || isOutOfStock || price === undefined}
                        className="bg-accent text-white font-bold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-all transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:scale-100"
                    >
                         <i className={`fas ${!isStoreOnline ? 'fa-clock' : isOutOfStock ? 'fa-box' : 'fa-plus'} mr-2`}></i>
                        {!isStoreOnline ? 'Fechado' : isOutOfStock ? 'Esgotado' : 'Adicionar'}
                    </button>
                </div>
            </div>
        </div>
    );
};
