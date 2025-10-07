import React, { useState, useEffect } from 'react';
import { SiteSettings } from '../types';

interface NotificationsTabProps {
    settings: SiteSettings;
    onSave: (settings: SiteSettings, files: {}, audioFiles: {}) => Promise<void>;
}

export const NotificationsTab: React.FC<NotificationsTabProps> = ({ settings, onSave }) => {
    const [notificationSettings, setNotificationSettings] = useState(settings.notificationSettings || { browserNotificationsEnabled: false });
    const [permissionStatus, setPermissionStatus] = useState(Notification.permission);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setNotificationSettings(settings.notificationSettings || { browserNotificationsEnabled: false });
    }, [settings]);

    const requestPermission = () => {
        Notification.requestPermission().then(status => {
            setPermissionStatus(status);
            if (status !== 'granted') {
                setNotificationSettings(prev => ({ ...prev, browserNotificationsEnabled: false }));
            }
        });
    };

    const handleToggle = () => {
        if (permissionStatus !== 'granted') {
            alert('Você precisa permitir as notificações no navegador primeiro.');
            requestPermission();
            return;
        }
        setNotificationSettings(prev => ({ ...prev, browserNotificationsEnabled: !prev.browserNotificationsEnabled }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const newSettings = { ...settings, notificationSettings };
        await onSave(newSettings, {}, {});
        setIsSaving(false);
    };

    const getPermissionStatusInfo = () => {
        switch (permissionStatus) {
            case 'granted':
                return { text: 'Permitidas', color: 'text-green-600', icon: 'fa-check-circle' };
            case 'denied':
                return { text: 'Bloqueadas', color: 'text-red-600', icon: 'fa-times-circle' };
            default:
                return { text: 'Não solicitado', color: 'text-yellow-600', icon: 'fa-question-circle' };
        }
    };

    const statusInfo = getPermissionStatusInfo();

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="p-4 border rounded-lg bg-gray-50/50">
                <h3 className="text-lg font-bold mb-4 pb-2 border-b">Notificações do Navegador</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <div>
                            <p className="font-semibold">Status da Permissão</p>
                            <p className={`text-sm font-bold ${statusInfo.color}`}>
                                <i className={`fas ${statusInfo.icon} mr-2`}></i>{statusInfo.text}
                            </p>
                        </div>
                        {permissionStatus === 'default' && (
                            <button type="button" onClick={requestPermission} className="bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600">
                                Solicitar Permissão
                            </button>
                        )}
                        {permissionStatus === 'denied' && (
                            <p className="text-xs text-red-600 max-w-xs">Você precisa alterar as permissões nas configurações do seu navegador para reativar.</p>
                        )}
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <p className="font-semibold">Ativar notificações de novos pedidos</p>
                         <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={notificationSettings.browserNotificationsEnabled}
                                onChange={handleToggle}
                                className="sr-only peer"
                                disabled={permissionStatus !== 'granted'}
                            />
                            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 peer-disabled:opacity-50"></div>
                        </label>
                    </div>
                </div>
            </div>

            <div className="mt-8 pt-4 border-t">
                <button type="submit" disabled={isSaving} className="bg-accent text-white font-semibold py-2 px-6 rounded-lg hover:bg-opacity-90">
                    {isSaving ? 'Salvando...' : 'Salvar Configurações de Notificação'}
                </button>
            </div>
        </form>
    );
};
