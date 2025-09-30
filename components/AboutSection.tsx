import React from 'react';
import aboutImg from '../assets/sobre-imagem.webp';

export const AboutSection: React.FC = () => {
    return (
        <section id="sobre" className="py-20 bg-brand-ivory-50">
            <div className="container mx-auto px-4">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div>
                         <span className="inline-block bg-brand-green-300 text-brand-green-700 px-4 py-2 rounded-full font-semibold text-sm mb-4">
                            <i className="fas fa-award mr-2"></i>Nossa Conquista
                        </span>
                        <h2 className="text-4xl font-bold text-text-on-light mb-6">A Melhor Pizza do Estado, Assinada por um Mestre</h2>
                        <p className="text-gray-700 leading-relaxed mb-6">
                           Em parceria com o renomado mestre pizzaiolo Luca Lonardi, a Santa Sensação eleva a pizza a um novo patamar. Fomos os grandes vencedores do concurso Panshow 2025, um reconhecimento que celebra nossa dedicação aos ingredientes frescos, massa de fermentação natural e, acima de tudo, a paixão por criar sabores inesquecíveis. Cada pizza que sai do nosso forno a lenha carrega a assinatura de um campeão e a promessa de uma experiência única.
                        </p>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3"><i className="fas fa-check-circle text-accent"></i><span>Vencedora do Panshow 2025</span></div>
                            <div className="flex items-center gap-3"><i className="fas fa-check-circle text-accent"></i><span>Assinada pelo Mestre Luca Lonardi</span></div>
                            <div className="flex items-center gap-3"><i className="fas fa-check-circle text-accent"></i><span>Ingredientes frescos e selecionados</span></div>
                            <div className="flex items-center gap-3"><i className="fas fa-check-circle text-accent"></i><span>Forno a lenha tradicional</span></div>
                        </div>
                    </div>
                    <div className="relative">
                        <img src={aboutImg} alt="Mestre Pizzaiolo Luca Lonardi segurando a pizza premiada" className="rounded-2xl shadow-xl w-full h-auto object-cover" />
                    </div>
                </div>
            </div>
        </section>
    );
};