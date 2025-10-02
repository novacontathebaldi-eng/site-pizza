import React from 'react';
import { PromotionPage, Product } from '../types';

interface PromotionSectionProps {
    promotion: PromotionPage;
    allProducts: Product[];
}

export const PromotionSection: React.FC<PromotionSectionProps> = ({ promotion, allProducts }) => {
    if (!promotion.isVisible) return null;

    const featuredProducts = promotion.featuredProductIds
        .map(id => allProducts.find(p => p.id === id))
        .filter((p): p is Product => Boolean(p) && p.active);

    const getYouTubeEmbedUrl = (url: string) => {
        if (!url) return '';
        try {
            const urlObj = new URL(url);
            let videoId = urlObj.searchParams.get('v');
            if (!videoId && (urlObj.hostname === 'youtu.be')) {
                videoId = urlObj.pathname.slice(1);
            }
            return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
        } catch (e) {
            return '';
        }
    };

    const videoEmbedUrl = getYouTubeEmbedUrl(promotion.videoUrl);

    const textContent = (
        <div className="flex flex-col justify-center">
            {promotion.isTitleVisible && <h2 className="text-4xl font-bold text-text-on-light mb-6">{promotion.title}</h2>}
            {promotion.isTextVisible && <p className="text-gray-700 leading-relaxed mb-6 whitespace-pre-wrap">{promotion.text}</p>}
        </div>
    );

    const videoContent = promotion.isVideoVisible && videoEmbedUrl ? (
        <div className="aspect-w-16 aspect-h-9 rounded-2xl shadow-xl overflow-hidden">
            <iframe
                src={videoEmbedUrl}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={promotion.title}
            ></iframe>
        </div>
    ) : null;
    
    return (
        <section id={`promo-${promotion.id}`} className="py-20 bg-white odd:bg-brand-ivory-50">
            <div className="container mx-auto px-4">
                <div className={`grid ${videoContent ? 'lg:grid-cols-2' : 'grid-cols-1'} gap-12 items-center`}>
                   {promotion.layout === 'video-left' ? (
                        <>
                            {videoContent}
                            {textContent}
                        </>
                    ) : (
                        <>
                            {textContent}
                            {videoContent}
                        </>
                    )}
                </div>

                {promotion.isProductsVisible && featuredProducts.length > 0 && (
                     <div className="mt-16">
                        <h3 className="text-2xl font-bold text-center mb-8">Produtos em Destaque</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {featuredProducts.map(product => (
                                // This is a simplified card, ideally we'd use MenuItemCard if props were available
                                <div key={product.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col overflow-hidden border border-gray-200">
                                    <img src={product.imageUrl} alt={product.name} className="w-full h-48 object-cover" />
                                    <div className="p-4 flex flex-col flex-grow">
                                        <h4 className="text-lg font-bold">{product.name}</h4>
                                        <p className="text-gray-500 text-xs mb-3 line-clamp-2 flex-grow">{product.description}</p>
                                        <div className="mt-auto pt-2 flex justify-between items-center">
                                            {Object.keys(product.prices).length > 0 && 
                                                <span className="text-xl font-bold text-accent">
                                                   A partir de {Object.values(product.prices)[0].toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </span>
                                            }
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};
