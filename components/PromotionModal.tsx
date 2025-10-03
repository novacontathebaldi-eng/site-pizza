import React, { useState, useEffect, useMemo } from 'react';
import { PromotionPage, Product } from '../types';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


interface PromotionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (promotion: PromotionPage) => Promise<void>;
    promotion: PromotionPage | null;
    allProducts: Product[];
}

const componentOptions: { id: 'video' | 'text' | 'products'; name: string; icon: string }[] = [
    { id: 'video', name: 'Vídeo', icon: 'fab fa-youtube' },
    { id: 'text', name: 'Texto (Título/Descrição)', icon: 'fas fa-align-left' },
    { id: 'products', name: 'Produtos em Destaque', icon: 'fas fa-pizza-slice' },
];

const SortableComponentItem: React.FC<{ id: string; name: string; icon: string }> = ({ id, name, icon }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : 'auto' };

    return (
        <div ref={setNodeRef} style={style} className="bg-gray-200 p-2 rounded-lg flex items-center gap-3">
            <button {...attributes} {...listeners} className="cursor-grab touch-none p-1"><i className="fas fa-grip-vertical text-gray-500"></i></button>
            <i className={`${icon} text-gray-700 w-5 text-center`}></i>
            <span className="font-semibold text-sm">{name}</span>
        </div>
    );
};

export const PromotionModal: React.FC<PromotionModalProps> = ({ isOpen, onSave, onClose, promotion, allProducts }) => {
    const getInitialState = (): Omit<PromotionPage, 'id' | 'order'> => ({
        isVisible: true, title: '', text: '', videoUrl: '',
        componentOrder: ['video', 'text', 'products'],
        featuredProductIds: [],
        isTitleVisible: true, isTextVisible: true, isVideoVisible: true, isProductsVisible: true,
        position: 'below',
    });
    const [formData, setFormData] = useState(getInitialState());
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen) {
            setFormData(promotion ? { ...promotion } : getInitialState());
            setSearchTerm('');
        }
    }, [promotion, isOpen]);

    const filteredProducts = useMemo(() => {
        if (!searchTerm) return allProducts;
        return allProducts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [searchTerm, allProducts]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({...prev, position: e.target.value as 'above' | 'below' }));
    }
    const handleToggle = (field: keyof PromotionPage) => {
        setFormData(prev => ({ ...prev, [field]: !prev[field] }));
    };
    const handleProductSelect = (productId: string) => {
        setFormData(prev => {
            const newIds = prev.featuredProductIds.includes(productId)
                ? prev.featuredProductIds.filter(id => id !== productId)
                : [...prev.featuredProductIds, productId];
            return { ...prev, featuredProductIds: newIds };
        });
    };
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...formData, id: promotion?.id || '', order: promotion?.order ?? 0 });
        onClose();
    };

    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setFormData(prev => {
                const oldIndex = prev.componentOrder.findIndex(item => item === active.id);
                const newIndex = prev.componentOrder.findIndex(item => item === over.id);
                return { ...prev, componentOrder: arrayMove(prev.componentOrder, oldIndex, newIndex) };
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b"><h2 className="text-2xl font-bold">{promotion ? 'Editar' : 'Nova'} Promoção</h2><button onClick={onClose} className="text-2xl">&times;</button></div>
                <div className="overflow-y-auto p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div><label className="block text-sm font-semibold mb-1">Título da Página</label><input name="title" value={formData.title} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" required /></div>
                                <div><label className="block text-sm font-semibold mb-1">URL do Vídeo (YouTube)</label><input name="videoUrl" value={formData.videoUrl} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" placeholder="https://www.youtube.com/watch?v=..." /></div>
                                <div className="p-3 bg-gray-50 rounded-lg border">
                                    <h4 className="font-semibold mb-2">Posição da Página</h4>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="position" value="above" checked={formData.position === 'above'} onChange={handleRadioChange} className="form-radio text-accent" />
                                            Acima do Cardápio
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="position" value="below" checked={formData.position === 'below'} onChange={handleRadioChange} className="form-radio text-accent" />
                                            Abaixo do Cardápio
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div><label className="block text-sm font-semibold mb-1">Texto/Descrição</label><textarea name="text" value={formData.text} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" rows={4} /></div>
                                <div className="p-3 bg-gray-50 rounded-lg border">
                                    <h4 className="font-semibold mb-2">Visibilidade dos Componentes</h4>
                                    <div className="space-y-2 text-sm">
                                        <label className="flex items-center gap-2"><input type="checkbox" checked={formData.isTitleVisible} onChange={() => handleToggle('isTitleVisible')} /> Mostrar Título</label>
                                        <label className="flex items-center gap-2"><input type="checkbox" checked={formData.isTextVisible} onChange={() => handleToggle('isTextVisible')} /> Mostrar Texto</label>
                                        <label className="flex items-center gap-2"><input type="checkbox" checked={formData.isVideoVisible} onChange={() => handleToggle('isVideoVisible')} /> Mostrar Vídeo</label>
                                        <label className="flex items-center gap-2"><input type="checkbox" checked={formData.isProductsVisible} onChange={() => handleToggle('isProductsVisible')} /> Mostrar Produtos</label>
                                    </div>
                                </div>
                               
                            </div>
                        </div>
                         <div>
                            <h4 className="font-semibold mb-2">Ordem dos Componentes</h4>
                            <div className="p-3 bg-gray-50 rounded-lg border">
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                    <SortableContext items={formData.componentOrder} strategy={verticalListSortingStrategy}>
                                        <div className="space-y-2">
                                            {formData.componentOrder.map(id => {
                                                const comp = componentOptions.find(c => c.id === id)!;
                                                return <SortableComponentItem key={id} id={comp.id} name={comp.name} icon={comp.icon} />;
                                            })}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">Produtos em Destaque</h4>
                            <div className="border rounded-lg p-3">
                                <input type="text" placeholder="Buscar produto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-3 py-2 border rounded-md mb-3" />
                                <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                                    {filteredProducts.map(p => (
                                        <label key={p.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100"><input type="checkbox" checked={formData.featuredProductIds.includes(p.id)} onChange={() => handleProductSelect(p.id)} /> {p.name}</label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={onClose} className="bg-gray-200 font-semibold py-2 px-4 rounded-lg">Cancelar</button><button type="submit" className="bg-accent text-white font-semibold py-2 px-4 rounded-lg"><i className="fas fa-save mr-2"></i>Salvar</button></div>
                    </form>
                </div>
            </div>
        </div>
    );
};