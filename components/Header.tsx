import React, { useState, useEffect, useRef } from 'react';
import { SiteSettings } from '../types';
import firebase from 'firebase/compat/app';

interface HeaderProps {
    cartItemCount: number;
    onCartClick: () => void;
    activeSection: string;
    settings: SiteSettings;
    currentUser: firebase.User | null;
    onLoginClick: () => void;
    onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({ cartItemCount, onCartClick, activeSection, settings, currentUser, onLoginClick, onSignOut }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);
    
    // Close profile menu if clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setIsProfileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
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
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-20 relative">
                    <a href="#inicio" onClick={(e) => { e.preventDefault(); scrollToSection('inicio');}} className="flex items-center gap-3 text-xl font-bold">
                        <img src={settings.logoUrl} alt="Santa Sensação Logo" className="h-14" />
                        <span className="hidden sm:inline">Santa Sensação</span>
                    </a>
                    
                    <div className="lg:hidden absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xl font-bold">
                        {activeSection}
                    </div>
                    
                    <nav className="hidden lg:flex items-center gap-6">
                        <a href="#inicio" onClick={(e) => { e.preventDefault(); scrollToSection('inicio');}} className="font-medium hover:text-brand-gold-600 transition-colors">Início</a>
                        <a href="#cardapio" onClick={(e) => { e.preventDefault(); scrollToSection('cardapio');}} className="font-medium hover:text-brand-gold-600 transition-colors">Cardápio</a>
                        <a href="#sobre" onClick={(e) => { e.preventDefault(); scrollToSection('sobre');}} className="font-medium hover:text-brand-gold-600 transition-colors">Sobre Nós</a>
                        <a href="#contato" onClick={(e) => { e.preventDefault(); scrollToSection('contato');}} className="font-medium hover:text-brand-gold-600 transition-colors">Contato</a>
                    </nav>

                    <div className="flex items-center gap-3">
                        {currentUser ? (
                            <div className="relative" ref={profileMenuRef}>
                                <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="flex items-center gap-2 rounded-full p-1 pr-3 bg-brand-olive-600 hover:bg-opacity-80 transition-colors">
                                    <img src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName || currentUser.email}&background=A28438&color=fff`} alt="User avatar" className="w-8 h-8 rounded-full object-cover" />
                                    <span className="font-semibold text-sm hidden sm:inline">{currentUser.displayName?.split(' ')[0]}</span>
                                    <i className={`fas fa-chevron-down text-xs transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`}></i>
                                </button>
                                {isProfileMenuOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-1 z-50 text-text-on-light animate-fade-in-up">
                                        <a href="#meus-pedidos" className="block px-4 py-2 text-sm hover:bg-gray-100">Meus Pedidos</a>
                                        <button onClick={onSignOut} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100">Sair</button>
                                    </div>
                                )}
                            </div>
                        ) : (
                             <button onClick={onLoginClick} className="hidden sm:flex items-center gap-2 bg-brand-olive-600 text-text-on-dark px-4 py-2 rounded-lg font-semibold hover:bg-opacity-80 transition-all">
                                <i className="fas fa-user-circle"></i>
                                <span>Entrar</span>
                            </button>
                        )}
                       
                        <button onClick={onCartClick} className="relative w-12 h-12 flex items-center justify-center rounded-lg bg-brand-olive-600 hover:bg-opacity-80 transition-colors">
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
                    {!currentUser && (
                         <button onClick={() => { onLoginClick(); handleLinkClick(); }} className="mt-4 bg-brand-gold-600 text-text-on-dark px-6 py-3 rounded-lg font-bold">
                            <i className="fas fa-user-circle mr-2"></i>
                            Entrar / Cadastrar
                        </button>
                    )}
                </nav>
            </div>
        </header>
    );
};
