import React from 'react';
import { SiteSettings } from '../types';

interface AboutSectionProps {
    settings: SiteSettings;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ settings }) => {
    // FIX: This component was using deprecated properties on SiteSettings (e.g., aboutTag, aboutTitle).
    // It has been updated to use the first available section from the `contentSections` array,
    // which aligns with the current data structure.
    const aboutSection = settings.contentSections?.filter(s => s.isVisible).sort((a,b) => a.order - b.order)[0];

    if (!aboutSection) {
        return null; // Don't render if there's no visible content section.
    }

    return (
        <section id="sobre" className="py-20 bg-brand-ivory-50">
            <div className="container mx-auto px-4">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div>
                         <span className="inline-block bg-brand-green-300 text-brand-green-700 px-4 py-2 rounded-full font-semibold text-sm mb-4">
                            <i className="fas fa-award mr-2"></i>{aboutSection.tag}
                        </span>
                        <h2 className="text-4xl font-bold text-text-on-light mb-6">{aboutSection.title}</h2>
                        <p className="text-gray-700 leading-relaxed mb-6 whitespace-pre-wrap">
                           {aboutSection.description}
                        </p>
                        <div className="space-y-3">
                            {aboutSection.list.map((item) => (
                                item.text && (
                                    // FIX: Changed key from index to item.id, which is available on ContentSectionListItem and is better for reconciliation.
                                    <div key={item.id} className="flex items-center gap-3">
                                        <i className={`${item.icon} text-accent`}></i>
                                        <span>{item.text}</span>
                                    </div>
                                )
                            ))}
                        </div>
                    </div>
                    <div className="relative">
                        <img src={aboutSection.imageUrl} alt="Mestre Pizzaiolo Luca Lonardi segurando a pizza premiada" className="rounded-2xl shadow-xl w-full h-auto object-cover" />
                    </div>
                </div>
            </div>
        </section>
    );
};
