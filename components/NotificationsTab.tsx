import React, { useState, useEffect } from 'react';
import { SiteSettings } from '../types';
import { messaging } from '../services/firebase';
import * as firebaseService from '../services/firebaseService';

interface NotificationsTabProps {
    settings: SiteSettings;
    onSave: (settings: SiteSettings, files: {}, audioFiles: {}) => Promise<void>;
}

export const NotificationsTab: React.FC<NotificationsTabProps> = ({ settings, onSave }) => {
    const [notificationSettings, setNotificationSettings] = useState(settings.notificationSettings!);
    const [permissionStatus, setPermissionStatus] = useState(Notification.permission);
    const [isSaving, setIsSaving] = useState(false);
    const [isSubscribing, setIsSubscribing] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    
    useEffect(() => {
        setIsSupported('Notification' in window && 'serviceWorker' in navigator && messaging !== null);
        setNotificationSettings(settings.notificationSettings!);
    }, [settings]);

    const requestPermissionAndSubscribe = async () => {
        if (!isSupported || !messaging) {
            alert("As notificações push não são suportadas neste navegador.");
            return;
        }
        setIsSubscribing(true);
        try {
            const currentToken = await messaging.getToken({ vapidKey: 'BGE3yS8b06g81179YJ2-dFE98w-fD1RkE2fFzOa1B8w1B8w1B8w1B8w1B8w1B8w1B8w1B8w1B8w' });
            if (currentToken) {
                await firebaseService.saveFcmToken(currentToken);
                setPermissionStatus('granted');
                setNotificationSettings(prev => ({ ...prev, browserNotificationsEnabled: true }));
                alert("Notificações ativadas com sucesso!");
                 new Notification('Santa Sensação', {
                    body: 'Ótimo! As notificações push estão ativadas.',
                    icon: '/assets/logo para icones.png'
                });
            } else {
                setPermissionStatus(Notification.permission);
                alert("Permissão de notificação necessária. Por favor, aceite a solicitação do navegador.");
            }
        } catch (err) {
            console.error('An error occurred while retrieving token. ', err);
            setPermissionStatus(Notification.permission);
            if (Notification.permission === 'denied') {
                alert("As notificações foram bloqueadas. Você precisa permitir nas configurações do seu navegador.");
            } else {
                alert("Não foi possível ativar as notificações. Tente novamente.");
            }
        } finally {
            setIsSubscribing(false);
        }
    };
    
    const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        const isEnabled = e.target.checked;
        if (permissionStatus !== 'granted' && isEnabled) {
            alert('Você precisa permitir as notificações no navegador primeiro clicando no botão "Habilitar Notificações".');
            e.target.checked = false;
            return;
        }
        setNotificationSettings(prev => ({ ...prev, browserNotificationsEnabled: isEnabled }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const settingsToSave = { ...settings, notificationSettings };
        await onSave(settingsToSave, {}, {});
        setIsSaving(false);
    };

    const getPermissionStatusInfo = () => {
        switch(permissionStatus) {
            case 'granted':
                return { text: 'Permitido', color: 'text-green-600', icon: 'fas fa-check-circle', canToggle: true };
            case 'denied':
                return { text: 'Bloqueado', color: 'text-red-600', icon: 'fas fa-times-circle', canToggle: false };
            default:
                return { text: 'Pendente', color: 'text-yellow-600', icon: 'fas fa-question-circle', canToggle: false };
        }
    };
    
    const statusInfo = getPermissionStatusInfo();

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in-up">
             <div>
                <h3 className="text-xl font-bold mb-4">Notificações Push no Navegador</h3>
                 {!isSupported && (
                     <div className="p-4 mb-4 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800">
                         <p className="font-bold">Navegador Incompatível</p>
                         <p className="text-sm">Seu navegador atual não suporta notificações push, que são necessárias para receber alertas com o site fechado.</p>
                     </div>
                 )}
                <div className="p-4 bg-gray-50 rounded-lg border space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="font-semibold">Status da Permissão:</span>
                         <span className={`font-bold flex items-center gap-2 ${statusInfo.color}`}>
                            <i className={statusInfo.icon}></i>
                            {statusInfo.text}
                        </span>
                    </div>

                    {permissionStatus === 'default' && isSupported && (
                        <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-md">
                             <p className="text-blue-800 mb-3">Para receber alertas de novos pedidos mesmo com o site fechado, você precisa autorizar as notificações push.</p>
                            <button type="button" onClick={requestPermissionAndSubscribe} disabled={isSubscribing} className="bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600 disabled:bg-blue-300">
                                {isSubscribing ? <><i className="fas fa-spinner fa-spin mr-2"></i>Aguardando...</> : <><i className="fas fa-bell mr-2"></i>Habilitar Notificações</>}
                            </button>
                        </div>
                    )}
                    
                     {permissionStatus === 'denied' && (
                        <div className="text-center p-4 bg-red-50 border border-red-200 rounded-md">
                             <p className="text-red-800">As notificações foram bloqueadas. Você precisa ir até as configurações do seu navegador, encontrar as permissões para este site e alterar para "Permitir".</p>
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-4 border-t">
                        <label htmlFor="enable-notifications-toggle" className="font-semibold cursor-pointer">
                            Receber notificações push de novos pedidos
                        </label>
                        <div className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                id="enable-notifications-toggle" 
                                className="sr-only peer" 
                                checked={notificationSettings.browserNotificationsEnabled}
                                onChange={handleToggle}
                                disabled={!statusInfo.canToggle}
                            />
                            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 peer-disabled:bg-gray-100 peer-disabled:cursor-not-allowed"></div>
                        </div>
                    </div>
                </div>
            </div>
             <div className="flex justify-end pt-4">
                <button type="submit" disabled={isSaving} className="bg-accent text-white font-semibold py-2 px-6 rounded-lg hover:bg-opacity-90 flex items-center disabled:bg-opacity-70">
                    {isSaving ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-save mr-2"></i>}
                    Salvar Configurações de Notificação
                </button>
            </div>
        </form>
    );
};