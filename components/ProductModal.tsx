import React, { useState, useEffect, useCallback } from 'react';
import { Product, Category } from '../types';
import { CameraCaptureModal } from './CameraCaptureModal';

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (product: Product, imageFile?: File) => Promise<void>;
    product: Product | null;
    categories: Category[];
}

export const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, onSave, product, categories }) => {
    const getInitialFormData = useCallback((): Omit<Product, 'id' | 'active'> => ({
        name: '',
        description: '',
        categoryId: categories.length > 0 ? categories[0].id : '',
        prices: {},
        imageUrl: '',
        badge: '',
        orderIndex: 0,
    }), [categories]);
    
    const [formData, setFormData] = useState<Omit<Product, 'id' | 'active'>>(getInitialFormData());
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageInputMethod, setImageInputMethod] = useState<'url' | 'upload'>('upload');
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setImageFile(null); // Limpa o arquivo anterior ao abrir
            if (product) {
                setFormData({
                    name: product.name,
                    description: product.description,
                    categoryId: product.categoryId,
                    prices: product.prices,
                    imageUrl: product.imageUrl,
                    badge: product.badge || '',
                    orderIndex: product.orderIndex,
                });
                setImagePreview(product.imageUrl);
                setImageInputMethod(product.imageUrl ? 'url' : 'upload');
            } else {
                setFormData(getInitialFormData());
                setImagePreview(null);
                setImageInputMethod('upload');
            }
        }
    }, [product, isOpen, categories, getInitialFormData]);

    useEffect(() => {
        // Limpa a URL de preview (blob) para evitar vazamento de memória
        return () => {
            if (imagePreview && imagePreview.startsWith('blob:')) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePriceChange = (size: string, value: string) => {
        const newPrices = { ...formData.prices };
        if (value) {
            newPrices[size] = parseFloat(value);
        } else {
            delete newPrices[size];
        }
        setFormData({ ...formData, prices: newPrices });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (imagePreview && imagePreview.startsWith('blob:')) {
                URL.revokeObjectURL(imagePreview);
            }
            setImageFile(file);
            const previewUrl = URL.createObjectURL(file);
            setImagePreview(previewUrl);
            setFormData({ ...formData, imageUrl: '' }); // Limpa o campo de URL
        }
    };
    
    const handlePhotoCaptured = (imageBlob: Blob) => {
        const capturedFile = new File([imageBlob], `capture_${new Date().toISOString()}.jpg`, { type: 'image/jpeg' });
        if (imagePreview && imagePreview.startsWith('blob:')) {
            URL.revokeObjectURL(imagePreview);
        }
        setImageFile(capturedFile);
        const previewUrl = URL.createObjectURL(capturedFile);
        setImagePreview(previewUrl);
        setFormData({ ...formData, imageUrl: '' });
        setIsCameraOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUploading(true);
        
        const finalProduct: Product = {
            id: product?.id || '',
            active: product?.active ?? true,
            ...formData,
        };

        try {
            await onSave(finalProduct, imageFile || undefined);
            onClose();
        } catch (error) {
            console.error("Falha ao salvar a partir do modal:", error);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                    <div className="flex justify-between items-center p-5 border-b border-gray-200">
                        <h2 className="text-2xl font-bold text-text-on-light">{product ? 'Editar Produto' : 'Novo Produto'}</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl" disabled={isUploading}>&times;</button>
                    </div>
                    <div className="overflow-y-auto p-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Campos do formulário ... */}
                            <div>
                                <label className="block text-sm font-semibold mb-1">Nome do Produto *</label>
                                <input name="name" value={formData.name} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" required />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Descrição *</label>
                                <textarea name="description" value={formData.description} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" rows={3} required />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-1">Categoria *</label>
                                    <select name="categoryId" value={formData.categoryId} onChange={handleChange} className="w-full px-3 py-2 border rounded-md bg-white" required>
                                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <label htmlFor="badge-input" className="block text-sm font-semibold">Selo de Destaque (opcional)</label>
                                        <div className="relative group flex items-center">
                                            <button type="button" tabIndex={0} className="w-5 h-5 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-xs font-bold cursor-help focus:outline-none focus:ring-2 focus:ring-accent">?</button>
                                            <div role="tooltip" className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg z-10 opacity-0 invisible pointer-events-none group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-200">
                                                Use selos para destacar produtos. Ex: "Popular", "Novo", "Promoção".
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-[6px] border-t-gray-800"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <input id="badge-input" name="badge" value={formData.badge} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" placeholder="Ex: Popular" />
                                </div>
                            </div>

                            {/* Seção da Imagem */}
                            <div>
                                <label className="block text-sm font-semibold mb-2">Imagem do Produto</label>
                                <div className="p-3 bg-gray-50 rounded-md border">
                                    <div className="flex justify-center gap-4 mb-3">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="imageInputMethod" value="upload" checked={imageInputMethod === 'upload'} onChange={() => setImageInputMethod('upload')} className="form-radio text-accent focus:ring-accent"/>
                                            <span>Enviar Imagem</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="imageInputMethod" value="url" checked={imageInputMethod === 'url'} onChange={() => setImageInputMethod('url')} className="form-radio text-accent focus:ring-accent"/>
                                            <span>Usar URL</span>
                                        </label>
                                    </div>

                                    {imageInputMethod === 'url' ? (
                                        <div>
                                            <input name="imageUrl" value={formData.imageUrl} onChange={(e) => { handleChange(e); setImagePreview(e.target.value); setImageFile(null); }} className="w-full px-3 py-2 border rounded-md" placeholder="https://exemplo.com/imagem.jpg" />
                                        </div>
                                    ) : (
                                        <div className="flex flex-col sm:flex-row items-center gap-4">
                                            <div className="w-32 h-32 bg-gray-200 rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden">
                                                {imagePreview ? (
                                                    <img src={imagePreview} alt="Pré-visualização" className="w-full h-full object-cover"/>
                                                ) : (
                                                    <i className="fas fa-image text-4xl text-gray-400"></i>
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <label htmlFor="file-upload" className="cursor-pointer bg-white text-accent font-semibold py-2 px-4 rounded-lg border border-accent hover:bg-accent/10 transition-colors text-center">
                                                    <i className="fas fa-upload mr-2"></i>Escolher arquivo...
                                                </label>
                                                <input id="file-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                                                <button type="button" onClick={() => setIsCameraOpen(true)} className="bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors">
                                                    <i className="fas fa-camera mr-2"></i>Tirar Foto
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Preços */}
                            <div>
                                <label className="block text-sm font-semibold mb-1">Preços *</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-md border">
                                    {['P', 'M', 'G', 'Única'].map(size => (
                                        <div key={size}>
                                            <label className="block text-xs font-medium mb-1">{size}</label>
                                            <input type="number" step="0.01" value={formData.prices[size] || ''} onChange={e => handlePriceChange(size, e.target.value)} className="w-full px-2 py-1 border rounded-md" placeholder="0.00"/>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Deixe o campo em branco para tamanhos não aplicáveis.</p>
                            </div>

                            {/* Botões */}
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300" disabled={isUploading}>Cancelar</button>
                                <button type="submit" className="bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 flex items-center" disabled={isUploading}>
                                    {isUploading ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin mr-2"></i>
                                            Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-save mr-2"></i>
                                            Salvar Produto
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            <CameraCaptureModal
                isOpen={isCameraOpen}
                onClose={() => setIsCameraOpen(false)}
                onCapture={handlePhotoCaptured}
            />
        </>
    );
};