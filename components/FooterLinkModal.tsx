import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FooterLink } from '../types';

interface FooterLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (link: FooterLink) => void;
    link: FooterLink | null;
}

export const FooterLinkModal: React.FC<FooterLinkModalProps> = ({ isOpen, onClose, onSave, link }) => {
    const getInitialState = (): Omit<FooterLink, 'id'> => ({
        icon: 'fas fa-link',
        text: '',
        url: '',
        isVisible: true
    });

    const [formData, setFormData] = useState<FooterLink>(link || { ...getInitialState(), id: '' });

    useEffect(() => {
        if (isOpen) {
            if (link) {
                setFormData(link);
            } else {
                setFormData({ ...getInitialState(), id: `new_${Date.now()}` });
            }
        }
    }, [link, isOpen]);

    if (!isOpen) return null;
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({...prev, [e.target.name]: e.target.value}));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                 <div className="flex justify-between items-center p-5 border-b">
                    <h2 className="text-2xl font-bold">{link ? 'Editar' : 'Novo'} Link do Rodapé</h2>
                    <button onClick={onClose} className="text-2xl">&times;</button>
                </div>
                <div className="overflow-y-auto p-6">
                     <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold mb-1">Texto do Link</label>
                            <input name="text" value={formData.text} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" required />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1">URL (Link de destino)</label>
                            <input name="url" value={formData.url} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" required />
                        </div>
                         <div>
                            <label className="block text-sm font-semibold mb-1">Ícone (FontAwesome)</label>
                            <input name="icon" value={formData.icon} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" placeholder="Ex: fab fa-whatsapp" required />
                             <p className="text-xs text-gray-500 mt-1">Use 'fab' para marcas (WhatsApp, Instagram) e 'fas' para ícones gerais.</p>
                        </div>
                         <div className="flex justify-end gap-3 pt-4">
                            <button type="button" onClick={onClose} className="bg-gray-200 font-semibold py-2 px-4 rounded-lg">Cancelar</button>
                            <button type="submit" className="bg-accent text-white font-semibold py-2 px-4 rounded-lg"><i className="fas fa-save mr-2"></i>Salvar Link</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
};
