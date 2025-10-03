import React from 'react';
import { PromotionPage, Product } from '../types';
import { MenuItemCard } from './MenuItemCard';

interface PromotionSectionProps {
    promotion: PromotionPage;
    allProducts: Product[];
    onAddToCart: (product: Product, size: string, price: number) => void;
    isStoreOnline: boolean;
}

export const PromotionSection: React.FC<PromotionSectionProps> = ({ promotion, allProducts, onAddToCart, isStoreOnline }) => {
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
            console.error("Invalid YouTube URL:", e);
            return '';
        }
    };

    const videoEmbedUrl = getYouTubeEmbedUrl(promotion.videoUrl);

    const textContent = (promotion.isTitleVisible || promotion.isTextVisible) ? (
        <div className="flex flex-col justify-center">
            {promotion.isTitleVisible && <h2 className="text-4xl font-bold text-text-on-light mb-6">{promotion.title}</h2>}
            {promotion.isTextVisible && <p className="text-gray-700 leading-relaxed mb-6 whitespace-pre-wrap">{promotion.text}</p>}
        </div>
    ) : null;

    const videoContent = promotion.isVideoVisible && videoEmbedUrl ? (
        <div className="aspect-w-16 aspect-h-9 rounded-2xl shadow-xl overflow-hidden">
            <iframe
                src={videoEmbedUrl}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={promotion.title}
                className="w-full h-full"
            ></iframe>
        </div>
    ) : null;

    const components = {
        video: videoContent,
        text: textContent,
        products: promotion.isProductsVisible && featuredProducts.length > 0 ? (
            <div className="mt-16 lg:col-span-2">
               <h3 className="text-2xl font-bold text-center mb-8">{promotion.title ? `Produtos da Promoção "${promotion.title}"` : "Produtos em Destaque"}</h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                   {featuredProducts.map(product => (
                       <MenuItemCard
                           key={product.id}
                           product={product}
                           onAddToCart={onAddToCart}
                           isStoreOnline={isStoreOnline}
                       />
                   ))}
               </div>
           </div>
        ) : null,
    };
    
    // Default order if none is specified
    const componentOrder = promotion.componentOrder?.length > 0 ? promotion.componentOrder : ['video', 'text'];

    return (
        <section id={`promo-${promotion.id}`} className="py-20 bg-white odd:bg-brand-ivory-50">
            <div className="container mx-auto px-4">
                <div className={`grid ${videoContent && textContent ? 'lg:grid-cols-2' : 'grid-cols-1'} gap-12 items-center`}>
                    {componentOrder.map(key => {
                        if (key !== 'products') { // Products are rendered separately below
                            return components[key];
                        }
                        return null;
                    })}
                </div>
                {components.products}
            </div>
        </section>
    );
};