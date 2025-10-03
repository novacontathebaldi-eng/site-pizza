import { SiteSettings } from '../types';
import defaultLogo from '../assets/logo.png';
import defaultHeroBg from '../assets/ambiente-pizzaria.webp';
import defaultAboutImg from '../assets/sobre-imagem.webp';

export const defaultSiteSettings: SiteSettings = {
    logoUrl: defaultLogo,
    heroSlogan: "A pizza nº 1 do ES",
    heroTitle: "Pizzaria Santa Sensação",
    heroSubtitle: "A pizza premiada do Espírito Santo, com ingredientes frescos, massa artesanal e a assinatura de um mestre.",
    heroBgUrl: defaultHeroBg,
    contentSections: [
        {
            id: 'section-1',
            order: 0,
            isVisible: true,
            isTagVisible: true,
            tagIcon: "fas fa-award",
            imageUrl: defaultAboutImg,
            tag: "Nossa Conquista",
            title: "A Melhor Pizza do Estado, Assinada por um Mestre",
            description: "Em parceria com o renomado mestre pizzaiolo Luca Lonardi, a Santa Sensação eleva a pizza a um novo patamar. Fomos os grandes vencedores do concurso Panshow 2025, um reconhecimento que celebra nossa dedicação aos ingredientes frescos, massa de fermentação natural e, acima de tudo, a paixão por criar sabores inesquecíveis. Cada pizza que sai do nosso forno a lenha carrega a assinatura de um campeão e a promessa de uma experiência única.",
            list: [
                { id: 'item-1-1', icon: "fas fa-award", text: "Vencedora do Panshow 2025" },
                { id: 'item-1-2', icon: "fas fa-user-check", text: "Assinada pelo Mestre Luca Lonardi" },
                { id: 'item-1-3', icon: "fas fa-leaf", text: "Ingredientes frescos e selecionados" },
                { id: 'item-1-4', icon: "fas fa-fire-alt", text: "Forno a lenha tradicional" }
            ]
        },
    ],
    footerLinks: [
        { id: 'footer-whatsapp', icon: 'fab fa-whatsapp', text: 'WhatsApp', url: 'https://wa.me/5527996500341', isVisible: true },
        { id: 'footer-instagram', icon: 'fab fa-instagram', text: 'Instagram', url: 'https://www.instagram.com/santasensacao.sl', isVisible: true },
        { id: 'footer-admin', icon: 'fas fa-key', text: 'Painel Administrativo', url: '#admin', isVisible: true }
    ],
    audioSettings: {
        notificationSound: '/assets/audio/notification2.mp3',
        notificationVolume: 0.5,
        backgroundMusic: '',
        backgroundVolume: 0.2,
    },
    notificationSettings: {
        browserNotificationsEnabled: false,
    }
};