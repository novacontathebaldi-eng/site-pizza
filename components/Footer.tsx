import React from 'react';
import { SiteSettings, DaySchedule } from '../types';

interface FooterProps {
    settings: SiteSettings;
    onOpenChatbot: () => void;
    onOpenPrivacyPolicy: () => void;
    onUserAreaClick: () => void;
}

// Helper function to process operating hours into structured groups
function formatOperatingHoursGroups(operatingHours?: DaySchedule[]): { days: string, time: string }[] {
    if (!operatingHours?.length) return [];
    
    const openSchedules = operatingHours.filter(h => h.isOpen);
    if (openSchedules.length === 0) return [];
    
    const schedulesByTime = openSchedules.reduce((acc, schedule) => {
        const timeKey = `${schedule.openTime}-${schedule.closeTime}`;
        if (!acc[timeKey]) acc[timeKey] = [];
        acc[timeKey].push(schedule);
        return acc;
    }, {} as Record<string, DaySchedule[]>);

    const result: { days: string, time: string }[] = [];

    for (const timeKey in schedulesByTime) {
        const schedules = schedulesByTime[timeKey].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
        if (schedules.length === 0) continue;

        let dayString;
        if (schedules.length === 7) {
            dayString = 'Todos os dias';
        } else {
            const sequences: DaySchedule[][] = [];
            if (schedules.length > 0) {
                let currentSequence: DaySchedule[] = [schedules[0]];
                for (let i = 1; i < schedules.length; i++) {
                    if (schedules[i].dayOfWeek === schedules[i - 1].dayOfWeek + 1) {
                        currentSequence.push(schedules[i]);
                    } else {
                        sequences.push(currentSequence);
                        currentSequence = [schedules[i]];
                    }
                }
                sequences.push(currentSequence);
            }
            
            // Handle Sunday-Saturday wrap-around (e.g., Fri, Sat, Sun)
            if (sequences.length > 1 && sequences[0][0].dayOfWeek === 0 && schedules[schedules.length - 1].dayOfWeek === 6) {
               const firstSeq = sequences.shift()!;
               sequences[sequences.length - 1].push(...firstSeq);
            }

            const formattedSequences = sequences.map(seq => {
                if (seq.length === 1) return seq[0].dayName;
                if (seq.length === 2) return `${seq[0].dayName} e ${seq[1].dayName}`;
                return `De ${seq[0].dayName} a ${seq[seq.length - 1].dayName}`;
            });
            dayString = formattedSequences.join(' e ');
        }

        const [openTime, closeTime] = timeKey.split('-');
        result.push({
            days: dayString,
            time: `das ${openTime}h às ${closeTime}h`
        });
    }
    return result;
}


const formatOperatingHours = (operatingHours?: DaySchedule[]): string[] => {
    if (!operatingHours?.length) {
        return ['Funcionamento não informado.'];
    }
    const openSchedules = operatingHours.filter(h => h.isOpen);
    if (openSchedules.length === 0) {
        return ['Fechado todos os dias.'];
    }

    const groups = formatOperatingHoursGroups(operatingHours);
    if (groups.length === 0) {
        return ['Fechado todos os dias.'];
    }

    const finalStrings: string[] = [];
    groups.forEach(group => {
        finalStrings.push(group.days);
        finalStrings.push(group.time);
    });

    return finalStrings;
};


export const Footer: React.FC<FooterProps> = ({ settings, onOpenChatbot, onOpenPrivacyPolicy, onUserAreaClick }) => {
    
    const visibleLinks = settings.footerLinks?.filter(link => link.isVisible !== false) ?? [];
    const socialLinks = visibleLinks.filter(link => link.icon.startsWith('fab'));
    const otherLinks = visibleLinks.filter(link => !link.icon.startsWith('fab') && link.url !== '#admin');
    const operatingHoursParts = formatOperatingHours(settings.operatingHours);

    return (
        <footer className="bg-brand-green-700 text-text-on-dark pt-16 pb-8">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center md:text-left">
                    <div className="flex flex-col items-center md:items-start md:col-span-1">
                        <div className="flex items-center gap-3 text-2xl font-bold mb-4">
                           <img src={settings.logoUrl} alt="Santa Sensação Logo" className="h-12" />
                            <span>Santa Sensação</span>
                        </div>
                        <p className="text-brand-green-300 mb-4">{settings.heroSlogan} 🏅</p>
                        <div className="flex gap-4">
                            {socialLinks.map(link => {
                                let bgColor = 'bg-gray-500';
                                if (link.icon.includes('whatsapp')) bgColor = 'bg-green-500 hover:bg-green-400';
                                if (link.icon.includes('instagram')) bgColor = 'bg-pink-600 hover:bg-pink-500';
                                if (link.icon.includes('facebook')) bgColor = 'bg-blue-600 hover:bg-blue-500';

                                return (
                                    <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className={`w-10 h-10 ${bgColor} rounded-full flex items-center justify-center text-xl transition-colors`}>
                                        <i className={link.icon}></i>
                                    </a>
                                )
                            })}
                        </div>
                    </div>
                    <div>
                        <h4 className="font-bold text-lg mb-4">Contato</h4>
                        <ul className="space-y-2 text-brand-green-300">
                            <li><i className="fas fa-map-marker-alt mr-2 text-accent"></i>Porfilio Furtado, 178 - Centro</li>
                            <li>Santa Leopoldina, ES</li>
                            <li><i className="fas fa-phone mr-2 text-accent"></i>(27) 99650-0341</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-lg mb-4">Funcionamento</h4>
                         <ul className="space-y-2 text-brand-green-300">
                            {operatingHoursParts.map((part, index) => (
                                <li key={index}><i className={`fas ${index % 2 === 0 ? 'fa-clock' : 'fa-none'} mr-2 text-accent`}></i>{part}</li>
                            ))}
                            <li><i className="fas fa-truck mr-2 text-accent"></i>Delivery disponível</li>
                        </ul>
                    </div>
                     <div>
                        <h4 className="font-bold text-lg mb-4">Cliente</h4>
                         <ul className="space-y-2 text-brand-green-300">
                            {otherLinks.map(link => (
                                <li key={link.id}>
                                    <a href={link.url} className="inline-flex items-center gap-2 hover:text-white transition-colors">
                                        <i className={`${link.icon} mr-1 text-accent`}></i>
                                        <span>{link.text}</span>
                                    </a>
                                </li>
                            ))}
                            <li>
                                <button onClick={onUserAreaClick} className="inline-flex items-center gap-2 hover:text-white transition-colors">
                                    <i className="fas fa-user-circle mr-1 text-accent"></i>
                                    <span>Área do Cliente</span>
                                </button>
                            </li>
                            <li>
                                <button onClick={onOpenChatbot} className="inline-flex items-center gap-2 hover:text-white transition-colors">
                                    <i className="fas fa-headset mr-1 text-accent"></i>
                                    <span>Ajuda e Suporte</span>
                                </button>
                            </li>
                            <li>
                                <button onClick={onOpenPrivacyPolicy} className="inline-flex items-center gap-2 hover:text-white transition-colors">
                                    <i className="fas fa-user-shield mr-1 text-accent"></i>
                                    <span>Política de Privacidade</span>
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>
                <div className="border-t border-brand-olive-600 mt-8 pt-6 text-center text-brand-green-300 text-sm">
                    <p>&copy; 2025 THEBALDI. Todos os direitos reservados.</p>
                </div>
            </div>
        </footer>
    );
};