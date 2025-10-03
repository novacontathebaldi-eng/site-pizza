import React, { useState, useEffect, useRef } from 'react';
import { SiteSettings } from '../types';

interface AudioTabProps {
    settings: SiteSettings;
    onSave: (settings: SiteSettings, files: {}, audioFiles: { [key: string]: File | null }) => Promise<void>;
}

const defaultSounds = [
    { name: 'Padrão 1 (Ding)', value: '/assets/audio/notification1.mp3' },
    { name: 'Padrão 2 (Plin)', value: '/assets/audio/notification2.mp3' },
    { name: 'Padrão 3 (Sino)', value: '/assets/audio/notification3.mp3' },
    { name: 'Padrão 4 (Alerta Curto)', value: '/assets/audio/notification4.mp3' },
    { name: 'Padrão 5 (Digital)', value: '/assets/audio/notification5.mp3' },
];

export const AudioTab: React.FC<AudioTabProps> = ({ settings, onSave }) => {
    const [audioSettings, setAudioSettings] = useState(settings.audioSettings!);
    const [audioFiles, setAudioFiles] = useState<{ [key: string]: File | null }>({
        notificationSound: null,
        backgroundMusic: null,
    });
    const [isSaving, setIsSaving] = useState(false);
    
    const audioPlayerRef = useRef<HTMLAudioElement>(new Audio());

    useEffect(() => {
        setAudioSettings(settings.audioSettings!);
    }, [settings]);

    const handleChange = (field: keyof typeof audioSettings, value: any) => {
        setAudioSettings(prev => ({ ...prev, [field]: value }));
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'notificationSound' | 'backgroundMusic') => {
        const file = e.target.files?.[0];
        if (file) {
            setAudioFiles(prev => ({ ...prev, [field]: file }));
            // Preview the sound
            const fileUrl = URL.createObjectURL(file);
            setAudioSettings(prev => ({...prev, [field]: fileUrl}));
        }
    };

    const playTestSound = () => {
        const player = audioPlayerRef.current;
        const soundUrl = audioSettings.notificationSound;
        
        if (!soundUrl) return;

        player.src = soundUrl;
        player.volume = audioSettings.notificationVolume;
        player.play().catch(err => {
            console.error("Error playing audio:", err);
            alert("Não foi possível tocar o áudio. A interação do usuário pode ser necessária.");
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const settingsToSave = { ...settings, audioSettings };
        await onSave(settingsToSave, {}, audioFiles);
        setAudioFiles({ notificationSound: null, backgroundMusic: null }); // Reset files after save
        setIsSaving(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in-up">
            <div>
                <h3 className="text-xl font-bold mb-4">Áudio de Notificação de Pedido</h3>
                <div className="p-4 bg-gray-50 rounded-lg border space-y-4">
                    <div>
                        <label htmlFor="notification-sound" className="block text-sm font-semibold mb-1">Som de Notificação</label>
                         <div className="flex gap-2">
                            <select
                                id="notification-sound"
                                value={audioSettings.notificationSound}
                                onChange={(e) => handleChange('notificationSound', e.target.value)}
                                className="w-full px-3 py-2 border rounded-md bg-white"
                            >
                                <optgroup label="Sons Padrão">
                                    {defaultSounds.map(sound => (
                                        <option key={sound.value} value={sound.value}>{sound.name}</option>
                                    ))}
                                </optgroup>
                                 <option value="" disabled>Ou envie um arquivo</option>
                            </select>
                            <button type="button" onClick={playTestSound} className="bg-blue-500 text-white font-semibold py-2 px-3 rounded-lg hover:bg-blue-600" aria-label="Testar som"><i className="fas fa-play"></i></button>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="notification-sound-upload" className="block text-sm font-semibold mb-1">Enviar Som Personalizado (MP3, WAV)</label>
                        <input type="file" id="notification-sound-upload" accept="audio/mpeg,audio/wav" onChange={(e) => handleFileChange(e, 'notificationSound')} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent/20 file:text-accent hover:file:bg-accent/30" />
                    </div>
                    <div>
                         <label htmlFor="notification-volume" className="block text-sm font-semibold mb-1">Volume da Notificação ({Math.round(audioSettings.notificationVolume * 100)}%)</label>
                         <input
                            id="notification-volume"
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={audioSettings.notificationVolume}
                            onChange={(e) => handleChange('notificationVolume', parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                         />
                    </div>
                </div>
            </div>
             <div>
                <h3 className="text-xl font-bold mb-4">Música de Fundo (Opcional)</h3>
                <div className="p-4 bg-gray-50 rounded-lg border space-y-4">
                     <div>
                        <label htmlFor="background-music-upload" className="block text-sm font-semibold mb-1">Enviar Música de Fundo (MP3, WAV)</label>
                        <input type="file" id="background-music-upload" accept="audio/mpeg,audio/wav" onChange={(e) => handleFileChange(e, 'backgroundMusic')} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent/20 file:text-accent hover:file:bg-accent/30" />
                        {audioSettings.backgroundMusic && <p className="text-xs text-gray-500 mt-1">Música atual: {audioSettings.backgroundMusic.split('/').pop()}</p>}
                    </div>
                     <div>
                         <label htmlFor="background-volume" className="block text-sm font-semibold mb-1">Volume da Música de Fundo ({Math.round(audioSettings.backgroundVolume * 100)}%)</label>
                         <input
                            id="background-volume"
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={audioSettings.backgroundVolume}
                            onChange={(e) => handleChange('backgroundVolume', parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                         />
                    </div>
                </div>
            </div>
             <div className="flex justify-end pt-4">
                <button type="submit" disabled={isSaving} className="bg-accent text-white font-semibold py-2 px-6 rounded-lg hover:bg-opacity-90 flex items-center disabled:bg-opacity-70">
                    {isSaving ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-save mr-2"></i>}
                    Salvar Configurações de Áudio
                </button>
            </div>
        </form>
    );
};
