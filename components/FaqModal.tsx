import React, { useState, useEffect } from 'react';
import { FaqItem } from '../types';

interface FaqModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: FaqItem) => void;
    item: FaqItem | null;
}

export const FaqModal: React.FC<FaqModalProps> = ({ isOpen, onClose, onSave, item }) => {
    const [ensinamento, setEnsinamento] = useState('');

    useEffect(() => {
        if (isOpen) {
            setEnsinamento(item ? item.ensinamento : '');
        }
    }, [item, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!ensinamento.trim()) return;

        const finalItem: FaqItem = {
            id: item?.id || '',
            ensinamento: ensinamento,
            active: item?.active ?? true,
            order: item?.order ?? 0,
        };
        onSave(finalItem);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-text-on-light">{item ? 'Editar Ensinamento' : 'Novo Ensinamento para o Chatbot'}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <div className="overflow-y-auto p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold mb-1" htmlFor="faq-ensinamento">Comando / Regra / Explicação *</label>
                            <textarea 
                                id="faq-ensinamento" 
                                value={ensinamento} 
                                onChange={(e) => setEnsinamento(e.target.value)} 
                                className="w-full px-3 py-2 border rounded-md" 
                                rows={8}
                                placeholder="Ex: Hoje, dia 16, não teremos taxa de entrega por ser uma promoção especial do dia."
                                required 
                            />
                            <p className="text-xs text-gray-500 mt-1">Escreva a regra ou informação que o chatbot deve seguir. Ele tratará esta instrução como uma ordem prioritária.</p>
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                            <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Cancelar</button>
                            <button type="submit" className="bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90"><i className="fas fa-save mr-2"></i>Salvar Ensinamento</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
