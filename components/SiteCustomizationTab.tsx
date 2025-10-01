import React, { useState, useEffect, useRef } from 'react';
import { SiteSettings, ContentSection, FooterLink } from '../types';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// PROPS
interface SiteCustomizationTabProps {
    settings: SiteSettings;
    onSave: (settings: SiteSettings, files: { [key: string]: File | null }) => Promise<void>;
}

// ImageUploader Component (Helper)
const ImageUploader: React.FC<{
    label: string;
    imageUrl: string;
    onUrlChange: (url: string) => void;
    onFileChange: (file: File | null) => void;
}> = ({ label, imageUrl, onUrlChange, onFileChange }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState(imageUrl);

    useEffect(() => {
        // If imageUrl is a blob url, don't update preview from props
        if (!preview.startsWith('blob:')) {
            setPreview(imageUrl);
        }
    }, [imageUrl]);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            onFileChange(file);
            const objectUrl = URL.createObjectURL(file);
            setPreview(objectUrl);
             // Clean up previous blob url if it exists
            if (preview.startsWith('blob:')) {
                URL.revokeObjectURL(preview);
            }
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

// Main Component
export const SiteCustomizationTab: React.FC<SiteCustomizationTabProps> = ({ settings, onSave }) => {
    const [formData, setFormData] = useState<SiteSettings>(settings);
    const [files, setFiles] = useState<{ [key: string]: File | null }>({});
    const [isSaving, setIsSaving] = useState(false);
    const [activeAccordion, setActiveAccordion] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        setFormData(settings);
    }, [settings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (key: string, file: File | null) => {
        setFiles(prev => ({ ...prev, [key]: file }));
    };

    const handleUrlChange = (field: keyof SiteSettings, url: string) => {
        setFormData(prev => ({ ...prev, [field]: url }));
    };

    // --- Content Section Handlers ---
    const handleSectionChange = (id: string, field: keyof Omit<ContentSection, 'id' | 'list'>, value: any) => {
        const newSections = formData.contentSections.map(s => s.id === id ? { ...s, [field]: value } : s);
        setFormData({ ...formData, contentSections: newSections });
    };

    const handleSectionListItemChange = (sectionId: string, itemIndex: number, field: 'icon' | 'text', value: string) => {
        const newSections = formData.contentSections.map(s => {
            if (s.id === sectionId) {
                const newList = [...s.list];
                newList[itemIndex] = { ...newList[itemIndex], [field]: value };
                return { ...s, list: newList };
            }
            return s;
        });
        setFormData({ ...formData, contentSections: newSections });
    };

    const handleAddSectionListItem = (sectionId: string) => {
        const newSections = formData.contentSections.map(s => {
            if (s.id === sectionId) {
                const newItem = { id: `item-${sectionId}-${Date.now()}`, icon: 'fas fa-check-circle', text: '' };
                return { ...s, list: [...s.list, newItem] };
            }
            return s;
        });
        setFormData({ ...formData, contentSections: newSections });
    };

    const handleRemoveSectionListItem = (sectionId: string, itemIndex: number) => {
         const newSections = formData.contentSections.map(s => {
            if (s.id === sectionId) {
                return { ...s, list: s.list.filter((_, i) => i !== itemIndex) };
            }
            return s;
        });
        setFormData({ ...formData, contentSections: newSections });
    };
    
    const handleAddNewSection = () => {
        const newSection: ContentSection = {
            id: `section-${Date.now()}`,
            order: formData.contentSections.length,
            isVisible: true,
            imageUrl: '',
            tag: 'Nova Seção',
            title: 'Título da Nova Seção',
            description: '',
            list: []
        };
        setFormData({ ...formData, contentSections: [...formData.contentSections, newSection] });
    };

    const handleDeleteSection = (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta seção?')) {
            setFormData({ ...formData, contentSections: formData.contentSections.filter(s => s.id !== id) });
        }
    };
    
    const handleSectionDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = formData.contentSections.findIndex(s => s.id === active.id);
            const newIndex = formData.contentSections.findIndex(s => s.id === over.id);
            const reorderedSections = arrayMove(formData.contentSections, oldIndex, newIndex);
            setFormData({ ...formData, contentSections: reorderedSections.map((s, i) => ({...s, order: i})) });
        }
    };

    // --- Footer Link Handlers ---
    const handleFooterLinkChange = (id: string, field: keyof Omit<FooterLink, 'id'>, value: string) => {
        const newLinks = formData.footerLinks.map(link => link.id === id ? { ...link, [field]: value } : link);
        setFormData({ ...formData, footerLinks: newLinks });
    };

    const handleAddFooterLink = () => {
        const newLink: FooterLink = { id: `footer-${Date.now()}`, icon: 'fas fa-link', text: 'Novo Link', url: '#' };
        setFormData({ ...formData, footerLinks: [...formData.footerLinks, newLink] });
    };

    const handleRemoveFooterLink = (id: string) => {
        setFormData({ ...formData, footerLinks: formData.footerLinks.filter(l => l.id !== id) });
    };

    const handleFooterLinkDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = formData.footerLinks.findIndex(l => l.id === active.id);
            const newIndex = formData.footerLinks.findIndex(l => l.id === over.id);
            setFormData({ ...formData, footerLinks: arrayMove(formData.footerLinks, oldIndex, newIndex) });
        }
    };

    // --- SUBMIT ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        await onSave(formData, files);
        setFiles({}); // Clear files after saving
        setIsSaving(false);
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="space-y-6">

                {/* --- Static Sections Accordion --- */}
                <div className="border rounded-lg bg-gray-50/50">
                    <button type="button" onClick={() => setActiveAccordion(activeAccordion === 'static' ? null : 'static')} className="w-full p-4 text-left font-bold flex justify-between items-center">
                        Configurações Gerais
                        <i className={`fas fa-chevron-down transition-transform ${activeAccordion === 'static' ? 'rotate-180' : ''}`}></i>
                    </button>
                    {activeAccordion === 'static' && (
                        <div className="p-4 border-t space-y-4">
                            <ImageUploader label="Logo da Pizzaria" imageUrl={formData.logoUrl} onUrlChange={(url) => handleUrlChange('logoUrl', url)} onFileChange={(file) => handleFileChange('logo', file)} />
                            <div>
                                <label className="block text-sm font-semibold mb-1">Slogan (Hero)</label>
                                <input name="heroSlogan" value={formData.heroSlogan} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Título Principal (Hero)</label>
                                <input name="heroTitle" value={formData.heroTitle} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Subtítulo (Hero)</label>
                                <textarea name="heroSubtitle" value={formData.heroSubtitle} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" rows={3} />
                            </div>
                            <ImageUploader label="Imagem de Fundo (Hero)" imageUrl={formData.heroBgUrl} onUrlChange={(url) => handleUrlChange('heroBgUrl', url)} onFileChange={(file) => handleFileChange('heroBg', file)} />
                        </div>
                    )}
                </div>

                {/* --- Dynamic Content Sections --- */}
                <div className="p-4 border rounded-lg bg-gray-50/50">
                    <h3 className="text-lg font-bold mb-4 pb-2 border-b">Seções de Conteúdo da Página</h3>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
                        <SortableContext items={formData.contentSections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-3">
                                {formData.contentSections.map(section => (
                                    <SortableContentSectionItem 
                                        key={section.id} 
                                        section={section}
                                        isOpen={activeAccordion === section.id}
                                        onToggle={() => setActiveAccordion(activeAccordion === section.id ? null : section.id)}
                                        onDelete={handleDeleteSection}
                                        onChange={handleSectionChange}
                                        onListItemChange={handleSectionListItemChange}
                                        onAddListItem={handleAddSectionListItem}
                                        onRemoveListItem={handleRemoveSectionListItem}
                                        onFileChange={handleFileChange}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                     <button type="button" onClick={handleAddNewSection} className="mt-4 bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600">
                        <i className="fas fa-plus mr-2"></i>Adicionar Nova Seção
                    </button>
                </div>
                
                {/* --- Footer Links Section --- */}
                 <div className="p-4 border rounded-lg bg-gray-50/50">
                    <h3 className="text-lg font-bold mb-4 pb-2 border-b">Links do Rodapé</h3>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleFooterLinkDragEnd}>
                        <SortableContext items={formData.footerLinks.map(l => l.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-3">
                                {formData.footerLinks.map(link => (
                                    <SortableFooterLinkItem 
                                        key={link.id}
                                        link={link}
                                        onChange={handleFooterLinkChange}
                                        onDelete={handleRemoveFooterLink}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                    <button type="button" onClick={handleAddFooterLink} className="mt-4 bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600">
                        <i className="fas fa-plus mr-2"></i>Adicionar Link
                    </button>
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


// Sortable Item for Content Sections
const SortableContentSectionItem: React.FC<{
    section: ContentSection,
    isOpen: boolean,
    onToggle: () => void,
    onDelete: (id: string) => void,
    onChange: (id: string, field: keyof Omit<ContentSection, 'id' | 'list'>, value: any) => void,
    onListItemChange: (sectionId: string, itemIndex: number, field: 'icon' | 'text', value: string) => void,
    onAddListItem: (sectionId: string) => void,
    onRemoveListItem: (sectionId: string, itemIndex: number) => void,
    onFileChange: (key: string, file: File | null) => void,
}> = (props) => {
    const { section, isOpen, onToggle, onDelete, onChange, onListItemChange, onAddListItem, onRemoveListItem, onFileChange } = props;
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: section.id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div ref={setNodeRef} style={style} className="border rounded-lg bg-white">
            <header className="p-3 flex items-center justify-between bg-gray-100 rounded-t-lg">
                <div className="flex items-center gap-2">
                    <button {...attributes} {...listeners} className="cursor-grab p-2 text-gray-500"><i className="fas fa-grip-vertical"></i></button>
                    <button type="button" onClick={onToggle} className="font-bold text-left flex-grow">{section.title || "Nova Seção"}</button>
                </div>
                <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={section.isVisible} onChange={e => onChange(section.id, 'isVisible', e.target.checked)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                    <button type="button" onClick={() => onDelete(section.id)} className="text-red-500 hover:text-red-700 w-8 h-8 flex items-center justify-center"><i className="fas fa-trash"></i></button>
                    <button type="button" onClick={onToggle} className="text-gray-600 w-8 h-8 flex items-center justify-center">
                        <i className={`fas fa-chevron-down transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
                    </button>
                </div>
            </header>
            {isOpen && (
                <div className="p-4 space-y-4">
                    <ImageUploader label="Imagem da Seção" imageUrl={section.imageUrl} onUrlChange={(url) => onChange(section.id, 'imageUrl', url)} onFileChange={(file) => onFileChange(section.id, file)} />
                    <div>
                        <label className="block text-sm font-semibold mb-1">Etiqueta</label>
                        <input value={section.tag} onChange={e => onChange(section.id, 'tag', e.target.value)} className="w-full px-3 py-2 border rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1">Título</label>
                        <input value={section.title} onChange={e => onChange(section.id, 'title', e.target.value)} className="w-full px-3 py-2 border rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1">Descrição</label>
                        <textarea value={section.description} onChange={e => onChange(section.id, 'description', e.target.value)} className="w-full px-3 py-2 border rounded-md" rows={5} />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1">Lista de Itens</label>
                        <div className="space-y-2">
                             {section.list.map((item, index) => (
                                <div key={item.id} className="flex items-center gap-2">
                                    <input value={item.icon} onChange={(e) => onListItemChange(section.id, index, 'icon', e.target.value)} className="w-1/3 px-3 py-2 border rounded-md" placeholder="Ícone (ex: fas fa-award)" />
                                    <input value={item.text} onChange={(e) => onListItemChange(section.id, index, 'text', e.target.value)} className="w-2/3 px-3 py-2 border rounded-md" placeholder="Texto do item" />
                                    <button type="button" onClick={() => onRemoveListItem(section.id, index)} className="bg-red-500 text-white w-9 h-9 flex-shrink-0 rounded-md hover:bg-red-600 flex items-center justify-center"><i className="fas fa-trash"></i></button>
                                </div>
                            ))}
                        </div>
                         <button type="button" onClick={() => onAddListItem(section.id)} className="mt-3 bg-blue-500 text-white font-semibold py-2 px-3 rounded-lg text-sm"><i className="fas fa-plus mr-2"></i>Adicionar Item</button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Sortable Item for Footer Links
const SortableFooterLinkItem: React.FC<{
    link: FooterLink,
    onChange: (id: string, field: keyof Omit<FooterLink, 'id'>, value: string) => void,
    onDelete: (id: string) => void,
}> = ({ link, onChange, onDelete }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: link.id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    
    return(
        <div ref={setNodeRef} style={style} className="p-3 flex items-center gap-2 bg-white border rounded-lg">
             <button {...attributes} {...listeners} className="cursor-grab p-2 text-gray-500"><i className="fas fa-grip-vertical"></i></button>
             <input value={link.icon} onChange={e => onChange(link.id, 'icon', e.target.value)} className="w-1/4 px-3 py-2 border rounded-md" placeholder="Ícone"/>
             <input value={link.text} onChange={e => onChange(link.id, 'text', e.target.value)} className="w-1/4 px-3 py-2 border rounded-md" placeholder="Texto"/>
             <input value={link.url} onChange={e => onChange(link.id, 'url', e.target.value)} className="w-2/4 px-3 py-2 border rounded-md" placeholder="URL"/>
             <button type="button" onClick={() => onDelete(link.id)} className="bg-red-500 text-white w-9 h-9 flex-shrink-0 rounded-md hover:bg-red-600 flex items-center justify-center"><i className="fas fa-trash"></i></button>
        </div>
    );
}
