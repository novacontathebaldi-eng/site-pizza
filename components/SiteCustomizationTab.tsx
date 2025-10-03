import React, { useState, useEffect, useRef } from 'react';
import { SiteSettings, ContentSection, FooterLink, ContentSectionListItem } from '../types';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ContentSectionModal } from './ContentSectionModal';
import { FooterLinkModal } from './FooterLinkModal';

interface SiteCustomizationTabProps {
    settings: SiteSettings;
    onSave: (settings: SiteSettings, files: { [key: string]: File | null }, audioFiles: { [key: string]: File | null }) => Promise<void>;
}

const ImageUploader: React.FC<{
    label: string;
    previewUrl: string;
    onFileChange: (file: File) => void;
    onUrlChange: (url: string) => void;
    currentUrl: string;
}> = ({ label, previewUrl, onFileChange, onUrlChange, currentUrl }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    return (
        <div>
            <label className="block text-sm font-semibold mb-1">{label}</label>
            <div className="flex items-center gap-4">
                <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center border overflow-hidden">
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

const SortableContentSectionItem: React.FC<{ section: ContentSection; onEdit: () => void; onDelete: () => void; onToggle: () => void; }> = ({ section, onEdit, onDelete, onToggle }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
    const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : 'auto' };

    return (
        <div ref={setNodeRef} style={style} className={`bg-gray-50 p-3 rounded-lg flex justify-between items-center transition-opacity ${!section.isVisible ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-4"><button {...attributes} {...listeners} className="cursor-grab touch-none p-2"><i className="fas fa-grip-vertical text-gray-500"></i></button><p className="font-bold">{section.title}</p></div>
            <div className="flex items-center gap-4">
                <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={section.isVisible} onChange={onToggle} className="sr-only peer" /><div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 peer-checked:bg-green-600"></div></label>
                <button onClick={onEdit} className="bg-blue-500 text-white w-8 h-8 rounded-md hover:bg-blue-600"><i className="fas fa-edit"></i></button>
                <button onClick={onDelete} className="bg-red-500 text-white w-8 h-8 rounded-md hover:bg-red-600"><i className="fas fa-trash"></i></button>
            </div>
        </div>
    );
};

const SortableFooterLinkItem: React.FC<{ link: FooterLink; onEdit: () => void; onDelete: () => void; onToggle: () => void; }> = ({ link, onEdit, onDelete, onToggle }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: link.id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    return (
        <div ref={setNodeRef} style={style} className={`bg-gray-50 p-3 rounded-lg flex justify-between items-center ${link.isVisible === false ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-4"><button {...attributes} {...listeners} className="cursor-grab p-2"><i className="fas fa-grip-vertical text-gray-500"></i></button><p className="font-bold"><i className={`${link.icon} mr-2`}></i>{link.text}</p></div>
            <div className="flex items-center gap-4">
                <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={link.isVisible !== false} onChange={onToggle} className="sr-only peer" /><div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 peer-checked:bg-green-600"></div></label>
                <button onClick={onEdit} className="bg-blue-500 text-white w-8 h-8 rounded-md"><i className="fas fa-edit"></i></button>
                <button onClick={onDelete} className="bg-red-500 text-white w-8 h-8 rounded-md"><i className="fas fa-trash"></i></button>
            </div>
        </div>
    );
};

export const SiteCustomizationTab: React.FC<SiteCustomizationTabProps> = ({ settings, onSave }) => {
    const [formData, setFormData] = useState<SiteSettings>(settings);
    const [files, setFiles] = useState<{ [key: string]: File | null }>({});
    const [previews, setPreviews] = useState<{ [key: string]: string }>({});
    const [editingSection, setEditingSection] = useState<ContentSection | null>(null);
    const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
    const [editingLink, setEditingLink] = useState<FooterLink | null>(null);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setFormData(settings);
        setPreviews({ logo: settings.logoUrl, heroBg: settings.heroBgUrl, ...settings.contentSections.reduce((acc, s) => ({ ...acc, [s.id]: s.imageUrl }), {}) });
    }, [settings]);

    const handleFileChange = (key: string, file: File) => {
        setFiles(prev => ({ ...prev, [key]: file }));
        setPreviews(prev => ({ ...prev, [key]: URL.createObjectURL(file) }));
    };
    const handleUrlChange = (key: string, url: string, formField: keyof SiteSettings | { sectionId: string }) => {
        setFiles(prev => ({ ...prev, [key]: null }));
        setPreviews(prev => ({ ...prev, [key]: url }));
        if (typeof formField === 'string') {
            setFormData(prev => ({ ...prev, [formField]: url }));
        } else if ('sectionId' in formField) {
            setFormData(prev => ({ ...prev, contentSections: prev.contentSections.map(s => s.id === formField.sectionId ? { ...s, imageUrl: url } : s) }));
        }
    };
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleContentDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setFormData(prev => {
                const oldIndex = prev.contentSections.findIndex(s => s.id === active.id);
                const newIndex = prev.contentSections.findIndex(s => s.id === over.id);
                return { ...prev, contentSections: arrayMove(prev.contentSections, oldIndex, newIndex).map((s, i) => ({ ...s, order: i })) };
            });
        }
    };

    const handleFooterDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setFormData(prev => {
                const oldIndex = prev.footerLinks.findIndex(l => l.id === active.id);
                const newIndex = prev.footerLinks.findIndex(l => l.id === over.id);
                return { ...prev, footerLinks: arrayMove(prev.footerLinks, oldIndex, newIndex) };
            });
        }
    };
    
    const handleToggleSection = (sectionId: string) => setFormData(prev => ({ ...prev, contentSections: prev.contentSections.map(s => s.id === sectionId ? { ...s, isVisible: !s.isVisible } : s)}));
    const handleDeleteSection = (sectionId: string) => { if(window.confirm("Tem certeza?")) { setFormData(prev => ({ ...prev, contentSections: prev.contentSections.filter(s => s.id !== sectionId)})) }};
    const handleEditSection = (section: ContentSection) => { setEditingSection(section); setIsSectionModalOpen(true); };
    const handleSaveSection = (section: ContentSection) => { setFormData(prev => ({...prev, contentSections: prev.contentSections.map(s => s.id === section.id ? section : s)})); };
    
    const handleToggleLink = (linkId: string) => setFormData(prev => ({ ...prev, footerLinks: prev.footerLinks.map(l => l.id === linkId ? { ...l, isVisible: !(l.isVisible !== false) } : l)}));
    const handleDeleteLink = (linkId: string) => { if(window.confirm("Tem certeza?")) { setFormData(prev => ({ ...prev, footerLinks: prev.footerLinks.filter(l => l.id !== linkId)})) }};
    const handleEditLink = (link: FooterLink) => { setEditingLink(link); setIsLinkModalOpen(true); };
    const handleSaveLink = (link: FooterLink) => { setFormData(prev => ({...prev, footerLinks: prev.footerLinks.map(l => l.id === link.id ? link : l)})); };

    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        await onSave(formData, files, {});
        setFiles({});
        setIsSaving(false);
    };

    return (
        <>
        <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in-up">
            <div className="p-4 bg-gray-50 rounded-lg border">
                <h3 className="text-xl font-bold mb-4">Aparência Geral</h3>
                <ImageUploader label="Logo da Pizzaria" previewUrl={previews.logo || ''} onFileChange={f => handleFileChange('logo', f)} onUrlChange={url => handleUrlChange('logo', url, 'logoUrl')} currentUrl={formData.logoUrl} />
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border space-y-4">
                <h3 className="text-xl font-bold">Seção de Herói (Topo)</h3>
                <ImageUploader label="Imagem de Fundo" previewUrl={previews.heroBg || ''} onFileChange={f => handleFileChange('heroBg', f)} onUrlChange={url => handleUrlChange('heroBg', url, 'heroBgUrl')} currentUrl={formData.heroBgUrl} />
                <div><label className="block text-sm font-semibold mb-1">Slogan</label><input name="heroSlogan" value={formData.heroSlogan} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" /></div>
                <div><label className="block text-sm font-semibold mb-1">Título Principal</label><input name="heroTitle" value={formData.heroTitle} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" /></div>
                <div><label className="block text-sm font-semibold mb-1">Subtítulo</label><input name="heroSubtitle" value={formData.heroSubtitle} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" /></div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg border space-y-4">
                 <h3 className="text-xl font-bold">Seções de Conteúdo (Sobre Nós, etc)</h3>
                 <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleContentDragEnd}>
                    <SortableContext items={formData.contentSections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                        {formData.contentSections.map(section => (
                            <SortableContentSectionItem key={section.id} section={section} onEdit={() => handleEditSection(section)} onDelete={() => handleDeleteSection(section.id)} onToggle={() => handleToggleSection(section.id)} />
                        ))}
                        </div>
                    </SortableContext>
                 </DndContext>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg border space-y-4">
                 <h3 className="text-xl font-bold">Links do Rodapé</h3>
                 <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleFooterDragEnd}>
                    <SortableContext items={formData.footerLinks.map(l => l.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                        {formData.footerLinks.map(link => (
                           <SortableFooterLinkItem key={link.id} link={link} onEdit={() => handleEditLink(link)} onDelete={() => handleDeleteLink(link.id)} onToggle={() => handleToggleLink(link.id)} />
                        ))}
                        </div>
                    </SortableContext>
                 </DndContext>
            </div>

            <div className="flex justify-end pt-4">
                <button type="submit" disabled={isSaving} className="bg-accent text-white font-semibold py-2 px-6 rounded-lg hover:bg-opacity-90 flex items-center disabled:bg-opacity-70">
                    {isSaving ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-save mr-2"></i>}
                    Salvar Personalização
                </button>
            </div>
        </form>
        <ContentSectionModal isOpen={isSectionModalOpen} onClose={() => setIsSectionModalOpen(false)} section={editingSection} onSave={handleSaveSection} />
        <FooterLinkModal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} link={editingLink} onSave={handleSaveLink} />
        </>
    );
};