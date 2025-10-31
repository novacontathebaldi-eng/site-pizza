import React, { useState, useEffect } from 'react';
import { SiteSettings } from '../types';
import firebase from 'firebase/compat/app';
import defaultProfilePic from '../assets/perfil.png';

interface HeaderProps {
    cartItemCount: number;
    onCartClick: () => void;
    onOpenChatbot: () => void;
    activeSection: string;
    settings: SiteSettings;
    user: firebase.User | null;
    onUserIconClick: () => void;
    // FIX: Added isAuthLoading to the component's props to handle the loading state of authentication.
    isAuthLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({ cartItemCount, onCartClick, onOpenChatbot, activeSection, settings, user, onUserIconClick, isAuthLoading }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLinkClick = () => {
        setIsMenuOpen(false);
    };

    const scrollToSection = (id: string) => {
      const element = document.getElementById(id);
      if(element) {
        const headerOffset = 80;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    };

    return (
        <header className={`bg-brand-green-700 text-text-on-dark sticky top-0 z-50 transition-shadow duration-300 ${isScrolled ? 'shadow-lg' : ''}`}>
            <div className="container mx-auto px-2 sm:px-4">
                <div className="flex justify-between items-center h-20 relative">
                    <a href="#inicio" onClick={(e) => { e.preventDefault(); scrollToSection('inicio');}} className="flex items-center gap-3 text-xl font-bold">
                        <img src={settings.logoUrl} alt="Santa Sensação Logo" className="h-14" />
                        <span className="hidden sm:inline">Santa Sensação</span>
                    </a>
                    
                    <div className="lg:hidden absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xl font-bold transition-opacity duration-300">
                        {activeSection}
                    </div>
                    
                    <nav className="hidden lg:flex items-center gap-6">
                        <a href="#inicio" onClick={(e) => { e.preventDefault(); scrollToSection('inicio');}} className="font-medium hover:text-brand-gold-600 transition-colors">Início</a>
                        <a href="#cardapio" onClick={(e) => { e.preventDefault(); scrollToSection('cardapio');}} className="font-medium hover:text-brand-gold-600 transition-colors">Cardápio</a>
                        <a href="#sobre" onClick={(e) => { e.preventDefault(); scrollToSection('sobre');}} className="font-medium hover:text-brand-gold-600 transition-colors">Sobre Nós</a>
                        <a href="#contato" onClick={(e) => { e.preventDefault(); scrollToSection('contato');}} className="font-medium hover:text-brand-gold-600 transition-colors">Contato</a>
                        <a href="#" onClick={(e) => { e.preventDefault(); onOpenChatbot();}} className="font-medium hover:text-brand-gold-600 transition-colors">Ajuda</a>
                    </nav>

                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* FIX: The user icon button now displays a loading spinner when isAuthLoading is true. */}
                        <button onClick={onUserIconClick} className="relative w-12 h-12 flex items-center justify-center rounded-full bg-brand-olive-600 hover:bg-opacity-80 transition-colors" aria-label="Minha Conta" disabled={isAuthLoading}>
                            {isAuthLoading ? (
                                <i className="fas fa-spinner fa-spin text-2xl"></i>
                            ) : user ? (
                                <img src={user.photoURL || defaultProfilePic} alt="Foto de perfil" className="w-full h-full rounded-full object-cover border-2 border-brand-gold-600" />
                            ) : (
                                <i className="fas fa-user-circle text-2xl"></i>
                            )}
                        </button>
                        <button onClick={onCartClick} className="relative w-12 h-12 hidden sm:flex items-center justify-center rounded-lg bg-brand-olive-600 hover:bg-opacity-80 transition-colors" aria-label="Abrir carrinho de compras">
                            <i className="fas fa-shopping-cart text-lg"></i>
                            {cartItemCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                    {cartItemCount}
                                </span>
                            )}
                        </button>
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="lg:hidden w-12 h-12 flex items-center justify-center rounded-lg bg-brand-olive-600 hover:bg-opacity-80 transition-colors z-50">
                            <i className={`fas ${isMenuOpen ? 'fa-times' : 'fa-bars'} text-lg`}></i>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            <div className={`lg:hidden fixed top-0 left-0 w-full h-full bg-brand-green-700 z-40 transform transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-y-0' : '-translate-y-full'}`}>
                <nav className="flex flex-col items-center justify-center h-full gap-8 text-2xl pt-20">
                    <a href="#inicio" onClick={(e) => { e.preventDefault(); scrollToSection('inicio'); handleLinkClick();}} className="font-bold hover:text-brand-gold-600 transition-colors">Início</a>
                    <a href="#cardapio" onClick={(e) => { e.preventDefault(); scrollToSection('cardapio'); handleLinkClick();}} className="font-bold hover:text-brand-gold-600 transition-colors">Cardápio</a>
                    <a href="#sobre" onClick={(e) => { e.preventDefault(); scrollToSection('sobre'); handleLinkClick();}} className="font-bold hover:text-brand-gold-600 transition-colors">Sobre Nós</a>
                    <a href="#contato" onClick={(e) => { e.preventDefault(); scrollToSection('contato'); handleLinkClick();}} className="font-bold hover:text-brand-gold-600 transition-colors">Contato</a>
                    <a href="#" onClick={(e) => { e.preventDefault(); onOpenChatbot(); handleLinkClick();}} className="font-bold hover:text-brand-gold-600 transition-colors">Ajuda</a>
                </nav>
            </div>
        </header>
    );
};