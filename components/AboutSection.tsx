import React from 'react';
import { SiteContent } from '../types';

interface AboutSectionProps {
    siteContent: SiteContent | null;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ siteContent }) => {
    return (
        <section id="sobre" className="py-20 bg-brand-ivory-50">
            <div className="container mx-auto px-4">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div>
                         <span className="inline-block bg-brand-green-300 text-brand-green-700 px-4 py-2 rounded-full font-semibold text-sm mb-4">
                            <i className="fas fa-award mr-2"></i>{siteContent?.aboutBadge}
                        </span>
                        <h2 className="text-4xl font-bold text-text-on-light mb-6">{siteContent?.aboutTitle}</h2>
                        <p className="text-gray-700 leading-relaxed mb-6">
                           {siteContent?.aboutParagraph}
                        </p>
                        <div className="space-y-3">
                            {siteContent?.aboutAchievements.map((achievement, index) => (
                                <div key={index} className="flex items-center gap-3">
                                    <i className="fas fa-check-circle text-accent"></i>
                                    <span>{achievement}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="relative">
                        {siteContent?.aboutImgUrl && <img src={siteContent.aboutImgUrl} alt="Mestre Pizzaiolo Luca Lonardi segurando a pizza premiada" className="rounded-2xl shadow-xl w-full h-auto object-cover" />}
                    </div>
                </div>
            </div>
        </section>
    );
};
