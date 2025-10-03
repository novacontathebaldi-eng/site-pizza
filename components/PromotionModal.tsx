import React, { useState, useEffect, useRef } from 'react';
import { Promotion, Product } from '../types';
import * as firebaseService from '../services/firebaseService';

interface PromotionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (promotion: Promotion, imageFile: File | null) => Promise<void>;
    promotion: Promotion | null;
    allProducts: Product[];
}

export const PromotionModal: React.FC<PromotionModalProps> = ({ isOpen, onClose, onSave, promotion, allProducts }) => {
    const getInitialFormData = (): Omit<Promotion, 'id'> => ({
        order: 0,
        active: true,
        title: '',
        description: '',
        layout: 'textLeft_mediaRight',
        includeMedia: true,
        videoUrl: '',
        imageUrl: '',
        includeProducts: false,
        productIds: [],
    });

    const [formData, setFormData] = useState(getInitialFormData());
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [productSearch, setProductSearch] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setImageFile(null);
            if (promotion) {
                setFormData({
                    order: promotion.order,
                    active: promotion.active,
                    title: promotion.title,
                    description: promotion.description,
                    layout: promotion.layout,
                    includeMedia: promotion.includeMedia,
                    videoUrl: promotion.videoUrl || '',
                    imageUrl: promotion.imageUrl || '',
                    includeProducts: promotion.includeProducts,
                    productIds: promotion.productIds || [],
                });
                setImagePreview(promotion.imageUrl || '');
            } else {
                setFormData(getInitialFormData());
                setImagePreview('');
            }
        }
    }, [promotion, isOpen]);

    useEffect(() => {
        if (!imageFile) {
             if (promotion?.imageUrl && !formData.imageUrl) {
                setImagePreview(promotion.imageUrl);
            }
            return;
        }
        const objectUrl = URL.createObjectURL(imageFile);
        setImagePreview(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [imageFile]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImageFile(e.target.files[0]);
            setFormData(prev => ({ ...prev, imageUrl: '' }));
        }
    };
    
    const toggleProductSelection = (productId: string) => {
        setFormData(prev => {
            const newProductIds = prev.productIds.includes(productId)
                ? prev.productIds.filter(id => id !== productId)
                : [...prev.productIds, productId];
            return { ...prev, productIds: newProductIds };
        });
    };
    
    const filteredProducts = allProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) && p.active);
    const selectedProducts = formData.productIds.map(id => allProducts.find(p => p.id === id)).filter(Boolean) as Product[];


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const promoToSave: Promotion = {
                id: promotion?.id || '',
                ...formData,
            };
            await onSave(promoToSave, imageFile);
            onClose();
        } catch (error) {
            console.error("Erro ao salvar promoção:", error);
            alert("Falha ao salvar a promoção.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-text-on-light">{promotion ? 'Editar Anúncio' : 'Novo Anúncio'}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl" disabled={isSaving}>&times;</button>
                </div>
                <div className="overflow-y-auto p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold mb-1">Título *</label>
                            <input name="title" value={formData.title} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" required />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1">Descrição</label>
                            <textarea name="description" value={formData.description} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" rows={3} />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1">Layout Visual *</label>
                            <select name="layout" value={formData.layout} onChange={handleChange} className="w-full px-3 py-2 border rounded-md bg-white">
                                <option value="textLeft_mediaRight">Texto à Esquerda, Mídia à Direita</option>
                                <option value="mediaLeft_textRight">Mídia à Esquerda, Texto à Direita</option>
                                <option value="mediaFull_textOverlay">Mídia em Tela Cheia, Texto Sobreposto</option>
                                <option value="productGridOnly">Apenas Grade de Produtos</option>
                            </select>
                        </div>
                        
                        <div className="p-4 bg-gray-50 rounded-lg border">
                             <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" name="includeMedia" checked={formData.includeMedia} onChange={handleChange} className="w-5 h-5"/>
                                <span className="font-semibold">Incluir Mídia Visual (Vídeo/Imagem)?</span>
                            </label>
                            {formData.includeMedia && (
                                <div className="mt-4 pl-8 space-y-4 animate-fade-in-up">
                                    <div>
                                        <label className="block text-sm font-semibold mb-1">URL do Vídeo (YouTube)</label>
                                        <input name="videoUrl" value={formData.videoUrl} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" placeholder="https://www.youtube.com/watch?v=..."/>
                                    </div>
                                    <div className="flex items-center text-sm text-gray-500"><div className="flex-grow border-t"></div><span className="px-2">OU</span><div className="flex-grow border-t"></div></div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-1">Imagem</label>
                                         <div className="flex items-center gap-4">
                                            <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center border overflow-hidden">
                                                {imagePreview ? <img src={imagePreview} alt="Prévia" className="w-full h-full object-cover" /> : <i className="fas fa-image text-3xl text-gray-300"></i>}
                                            </div>
                                            <div className="flex-grow">
                                                 <input name="imageUrl" value={formData.imageUrl} onChange={handleChange} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Cole uma URL de imagem aqui" />
                                                <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-2 w-full text-sm bg-gray-200 text-gray-800 font-semibold py-2 px-3 rounded-lg hover:bg-gray-300"><i className="fas fa-upload mr-2"></i>Enviar Arquivo</button>
                                                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-gray-50 rounded-lg border">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" name="includeProducts" checked={formData.includeProducts} onChange={handleChange} className="w-5 h-5"/>
                                <span className="font-semibold">Incluir Produtos?</span>
                            </label>
                             {formData.includeProducts && (
                                 <div className="mt-4 pl-8 space-y-4 animate-fade-in-up">
                                     <input type="search" value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Buscar produto para adicionar..." className="w-full px-3 py-2 border rounded-md mb-2"/>
                                     <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-1 bg-white">
                                         {filteredProducts.map(p => (
                                             <label key={p.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-100 cursor-pointer">
                                                 <input type="checkbox" checked={formData.productIds.includes(p.id)} onChange={() => toggleProductSelection(p.id)} className="w-4 h-4" />
                                                 <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded object-cover" />
                                                 <span className="text-sm font-medium">{p.name}</span>
                                             </label>
                                         ))}
                                     </div>
                                     {selectedProducts.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-semibold mt-4 mb-2">Produtos Selecionados:</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedProducts.map(p => (
                                                    <div key={p.id} className="flex items-center gap-2 bg-accent/20 text-accent text-sm font-semibold px-2 py-1 rounded-full">
                                                        <span>{p.name}</span>
                                                        <button type="button" onClick={() => toggleProductSelection(p.id)} className="text-accent hover:text-red-600">&times;</button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                     )}
                                 </div>
                             )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button type="button" onClick={onClose} disabled={isSaving} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 disabled:opacity-50">Cancelar</button>
                            <button type="submit" disabled={isSaving} className="bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 flex items-center justify-center min-w-[150px] disabled:bg-opacity-70">
                                {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-save mr-2"></i><span>Salvar Anúncio</span></>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
