import React from 'react';
import { Promotion, Product } from '../types';
import { MenuItemCard } from './MenuItemCard'; // Re-use for consistency

interface PromotionsSectionProps {
    promotions: Promotion[];
    products: Product[];
    onAddToCart: (product: Product, size: string, price: number) => void;
}

const PromotionBlock: React.FC<{ promotion: Promotion; allProducts: Product[]; onAddToCart: PromotionsSectionProps['onAddToCart'] }> = ({ promotion, allProducts, onAddToCart }) => {
    
    const youtubeEmbedUrl = (url: string) => {
        try {
            const videoUrl = new URL(url);
            let videoId = videoUrl.searchParams.get('v');
            if (videoUrl.hostname === 'youtu.be') {
                videoId = videoUrl.pathname.slice(1);
            }
            return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
        } catch (e) {
            return null;
        }
    };
    
    const promotionProducts = promotion.includeProducts
        ? promotion.productIds.map(id => allProducts.find(p => p.id === id)).filter((p): p is Product => !!p)
        : [];

    const Content = (
        <div className="flex flex-col justify-center text-center lg:text-left">
            <h2 className="text-4xl font-bold text-text-on-light mb-4">{promotion.title}</h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
               {promotion.description}
            </p>
        </div>
    );

    const Media = promotion.includeMedia ? (
        <div className="relative flex items-center justify-center aspect-video">
            {promotion.videoUrl && youtubeEmbedUrl(promotion.videoUrl) ? (
                 <iframe 
                    className="w-full h-full rounded-2xl shadow-xl" 
                    src={youtubeEmbedUrl(promotion.videoUrl)!}
                    title={promotion.title} 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen>
                </iframe>
            ) : promotion.imageUrl && (
                <img src={promotion.imageUrl} alt={promotion.title} className="rounded-2xl shadow-xl w-full h-full object-cover" />
            )}
        </div>
    ) : null;
    
    const ProductGrid = (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {promotionProducts.map(product => (
                <MenuItemCard 
                    key={product.id}
                    product={product}
                    onAddToCart={onAddToCart}
                    isStoreOnline={true} // Assume store is online if promotions are showing
                />
            ))}
        </div>
    );

    switch (promotion.layout) {
        case 'textLeft_mediaRight':
            return (
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {Content}
                    {Media}
                </div>
            );
        case 'mediaLeft_textRight':
             return (
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {Media}
                    {Content}
                </div>
            );
        case 'mediaFull_textOverlay':
            return (
                <div className="relative flex items-center justify-center rounded-2xl shadow-xl overflow-hidden min-h-[400px] text-white p-8 text-center">
                    {Media && React.cloneElement(Media as React.ReactElement<any>, { className: 'absolute inset-0 w-full h-full object-cover z-0' })}
                    <div className="absolute inset-0 bg-black/60 z-10"></div>
                    <div className="relative z-20">
                        {Content}
                    </div>
                </div>
            );
        case 'productGridOnly':
            return (
                 <div className="text-center">
                    <h2 className="text-4xl font-bold text-text-on-light mb-4">{promotion.title}</h2>
                    <p className="text-lg text-gray-600 mt-2 max-w-2xl mx-auto mb-12">{promotion.description}</p>
                    {ProductGrid}
                </div>
            );
        default:
            return null;
    }
};

export const PromotionsSection: React.FC<PromotionsSectionProps> = ({ promotions, products, onAddToCart }) => {
    const activePromotions = promotions.filter(p => p.active).sort((a, b) => a.order - b.order);

    if (activePromotions.length === 0) {
        return null;
    }

    return (
        <section id="promocoes" className="py-20 bg-brand-ivory-50">
            <div className="container mx-auto px-4 space-y-20">
                {activePromotions.map(promo => (
                    <PromotionBlock 
                        key={promo.id} 
                        promotion={promo} 
                        allProducts={products}
                        onAddToCart={onAddToCart}
                    />
                ))}
            </div>
        </section>
    );
};