import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { ContentSection, ContentSectionListItem } from '../types';

interface ImageUploaderProps {
    label: string;
    previewUrl: string;
    onFileChange: (file: File) => void;
    onUrlChange: (url: string) => void;
    currentUrl: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ label, previewUrl, onFileChange, onUrlChange, currentUrl }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    return (
        <div>
            <label className="block text-sm font-semibold mb-1">{label}</label>
            <div className="flex items-center gap-4">
                <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center border overflow-hidden flex-shrink-0">
                    {previewUrl ? <img src={previewUrl} alt="Prévia" className="w-full h-full object-cover" /> : <i className="fas fa-image text-3xl text-gray-300"></i>}
                </div>
                <div className="flex-grow space-y-2">
                    <input value={currentUrl} onChange={(e) => onUrlChange(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Ou cole uma URL aqui" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full text-sm bg-gray-200 text-gray-800 font-semibold py-2 px-3 rounded-lg hover:bg-gray-300"><i className="fas fa-upload mr-2"></i>Enviar Arquivo</button>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={(e) => e.target.files && onFileChange(e.target.files[0])} className="hidden" />
                </div>
            </div>
        </div>
    );
};

interface ContentSectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (section: ContentSection, file: File | null) => void;
    section: ContentSection | null;
}

export const ContentSectionModal: React.FC<ContentSectionModalProps> = ({ isOpen, onClose, onSave, section }) => {
    const getInitialState = (): Omit<ContentSection, 'id' | 'order' | 'isVisible'> => ({
        imageUrl: '',
        isTagVisible: true,
        tagIcon: 'fas fa-star',
        tag: '',
        title: '',
        description: '',
        list: [],
    });
    
    const [formData, setFormData] = useState<ContentSection>(section || { ...getInitialState(), id: '', order: 0, isVisible: true });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState('');

    useEffect(() => {
        if (isOpen) {
            setImageFile(null);
            if (section) {
                setFormData(section);
                setPreviewUrl(section.imageUrl);
            } else {
                const newSection = { ...getInitialState(), id: `new_${Date.now()}`, order: 99, isVisible: true };
                setFormData(newSection);
                setPreviewUrl(newSection.imageUrl);
            }
        }
    }, [section, isOpen]);
    
    useEffect(() => {
        if (!imageFile) return;
        const objectUrl = URL.createObjectURL(imageFile);
        setPreviewUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [imageFile]);


    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const handleToggle = (field: keyof ContentSection) => {
        setFormData(prev => ({ ...prev, [field]: !prev[field] }));
    }

    const handleListItemChange = (index: number, field: keyof ContentSectionListItem, value: string) => {
        const newList = [...formData.list];
        newList[index] = { ...newList[index], [field]: value };
        setFormData(prev => ({ ...prev, list: newList }));
    };

    const addListItem = () => {
        const newItem: ContentSectionListItem = { id: `item_${Date.now()}`, icon: 'fas fa-check', text: '' };
        setFormData(prev => ({ ...prev, list: [...prev.list, newItem] }));
    };
    
    const removeListItem = (index: number) => {
        setFormData(prev => ({...prev, list: prev.list.filter((_, i) => i !== index)}));
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData, imageFile);
        onClose();
    };
    
    const handleFileChangeForUploader = (file: File) => {
        setImageFile(file);
        setFormData(prev => ({ ...prev, imageUrl: '' }));
    };

    const handleUrlChangeForUploader = (url: string) => {
        setImageFile(null);
        setPreviewUrl(url);
        setFormData(prev => ({ ...prev, imageUrl: url }));
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b">
                    <h2 className="text-2xl font-bold">{section ? 'Editar' : 'Nova'} Seção de Conteúdo</h2>
                    <button onClick={onClose} className="text-2xl">&times;</button>
                </div>
                <div className="overflow-y-auto p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold mb-1">Título</label>
                            <input name="title" value={formData.title} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" required />
                        </div>
                         <ImageUploader
                            label="Imagem da Seção"
                            previewUrl={previewUrl}
                            onFileChange={handleFileChangeForUploader}
                            onUrlChange={handleUrlChangeForUploader}
                            currentUrl={formData.imageUrl}
                        />
                        <div>
                            <label className="block text-sm font-semibold mb-1">Descrição</label>
                            <textarea name="description" value={formData.description} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" rows={4} />
                        </div>
                         <div className="p-3 bg-gray-50 rounded-lg border space-y-3">
                            <label className="flex items-center gap-2 font-semibold">
                                <input type="checkbox" checked={!!formData.isTagVisible} onChange={() => handleToggle('isTagVisible')} />
                                Mostrar Tag de Destaque
                            </label>
                             {formData.isTagVisible && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-fade-in-up">
                                     <div>
                                        <label className="block text-xs font-semibold mb-1">Ícone da Tag</label>
                                        <input name="tagIcon" value={formData.tagIcon} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" placeholder="fas fa-star" />
                                     </div>
                                     <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold mb-1">Texto da Tag</label>
                                        <input name="tag" value={formData.tag} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" placeholder="Nossa Conquista" />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">Lista de Itens</h4>
                            <div className="p-3 bg-gray-50 rounded-lg border space-y-3">
                                {formData.list.map((item, index) => (
                                    <div key={item.id} className="flex items-center gap-2">
                                        <input value={item.icon} onChange={(e) => handleListItemChange(index, 'icon', e.target.value)} className="w-1/3 px-2 py-1 border rounded-md" placeholder="Ícone (fas fa-check)" />
                                        <input value={item.text} onChange={(e) => handleListItemChange(index, 'text', e.target.value)} className="flex-grow px-2 py-1 border rounded-md" placeholder="Texto do item" />
                                        <button type="button" onClick={() => removeListItem(index)} className="bg-red-500 text-white w-8 h-8 rounded-md flex-shrink-0"><i className="fas fa-trash"></i></button>
                                    </div>
                                ))}
                                <button type="button" onClick={addListItem} className="text-sm bg-blue-500 text-white font-semibold py-1 px-3 rounded-lg"><i className="fas fa-plus mr-2"></i>Adicionar Item</button>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button type="button" onClick={onClose} className="bg-gray-200 font-semibold py-2 px-4 rounded-lg">Cancelar</button>
                            <button type="submit" className="bg-accent text-white font-semibold py-2 px-4 rounded-lg"><i className="fas fa-save mr-2"></i>Salvar Seção</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
};
