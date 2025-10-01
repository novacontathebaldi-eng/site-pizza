import React, { useState, useEffect } from 'react';
import { SiteSettings } from '../types';

interface HeroSectionProps {
    settings: SiteSettings;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ settings }) => {
    const [scrollOpacity, setScrollOpacity] = useState(1);

    useEffect(() => {
        const handleScroll = () => {
            // A imagem começará a desaparecer após rolar um pouco e desaparecerá completamente após 400px.
            const fadeStart = 50;
            const fadeEnd = 400;
            const scrollPosition = window.scrollY;

            if (scrollPosition <= fadeStart) {
                setScrollOpacity(1);
            } else if (scrollPosition >= fadeEnd) {
                setScrollOpacity(0);
            } else {
                const newOpacity = 1 - ((scrollPosition - fadeStart) / (fadeEnd - fadeStart));
                setScrollOpacity(newOpacity);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToCardapio = () => {
        const cardapioSection = document.getElementById('cardapio');
        if (cardapioSection) {
            const headerOffset = 80;
            const elementPosition = cardapioSection.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
        }
    };

    return (
        <section id="inicio" className="bg-brand-green-700 text-text-on-dark min-h-[calc(100vh-80px)] flex items-center justify-center pb-20 px-4 relative overflow-hidden">
            {/* Camada da Imagem de Fundo com Fade */}
            <div 
                className="absolute inset-0 bg-cover bg-center" 
                style={{
                    backgroundImage: `url(${settings.heroBgUrl})`,
                    opacity: scrollOpacity,
                    transition: 'opacity 0.1s ease-out'
                }}
            ></div>
            {/* Camada de Escurecimento para Contraste com Fade */}
            <div 
                className="absolute inset-0 bg-black/60"
                style={{
                    opacity: scrollOpacity,
                    transition: 'opacity 0.1s ease-out'
                }}
            ></div>
            {/* Gradiente para transição suave para a cor de fundo sólida */}
            <div className="absolute inset-0 bg-gradient-to-t from-brand-green-700 via-brand-green-700/80 to-transparent"></div>
            
            <div className="container mx-auto text-center z-10">
                <div className="inline-block bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20 mb-6">
                    <p className="font-semibold text-sm flex items-center gap-2"><i className="fas fa-award text-brand-gold-600"></i> {settings.heroSlogan}</p>
                </div>
                <h1 className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight">
                    {settings.heroTitle.split(' ').map((word, index, arr) => 
                        word.toLowerCase() === 'santa' || word.toLowerCase() === 'sensação' 
                        ? <span key={index} className="text-brand-gold-600">{word} </span> 
                        : <span key={index}>{word} </span>
                    )}
                </h1>
                <p className="text-lg md:text-xl font-medium text-brand-ivory-50/90 mb-8 max-w-2xl mx-auto">
                    {settings.heroSubtitle}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button onClick={scrollToCardapio} className="bg-brand-gold-600 text-text-on-dark font-bold py-3 px-8 rounded-xl text-lg hover:bg-opacity-90 transition-all transform hover:scale-105">
                        <i className="fas fa-pizza-slice mr-2"></i> Ver Cardápio e Pedir
                    </button>
                </div>
            </div>
        </section>
    );
};
