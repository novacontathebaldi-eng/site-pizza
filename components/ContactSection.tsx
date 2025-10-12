
import React from 'react';

const ContactCard = ({ icon, title, text, buttonText, buttonLink, isPrimary }: { icon: string; title: string; text: string; buttonText?: string; buttonLink?: string, isPrimary?: boolean }) => (
    <div className="bg-brand-ivory-50 p-6 rounded-2xl shadow-md hover:shadow-lg transition-shadow text-center flex flex-col items-center border border-brand-green-300/50">
        <div className="w-16 h-16 rounded-2xl bg-brand-green-300 text-brand-green-700 flex items-center justify-center text-2xl mb-4">
            <i className={icon}></i>
        </div>
        <h3 className="text-xl font-bold text-text-on-light mb-2">{title}</h3>
        <p className="text-gray-600 mb-4 flex-grow" dangerouslySetInnerHTML={{ __html: text }}></p>
        {buttonLink && buttonText && (
             <a href={buttonLink} target="_blank" rel="noopener noreferrer" className={`mt-auto font-bold py-2 px-6 rounded-lg transition-all transform hover:scale-105 ${isPrimary ? 'bg-accent text-white' : 'bg-brand-green-500 text-white'}`}>
                {buttonText}
            </a>
        )}
    </div>
);

export const ContactSection: React.FC = () => {
    return (
        <section id="contato" className="py-20 bg-white">
             <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                     <span className="inline-block bg-brand-green-300 text-brand-green-700 px-4 py-2 rounded-full font-semibold text-sm mb-4">
                        <i className="fas fa-map-marker-alt mr-2"></i>Fale Conosco
                    </span>
                    <h2 className="text-4xl font-bold text-text-on-light">Entre em Contato</h2>
                    <p className="text-lg text-gray-600 mt-2 max-w-2xl mx-auto">Estamos prontos para atendê-lo e preparar a melhor pizza da sua vida!</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    <ContactCard 
                        icon="fab fa-whatsapp"
                        title="WhatsApp"
                        text="Faça seu pedido pelo WhatsApp"
                        buttonText="(27) 99650-0341"
                        buttonLink="https://wa.me/5527996500341"
                        isPrimary
                    />
                     <ContactCard 
                        icon="fab fa-instagram"
                        title="Instagram"
                        text="Siga-nos para novidades"
                        buttonText="@santasensacao.sl"
                        buttonLink="https://www.instagram.com/santasensacao.sl"
                    />
                     <ContactCard 
                        icon="fas fa-map-marker-alt"
                        title="Endereço"
                        text="Porfilio Furtado, 178<br>Centro - Santa Leopoldina, ES"
                    />
                     <ContactCard 
                        icon="fas fa-clock"
                        title="Horário"
                        text="Quarta a Domingo<br>19h às 22h"
                    />
                </div>
                
                <div className="mt-16">
                    <iframe
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3748.241517983617!2d-40.53186832476562!3d-20.040217981387614!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xb8567115982877%3A0x1994e098805f778d!2sR.%20Porf%C3%ADrio%20Furtado%2C%20178%20-%20Santa%20Leopoldina%2C%20ES%2C%2029640-000!5e0!3m2!1sen!2sbr!4v1719503456789!5m2!1sen!2sbr"
                        className="w-full h-96 rounded-2xl shadow-lg border border-brand-green-300/50"
                        style={{ border: 0 }}
                        allowFullScreen={true}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Mapa da localização da Pizzaria Santa Sensação"
                    ></iframe>
                </div>

            </div>
        </section>
    );
};
