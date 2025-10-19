import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product } from '../types';

interface MenuItemCardProps {
    product: Product;
    onAddToCart: (product: Product, size: string, price: number) => void;
    isStoreOnline: boolean;
    isInCart: boolean;
}

const sizeOrder = ['P', 'M', 'G', 'Única'];

export const MenuItemCard: React.FC<MenuItemCardProps> = ({ product, onAddToCart, isStoreOnline, isInCart }) => {
    const prices = product.prices ?? {};
    const hasPrices = Object.keys(prices).length > 0;
    const isOutOfStock = product.stockStatus === 'out_of_stock';
    const isPromo = product.isPromotion && product.promotionalPrice != null && product.promotionalPrice > 0;


    const sortedSizes = useMemo(() => {
        if (!hasPrices) return [];
        return Object.keys(prices).sort((a, b) => {
            const indexA = sizeOrder.indexOf(a);
            const indexB = sizeOrder.indexOf(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
    }, [prices, hasPrices]);

    const [selectedSize, setSelectedSize] = useState<string>('');
    const [showSizeError, setShowSizeError] = useState(false);
    const [wasAdded, setWasAdded] = useState(false);
    
    const addedTimerRef = useRef<number | null>(null);
    const errorTimerRef = useRef<number | null>(null);

    // Auto-select size if there's only one option, otherwise reset.
    useEffect(() => {
        if (sortedSizes.length === 1) {
            setSelectedSize(sortedSizes[0]);
        } else {
            setSelectedSize('');
        }
    }, [product, sortedSizes]);

    // Cleanup timers on component unmount
    useEffect(() => {
        return () => {
            if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
            if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
        };
    }, []);
    
    const handleAddToCart = () => {
        if (!isStoreOnline || wasAdded || (!hasPrices && !isPromo) || isOutOfStock) return;
        
        // Validate size selection if multiple sizes are available
        if (hasPrices && sortedSizes.length > 1 && !selectedSize) {
            setShowSizeError(true);
            if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
            errorTimerRef.current = window.setTimeout(() => setShowSizeError(false), 2500);
            return;
        }

        const price = isPromo ? product.promotionalPrice! : prices[selectedSize];
        const size = selectedSize || 'Única';

        onAddToCart(product, size, price);
        setWasAdded(true);

        if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
        addedTimerRef.current = window.setTimeout(() => setWasAdded(false), 1500);
    };

    const handleSizeClick = (size: string) => {
        setSelectedSize(size);
        if (showSizeError) {
            setShowSizeError(false);
            if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
        }
    };

    const formatPrice = (price: number) => {
        return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const { priceText, originalPriceText } = useMemo(() => {
        let priceText: string;
        let originalPriceText: string | null = null;

        if (isPromo && product.promotionalPrice) {
            priceText = formatPrice(product.promotionalPrice);
            if (hasPrices && prices[selectedSize]) {
                originalPriceText = formatPrice(prices[selectedSize]);
            }
        } else if (hasPrices) {
            if (selectedSize) {
                priceText = formatPrice(prices[selectedSize]);
            } else if (sortedSizes.length > 1) {
                const minPrice = Math.min(...Object.values(prices));
                priceText = `A partir de ${formatPrice(minPrice)}`;
            } else if (sortedSizes.length === 1) {
                priceText = formatPrice(prices[sortedSizes[0]]);
            } else {
                priceText = "Indisponível";
            }
        } else {
            priceText = "Indisponível";
        }
        return { priceText, originalPriceText };
    }, [isPromo, product.promotionalPrice, hasPrices, prices, selectedSize, sortedSizes]);


    const buttonClass = wasAdded
        ? 'bg-green-500 text-white font-bold py-2 px-5 rounded-lg transition-all cursor-default'
        : 'bg-accent text-white font-bold py-2 px-5 rounded-lg transition-all transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed';

    return (
        <div className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden border border-gray-200`}>
            <div className="relative">
                {isPromo && (
                    <span className="absolute top-2 left-2 bg-red-600 text-white px-2 py-0.5 text-xs font-bold rounded-full flex items-center gap-1 z-10 animate-pulse">
                        <i className="fas fa-tags text-xs"></i> PROMO
                    </span>
                )}
                
                {isInCart ? (
                    <div className="absolute top-2 right-2 bg-green-600 text-white text-xs font-bold rounded-full flex items-center justify-center gap-1.5 z-10 shadow-md h-7 w-7 sm:w-auto sm:px-2.5">
                        <i className="fas fa-check"></i>
                        <span className="hidden sm:inline">Adicionado</span>
                    </div>
                ) : product.badge ? (
                    <span className="absolute top-2 right-2 bg-accent text-white px-2 py-0.5 text-xs font-bold rounded-full">
                        {product.badge}
                    </span>
                ) : null}

                <img src={product.imageUrl} alt={product.name} className="w-full aspect-square object-cover" />
                
                 {isOutOfStock && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="bg-red-600 text-white px-4 py-1 font-bold rounded-full text-sm">ESGOTADO</span>
                    </div>
                )}
            </div>
            <div className="p-4 flex flex-col flex-grow">
                <div className="flex-grow">
                    <h3 className="text-lg font-bold text-text-on-light mb-1">{product.name}</h3>
                    <p className="text-gray-500 text-xs mb-3 line-clamp-2">{product.description}</p>
                    
                    {hasPrices && sortedSizes.length > 1 && (
                        <div className="mb-3">
                            <div className="flex flex-wrap gap-2">
                                {sortedSizes.map(size => (
                                    <button
                                        key={size}
                                        onClick={() => handleSizeClick(size)}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border-2 transition-colors ${
                                            selectedSize === size
                                                ? 'bg-brand-olive-600 text-white border-brand-olive-600'
                                                : 'bg-gray-100 text-gray-700 border-gray-300 hover:border-brand-olive-600/50'
                                        }`}
                                        disabled={isOutOfStock}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                            {showSizeError && (
                                <p className="text-red-600 text-xs mt-1.5 animate-pulse">
                                    Por favor, selecione um tamanho.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-auto pt-2 flex justify-between items-center">
                     <div className="flex flex-col items-start">
                        {originalPriceText && (
                            <span className="text-xs text-gray-500 line-through">
                                {originalPriceText}
                            </span>
                        )}
                        <span className={`${isPromo ? 'text-2xl' : 'text-xl'} font-bold text-accent leading-none`}>
                           {priceText}
                        </span>
                    </div>
                    <button 
                        onClick={handleAddToCart}
                        disabled={!isStoreOnline || wasAdded || (!hasPrices && !isPromo) || isOutOfStock}
                        className={buttonClass}
                    >
                        {isOutOfStock ? (
                            'Esgotado'
                        ) : wasAdded ? (
                            <>
                                <i className="fas fa-check mr-1"></i>
                                Adicionado!
                            </>
                        ) : (
                            <>
                                <i className="fas fa-plus mr-1"></i>
                                Adicionar
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};