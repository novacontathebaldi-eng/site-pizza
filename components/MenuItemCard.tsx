import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product } from '../types';

interface MenuItemCardProps {
    product: Product;
    categoryName: string;
    onAddToCart: (product: Product, size: string, price: number) => void;
    isStoreOnline: boolean;
    isInCart: boolean;
}

const sizeOrder = ['P', 'M', 'G', 'Única'];

export const MenuItemCard: React.FC<MenuItemCardProps> = ({ product, categoryName, onAddToCart, isStoreOnline, isInCart }) => {
    const prices = product.prices ?? {};
    const hasPrices = Object.keys(prices).length > 0;
    const isOutOfStock = product.stockStatus === 'out_of_stock';
    const isPromo = product.isPromotion && product.promotionalPrice != null && product.promotionalPrice > 0;
    const isPizza = categoryName.toLowerCase().includes('pizza');


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

    // If there's only one size, pre-select it. Otherwise, start with no selection.
    const [selectedSize, setSelectedSize] = useState<string>(sortedSizes.length === 1 ? sortedSizes[0] : '');
    const [wasAdded, setWasAdded] = useState(false);
    const [showSizeError, setShowSizeError] = useState(false);
    const timerRef = useRef<number | null>(null);

    // Reset selection when product changes.
    useEffect(() => {
        setSelectedSize(sortedSizes.length === 1 ? sortedSizes[0] : '');
        setShowSizeError(false); // Also clear any previous error message
    }, [product, sortedSizes]);

    // Limpa o timer se o componente for desmontado
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);
    
    const handleAddToCart = () => {
        // Check if a size needs to be selected
        if (hasPrices && sortedSizes.length > 1 && !selectedSize) {
            setShowSizeError(true);
            setTimeout(() => setShowSizeError(false), 2500);
            return;
        }

        if (!isStoreOnline || wasAdded || (!hasPrices && !isPromo) || isOutOfStock) return;
        
        // Se for promoção, usa o preço promocional. Senão, busca o preço do tamanho selecionado.
        const price = isPromo ? product.promotionalPrice! : prices[selectedSize];
        
        // Para promoções, o 'tamanho' ainda é relevante para o controle do carrinho, mesmo que o preço seja único.
        const size = selectedSize || 'Única';

        onAddToCart(product, size, price);
        setWasAdded(true);

        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        timerRef.current = window.setTimeout(() => {
            setWasAdded(false);
        }, 1500);
    };

    const formatPrice = (price: number) => {
        return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const buttonClass = wasAdded
        ? 'bg-green-500 text-white font-bold py-2 px-5 rounded-lg transition-all cursor-default'
        : 'bg-accent text-white font-bold py-2 px-5 rounded-lg transition-all transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed';
        
    let priceToDisplay: string;
    let originalPriceStriked: string | null = null;
    
    if (isPromo) {
        priceToDisplay = formatPrice(product.promotionalPrice!);
        // Only show striked price if a size is selected (or if there's only one size)
        if (selectedSize && prices[selectedSize]) {
            originalPriceStriked = formatPrice(prices[selectedSize]);
        }
    } else if (hasPrices) {
        if (selectedSize) {
            priceToDisplay = formatPrice(prices[selectedSize]);
        } else {
            priceToDisplay = 'Selecione';
        }
    } else {
        priceToDisplay = 'Indisponível';
    }

    const sliceInfo = useMemo(() => {
        if (!isPizza || !selectedSize) {
            return null;
        }
        if (selectedSize === 'M') {
            return '6 fatias';
        }
        if (selectedSize === 'G') {
            return '8 fatias';
        }
        return null;
    }, [isPizza, selectedSize]);

    return (
        <div className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden border border-gray-200`}>
            <div className="relative">
                {isPromo && (
                    <span className="absolute top-2 left-2 bg-red-600 text-white px-2 py-0.5 text-xs font-bold rounded-full flex items-center gap-1 z-10 animate-pulse">
                        <i className="fas fa-tags text-xs"></i> PROMO
                    </span>
                )}
                
                {/* Selo Inteligente: Mostra "Adicionado" com prioridade, ou o selo de destaque se não estiver no carrinho. */}
                {isInCart ? (
                    <div className="absolute top-2 right-2 bg-green-600 text-white text-xs font-bold rounded-full flex items-center justify-center gap-1.5 z-10 shadow-md h-7 px-2.5">
                        <i className="fas fa-check"></i>
                        <span>Adicionado</span>
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
                        <div className="flex flex-wrap gap-2 mb-3">
                            {sortedSizes.map(size => (
                                <button
                                    key={size}
                                    onClick={() => setSelectedSize(size)}
                                    className={`px-3 py-1 text-xs font-semibold rounded-md border transition-colors ${
                                        selectedSize === size
                                            ? 'bg-brand-olive-600 text-white border-brand-olive-600'
                                            : 'bg-gray-100 text-gray-700 border-gray-300 hover:border-brand-olive-600'
                                    }`}
                                    disabled={isOutOfStock}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    )}
                    {showSizeError && <p className="text-red-500 text-xs text-center -mt-2 mb-2">Por favor, selecione um tamanho.</p>}
                </div>

                <div className="mt-auto pt-2 flex justify-between items-center">
                     <div className="flex flex-col items-start">
                        <div className="h-4 mb-1 flex items-end">
                            {sliceInfo && (
                                <span className="text-xs font-semibold text-brand-olive-600">
                                    {sliceInfo}
                                </span>
                            )}
                        </div>
                        {originalPriceStriked && (
                            <span className="text-xs text-gray-500 line-through">
                                {originalPriceStriked}
                            </span>
                        )}
                        <span className={`${isPromo ? 'text-2xl leading-tight' : 'text-xl'} font-bold text-accent -mt-1`}>
                            {priceToDisplay}
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