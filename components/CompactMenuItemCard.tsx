import React, { useMemo } from 'react';
import { Product } from '../types';

interface CompactMenuItemCardProps {
    product: Product;
    onShowDetails: (product: Product) => void;
    isStoreOnline: boolean;
    isInCart: boolean;
}

export const CompactMenuItemCard: React.FC<CompactMenuItemCardProps> = ({ product, onShowDetails, isStoreOnline, isInCart }) => {
    const isOutOfStock = product.stockStatus === 'out_of_stock';
    const isPromo = product.isPromotion && product.promotionalPrices && Object.values(product.promotionalPrices).some(p => typeof p === 'number' && p > 0);

    const priceDisplay = useMemo(() => {
        if (!product.prices || Object.keys(product.prices).length === 0) {
            return 'Indisponível';
        }

        const effectivePrices = isPromo && product.promotionalPrices && Object.keys(product.promotionalPrices).length > 0
            ? product.promotionalPrices
            : product.prices;
            
        // FIX: Added an explicit type predicate `(p): p is number` to the filter.
        // This ensures TypeScript correctly infers `prices` as `number[]`,
        // resolving an error where `Math.min` received `unknown` arguments.
        const prices = Object.values(effectivePrices).filter((p): p is number => typeof p === 'number' && p > 0);
        
        if (prices.length === 0) return 'Indisponível';

        const minPrice = Math.min(...prices);

        if (prices.length > 1) {
            return `a partir de ${minPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
        }
        return minPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    }, [product.prices, product.promotionalPrices, isPromo]);

    return (
        <button
            onClick={() => onShowDetails(product)}
            disabled={!isStoreOnline || isOutOfStock}
            className="w-full flex items-center gap-4 p-3 rounded-lg bg-white hover:bg-gray-50 transition-colors border disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <div className="relative flex-shrink-0">
                <img src={product.imageUrl} alt={product.name} className="w-16 h-16 rounded-md object-cover" />
                {isOutOfStock && <div className="absolute inset-0 bg-black/60 rounded-md flex items-center justify-center text-white text-xs font-bold">ESGOTADO</div>}
            </div>
            <div className="flex-grow text-left">
                <h4 className="font-bold text-text-on-light flex items-center gap-2">
                    {product.name}
                    {isInCart && <i className="fas fa-check-circle text-green-500 text-sm" title="Adicionado ao carrinho"></i>}
                </h4>
                <p className="text-sm font-semibold text-accent">{priceDisplay}</p>
            </div>
            <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-accent text-white rounded-full flex items-center justify-center">
                    <i className="fas fa-plus"></i>
                </div>
            </div>
        </button>
    );
};