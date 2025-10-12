import React, { useState, useEffect } from 'react';
import { SiteSettings } from '../types';

interface HeroSectionProps {
    settings: SiteSettings;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ settings }) => {
    const [offsetY, setOffsetY] = useState(0);
    const handleScroll = () => setOffsetY(window.pageYOffset);

    useEffect(() => {
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

    const heroTitle = settings.heroTitle ?? '';
    const heroSlogan = settings.heroSlogan ?? '';
    const heroSubtitle = settings.heroSubtitle ?? '';

    // Parallax calculations
    const backgroundTransform = `translate3d(0, ${offsetY * 0.5}px, 0) scale(${1 + offsetY * 0.0001})`;
    const contentTransform = `translate3d(0, ${offsetY * 0.3}px, 0)`;
    const contentOpacity = Math.max(0, 1 - offsetY / 300);

    return (
        <section id="inicio" className="bg-brand-green-700 text-text-on-dark h-[calc(100vh-80px)] min-h-[600px] flex items-center justify-center px-4 relative overflow-hidden">
            {/* Background Image Layer (Parallax) */}
            <div 
                className="absolute inset-0 bg-cover bg-center" 
                style={{
                    backgroundImage: `url(${settings.heroBgUrl})`,
                    transform: backgroundTransform,
                    willChange: 'transform',
                }}
            ></div>
            {/* Dimming Overlay */}
            <div className="absolute inset-0 bg-black/60"></div>
            {/* Gradient for smooth transition to the solid background color */}
            <div className="absolute inset-0 bg-gradient-to-t from-brand-green-700 via-brand-green-700/80 to-transparent"></div>
            
            {/* Content Layer (Parallax) */}
            <div 
                className="container mx-auto text-center z-10"
                style={{
                    transform: contentTransform,
                    opacity: contentOpacity,
                    willChange: 'transform, opacity',
                }}
            >
                <div className="inline-block bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20 mb-6">
                    <p className="font-semibold text-sm flex items-center gap-2"><i className="fas fa-award text-brand-gold-600"></i> {heroSlogan}</p>
                </div>
                <h1 className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight">
                    {heroTitle.split(' ').map((word, index) => 
                        word.toLowerCase() === 'santa' || word.toLowerCase() === 'sensação' 
                        ? <span key={index} className="text-brand-gold-600">{word} </span> 
                        : <span key={index}>{word} </span>
                    )}
                </h1>
                <p className="text-lg md:text-xl font-medium text-brand-ivory-50/90 mb-8 max-w-2xl mx-auto">
                    {heroSubtitle}
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