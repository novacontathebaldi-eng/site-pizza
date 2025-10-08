import React, { useState, useEffect } from 'react';
import { Category } from '../types';

interface CategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (category: Category) => void;
    category: Category | null;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose, onSave, category }) => {
    const getInitialFormData = (): Omit<Category, 'id' | 'active' | 'order'> => ({
        name: '',
    });
    
    const [name, setName] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (category) {
                setName(category.name);
            } else {
                setName('');
            }
        }
    }, [category, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalCategory: Category = {
            id: category?.id || '',
            name: name,
            active: category?.active ?? true,
            order: category?.order ?? 0, // A ordem será definida pelo serviço
        };
        onSave(finalCategory);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-text-on-light">{category ? 'Editar Categoria' : 'Nova Categoria'}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <div className="overflow-y-auto p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold mb-1" htmlFor="category-name">Nome da Categoria *</label>
                            <input id="category-name" name="name" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded-md" required />
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                            <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Cancelar</button>
                            <button type="submit" className="bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90"><i className="fas fa-save mr-2"></i>Salvar Categoria</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};