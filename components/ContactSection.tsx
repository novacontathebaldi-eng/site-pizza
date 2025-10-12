import React from 'react';

export const ContactSection: React.FC = () => {
    const address = "Rua Porfilio Furtado, 178, Centro - Santa Leopoldina, ES";
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    // Vou colocar um botão no personalizar para carlinhos mudar isso fácil heheheh
    const facadeImageUrl = "https://lh3.googleusercontent.com/rd-gg-dl/AJfQ9KQkqkOtWs_hgFShtIOEArHEh8_xXooWu13P5CFqJ69NVReJXJ3WwvoSTDTDO8FUNKKUu1_gV4MrN8nji0cEdCnudLaz6WCWk9NK-Y3tW6JQa_KumwVZMiTgG1WKu9bq3ynTPyw_KWw_HnI8IbhR6ZWkaTJ3SM8IuC5Zf9cwfEMYmcLZkknimqSHA9ZCnNafgeDy0LRHs9wBf1xAozBJFKveB5r3QCzSltnieMzxKW90L3JYRw0zCYC8wRmWx1XD-Dld5TisTzadNrbka9xXO51x21dnmrj7h-0EkDFR5OWyZrUhCGwsq_mQDokC2uIfxu_MkdeK-g0W0m6JyXAjAcEfqAE3fTQ5ustRuzUwSTwvpAnkjQ_cKhluE8XzTKUBzk10rJogSfiqhFpo06oHJDHw9iMhX0Zs2nt1_yunIXzoMySet5hMSnVZRT4XiQPEjTc9MdScndBIQ5WiIDycCdgNXDh6b7guRnz_kU6Rbzg0dXsR2XgIaP8SPVCsYdS7uUp9kRUYVM07FqGkwMNZZs6kop1fpkZlS46rm64DdEwZ4X5uzGIkJxA_gtpXA4FcuRfp8AhRFei2lwgDbUtA5pQEUFc7Hy4s8iOslUL8jXqbp4ZVqUfe29FkzclTJLyDVoHPC9DkRjvMeM-d_-w--0MpOE9cLOUJLHQqRHAOmjsHMoOXDSAGXPWYiHqiHALl7gdye28wtnUe05oW44XDI6z7h4PNvv6SUEJzQluvmUG7iz5mme7DSGtgcI8AFGfWKuRZ51Ql4CWmc5-kPNfpJ50g_rb6FXe5ol0N-606jQ5GoQMvpCVHJQeiQk_kvTEQub6fnB4oiOM67aG9NMP-91jqf-lLnf5OifjWWLc0Lf9YZTzSaWX02oYWrppxlIf-TQ4viNWMtUvO1rk0Qu5_2vBdQzRbZk_62-gda3nw4d9CkXzolof_I4kIHRes-BUyF0iAzY7FPYQmRW9Xe7cPO5gmw7DgEmlZuoHK_wyxn73mV7nkqqS_a761li7jE8U0D2W6CRAzeJ9ZrlNEHLhDwXei9cJW3qpAdp0ZdqxjeqiExQ_M0OCCIe1OLmo8OgcrJe7t6-bqabmIvxATIfrG2UYiuIv5j6bwfhjgM09W-CxanS5MoSVjUdwOGZa4_z4zrwOoPK8nwEFzngi1Lx9cIuouBq5GADwQNs3AzSHW8TsjOxnNG91Jgk-JIJFpZ0b7monkgDhi1NY6DmYXo__D7PokTTCJ_K79ERBoo2b0jfvYHPW4DVpgrJJiTSRA3S5LtZdqoUS3_YX81VNt49LpkLvjEoY3cXXUqBuLqFtXZ5Dm5IK5QLRsI8TtyYI9BM9qafNsyuIJ9JHt55yDaSAxVNznVS6GpKAUTt67f0qIiBTlQgM41Rnv1Gu9=s1024-rj?authuser=4";

    return (
        <section id="contato" className="py-20 bg-white">
             <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                     <span className="inline-block bg-brand-green-300 text-brand-green-700 px-4 py-2 rounded-full font-semibold text-sm mb-4">
                        <i className="fas fa-map-marked-alt mr-2"></i>Venha nos Visitar
                    </span>
                    <h2 className="text-4xl font-bold text-text-on-light">Nossa Casa</h2>
                    <p className="text-lg text-gray-600 mt-2 max-w-2xl mx-auto">Estamos no coração de Santa Leopoldina, prontos para te receber com a melhor pizza do estado!</p>
                </div>

                <div className="grid lg:grid-cols-2 gap-12 items-stretch bg-brand-ivory-50 p-6 sm:p-8 rounded-2xl shadow-lg border border-brand-gold-600/20">
                    {/* Left Column: Info & Image */}
                    <div className="flex flex-col space-y-6">
                        <img 
                            src={facadeImageUrl}
                            alt="Ambiente aconchegante da pizzaria" 
                            className="rounded-xl shadow-lg w-full h-64 object-cover" 
                        />
                        
                        <div className="space-y-4 flex-grow">
                            <div className="flex items-start gap-4">
                                <i className="fas fa-map-marker-alt text-accent text-xl mt-1 w-6 text-center flex-shrink-0"></i>
                                <div>
                                    <h3 className="text-lg font-bold text-text-on-light">Nosso Endereço</h3>
                                    <p className="text-gray-700">{address}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-4">
                                <i className="fas fa-clock text-accent text-xl mt-1 w-6 text-center flex-shrink-0"></i>
                                <div>
                                    <h3 className="text-lg font-bold text-text-on-light">Funcionamento</h3>
                                    <p className="text-gray-700">Quarta a Domingo, das 19h às 22h</p>
                                </div>
                            </div>
                        </div>

                        <a 
                            href={googleMapsUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="mt-auto block text-center bg-accent text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-opacity-90 transition-all transform hover:scale-105"
                        >
                            <i className="fas fa-directions mr-2"></i>
                            Como Chegar
                        </a>
                    </div>

                    {/* Right Column: Map */}
                    <div className="w-full h-full min-h-[400px] lg:min-h-full rounded-xl overflow-hidden shadow-lg">
                        <iframe
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3748.241517983617!2d-40.53186832476562!3d-20.040217981387614!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xb8567115982877%3A0x1994e098805f778d!2sR.%20Porf%C3%ADrio%20Furtado%2C%20178%20-%20Santa%20Leopoldina%2C%20ES%2C%2029640-000!5e0!3m2!1sen!2sbr!4v1719503456789!5m2!1sen!2sbr"
                            className="w-full h-full"
                            style={{ border: 0 }}
                            allowFullScreen={true}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            title="Mapa da localização da Pizzaria Santa Sensação"
                        ></iframe>
                    </div>
                </div>
            </div>
        </section>
    );
};