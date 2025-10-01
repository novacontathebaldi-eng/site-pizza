import React, { useState, useEffect, useRef } from 'react';
import { SiteSettings } from '../types';

interface SiteCustomizationTabProps {
    settings: SiteSettings;
    onSave: (settings: SiteSettings, files: { [key: string]: File | null }) => Promise<void>;
}

interface ImageUploaderProps {
    label: string;
    imageUrl: string;
    onUrlChange: (url: string) => void;
    onFileChange: (file: File | null) => void;
    imageKey: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ label, imageUrl, onUrlChange, onFileChange, imageKey }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState(imageUrl);

    useEffect(() => {
        setPreview(imageUrl);
    }, [imageUrl]);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            onFileChange(file);
            const objectUrl = URL.createObjectURL(file);
            setPreview(objectUrl);
        }
    };
    
    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUrlChange(e.target.value);
        setPreview(e.target.value);
        onFileChange(null);
    }

    return (
        <div>
            <label className="block text-sm font-semibold mb-1">{label}</label>
            <div className="flex items-center gap-4">
                <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center border overflow-hidden">
                    {preview ? <img src={preview} alt="Prévia" className="w-full h-full object-cover" /> : <i className="fas fa-image text-3xl text-gray-300"></i>}
                </div>
                <div className="flex-grow space-y-2">
                    <input value={imageUrl} onChange={handleUrlChange} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="Ou cole uma URL aqui" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full text-sm bg-gray-200 text-gray-800 font-semibold py-2 px-3 rounded-lg hover:bg-gray-300">
                        <i className="fas fa-upload mr-2"></i>Enviar Arquivo
                    </button>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                </div>
            </div>
        </div>
    );
};


export const SiteCustomizationTab: React.FC<SiteCustomizationTabProps> = ({ settings, onSave }) => {
    const [formData, setFormData] = useState<SiteSettings>(settings);
    const [files, setFiles] = useState<{ [key: string]: File | null }>({
        logo: null,
        heroBg: null,
        aboutImage: null,
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setFormData(settings);
    }, [settings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleListItemChange = (index: number, field: 'icon' | 'text', value: string) => {
        const newList = [...formData.aboutList];
        newList[index] = { ...newList[index], [field]: value };
        setFormData({ ...formData, aboutList: newList });
    };

    const handleAddListItem = () => {
        const newList = [...formData.aboutList, { icon: 'fas fa-check-circle', text: '' }];
        setFormData({ ...formData, aboutList: newList });
    };
    
    const handleRemoveListItem = (index: number) => {
        const newList = formData.aboutList.filter((_, i) => i !== index);
        setFormData({ ...formData, aboutList: newList });
    };

    const handleUrlChange = (field: keyof SiteSettings, url: string) => {
        setFormData(prev => ({ ...prev, [field]: url }));
    };

    const handleFileChange = (key: string, file: File | null) => {
        setFiles(prev => ({ ...prev, [key]: file }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        await onSave(formData, files);
        setIsSaving(false);
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="space-y-8">
                {/* Section: Topo e Cabeçalho */}
                <div className="p-4 border rounded-lg bg-gray-50/50">
                    <h3 className="text-lg font-bold mb-4 pb-2 border-b">Topo e Cabeçalho</h3>
                    <div className="space-y-4">
                        <ImageUploader
                            label="Logo da Pizzaria"
                            imageUrl={formData.logoUrl}
                            onUrlChange={(url) => handleUrlChange('logoUrl', url)}
                            onFileChange={(file) => handleFileChange('logo', file)}
                            imageKey="logo"
                        />
                        <div>
                            <label className="block text-sm font-semibold mb-1">Texto do Slogan (Hero Section)</label>
                            <input name="heroSlogan" value={formData.heroSlogan} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1">Título Principal (Hero Section)</label>
                            <input name="heroTitle" value={formData.heroTitle} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1">Subtítulo (Hero Section)</label>
                            <textarea name="heroSubtitle" value={formData.heroSubtitle} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" rows={3} />
                        </div>
                    </div>
                </div>

                {/* Section: Imagem de Fundo Principal */}
                <div className="p-4 border rounded-lg bg-gray-50/50">
                     <h3 className="text-lg font-bold mb-4 pb-2 border-b">Imagem de Fundo Principal</h3>
                     <ImageUploader
                        label="Imagem de Fundo (Hero Section)"
                        imageUrl={formData.heroBgUrl}
                        onUrlChange={(url) => handleUrlChange('heroBgUrl', url)}
                        onFileChange={(file) => handleFileChange('heroBg', file)}
                        imageKey="heroBg"
                    />
                </div>

                {/* Section: Sobre Nós */}
                <div className="p-4 border rounded-lg bg-gray-50/50">
                    <h3 className="text-lg font-bold mb-4 pb-2 border-b">Seção "Sobre Nós"</h3>
                    <div className="space-y-4">
                        <ImageUploader
                            label="Imagem da Seção Sobre"
                            imageUrl={formData.aboutImageUrl}
                            onUrlChange={(url) => handleUrlChange('aboutImageUrl', url)}
                            onFileChange={(file) => handleFileChange('aboutImage', file)}
                            imageKey="aboutImage"
                        />
                         <div>
                            <label className="block text-sm font-semibold mb-1">Etiqueta do Título</label>
                            <input name="aboutTag" value={formData.aboutTag} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" />
                        </div>
                         <div>
                            <label className="block text-sm font-semibold mb-1">Título da Seção</label>
                            <input name="aboutTitle" value={formData.aboutTitle} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1">Parágrafo de Descrição</label>
                            <textarea name="aboutDescription" value={formData.aboutDescription} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" rows={6} />
                        </div>
                         <div>
                            <label className="block text-sm font-semibold mb-1">Lista de Conquistas</label>
                            <p className="text-xs text-gray-500 mb-2">
                                Use classes do Font Awesome para os ícones (ex: <code>fas fa-award</code>).{' '}
                                <a href="https://fontawesome.com/v6/search?m=free&s=solid" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                    Buscar ícones
                                </a>
                            </p>
                            <div className="space-y-3">
                                {formData.aboutList.map((item, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <input 
                                            value={item.icon} 
                                            onChange={(e) => handleListItemChange(index, 'icon', e.target.value)} 
                                            className="w-1/3 px-3 py-2 border rounded-md"
                                            placeholder="Classe do Ícone"
                                        />
                                        <input 
                                            value={item.text} 
                                            onChange={(e) => handleListItemChange(index, 'text', e.target.value)} 
                                            className="w-2/3 px-3 py-2 border rounded-md"
                                            placeholder="Texto da Conquista"
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => handleRemoveListItem(index)}
                                            className="bg-red-500 text-white w-9 h-9 flex-shrink-0 rounded-md hover:bg-red-600 flex items-center justify-center"
                                            aria-label="Remover item"
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button 
                                type="button" 
                                onClick={handleAddListItem}
                                className="mt-3 bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600 transition-all text-sm"
                            >
                                <i className="fas fa-plus mr-2"></i>Adicionar Item
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 pt-4 border-t">
                <button type="submit" disabled={isSaving} className="bg-accent text-white font-semibold py-2 px-6 rounded-lg hover:bg-opacity-90 flex items-center justify-center min-w-[180px] disabled:bg-opacity-70">
                    {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-save mr-2"></i><span>Salvar Alterações</span></>}
                </button>
            </div>
        </form>
    );
};