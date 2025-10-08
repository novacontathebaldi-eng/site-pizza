import React from 'react';
import { ContentSection } from '../types';

interface DynamicContentSectionProps {
    section: ContentSection;
    order: number;
}

export const DynamicContentSection: React.FC<DynamicContentSectionProps> = ({ section, order }) => {
    const isOrderEven = order % 2 === 0;

    const content = (
        <div className="flex flex-col justify-center">
            {(section.isTagVisible ?? true) && section.tag && (
                <span className="inline-block bg-brand-green-300 text-brand-green-700 px-4 py-2 rounded-full font-semibold text-sm mb-4 self-start">
                    <i className={`${section.tagIcon || 'fas fa-star'} mr-2`}></i>{section.tag}
                </span>
            )}
            <h2 className="text-4xl font-bold text-text-on-light mb-6">{section.title}</h2>
            <p className="text-gray-700 leading-relaxed mb-6 whitespace-pre-wrap">
               {section.description}
            </p>
            <div className="space-y-3">
                {(section.list ?? []).map((item) => (
                    item.text && (
                        <div key={item.id} className="flex items-center gap-3">
                            <i className={`${item.icon} text-accent w-5 text-center`}></i>
                            <span>{item.text}</span>
                        </div>
                    )
                ))}
            </div>
        </div>
    );

    const image = section.imageUrl ? (
        <div className="relative flex items-center justify-center">
            <img src={section.imageUrl} alt={section.title} className="rounded-2xl shadow-xl w-full h-auto object-cover" />
        </div>
    ) : null;

    return (
        <section id={`content-${section.id}`} className="py-20 bg-brand-ivory-50 odd:bg-white">
            <div className="container mx-auto px-4">
                <div className={`grid ${image ? 'lg:grid-cols-2' : 'grid-cols-1'} gap-12 items-center`}>
                    {/* If there's no image, always render content first. Otherwise, alternate. */}
                    {!image || isOrderEven ? (
                        <>
                            {content}
                            {image}
                        </>
                    ) : (
                        <>
                            {image}
                            {content}
                        </>
                    )}
                </div>
            </div>
        </section>
    );
};