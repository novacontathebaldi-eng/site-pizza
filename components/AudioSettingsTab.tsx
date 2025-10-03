import React, { useState, useEffect, useRef } from 'react';
import { SiteSettings, AnnouncementAudio } from '../types';

interface AudioSettingsTabProps {
    settings: SiteSettings;
    onSave: (settings: SiteSettings, files: { [key: string]: File | null }) => Promise<void>;
}

const preloadedSounds = [
    { name: 'Sino', url: '/assets/audio/sino.mp3' },
    { name: 'Alerta Digital', url: '/assets/audio/alerta.mp3' },
    { name: 'Moedas', url: '/assets/audio/moedas.mp3' },
];

export const AudioSettingsTab: React.FC<AudioSettingsTabProps> = ({ settings, onSave }) => {
    const [audioSettings, setAudioSettings] = useState(settings.audioSettings);
    const [filesToUpload, setFilesToUpload] = useState<{ [key: string]: File | null }>({});
    const [isSaving, setIsSaving] = useState(false);
    const audioPreviewRef = useRef<HTMLAudioElement>(null);
    
    useEffect(() => {
        setAudioSettings(settings.audioSettings);
    }, [settings]);

    const handleChange = (field: keyof typeof audioSettings, value: any) => {
        setAudioSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleFileChange = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFilesToUpload(prev => ({ ...prev, [key]: file }));
            const url = URL.createObjectURL(file);
            if (key === 'notificationSound') {
                setAudioSettings(prev => ({ ...prev, notificationSound: url }));
            } else if (key === 'backgroundMusic') {
                setAudioSettings(prev => ({ ...prev, backgroundMusic: url }));
            }
        }
    };

    const handlePlayPreview = (url: string) => {
        if (audioPreviewRef.current && url) {
            audioPreviewRef.current.src = url;
            audioPreviewRef.current.play();
        }
    };

    const handleAddAnnouncementAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const newAudio: AnnouncementAudio = {
                id: `announcement-${Date.now()}`,
                name: file.name.replace(/\.[^/.]+$/, ""),
                url: URL.createObjectURL(file), // Temporary URL for preview
            };
            setAudioSettings(prev => ({ ...prev, announcementAudios: [...prev.announcementAudios, newAudio] }));
            setFilesToUpload(prev => ({ ...prev, [newAudio.id]: file }));
        }
    };
    
    const handleRemoveAnnouncementAudio = (id: string) => {
        setAudioSettings(prev => ({ ...prev, announcementAudios: prev.announcementAudios.filter(a => a.id !== id) }));
        setFilesToUpload(prev => {
            const newFiles = { ...prev };
            delete newFiles[id];
            return newFiles;
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        const newSettings = { ...settings, audioSettings };
        await onSave(newSettings, filesToUpload);
        setFilesToUpload({});
        setIsSaving(false);
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
             <audio ref={audioPreviewRef} className="hidden" />
            <div className="p-4 border rounded-lg bg-white">
                <h4 className="font-bold mb-2">Som de Notificação de Pedido</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <select
                        className="w-full px-3 py-2 border rounded-md bg-white"
                        value={audioSettings.notificationSound}
                        onChange={(e) => handleChange('notificationSound', e.target.value)}
                    >
                        <optgroup label="Sons Padrão">
                            {preloadedSounds.map(sound => <option key={sound.url} value={sound.url}>{sound.name}</option>)}
                        </optgroup>
                         <option value={audioSettings.notificationSound} disabled={preloadedSounds.some(s => s.url === audioSettings.notificationSound)}>
                            {audioSettings.notificationSound.startsWith('blob:') ? 'Áudio Personalizado' : audioSettings.notificationSound}
                        </option>
                    </select>
                    <div className="flex gap-2">
                        <label className="flex-grow bg-gray-200 text-gray-800 font-semibold py-2 px-3 rounded-lg hover:bg-gray-300 text-center cursor-pointer">
                            <i className="fas fa-upload mr-2"></i>Enviar Áudio
                            <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleFileChange('notificationSound', e)} />
                        </label>
                         <button type="button" onClick={() => handlePlayPreview(audioSettings.notificationSound)} className="w-12 bg-blue-500 text-white rounded-lg hover:bg-blue-600"><i className="fas fa-play"></i></button>
                    </div>
                </div>
                 <div className="mt-4">
                    <label className="block text-sm font-semibold mb-1">Volume da Notificação</label>
                    <input type="range" min="0" max="1" step="0.1" value={audioSettings.notificationVolume} onChange={e => handleChange('notificationVolume', parseFloat(e.target.value))} className="w-full" />
                </div>
            </div>

            <div className="p-4 border rounded-lg bg-white">
                <h4 className="font-bold mb-2">Música de Fundo do Painel (Opcional)</h4>
                 <label className="flex items-center gap-3 cursor-pointer mb-4">
                    <input type="checkbox" checked={audioSettings.backgroundMusicEnabled} onChange={e => handleChange('backgroundMusicEnabled', e.target.checked)} className="w-5 h-5"/>
                    <span className="font-semibold">Ativar Música de Fundo</span>
                </label>
                {audioSettings.backgroundMusicEnabled && (
                    <div className="space-y-4 animate-fade-in-up">
                         <div className="flex gap-2">
                             <input type="text" readOnly value={audioSettings.backgroundMusic || "Nenhuma música selecionada"} className="w-full px-3 py-2 border rounded-md bg-gray-50"/>
                            <label className="flex-shrink-0 bg-gray-200 text-gray-800 font-semibold py-2 px-3 rounded-lg hover:bg-gray-300 text-center cursor-pointer">
                                <i className="fas fa-upload mr-2"></i>Enviar
                                <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleFileChange('backgroundMusic', e)} />
                            </label>
                        </div>
                        <label className="flex items-center gap-3 cursor-pointer">
                           <input type="checkbox" checked={audioSettings.backgroundMusicLoop} onChange={e => handleChange('backgroundMusicLoop', e.target.checked)} className="w-5 h-5"/>
                           <span className="font-medium text-sm">Repetir Música (Loop)</span>
                       </label>
                        <div>
                           <label className="block text-sm font-semibold mb-1">Volume da Música</label>
                           <input type="range" min="0" max="1" step="0.1" value={audioSettings.backgroundMusicVolume} onChange={e => handleChange('backgroundMusicVolume', parseFloat(e.target.value))} className="w-full" />
                       </div>
                    </div>
                )}
            </div>
            
             <div className="p-4 border rounded-lg bg-white">
                <h4 className="font-bold mb-2">Áudios de Anúncio (para a página de promoções)</h4>
                <div className="space-y-2">
                    {audioSettings.announcementAudios.map(audio => (
                        <div key={audio.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                            <span className="flex-grow font-medium text-sm">{audio.name}</span>
                            <button type="button" onClick={() => handlePlayPreview(audio.url)} className="w-8 h-8 text-sm bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200"><i className="fas fa-play"></i></button>
                            <button type="button" onClick={() => handleRemoveAnnouncementAudio(audio.id)} className="w-8 h-8 text-sm bg-red-100 text-red-600 rounded-md hover:bg-red-200"><i className="fas fa-trash"></i></button>
                        </div>
                    ))}
                </div>
                <label className="mt-4 inline-block bg-blue-500 text-white font-semibold py-2 px-3 rounded-lg hover:bg-blue-600 text-sm cursor-pointer">
                    <i className="fas fa-plus mr-2"></i>Adicionar Áudio de Anúncio
                    <input type="file" accept="audio/*" className="hidden" onChange={handleAddAnnouncementAudio} />
                </label>
            </div>


            <div className="mt-6">
                <button onClick={handleSave} disabled={isSaving} className="bg-accent text-white font-semibold py-2 px-6 rounded-lg hover:bg-opacity-90 disabled:bg-opacity-70">
                    {isSaving ? 'Salvando...' : 'Salvar Configurações de Áudio'}
                </button>
            </div>
        </div>
    );
};
