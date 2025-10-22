import React, { useState, useMemo, useEffect } from 'react';
import { Product } from '../types';

interface HalfAndHalfModalProps {
    isOpen: boolean;
    onClose: () => void;
    pizzas: Product[];
    firstHalf: Product | null;
    onAddToCart: (product1: Product, product2: Product, size: string) => void;
}

const sizeOrder = ['P', 'M', 'G'];

export const HalfAndHalfModal: React.FC<HalfAndHalfModalProps> = ({ isOpen, onClose, pizzas, firstHalf, onAddToCart }) => {
    const [selectedSize, setSelectedSize] = useState('');
    const [secondHalf, setSecondHalf] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!isOpen) {
            // Reset state when modal closes
            setSelectedSize('');
            setSecondHalf(null);
            setSearchTerm('');
        }
    }, [isOpen]);

    const secondHalfOptions = useMemo(() => {
        if (!firstHalf) return [];
        return pizzas
            .filter(p => p.id !== firstHalf.id && p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [pizzas, firstHalf, searchTerm]);

    const finalPrice = useMemo(() => {
        if (!firstHalf || !secondHalf || !selectedSize) return 0;
        const price1 = firstHalf.prices[selectedSize] || 0;
        const price2 = secondHalf.prices[selectedSize] || 0;
        return Math.max(price1, price2);
    }, [firstHalf, secondHalf, selectedSize]);

    if (!isOpen || !firstHalf) return null;

    const handleAddToCart = () => {
        if (firstHalf && secondHalf && selectedSize) {
            onAddToCart(firstHalf, secondHalf, selectedSize);
        }
    };

    const availableSizes = useMemo(() => 
        sizeOrder.filter(size => firstHalf.prices[size] !== undefined), 
    [firstHalf]);
    
    const formatPrice = (price: number) => price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-text-on-light"><i className="fas fa-pizza-slice mr-2"></i>Monte sua Pizza Meio a Meio</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <div className="flex-grow overflow-y-auto p-6">
                    <div className="mb-6">
                        <label className="block text-lg font-bold mb-3 text-center">1. Escolha o Tamanho</label>
                        <div className="flex justify-center gap-3">
                            {availableSizes.map(size => (
                                <button
                                    key={size}
                                    onClick={() => setSelectedSize(size)}
                                    className={`w-24 py-2 text-lg font-bold rounded-lg border-2 transition-colors ${
                                        selectedSize === size
                                            ? 'bg-accent text-white border-accent'
                                            : 'bg-white text-gray-700 border-gray-300 hover:border-accent'
                                    }`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                         {!selectedSize && <p className="text-center text-red-500 text-sm mt-2">Você precisa escolher um tamanho para continuar.</p>}
                    </div>

                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity duration-300 ${!selectedSize ? 'opacity-30 pointer-events-none' : ''}`}>
                        {/* Coluna da Primeira Metade */}
                        <div>
                            <h3 className="text-xl font-bold mb-3 text-center">1ª Metade</h3>
                            <div className="border rounded-lg p-4 bg-gray-50">
                                <img src={firstHalf.imageUrl} alt={firstHalf.name} className="w-full h-40 object-cover rounded-lg mb-3" />
                                <h4 className="font-bold text-lg">{firstHalf.name}</h4>
                                <p className="text-gray-600 text-sm mb-2">{firstHalf.description}</p>
                                <p className="font-bold text-accent text-lg">{selectedSize ? formatPrice(firstHalf.prices[selectedSize]) : '-'}</p>
                            </div>
                        </div>

                        {/* Coluna da Segunda Metade */}
                        <div>
                             <h3 className="text-xl font-bold mb-3 text-center">2ª Metade</h3>
                            <div className="relative mb-3">
                                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                <input
                                    type="text"
                                    placeholder="Buscar outro sabor..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border rounded-md"
                                />
                            </div>
                            <div className="border rounded-lg p-2 bg-gray-50 h-96 overflow-y-auto space-y-2">
                               {secondHalfOptions.length > 0 ? secondHalfOptions.map(pizza => (
                                    <button
                                        key={pizza.id}
                                        onClick={() => setSecondHalf(pizza)}
                                        className={`w-full text-left p-3 rounded-md transition-colors flex justify-between items-center ${
                                            secondHalf?.id === pizza.id
                                                ? 'bg-accent/20 border border-accent'
                                                : 'hover:bg-gray-200'
                                        }`}
                                    >
                                        <div>
                                            <p className="font-bold">{pizza.name}</p>
                                            <p className="text-xs text-gray-500 line-clamp-1">{pizza.description}</p>
                                        </div>
                                        <p className="font-semibold text-accent text-sm flex-shrink-0 ml-2">{selectedSize ? formatPrice(pizza.prices[selectedSize]) : '-'}</p>
                                    </button>
                               )) : <p className="text-center text-gray-500 p-4">Nenhum sabor encontrado.</p>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Rodapé com Resumo e Botão */}
                 <div className="p-5 border-t border-gray-200 bg-brand-ivory-50">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-center md:text-left">
                             <h4 className="font-bold text-xl text-text-on-light">Sua Pizza Meio a Meio:</h4>
                            <p className="text-gray-600">{secondHalf ? `${firstHalf.name} / ${secondHalf.name}` : 'Selecione a 2ª metade'}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-gray-500">Valor Final</p>
                            <p className="font-bold text-3xl text-accent">{formatPrice(finalPrice)}</p>
                            <p className="text-xs text-brand-olive-600">(Cobrado o valor da metade mais cara)</p>
                        </div>
                        <button
                            onClick={handleAddToCart}
                            disabled={!selectedSize || !secondHalf}
                            className="w-full md:w-auto bg-accent text-white font-bold py-3 px-8 rounded-lg text-lg hover:bg-opacity-90 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            <i className="fas fa-plus mr-2"></i>Adicionar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
