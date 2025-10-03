import React, { useState, useEffect, useRef } from 'react';
import { SiteSettings } from '../types';

interface AudioTabProps {
    settings: SiteSettings;
    onSave: (settings: SiteSettings, files: {}, audioFiles: { [key: string]: File | null }) => Promise<void>;
    notificationAudioRef: React.MutableRefObject<HTMLAudioElement | null>;
    onUnlockAudio: () => void;
}

// Updated to use the new notification sound files from the assets folder.
const defaultSounds = [
    { name: 'Padrão 1', value: '/assets/audio/notf1.mp3' },
    { name: 'Padrão 2', value: '/assets/audio/notf2.mp3' },
    { name: 'Padrão 3', value: '/assets/audio/notf3.mp3' },
    { name: 'Padrão 4', value: '/assets/audio/notf4.mp3' },
    { name: 'Padrão 5', value: '/assets/audio/notf5.mp3' },
];

export const AudioTab: React.FC<AudioTabProps> = ({ settings, onSave, notificationAudioRef, onUnlockAudio }) => {
    const [audioSettings, setAudioSettings] = useState(settings.audioSettings!);
    const [audioFiles, setAudioFiles] = useState<{ [key: string]: File | null }>({
        notificationSound: null,
        backgroundMusic: null,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [playingType, setPlayingType] = useState<'notification' | 'background' | null>(null);
    const [audioUnlocked, setAudioUnlocked] = useState(false);
    
    const backgroundAudioPlayerRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        setAudioSettings(settings.audioSettings!);
        
        const setupPlayer = (player: HTMLAudioElement | null, type: 'notification' | 'background') => {
            if (player) {
                const onEnd = () => { if (playingType === type) setPlayingType(null); };
                player.addEventListener('ended', onEnd);
                player.addEventListener('pause', onEnd);
                return () => {
                    player.removeEventListener('ended', onEnd);
                    player.removeEventListener('pause', onEnd);
                };
            }
        };

        const cleanupNotification = setupPlayer(notificationAudioRef.current, 'notification');
        
        if (!backgroundAudioPlayerRef.current) {
            backgroundAudioPlayerRef.current = new Audio();
        }
        const cleanupBackground = setupPlayer(backgroundAudioPlayerRef.current, 'background');

        return () => {
            cleanupNotification?.();
            cleanupBackground?.();
            notificationAudioRef.current?.pause();
            backgroundAudioPlayerRef.current?.pause();
        };
    }, [settings, notificationAudioRef, playingType]);

    const handleChange = (field: keyof typeof audioSettings, value: any) => {
        setAudioSettings(prev => ({ ...prev, [field]: value }));
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'notificationSound' | 'backgroundMusic') => {
        const file = e.target.files?.[0];
        if (file) {
            notificationAudioRef.current?.pause();
            backgroundAudioPlayerRef.current?.pause();
            setAudioFiles(prev => ({ ...prev, [field]: file }));
            const fileUrl = URL.createObjectURL(file);
            setAudioSettings(prev => ({...prev, [field]: fileUrl}));
        }
    };

    const toggleTestSound = (type: 'notification' | 'background') => {
        if (!audioUnlocked) {
            onUnlockAudio();
            setAudioUnlocked(true);
        }

        const isNotification = type === 'notification';
        const player = isNotification ? notificationAudioRef.current : backgroundAudioPlayerRef.current;
        if (!player) return;

        const soundUrl = isNotification ? audioSettings.notificationSound : audioSettings.backgroundMusic;
        const volume = isNotification ? audioSettings.notificationVolume : audioSettings.backgroundVolume;

        if (!soundUrl) return;

        if (playingType === type && !player.paused) {
            player.pause();
            setPlayingType(null);
        } else {
            if (playingType) {
                (isNotification ? backgroundAudioPlayerRef.current : notificationAudioRef.current)?.pause();
            }
            if (!isNotification && backgroundAudioPlayerRef.current) {
                 backgroundAudioPlayerRef.current.loop = true;
            }
            
            player.src = soundUrl;
            player.volume = volume;
            player.play()
                .then(() => setPlayingType(type))
                .catch(err => {
                    console.error("Error playing audio:", err);
                    alert("Não foi possível tocar o áudio. Pode ser necessário interagir com a página primeiro.");
                    setPlayingType(null);
                });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        notificationAudioRef.current?.pause();
        backgroundAudioPlayerRef.current?.pause();
        const settingsToSave = { ...settings, audioSettings };
        await onSave(settingsToSave, {}, audioFiles);
        setAudioFiles({ notificationSound: null, backgroundMusic: null });
        setIsSaving(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in-up">
            {!audioUnlocked && (
                <div className="p-4 mb-6 bg-blue-50 border-l-4 border-blue-500 text-blue-800">
                    <p className="font-bold"><i className="fas fa-info-circle mr-2"></i>Ação Necessária</p>
                    <p className="text-sm">Para que os sons de notificação funcionem (especialmente no celular), clique em um dos botões <i className="fas fa-play"></i> para ativar o áudio no seu navegador.</p>
                </div>
            )}
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
                            <button type="button" onClick={() => toggleTestSound('notification')} className="bg-blue-500 text-white font-semibold py-2 px-3 rounded-lg hover:bg-blue-600 w-12" aria-label="Testar som">
                                <i className={`fas ${playingType === 'notification' ? 'fa-pause' : 'fa-play'}`}></i>
                            </button>
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
                     <div className="flex items-end gap-2">
                        <div className="flex-grow">
                            <label htmlFor="background-music-upload" className="block text-sm font-semibold mb-1">Enviar Música de Fundo (MP3, WAV)</label>
                            <input type="file" id="background-music-upload" accept="audio/mpeg,audio/wav" onChange={(e) => handleFileChange(e, 'backgroundMusic')} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent/20 file:text-accent hover:file:bg-accent/30" />
                            {audioSettings.backgroundMusic && <p className="text-xs text-gray-500 mt-1">Música atual: {audioFiles.backgroundMusic?.name || audioSettings.backgroundMusic.split('/').pop()}</p>}
                        </div>
                        <button type="button" onClick={() => toggleTestSound('background')} className="bg-blue-500 text-white font-semibold py-2 px-3 rounded-lg hover:bg-blue-600 w-12 h-10" aria-label="Testar música de fundo" disabled={!audioSettings.backgroundMusic}>
                            <i className={`fas ${playingType === 'background' ? 'fa-pause' : 'fa-play'}`}></i>
                        </button>
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