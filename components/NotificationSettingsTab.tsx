import React, { useState, useEffect } from 'react';
import { SiteSettings } from '../types';

interface NotificationSettingsTabProps {
    settings: SiteSettings;
    onSave: (settings: SiteSettings, files: { [key: string]: File | null }) => Promise<void>;
}

export const NotificationSettingsTab: React.FC<NotificationSettingsTabProps> = ({ settings, onSave }) => {
    const [notificationSettings, setNotificationSettings] = useState(settings.notificationSettings);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setNotificationSettings(settings.notificationSettings);
    }, [settings]);

    const handleChange = (field: keyof typeof notificationSettings, value: any) => {
        setNotificationSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        const newSettings = { ...settings, notificationSettings };
        await onSave(newSettings, {});
        setIsSaving(false);
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="p-4 border rounded-lg bg-white">
                <label className="flex items-center gap-3 cursor-pointer mb-4">
                    <input type="checkbox" checked={notificationSettings.enabled} onChange={e => handleChange('enabled', e.target.checked)} className="w-5 h-5"/>
                    <span className="font-bold text-lg">Ativar Notificações do Painel</span>
                </label>

                {notificationSettings.enabled && (
                    <div className="space-y-6 pl-8 animate-fade-in-up">
                        <div>
                            <h4 className="font-semibold mb-2">Tipos de Notificação</h4>
                             <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={notificationSettings.notifyOnNewOrder} onChange={e => handleChange('notifyOnNewOrder', e.target.checked)} className="w-5 h-5"/>
                                <span className="font-medium">Notificar ao receber um novo pedido pendente</span>
                            </label>
                             <p className="text-xs text-gray-500 mt-2 pl-8">(Mais opções de notificação serão adicionadas no futuro, como confirmação de pagamento PIX.)</p>
                        </div>

                         <div>
                            <label className="block text-sm font-semibold mb-1">Posição na Tela</label>
                             <select
                                value={notificationSettings.position}
                                onChange={e => handleChange('position', e.target.value as 'top-right' | 'bottom-left')}
                                className="w-full md:w-1/2 px-3 py-2 border rounded-md bg-white"
                            >
                                <option value="top-right">Canto Superior Direito</option>
                                <option value="bottom-left">Canto Inferior Esquerdo</option>
                            </select>
                        </div>
                        
                        <div>
                             <label className="block text-sm font-semibold mb-1">Duração da Notificação: <span className="font-bold">{notificationSettings.duration} segundos</span></label>
                            <input
                                type="range"
                                min="3"
                                max="20"
                                step="1"
                                value={notificationSettings.duration}
                                onChange={e => handleChange('duration', parseInt(e.target.value, 10))}
                                className="w-full md:w-1/2"
                            />
                        </div>

                    </div>
                )}
            </div>
             <div className="mt-6">
                <button onClick={handleSave} disabled={isSaving} className="bg-accent text-white font-semibold py-2 px-6 rounded-lg hover:bg-opacity-90 disabled:bg-opacity-70">
                    {isSaving ? 'Salvando...' : 'Salvar Configurações de Notificação'}
                </button>
            </div>
        </div>
    );
};
