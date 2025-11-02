import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product } from '../types';

interface ProductDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    onAddToCart: (product: Product, size: string, price: number, notes?: string) => void;
    onSelectHalfAndHalf: (product: Product) => void;
    isStoreOnline: boolean;
}

const sizeOrder = ['P', 'M', 'G', 'Única'];

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ isOpen, onClose, product, onAddToCart, onSelectHalfAndHalf, isStoreOnline }) => {
    const [selectedSize, setSelectedSize] = useState<string>('');
    const [notes, setNotes] = useState('');
    const [showSizeError, setShowSizeError] = useState(false);
    const [wasAdded, setWasAdded] = useState(false);
    const timerRef = useRef<number | null>(null);

    const prices = product?.prices ?? {};
    const hasPrices = Object.keys(prices).length > 0;
    const isPromo = product?.isPromotion && product.promotionalPrices && Object.values(product.promotionalPrices).some(p => typeof p === 'number' && p > 0);
    const categoryName = product?.categoryId ? product.categoryId.toLowerCase() : '';
    const isPizza = categoryName.includes('pizza');

    const sortedSizes = useMemo(() => {
        if (!product || !hasPrices) return [];
        return Object.keys(prices).sort((a, b) => {
            const indexA = sizeOrder.indexOf(a);
            const indexB = sizeOrder.indexOf(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
    }, [product, prices, hasPrices]);

    useEffect(() => {
        if (isOpen && product) {
            // Reset state when a new product is shown
            setSelectedSize(sortedSizes.length === 1 ? sortedSizes[0] : '');
            setNotes('');
            setShowSizeError(false);
            setWasAdded(false);
        }
        
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [isOpen, product, sortedSizes]);

    if (!isOpen || !product) return null;
    
    const handleAddToCartClick = () => {
        if (hasPrices && sortedSizes.length > 1 && !selectedSize) {
            setShowSizeError(true);
            setTimeout(() => setShowSizeError(false), 2500);
            return;
        }

        if (!isStoreOnline || wasAdded || !hasPrices) return;

        const size = selectedSize || sortedSizes[0] || 'Única';
        const promoPriceForSize = isPromo ? product.promotionalPrices?.[size] : undefined;
        const price = (promoPriceForSize && promoPriceForSize > 0) ? promoPriceForSize : prices[size];
        
        if (price === undefined) {
            console.error("Price not found for selected size");
            return;
        }
        
        onAddToCart(product, size, price, notes);
        setWasAdded(true);

        timerRef.current = window.setTimeout(() => {
            onClose(); // Close modal after adding
        }, 1000); // 1 sec delay to show "Adicionado!"
    };

    const handleSelectHalfAndHalf = () => {
        onSelectHalfAndHalf(product);
        onClose();
    };

    const currentPrice = useMemo(() => {
        if (!selectedSize) return null;
        const promoPrice = isPromo ? product.promotionalPrices?.[selectedSize] : undefined;
        if (promoPrice && promoPrice > 0) return promoPrice;
        return prices[selectedSize];
    }, [selectedSize, isPromo, product, prices]);

    const formatPrice = (price: number) => price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    const buttonText = wasAdded ? 'Adicionado!' : currentPrice ? `Adicionar ${formatPrice(currentPrice)}` : 'Adicionar';

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in-up">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-2 text-right">
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 w-10 h-10 text-2xl">&times;</button>
                </div>
                <div className="overflow-y-auto px-6 pb-6 -mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <img src={product.imageUrl} alt={product.name} className="w-full aspect-square object-cover rounded-lg" />
                        <div className="flex flex-col">
                            <h2 className="text-3xl font-bold text-text-on-light">{product.name}</h2>
                            <p className="text-gray-600 mt-2">{product.description}</p>

                            {hasPrices && sortedSizes.length > 1 && (
                                <div className="mt-4">
                                    <label className="block text-sm font-semibold mb-2">Tamanho:</label>
                                    <div className="flex flex-wrap gap-2">
                                        {sortedSizes.map(size => {
                                            const price = prices[size];
                                            const promoPrice = isPromo ? product.promotionalPrices?.[size] : undefined;
                                            return (
                                                <button
                                                    key={size}
                                                    onClick={() => setSelectedSize(size)}
                                                    className={`px-4 py-2 text-sm font-semibold rounded-lg border-2 transition-colors ${selectedSize === size ? 'bg-accent text-white border-accent' : 'bg-white text-gray-700 border-gray-300 hover:border-accent'}`}
                                                >
                                                    {size}
                                                    <span className="block text-xs">
                                                        {promoPrice && promoPrice > 0 ? (
                                                            <>
                                                                <span className="line-through text-gray-400 mr-1">{formatPrice(price)}</span>
                                                                <span>{formatPrice(promoPrice)}</span>
                                                            </>
                                                        ) : (
                                                            formatPrice(price)
                                                        )}
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                    {showSizeError && <p className="text-red-500 text-xs mt-2">Por favor, selecione um tamanho.</p>}
                                </div>
                            )}

                            <div className="mt-4">
                                <label htmlFor="product-notes" className="block text-sm font-semibold mb-1">Observações (opcional):</label>
                                <textarea
                                    id="product-notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md"
                                    rows={2}
                                    placeholder="Ex: sem cebola, ponto da carne, etc."
                                />
                            </div>

                            <div className="mt-auto pt-4 space-y-3">
                                {isPizza && hasPrices && !isPromo && (
                                    <button onClick={handleSelectHalfAndHalf} className="w-full text-center font-semibold text-accent hover:text-brand-olive-600">
                                        🍕 Montar Meio a Meio
                                    </button>
                                )}
                                <button
                                    onClick={handleAddToCartClick}
                                    disabled={!isStoreOnline || wasAdded}
                                    className={`w-full font-bold py-3 px-6 rounded-lg text-lg transition-all ${wasAdded ? 'bg-green-500 text-white' : 'bg-accent text-white hover:bg-opacity-90 disabled:bg-gray-400'}`}
                                >
                                    {buttonText}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
