import React from 'react';
import { SiteSettings } from '../types';

export const Footer: React.FC<{ settings: SiteSettings }> = ({ settings }) => {
    
    const socialLinks = settings.footerLinks.filter(link => link.icon.startsWith('fab'));
    const otherLinks = settings.footerLinks.filter(link => !link.icon.startsWith('fab'));

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
                            <li><i className="fas fa-clock mr-2 text-accent"></i>Quarta a Domingo</li>
                            <li>19h às 22h</li>
                            <li><i className="fas fa-truck mr-2 text-accent"></i>Delivery disponível</li>
                        </ul>
                    </div>
                     <div>
                        <h4 className="font-bold text-lg mb-4">Acesso</h4>
                         <ul className="space-y-2 text-brand-green-300">
                            {otherLinks.map(link => (
                                <li key={link.id}>
                                    <a href={link.url} className="inline-flex items-center gap-2 hover:text-white transition-colors">
                                        <i className={`${link.icon} mr-1 text-accent`}></i>
                                        <span>{link.text}</span>
                                    </a>
                                </li>
                            ))}
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
