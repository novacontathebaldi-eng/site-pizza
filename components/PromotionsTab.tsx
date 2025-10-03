import React, { useState, useEffect } from 'react';
import { PromotionPage, Product, SiteSettings } from '../types';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PromotionModal } from './PromotionModal';

interface PromotionsTabProps {
    promotions: PromotionPage[];
    allProducts: Product[];
    siteSettings: SiteSettings;
    onSave: (promotion: PromotionPage) => Promise<void>;
    onDelete: (promotionId: string) => Promise<void>;
    onReorder: (promotionsToUpdate: { id: string; order: number }[]) => Promise<void>;
    onSaveSettings: (settings: SiteSettings, files: {}, audioFiles: {}) => Promise<void>;
}

const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
    <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
    </label>
);

const SortablePromotionItem: React.FC<{ promotion: PromotionPage; onEdit: () => void; onDelete: () => void; onToggle: () => void; }> = ({ promotion, onEdit, onDelete, onToggle }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: promotion.id });
    const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : 'auto' };

    return (
        <div ref={setNodeRef} style={style} className={`bg-gray-50 p-3 rounded-lg flex justify-between items-center transition-opacity ${!promotion.isVisible ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-4">
                <button {...attributes} {...listeners} className="cursor-grab touch-none p-2"><i className="fas fa-grip-vertical text-gray-500"></i></button>
                <p className="font-bold">{promotion.title}</p>
            </div>
            <div className="flex items-center gap-4">
                <ToggleSwitch checked={promotion.isVisible} onChange={onToggle} />
                <button onClick={onEdit} className="bg-blue-500 text-white w-8 h-8 rounded-md hover:bg-blue-600"><i className="fas fa-edit"></i></button>
                <button onClick={onDelete} className="bg-red-500 text-white w-8 h-8 rounded-md hover:bg-red-600"><i className="fas fa-trash"></i></button>
            </div>
        </div>
    );
};

export const PromotionsTab: React.FC<PromotionsTabProps> = ({ promotions, allProducts, siteSettings, onSave, onDelete, onReorder, onSaveSettings }) => {
    const [localPromotions, setLocalPromotions] = useState<PromotionPage[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState<PromotionPage | null>(null);

    useEffect(() => {
        setLocalPromotions([...promotions].sort((a, b) => a.order - b.order));
    }, [promotions]);
    
    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = localPromotions.findIndex(p => p.id === active.id);
            const newIndex = localPromotions.findIndex(p => p.id === over.id);
            const reordered = arrayMove(localPromotions, oldIndex, newIndex);
            onReorder(reordered.map((p, index) => ({ id: p.id, order: index })));
        }
    };
    const handleAddNew = () => { setEditingPromotion(null); setIsModalOpen(true); };
    const handleEdit = (promo: PromotionPage) => { setEditingPromotion(promo); setIsModalOpen(true); };
    const handleDelete = (id: string) => { if (window.confirm(`Tem certeza que deseja apagar esta promoção? Esta ação não pode ser desfeita.`)) onDelete(id); };
    const handleToggleVisibility = (promo: PromotionPage) => {
        onSave({ ...promo, isVisible: !promo.isVisible });
    };

    return (
        <div className="animate-fade-in-up">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Gerenciar Páginas de Promoção</h3>
                <button onClick={handleAddNew} className="bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90"><i className="fas fa-plus mr-2"></i>Nova Página</button>
            </div>
            
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={localPromotions.map(p => p.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                        {localPromotions.length > 0 ? localPromotions.map(promo => (
                            <SortablePromotionItem
                                key={promo.id}
                                promotion={promo}
                                onEdit={() => handleEdit(promo)}
                                onDelete={() => handleDelete(promo.id)}
                                onToggle={() => handleToggleVisibility(promo)}
                            />
                        )) : (
                            <div className="text-center py-12 text-gray-500">
                                <i className="fas fa-bullhorn text-4xl mb-3"></i>
                                <p>Nenhuma página de promoção criada ainda.</p>
                            </div>
                        )}
                    </div>
                </SortableContext>
            </DndContext>
            
            <PromotionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={onSave}
                promotion={editingPromotion}
                allProducts={allProducts}
            />
        </div>
    );
};