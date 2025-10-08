
import React from 'react';
import { SiteSettings } from '../types.ts';

interface FooterProps {
    settings: SiteSettings;
}

export const Footer: React.FC<FooterProps> = ({ settings }) => {
    return (
        <footer className="bg-brand-green-700 text-text-on-dark py-12">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
                    <div>
                        <img src={settings.logoUrl} alt="Logo Pizzaria" className="h-12 mx-auto md:mx-0 mb-4 invert brightness-0" />
                        <p className="text-sm text-brand-ivory-50/80">{settings.heroSlogan}</p>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg mb-4">Navegação</h3>
                        <ul className="space-y-2">
                            <li><a href="#inicio" className="hover:text-white">Início</a></li>
                            <li><a href="#sobre" className="hover:text-white">Sobre</a></li>
                            <li><a href="#cardapio" className="hover:text-white">Cardápio</a></li>
                            <li><a href="#contato" className="hover:text-white">Contato</a></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg mb-4">Redes Sociais</h3>
                        <div className="flex justify-center md:justify-start gap-4 text-2xl">
                            {settings.footerLinks.filter(l => l.isVisible).map(link => (
                                <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                                    <i className={link.icon}></i>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="text-center text-sm text-brand-ivory-50/70 pt-8 mt-8 border-t border-white/20">
                    <p>&copy; {new Date().getFullYear()} Santa Sensação Pizzaria. Todos os direitos reservados.</p>
                </div>
            </div>
        </footer>
    );
};
