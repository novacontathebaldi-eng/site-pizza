
import React, { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';

interface HeaderProps {
    logoUrl: string;
    cartItemCount: number;
    onCartClick: () => void;
    isStoreOnline: boolean;
    currentUser: firebase.User | null;
    onAuthClick: () => void;
    isAuthLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({ logoUrl, cartItemCount, onCartClick, isStoreOnline, currentUser, onAuthClick, isAuthLoading }) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleSignOut = () => {
        firebase.auth().signOut();
        setIsUserMenuOpen(false);
    };

    const navLinks = [
        { href: '#inicio', text: 'Início' },
        { href: '#sobre', text: 'Sobre' },
        { href: '#cardapio', text: 'Cardápio' },
        { href: '#contato', text: 'Contato' },
    ];

    return (
        <header className={`sticky top-0 z-40 transition-all duration-300 ${isScrolled ? 'bg-white/95 shadow-md backdrop-blur-sm' : 'bg-transparent'}`}>
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-20">
                    <a href="#inicio">
                        <img src={logoUrl} alt="Logo Pizzaria" className={`h-12 transition-all ${isScrolled ? '' : 'invert brightness-0'}`} />
                    </a>

                    <nav className="hidden lg:flex items-center gap-8">
                        {navLinks.map(link => (
                            <a key={link.href} href={link.href} className={`font-semibold transition-colors ${isScrolled ? 'text-text-on-light hover:text-accent' : 'text-text-on-dark hover:text-white/80'}`}>{link.text}</a>
                        ))}
                    </nav>

                    <div className="flex items-center gap-4">
                        <div className={`text-xs font-bold px-3 py-1 rounded-full ${isStoreOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {isStoreOnline ? 'ABERTO' : 'FECHADO'}
                        </div>
                        <button onClick={onCartClick} className="relative">
                            <i className={`fas fa-shopping-cart text-2xl transition-colors ${isScrolled ? 'text-text-on-light hover:text-accent' : 'text-text-on-dark hover:text-white/80'}`}></i>
                            {cartItemCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-accent text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                    {cartItemCount}
                                </span>
                            )}
                        </button>
                        
                        {/* Auth Button/Menu */}
                        <div className="relative">
                            {isAuthLoading ? (
                                <div className="w-8 h-8 flex items-center justify-center"><i className="fas fa-spinner fa-spin"></i></div>
                            ) : currentUser ? (
                                <>
                                <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className={`w-9 h-9 rounded-full overflow-hidden ${isScrolled ? 'border-2 border-accent' : 'border-2 border-white'}`}>
                                    <img src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName || currentUser.email}&background=random`} alt="User avatar" />
                                </button>
                                {isUserMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                                        <a href="#/meus-pedidos" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Meus Pedidos</a>
                                        <button onClick={handleSignOut} className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Sair</button>
                                    </div>
                                )}
                                </>
                            ) : (
                                <button onClick={onAuthClick} className={`font-semibold transition-colors ${isScrolled ? 'text-text-on-light hover:text-accent' : 'text-text-on-dark hover:text-white/80'}`}>
                                    Entrar
                                </button>
                            )}
                        </div>

                        <button className="lg:hidden text-2xl" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                            <i className={`fas ${isMenuOpen ? 'fa-times' : 'fa-bars'} ${isScrolled ? 'text-text-on-light' : 'text-text-on-dark'}`}></i>
                        </button>
                    </div>
                </div>
                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="lg:hidden bg-white shadow-lg absolute top-20 left-0 w-full">
                        <nav className="flex flex-col p-4 space-y-2">
                             {navLinks.map(link => (
                                <a key={link.href} href={link.href} onClick={() => setIsMenuOpen(false)} className="font-semibold p-2 rounded-md hover:bg-gray-100 text-text-on-light hover:text-accent">{link.text}</a>
                            ))}
                        </nav>
                    </div>
                )}
            </div>
        </header>
    );
};
