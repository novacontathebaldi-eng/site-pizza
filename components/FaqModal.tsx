import React, { useState, useEffect } from 'react';
import { FaqItem } from '../types';
import firebase from 'firebase/compat/app';

interface FaqModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (faq: Omit<FaqItem, 'id' | 'createdAt' | 'updatedAt'>, id?: string) => Promise<void>;
    faq: FaqItem | null;
}

export const FaqModal: React.FC<FaqModalProps> = ({ isOpen, onClose, onSave, faq }) => {
    const [question, setQuestion] = useState('');
    const [keywords, setKeywords] = useState('');
    const [answer, setAnswer] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (faq) {
                setQuestion(faq.question);
                setKeywords(faq.keywords.join(', '));
                setAnswer(faq.answer);
            } else {
                setQuestion('');
                setKeywords('');
                setAnswer('');
            }
        }
    }, [faq, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const faqData = {
            question,
            answer,
            keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
            active: faq?.active ?? true,
            order: faq?.order ?? 0,
        };
        await onSave(faqData, faq?.id);
        setIsSaving(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-text-on-light">{faq ? 'Editar Pergunta' : 'Nova Pergunta'}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl" disabled={isSaving}>&times;</button>
                </div>
                <div className="overflow-y-auto p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold mb-1" htmlFor="faq-question">Pergunta Principal *</label>
                            <input id="faq-question" value={question} onChange={(e) => setQuestion(e.target.value)} className="w-full px-3 py-2 border rounded-md" required />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1" htmlFor="faq-keywords">Variações da Pergunta (separadas por vírgula)</label>
                            <input id="faq-keywords" value={keywords} onChange={(e) => setKeywords(e.target.value)} className="w-full px-3 py-2 border rounded-md" placeholder="Ex: horário de entrega, que horas entregam" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1" htmlFor="faq-answer">Resposta *</label>
                            <textarea id="faq-answer" value={answer} onChange={(e) => setAnswer(e.target.value)} className="w-full px-3 py-2 border rounded-md" rows={5} required />
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                            <button type="button" onClick={onClose} disabled={isSaving} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 disabled:opacity-50">Cancelar</button>
                            <button type="submit" disabled={isSaving} className="bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 flex items-center justify-center min-w-[120px] disabled:bg-opacity-70">
                                {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-save mr-2"></i><span>Salvar</span></>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
