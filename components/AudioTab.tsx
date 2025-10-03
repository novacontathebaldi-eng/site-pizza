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
    const [isPlaying, setIsPlaying] = useState< 'notification' | 'background' | null >(null);
    
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        setAudioSettings(settings.audioSettings!);
        // Setup audio player
        if (!audioPlayerRef.current) {
            audioPlayerRef.current = new Audio();
            audioPlayerRef.current.onended = () => setIsPlaying(null);
        }
        return () => { // Cleanup on unmount
            audioPlayerRef.current?.pause();
            setIsPlaying(null);
        };
    }, [settings]);


    const handleChange = (field: keyof typeof audioSettings, value: any) => {
        setAudioSettings(prev => ({ ...prev, [field]: value }));
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'notificationSound' | 'backgroundMusic') => {
        const file = e.target.files?.[0];
        if (file) {
            audioPlayerRef.current?.pause();
            setIsPlaying(null);
            setAudioFiles(prev => ({ ...prev, [field]: file }));
            const fileUrl = URL.createObjectURL(file);
            setAudioSettings(prev => ({...prev, [field]: fileUrl}));
        }
    };

    const toggleTestSound = (type: 'notification' | 'background') => {
        const player = audioPlayerRef.current;
        if (!player) return;

        // If another sound is playing, stop it first
        if (isPlaying && isPlaying !== type) {
            player.pause();
        }

        // If the clicked sound is already playing, pause it
        if (isPlaying === type) {
            player.pause();
            setIsPlaying(null);
            return;
        }

        // Otherwise, play the new sound
        const soundUrl = type === 'notification' ? audioSettings.notificationSound : audioSettings.backgroundMusic;
        const volume = type === 'notification' ? audioSettings.notificationVolume : audioSettings.backgroundVolume;

        if (!soundUrl) return;

        player.src = soundUrl;
        player.volume = volume;
        player.play()
            .then(() => setIsPlaying(type))
            .catch(err => {
                console.error("Error playing audio:", err);
                alert("Não foi possível tocar o áudio. A interação do usuário pode ser necessária.");
                setIsPlaying(null);
            });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        audioPlayerRef.current?.pause();
        setIsPlaying(null);
        const settingsToSave = { ...settings, audioSettings };
        await onSave(settingsToSave, {}, audioFiles);
        setAudioFiles({ notificationSound: null, backgroundMusic: null });
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
                            <button type="button" onClick={() => toggleTestSound('notification')} className="bg-blue-500 text-white font-semibold py-2 px-3 rounded-lg hover:bg-blue-600 w-12" aria-label="Testar som">
                                <i className={`fas ${isPlaying === 'notification' ? 'fa-pause' : 'fa-play'}`}></i>
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
                            {audioSettings.backgroundMusic && <p className="text-xs text-gray-500 mt-1">Música atual: {audioSettings.backgroundMusic.split('/').pop()}</p>}
                        </div>
                        <button type="button" onClick={() => toggleTestSound('background')} className="bg-blue-500 text-white font-semibold py-2 px-3 rounded-lg hover:bg-blue-600 w-12 h-10" aria-label="Testar música de fundo" disabled={!audioSettings.backgroundMusic}>
                            <i className={`fas ${isPlaying === 'background' ? 'fa-pause' : 'fa-play'}`}></i>
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