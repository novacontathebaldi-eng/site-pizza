import React, { useState, useEffect, useRef } from 'react';
import { SiteSettings } from '../types';

interface AudioTabProps {
    settings: SiteSettings;
    onSave: (settings: SiteSettings, files: {}, audioFiles: { [key: string]: File | null }) => Promise<void>;
}

const defaultSounds = [
    { name: 'Padrão 1 (Ding)', value: '/assets/audio/notification1.mp3' },
    { name: 'Padrão 2 (Plin)', value: '/assets/audio/notification2.mp3' },
];

export const AudioTab: React.FC<AudioTabProps> = ({ settings, onSave }) => {
    const [audioSettings, setAudioSettings] = useState(settings.audioSettings || { notificationSound: 'default-1', notificationVolume: 0.5, backgroundMusic: '', backgroundVolume: 0.2 });
    const [audioFiles, setAudioFiles] = useState<{ [key: string]: File | null }>({});
    const [isSaving, setIsSaving] = useState(false);
    const [bgMusicPreview, setBgMusicPreview] = useState<string | null>(null);

    const audioRef = useRef<HTMLAudioElement>(null);
    const bgMusicRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        setAudioSettings(settings.audioSettings || { notificationSound: 'default-1', notificationVolume: 0.5, backgroundMusic: '', backgroundVolume: 0.2 });
    }, [settings]);
    
    useEffect(() => {
        if (bgMusicRef.current) {
            bgMusicRef.current.volume = audioSettings.backgroundVolume;
        }
    }, [audioSettings.backgroundVolume]);

    const handleChange = (field: keyof typeof audioSettings, value: any) => {
        setAudioSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'notificationSound' | 'backgroundMusic') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAudioFiles(prev => ({ ...prev, [field]: file }));
            const objectUrl = URL.createObjectURL(file);

            if (field === 'backgroundMusic') {
                setBgMusicPreview(objectUrl);
            }
            // For notification sound, we can set it directly for preview
            if (field === 'notificationSound') {
                setAudioSettings(prev => ({...prev, notificationSound: objectUrl }));
            }
        }
    };
    
    const playPreview = () => {
        if (audioRef.current) {
            audioRef.current.src = audioSettings.notificationSound;
            audioRef.current.volume = audioSettings.notificationVolume;
            audioRef.current.play().catch(e => console.error("Preview failed", e));
        }
    };
    
    const toggleBackgroundMusic = () => {
        if (bgMusicRef.current) {
            if (bgMusicRef.current.paused) {
                bgMusicRef.current.play().catch(e => console.error("BG music failed", e));
            } else {
                bgMusicRef.current.pause();
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const newSettings = { ...settings, audioSettings };
        await onSave(newSettings, {}, audioFiles);
        setAudioFiles({}); // Clear files after saving
        setIsSaving(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <audio ref={audioRef} />
            <audio ref={bgMusicRef} src={bgMusicPreview || audioSettings.backgroundMusic} loop />

            <div className="p-4 border rounded-lg bg-gray-50/50">
                <h3 className="text-lg font-bold mb-4 pb-2 border-b">Som de Notificação</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold mb-1">Escolha o som</label>
                        <select
                            value={audioSettings.notificationSound}
                            onChange={(e) => handleChange('notificationSound', e.target.value)}
                            className="w-full p-2 border rounded-md bg-white"
                        >
                            <optgroup label="Padrões">
                                {defaultSounds.map(sound => <option key={sound.value} value={sound.value}>{sound.name}</option>)}
                            </optgroup>
                            {audioSettings.notificationSound && !defaultSounds.some(s => s.value === audioSettings.notificationSound) && (
                                <optgroup label="Personalizado">
                                    <option value={audioSettings.notificationSound}>Áudio Carregado</option>
                                </optgroup>
                            )}
                        </select>
                    </div>
                     <div className="flex items-center gap-4">
                        <input type="file" accept="audio/*" onChange={(e) => handleFileChange(e, 'notificationSound')} id="notification-upload" className="hidden" />
                        <label htmlFor="notification-upload" className="cursor-pointer bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 text-sm">
                            <i className="fas fa-upload mr-2"></i>Enviar Novo Som
                        </label>
                        <button type="button" onClick={playPreview} className="bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600 text-sm">
                            <i className="fas fa-play mr-2"></i>Testar
                        </button>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1">Volume da Notificação</label>
                        <div className="flex items-center gap-3">
                            <i className="fas fa-volume-down text-gray-500"></i>
                            <input
                                type="range"
                                min="0" max="1" step="0.05"
                                value={audioSettings.notificationVolume}
                                onChange={(e) => handleChange('notificationVolume', parseFloat(e.target.value))}
                                className="w-full"
                            />
                            <i className="fas fa-volume-up text-gray-500"></i>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 border rounded-lg bg-gray-50/50">
                <h3 className="text-lg font-bold mb-4 pb-2 border-b">Música de Fundo (Ambiente)</h3>
                 <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-semibold mb-1">Música de fundo para o painel</label>
                        <input type="file" accept="audio/*" onChange={(e) => handleFileChange(e, 'backgroundMusic')} id="bg-music-upload" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                        { (bgMusicPreview || audioSettings.backgroundMusic) &&
                            <button type="button" onClick={toggleBackgroundMusic} className="mt-2 bg-green-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-600 text-sm">
                                <i className="fas fa-play mr-2"></i>Play / Pause
                            </button>
                        }
                    </div>
                     <div>
                        <label className="block text-sm font-semibold mb-1">Volume da Música</label>
                        <div className="flex items-center gap-3">
                            <i className="fas fa-volume-down text-gray-500"></i>
                            <input
                                type="range"
                                min="0" max="1" step="0.05"
                                value={audioSettings.backgroundVolume}
                                onChange={(e) => handleChange('backgroundVolume', parseFloat(e.target.value))}
                                className="w-full"
                            />
                            <i className="fas fa-volume-up text-gray-500"></i>
                        </div>
                    </div>
                 </div>
            </div>
            
            <div className="mt-8 pt-4 border-t">
                <button type="submit" disabled={isSaving} className="bg-accent text-white font-semibold py-2 px-6 rounded-lg hover:bg-opacity-90">
                    {isSaving ? 'Salvando...' : 'Salvar Configurações de Áudio'}
                </button>
            </div>
        </form>
    );
};
