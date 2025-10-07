import React, { useState, useEffect } from 'react';
import { PromotionPage, Product } from '../types';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// PROPS
interface PromotionsTabProps {
    promotions: PromotionPage[];
    allProducts: Product[];
    onSave: (promotion: PromotionPage) => Promise<void>;
    onDelete: (promotionId: string) => Promise<void>;
    onReorder: (promotionsToUpdate: { id: string; order: number }[]) => Promise<void>;
}

// MAIN COMPONENT
export const PromotionsTab: React.FC<PromotionsTabProps> = ({ promotions, allProducts, onSave, onDelete, onReorder }) => {
    const [localPromotions, setLocalPromotions] = useState<PromotionPage[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState<PromotionPage | null>(null);

    useEffect(() => {
        setLocalPromotions([...promotions].sort((a, b) => a.order - b.order));
    }, [promotions]);

    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = localPromotions.findIndex(p => p.id === active.id);
        const newIndex = localPromotions.findIndex(p => p.id === over.id);
        const reordered = arrayMove(localPromotions, oldIndex, newIndex);
        
        onReorder(reordered.map((p, index) => ({ id: p.id, order: index })));
    };

    const handleAddNew = () => {
        setEditingPromotion(null);
        setIsModalOpen(true);
    };

    const handleEdit = (promo: PromotionPage) => {
        setEditingPromotion(promo);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta página de promoção?')) {
            onDelete(id);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Promoções e Anúncios</h3>
                <button onClick={handleAddNew} className="bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90">
                    <i className="fas fa-plus mr-2"></i>Nova Página de Promoção
                </button>
            </div>
            <p className="text-gray-600 mb-4 text-sm">Crie seções de conteúdo que aparecerão na sua página inicial. Arraste e solte para reordenar.</p>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={localPromotions.map(p => p.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                        {localPromotions.map(promo => (
                            <SortablePromotionItem
                                key={promo.id}
                                promotion={promo}
                                onEdit={() => handleEdit(promo)}
                                onDelete={() => handleDelete(promo.id)}
                                onVisibilityChange={(isVisible) => onSave({ ...promo, isVisible })}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
            
            {isModalOpen && (
                <PromotionModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={onSave}
                    promotion={editingPromotion}
                    allProducts={allProducts}
                    order={editingPromotion ? editingPromotion.order : localPromotions.length}
                />
            )}
        </div>
    );
};

// SORTABLE ITEM
const SortablePromotionItem: React.FC<{
    promotion: PromotionPage;
    onEdit: () => void;
    onDelete: () => void;
    onVisibilityChange: (isVisible: boolean) => void;
}> = ({ promotion, onEdit, onDelete, onVisibilityChange }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: promotion.id });
    const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : 'auto' };

    return (
        <div ref={setNodeRef} style={style} className={`bg-gray-50 p-3 rounded-lg flex justify-between items-center transition-opacity ${!promotion.isVisible ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-4">
                <button {...attributes} {...listeners} className="cursor-grab touch-none p-2" aria-label="Mover promoção"><i className="fas fa-grip-vertical text-gray-500"></i></button>
                <p className="font-bold">{promotion.title}</p>
            </div>
            <div className="flex items-center gap-4">
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={promotion.isVisible} onChange={e => onVisibilityChange(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
                <button onClick={onEdit} className="bg-blue-500 text-white w-8 h-8 rounded-md hover:bg-blue-600"><i className="fas fa-edit"></i></button>
                <button onClick={onDelete} className="bg-red-500 text-white w-8 h-8 rounded-md hover:bg-red-600"><i className="fas fa-trash"></i></button>
            </div>
        </div>
    );
};

// MODAL
const PromotionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (promotion: PromotionPage) => Promise<void>;
    promotion: PromotionPage | null;
    allProducts: Product[];
    order: number;
}> = ({ isOpen, onClose, onSave, promotion, allProducts, order }) => {
    
    const getInitialFormData = (): Omit<PromotionPage, 'id'> => ({
        order, isVisible: true, title: 'Nova Promoção', text: '', videoUrl: '',
        layout: 'video-left', featuredProductIds: [], isTitleVisible: true, isTextVisible: true,
        isVideoVisible: true, isProductsVisible: true,
    });
    
    const [formData, setFormData] = useState(getInitialFormData());
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData(promotion ? { ...promotion } : getInitialFormData());
        }
    }, [promotion, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleToggle = (field: keyof PromotionPage) => {
        setFormData({ ...formData, [field]: !formData[field] });
    };

    const handleProductSelect = (productId: string) => {
        const newIds = formData.featuredProductIds.includes(productId)
            ? formData.featuredProductIds.filter(id => id !== productId)
            : [...formData.featuredProductIds, productId];
        setFormData({ ...formData, featuredProductIds: newIds });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const finalData: PromotionPage = { ...formData, id: promotion?.id || '' };
        await onSave(finalData);
        setIsSaving(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b"><h2 className="text-2xl font-bold">{promotion ? 'Editar' : 'Nova'} Página de Promoção</h2><button onClick={onClose} disabled={isSaving}>&times;</button></div>
                <div className="overflow-y-auto p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <ToggleSwitch label="Título Visível?" enabled={formData.isTitleVisible} onChange={() => handleToggle('isTitleVisible')} />
                            <ToggleSwitch label="Texto Visível?" enabled={formData.isTextVisible} onChange={() => handleToggle('isTextVisible')} />
                            <ToggleSwitch label="Vídeo Visível?" enabled={formData.isVideoVisible} onChange={() => handleToggle('isVideoVisible')} />
                            <ToggleSwitch label="Produtos Visíveis?" enabled={formData.isProductsVisible} onChange={() => handleToggle('isProductsVisible')} />
                        </div>

                        <div><label className="block text-sm font-semibold mb-1">Título</label><input name="title" value={formData.title} onChange={handleChange} className="w-full border rounded-md p-2" /></div>
                        <div><label className="block text-sm font-semibold mb-1">Texto</label><textarea name="text" value={formData.text} onChange={handleChange} rows={4} className="w-full border rounded-md p-2" /></div>
                        <div><label className="block text-sm font-semibold mb-1">URL do Vídeo (YouTube)</label><input name="videoUrl" value={formData.videoUrl} onChange={handleChange} placeholder="https://www.youtube.com/watch?v=..." className="w-full border rounded-md p-2" /></div>

                        <div>
                            <label className="block text-sm font-semibold mb-1">Layout</label>
                            <select name="layout" value={formData.layout} onChange={handleChange} className="w-full border rounded-md p-2 bg-white">
                                <option value="video-left">Vídeo na Esquerda</option>
                                <option value="video-right">Vídeo na Direita</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-semibold mb-2">Produtos em Destaque</label>
                            <div className="max-h-60 overflow-y-auto border rounded-md p-3 space-y-2 bg-gray-50">
                                {allProducts.map(product => (
                                    <label key={product.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                                        <input type="checkbox" checked={formData.featuredProductIds.includes(product.id)} onChange={() => handleProductSelect(product.id)} className="w-5 h-5" />
                                        <img src={product.imageUrl} alt={product.name} className="w-10 h-10 object-cover rounded-md" />
                                        <span className="font-medium">{product.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <button type="button" onClick={onClose} disabled={isSaving} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg">Cancelar</button>
                            <button type="submit" disabled={isSaving} className="bg-accent text-white font-semibold py-2 px-4 rounded-lg">{isSaving ? 'Salvando...' : 'Salvar'}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

const ToggleSwitch: React.FC<{label: string, enabled: boolean, onChange: () => void}> = ({label, enabled, onChange}) => (
    <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg border">
        <span className="font-semibold text-sm">{label}</span>
        <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={enabled} onChange={onChange} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
        </label>
    </div>
);
