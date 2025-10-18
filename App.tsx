import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
// FIX: The 'Partial' type is a built-in TypeScript utility and does not need to be imported.
import { Product, Category, CartItem, OrderDetails, SiteSettings, Order, OrderStatus, PaymentStatus, ChatMessage, ReservationDetails, UserProfile, DaySchedule } from './types';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { MenuSection } from './components/MenuSection';
import { DynamicContentSection } from './components/DynamicContentSection';
import { ContactSection } from './components/ContactSection';
import { AdminSection } from './components/AdminSection';
import { Footer } from './components/Footer';
import { CartSidebar } from './components/CartSidebar';
import { CheckoutModal, OrderConfirmationModal, ReservationConfirmationModal } from './components/CheckoutModal';
import { ReservationModal } from './components/ReservationModal';
import { PixPaymentModal } from './components/PixPaymentModal';
import { PaymentFailureModal } from './components/PaymentFailureModal';
import { Chatbot } from '@/components/Chatbot';
import { LoginModal } from '@/components/LoginModal';
import { UserAreaModal } from '@/components/UserAreaModal';
import { db, auth } from './services/firebase';
import * as firebaseService from './services/firebaseService';
import { seedDatabase } from './services/seed';
import defaultLogo from './assets/logo.png';
import defaultHeroBg from './assets/ambiente-pizzaria.webp';
import defaultAboutImg from './assets/sobre-imagem.webp';
import firebase from 'firebase/compat/app';
import { OrderDetailsModal } from './components/OrderDetailsModal';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { CookieConsentBanner } from './components/CookieConsentBanner';

// Type declarations for Google GAPI library to avoid TypeScript errors
declare global {
    interface Window {
        gapi: any;
        googleScriptLoaded: boolean;
        onGoogleScriptLoadCallback: () => void;
    }
}

interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error';
}

const defaultSiteSettings: SiteSettings = {
    logoUrl: defaultLogo,
    heroSlogan: "A pizza nº 1 do ES",
    heroTitle: "Pizzaria Santa Sensação",
    heroSubtitle: "A pizza premiada do Espírito Santo, com ingredientes frescos, massa artesanal e a assinatura de um mestre.",
    heroBgUrl: defaultHeroBg,
    automaticSchedulingEnabled: true,
    operatingHours: [
        { dayOfWeek: 0, dayName: 'Domingo', isOpen: true, openTime: '19:00', closeTime: '22:00' },
        { dayOfWeek: 1, dayName: 'Segunda', isOpen: false, openTime: '19:00', closeTime: '22:00' },
        { dayOfWeek: 2, dayName: 'Terça', isOpen: false, openTime: '19:00', closeTime: '22:00' },
        { dayOfWeek: 3, dayName: 'Quarta', isOpen: true, openTime: '19:00', closeTime: '22:00' },
        { dayOfWeek: 4, dayName: 'Quinta', isOpen: true, openTime: '19:00', closeTime: '22:00' },
        { dayOfWeek: 5, dayName: 'Sexta', isOpen: true, openTime: '19:00', closeTime: '22:00' },
        { dayOfWeek: 6, dayName: 'Sábado', isOpen: true, openTime: '19:00', closeTime: '22:00' },
    ],
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
        {
            id: 'section-2',
            order: 1,
            isVisible: true,
            isTagVisible: true,
            tagIcon: 'fas fa-seedling',
            imageUrl: 'https://picsum.photos/seed/ingredients/800/600',
            tag: "Qualidade e Tradição",
            title: "Ingredientes Frescos, Sabor Incomparável",
            description: "Nossa paixão pela pizza começa na escolha de cada ingrediente. Trabalhamos com produtores locais para garantir o frescor e a qualidade que você sente em cada fatia. Da nossa massa de fermentação lenta aos tomates italianos, tudo é pensado para criar uma experiência única.",
            list: [
                { id: 'item-2-1', icon: 'fas fa-bread-slice', text: "Massa de fermentação natural de 48h" },
                { id: 'item-2-2', icon: 'fas fa-pepper-hot', text: "Tomates italianos San Marzano" },
                { id: 'item-2-3', icon: 'fas fa-cheese', text: "Mozzarella fresca e queijos selecionados" },
                { id: 'item-2-4', icon: 'fas fa-leaf', text: "Manjericão e ervas da nossa horta" }
            ]
        }
    ],
    footerLinks: [
        { id: 'footer-whatsapp', icon: 'fab fa-whatsapp', text: 'WhatsApp', url: 'https://wa.me/5527996500341', isVisible: true },
        { id: 'footer-instagram', icon: 'fab fa-instagram', text: 'Instagram', url: 'https://www.instagram.com/santasensacao.sl', isVisible: true },
        { id: 'footer-admin', icon: 'fas fa-key', text: 'Painel Administrativo', url: '#admin', isVisible: true }
    ]
};

const generateWhatsAppMessage = (details: OrderDetails, currentCart: CartItem[], total: number, orderNumber: number, isPaid: boolean) => {
    const orderTypeMap = { delivery: 'Entrega', pickup: 'Retirada na loja', local: 'Consumo no Local' };
    const paymentMethodMap = { credit: 'Cartão de Crédito', debit: 'Cartão de Débito', pix: 'PIX', cash: 'Dinheiro' };

    let message = `*🍕 NOVO PEDIDO #${orderNumber} - SANTA SENSAÇÃO 🍕*\n\n`;
    if (isPaid) {
        message += `*✅ JÁ PAGO VIA PIX PELO SITE*\n\n`;
    }
    message += `*👤 DADOS DO CLIENTE:*\n`;
    message += `*Nome:* ${details.name}\n`;
    message += `*Telefone:* ${details.phone}\n`;
    message += `*Tipo de Pedido:* ${orderTypeMap[details.orderType]}\n`;
    
    if (details.orderType === 'delivery') {
        message += `\n*📍 ENDEREÇO DE ENTREGA:*\n`;
        message += `*Localidade:* ${details.neighborhood}\n`;
        message += `*Rua:* ${details.street}\n`;
        message += `*Número:* ${details.number}\n`;
        if (details.complement) {
            message += `*Complemento:* ${details.complement}\n`;
        }
    }
    
    if (details.allergies) {
        message += `\n*⚠️ ALERGIAS/RESTRIÇÕES:*\n${details.allergies}\n`;
    }

    message += `\n*🛒 ITENS DO PEDIDO:*\n`;
    currentCart.forEach(item => {
        message += `• ${item.quantity}x ${item.name} (${item.size}) - R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}\n`;
    });

    const subtotal = currentCart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    message += `\n*🧾 RESUMO FINANCEIRO:*\n`;
    message += `*Subtotal:* R$ ${subtotal.toFixed(2).replace('.', ',')}\n`;
    if (details.orderType === 'delivery' && details.deliveryFee) {
        message += `*Taxa de Entrega:* R$ ${details.deliveryFee.toFixed(2).replace('.', ',')}\n`;
    }
    message += `*💰 TOTAL: R$ ${total.toFixed(2).replace('.', ',')}*\n\n`;
    
    message += `*💳 PAGAMENTO:*\n`;
    message += `*Forma:* ${paymentMethodMap[details.paymentMethod]}\n`;
    if (!isPaid && details.paymentMethod === 'cash') {
        if (details.changeNeeded) {
            message += `*Precisa de troco para:* R$ ${details.changeAmount}\n`;
        } else {
            message += `*Não precisa de troco.*\n`;
        }
    }
    if (details.notes) {
        message += `\n*📝 OBSERVAÇÕES:*\n${details.notes}\n`;
    }
    message += `\n_Pedido gerado pelo nosso site._`;
    return `https://wa.me/5527996500341?text=${encodeURIComponent(message)}`;
};

const generateReservationWhatsAppMessage = (details: ReservationDetails, orderNumber: number) => {
    let message = `*📅 NOVA RESERVA #${orderNumber} - SANTA SENSAÇÃO 📅*\n\n`;
    message += `Uma nova reserva foi feita pelo site.\n\n`;
    message += `*👤 DADOS DO CLIENTE:*\n`;
    message += `*Nome:* ${details.name}\n`;
    message += `*Telefone:* ${details.phone}\n\n`;
    message += `*📋 DETALHES DA RESERVA:*\n`;
    const [year, month, day] = details.reservationDate.split('-');
    const formattedDate = `${day}/${month}/${year}`;
    message += `*Data:* ${formattedDate}\n`;
    message += `*Horário:* ${details.reservationTime}\n`;
    message += `*Quantidade de Pessoas:* ${details.numberOfPeople}\n`;
    if (details.notes) {
        message += `\n*📝 OBSERVAÇÕES:*\n${details.notes}\n`;
    }
    message += `\n_Reserva gerada pelo nosso site._`;
    return `https://wa.me/5527996500341?text=${encodeURIComponent(message)}`;
};

const App: React.FC = () => {
    // App State
    const [name, setName] = useState<string>('');
    const [phone, setPhone] = useState<string>('');
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [isStoreOnline, setIsStoreOnline] = useState<boolean>(true);
    const [siteSettings, setSiteSettings] = useState<SiteSettings>(defaultSiteSettings);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // UI State
    const [activeSection, setActiveSection] = useState('Início');
    const [activeMenuCategory, setActiveMenuCategory] = useState<string>('');
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState<boolean>(false);
    const [isReservationModalOpen, setIsReservationModalOpen] = useState<boolean>(false);
    const [isChatbotOpen, setIsChatbotOpen] = useState<boolean>(false);
    const [isFooterVisible, setIsFooterVisible] = useState(false);
    const [showFloatingButton, setShowFloatingButton] = useState(false);
    const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState<boolean>(false);
    const [showCookieBanner, setShowCookieBanner] = useState<boolean>(false);
    
    // Auth State
    const [currentUser, setCurrentUser] = useState<firebase.User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
    const [isUserAreaModalOpen, setIsUserAreaModalOpen] = useState<boolean>(false);
    const [isGapiReady, setIsGapiReady] = useState(false);
    const [postRegisterAction, setPostRegisterAction] = useState<string | null>(null);
    const prevUser = useRef<firebase.User | null>(null);


    // Order/Payment Flow State
    const [cart, setCart] = useState<CartItem[]>([]);
    const [payingOrder, setPayingOrder] = useState<Order | null>(null);
    const [showPaymentFailureModal, setShowPaymentFailureModal] = useState<boolean>(false);
    const [pixRetryKey, setPixRetryKey] = useState<number>(0);
    const [isProcessingOrder, setIsProcessingOrder] = useState<boolean>(false);
    const [confirmedOrderData, setConfirmedOrderData] = useState<Order | null>(null);
    const [confirmedReservationData, setConfirmedReservationData] = useState<Order | null>(null);
    const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
    const [isOrderTrackerExpanded, setIsOrderTrackerExpanded] = useState<boolean>(false);

    // Admin State
    const [refundingOrderId, setRefundingOrderId] = useState<string | null>(null);
    
    // Chatbot State
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
        { role: 'bot', content: `🍕 Olá! Bem-vindo(a) à Pizzaria Santa Sensação!\n\nEu sou o Sensação, seu assistente virtual. Estou aqui para te ajudar a fazer pedidos, tirar dúvidas sobre nosso cardápio, acompanhar entregas e muito mais.\n\nComo posso te ajudar hoje?` }
    ]);
    const [isBotReplying, setIsBotReplying] = useState<boolean>(false);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    
    // Logic to determine if any modal is visible
    const isModalVisible = useMemo(() => {
        return isCartOpen || 
               isCheckoutModalOpen || 
               isReservationModalOpen || 
               isChatbotOpen || 
               isLoginModalOpen || 
               isUserAreaModalOpen || 
               !!payingOrder || 
               showPaymentFailureModal || 
               !!confirmedOrderData || 
               !!confirmedReservationData ||
               !!trackingOrder ||
               isPrivacyPolicyOpen;
    }, [
        isCartOpen, 
        isCheckoutModalOpen, 
        isReservationModalOpen, 
        isChatbotOpen, 
        isLoginModalOpen, 
        isUserAreaModalOpen, 
        payingOrder, 
        showPaymentFailureModal, 
        confirmedOrderData, 
        confirmedReservationData,
        trackingOrder,
        isPrivacyPolicyOpen
    ]);

    // Effect to lock body scroll when a modal is open
    useEffect(() => {
        if (isModalVisible) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
        }

        // Cleanup function to ensure scroll is restored if component unmounts
        return () => {
            document.body.classList.remove('modal-open');
        };
    }, [isModalVisible]);

    const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        const id = Date.now();
        setToasts(prevToasts => [...prevToasts, { id, message, type }]);
        setTimeout(() => {
            setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
        }, 4000);
    }, []);

    // Effect to check for cookie consent on initial load
    useEffect(() => {
        const consent = localStorage.getItem('santaSensacaoCookieConsent');
        if (!consent) {
            setShowCookieBanner(true);
        }
    }, []);

    const handleAcceptCookies = () => {
        localStorage.setItem('santaSensacaoCookieConsent', 'true');
        setShowCookieBanner(false);
    };

    // Effect to initialize Google Auth
    useEffect(() => {
        const initGoogleAuth = () => {
            if (window.gapi && !isGapiReady) {
                window.gapi.load('auth2', () => {
                    try {
                        window.gapi.auth2.init({
                            client_id: '914255031241-o9ilfh14poff9ik89uabv1me8f28v8o9.apps.googleusercontent.com',
                        }).then(() => {
                            setIsGapiReady(true);
                        }, (error: any) => {
                            // Don't show toast on initial load failure, only on interaction.
                            console.error('Error initializing Google Auth2:', error);
                        });
                    } catch (error) {
                        console.error('Error loading Google Auth2:', error);
                    }
                });
            }
        };

        // Assign callback for the script in index.html to call
        window.onGoogleScriptLoadCallback = initGoogleAuth;

        // If script is already loaded and callback was missed (race condition), run init
        if (window.googleScriptLoaded) {
            initGoogleAuth();
        }

        return () => {
            // @ts-ignore
            delete window.onGoogleScriptLoadCallback;
        };
    }, [isGapiReady]);


    // Effect for Firebase Auth state changes
    useEffect(() => {
        if (!auth) return;
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            setCurrentUser(user);
            if (user) {
                const profile = await firebaseService.getUserProfile(user.uid);
                setUserProfile(profile);
                if (profile?.name) setName(profile.name);
                if (profile?.phone) setPhone(profile.phone);
            } else {
                setUserProfile(null);
                setName('');
                setPhone('');
            }
        });
        return () => unsubscribe();
    }, []);
    
    // Effect to sync guest orders on login
    useEffect(() => {
        const syncGuestOrders = async (user: firebase.User) => {
            const guestOrderIds: string[] = JSON.parse(localStorage.getItem('santaSensacaoGuestOrders') || '[]');
            if (guestOrderIds.length > 0) {
                try {
                    await firebaseService.syncGuestOrders(user.uid, guestOrderIds);
                    localStorage.removeItem('santaSensacaoGuestOrders');
                    addToast('Seus pedidos anteriores foram associados à sua conta!', 'success');
                } catch (error) {
                    console.error('Failed to sync guest orders:', error);
                    addToast('Não foi possível associar seus pedidos anteriores.', 'error');
                }
            }
        };

        // Check if user has just logged in (was null, is now not null)
        if (currentUser && !prevUser.current) {
            syncGuestOrders(currentUser);
        }

        // Update the ref for the next render
        prevUser.current = currentUser;
    }, [currentUser, addToast]);


    // Effect to listen for profile updates in real-time
    useEffect(() => {
        if (!db || !currentUser?.uid) return;
    
        const unsubProfile = db.collection('users').doc(currentUser.uid).onSnapshot(doc => {
            if (doc.exists) {
                const newProfile = { uid: doc.id, ...doc.data() } as UserProfile;
                setUserProfile(newProfile);
                if (newProfile.name) setName(newProfile.name);
                if (newProfile.phone) setPhone(newProfile.phone);
            }
        });
    
        return () => unsubProfile();
    }, [currentUser?.uid]);
    
    // Effect to trigger post-registration flow
    useEffect(() => {
        if (postRegisterAction === 'add_address_flow' && currentUser) {
            setIsUserAreaModalOpen(true);
        }
    }, [postRegisterAction, currentUser]);


    // Other existing handlers...
    useEffect(() => {
        const savedCart = localStorage.getItem('santaSensacaoCart');
        if (savedCart) setCart(JSON.parse(savedCart));
    }, []);

    useEffect(() => {
        const sectionIds = ['inicio', 'cardapio', 'sobre', 'contato'];
        const sectionElements = sectionIds.map(id => document.getElementById(id));
        const idToTitle: { [key: string]: string } = { 'inicio': 'Início', 'cardapio': 'Cardápio', 'sobre': 'Sobre Nós', 'contato': 'Contato' };

        const observerOptions = { root: null, rootMargin: '-80px 0px -60% 0px', threshold: 0 };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setActiveSection(idToTitle[entry.target.id] || 'Início');
                }
            });
        }, observerOptions);

        sectionElements.forEach(el => { if (el) observer.observe(el); });
        
        const footerElement = document.getElementById('footer-section');
        const footerObserver = new IntersectionObserver(([entry]) => setIsFooterVisible(entry.isIntersecting), { threshold: 0.1 });
        if (footerElement) footerObserver.observe(footerElement);

        const cardapioEl = document.getElementById('cardapio');
        const buttonObserver = new IntersectionObserver(([entry]) => {
            // Mostra o botão se o final da seção do cardápio estiver acima do topo da viewport (ou seja, já foi rolado para cima)
            setShowFloatingButton(!entry.isIntersecting && entry.boundingClientRect.bottom < 0);
        }, { threshold: 0 });
        if (cardapioEl) buttonObserver.observe(cardapioEl);

        return () => {
            sectionElements.forEach(el => { if (el) observer.unobserve(el); });
            if (footerElement) footerObserver.unobserve(footerElement);
            if (cardapioEl) buttonObserver.unobserve(cardapioEl);
        };
    }, [isLoading]);
    


    useEffect(() => {
        if (!db) { setError("Falha na conexão com o banco de dados."); setIsLoading(false); return; }
        const handleConnectionError = (err: Error, context: string) => { console.error(`Error fetching ${context}:`, err); setError("Não foi possível conectar ao banco de dados."); setIsLoading(false); };
        const unsubSettings = db.doc('store_config/site_settings').onSnapshot(doc => { if (doc.exists) setSiteSettings(prev => ({ ...defaultSiteSettings, ...prev, ...doc.data() as Partial<SiteSettings> })); }, err => handleConnectionError(err, "site settings"));
        const unsubStatus = db.doc('store_config/status').onSnapshot(doc => { if (doc.data()) setIsStoreOnline(doc.data()!.isOpen); }, err => handleConnectionError(err, "store status"));
        const unsubCategories = db.collection('categories').orderBy('order').onSnapshot(snapshot => setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category))), err => handleConnectionError(err, "categories"));
        const unsubProducts = db.collection('products').orderBy('orderIndex').onSnapshot(snapshot => { setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product))); setIsLoading(false); setError(null); }, err => handleConnectionError(err, "products"));
        const unsubOrders = db.collection('orders').orderBy('createdAt', 'desc').onSnapshot(snapshot => setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order))), err => handleConnectionError(err, "orders"));
        return () => { unsubSettings(); unsubStatus(); unsubCategories(); unsubProducts(); unsubOrders(); };
    }, []);

    useEffect(() => { if (categories.length > 0 && !activeMenuCategory) { const firstActiveCategory = categories.find(c => c.active); if (firstActiveCategory) setActiveMenuCategory(firstActiveCategory.id); } }, [categories, activeMenuCategory]);
    useEffect(() => { localStorage.setItem('santaSensacaoCart', JSON.stringify(cart)); }, [cart]);


    // --- Auth Handlers ---
    const handleGoogleSignIn = async () => {
        if (!isGapiReady || !auth) {
            addToast('Serviço de login não está pronto. Tente em instantes.', 'error');
            return;
        }
        try {
            const googleAuth = window.gapi.auth2.getAuthInstance();
            const googleUser = await googleAuth.signIn();
            const idToken = googleUser.getAuthResponse().id_token;

            // Garante que a sessão do usuário persista após o navegador ser fechado.
            await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

            const customToken = await firebaseService.verifyGoogleToken(idToken);
            await auth.signInWithCustomToken(customToken);

            setIsLoginModalOpen(false);
            addToast(`Bem-vindo(a), ${googleUser.getBasicProfile().getName()}!`, 'success');
        } catch (error: any) {
            console.error("Google Sign-In Error:", error);
            if (error.error !== 'popup_closed_by_user') {
                addToast('Falha no login com Google. Tente novamente.', 'error');
            }
        }
    };
    
    const handleRegisterSuccess = () => {
        setIsLoginModalOpen(false);
        setPostRegisterAction('add_address_flow');
    };

    const handleLogout = async () => {
        if (!auth) return;
        try {
            if (isGapiReady) {
                const googleAuth = window.gapi.auth2.getAuthInstance();
                if (googleAuth && googleAuth.isSignedIn.get()) {
                    await googleAuth.signOut();
                }
            }
            await auth.signOut();
            setIsUserAreaModalOpen(false);
            addToast('Você foi desconectado.', 'success');
        } catch (error) {
            console.error('Error signing out:', error);
            addToast('Erro ao sair da conta.', 'error');
        }
    };

    const handleUserIconClick = () => {
        if (currentUser) {
            setIsUserAreaModalOpen(true);
        } else {
            setIsLoginModalOpen(true);
        }
    };
    
    const handleUserAreaClose = () => {
        setIsUserAreaModalOpen(false);
        if (postRegisterAction) {
            setPostRegisterAction(null);
        }
    };


    // Other existing handlers...
    const handleSendMessageToBot = async (message: string) => {
        if (!message.trim() || isBotReplying) return;
        const newUserMessage: ChatMessage = { role: 'user', content: message };
        const updatedMessages = [...chatMessages, newUserMessage];
        setChatMessages(updatedMessages);
        setIsBotReplying(true);
        try {
            const botReply = await firebaseService.askChatbot(updatedMessages);
            const newBotMessage: ChatMessage = { role: 'bot', content: botReply };
            setChatMessages(prev => [...prev, newBotMessage]);
        } catch (error) {
            const errorMessage: ChatMessage = { role: 'bot', content: 'Desculpe, estou com um problema para me conectar. Tente novamente mais tarde.' };
            setChatMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsBotReplying(false);
        }
    };

    const handleAddToCart = useCallback((product: Product, size: string, price: number) => {
        setCart(prevCart => {
            const existingItemIndex = prevCart.findIndex(item => item.productId === product.id && item.size === size);
            if (existingItemIndex > -1) {
                const updatedCart = [...prevCart];
                updatedCart[existingItemIndex].quantity += 1;
                return updatedCart;
            } else {
                const newItem: CartItem = { id: `${product.id}-${size}`, productId: product.id, name: product.name, size, price, quantity: 1, imageUrl: product.imageUrl };
                return [...prevCart, newItem];
            }
        });
    }, []);

    const handleUpdateCartQuantity = useCallback((itemId: string, newQuantity: number) => {
        setCart(prevCart => {
            if (newQuantity <= 0) return prevCart.filter(item => item.id !== itemId);
            return prevCart.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item);
        });
    }, []);
    
    const handleCheckout = async (details: OrderDetails) => {
        setIsProcessingOrder(true);
        setIsCheckoutModalOpen(false);
        const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const total = subtotal + (details.deliveryFee || 0);
        try {
            const { orderId, orderNumber } = await firebaseService.createOrder(details, cart, total, 'payLater');
            
            if (!currentUser) {
                const guestOrders = JSON.parse(localStorage.getItem('santaSensacaoGuestOrders') || '[]');
                guestOrders.push(orderId);
                localStorage.setItem('santaSensacaoGuestOrders', JSON.stringify(guestOrders));
            }

            addToast(`Pedido #${orderNumber} criado!`, 'success');
            const confirmedOrder: Order = {
                id: orderId, orderNumber,
                customer: { name: details.name, phone: details.phone, orderType: details.orderType, ...details },
                items: cart, total, paymentMethod: details.paymentMethod, paymentStatus: 'pending', status: 'pending',
                createdAt: new Date(), notes: details.notes, allergies: details.allergies, deliveryFee: details.deliveryFee,
            };
            setConfirmedOrderData(confirmedOrder);
            setCart([]);
            setIsCartOpen(false);
        } catch (error: any) {
            console.error("Failed to create order:", error);
            addToast(error.message || "Erro ao criar pedido.", 'error');
        } finally {
            setIsProcessingOrder(false);
        }
    };

    const handleInitiatePixPayment = async (details: OrderDetails, pixOption: 'payNow' | 'payLater') => {
        setIsProcessingOrder(true);
        setIsCheckoutModalOpen(false);
        const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const total = subtotal + (details.deliveryFee || 0);
        try {
            const { orderId, orderNumber, pixData } = await firebaseService.createOrder(details, cart, total, pixOption);

            if (!currentUser) {
                const guestOrders = JSON.parse(localStorage.getItem('santaSensacaoGuestOrders') || '[]');
                guestOrders.push(orderId);
                localStorage.setItem('santaSensacaoGuestOrders', JSON.stringify(guestOrders));
            }

            if (!pixData || !pixData.qrCodeBase64) throw new Error("A resposta do servidor não incluiu os dados do PIX.");
            const newOrder: Order = {
                id: orderId, orderNumber: orderNumber,
                customer: { name: details.name, phone: details.phone, orderType: details.orderType, address: details.address, cpf: details.cpf },
                items: cart, total, paymentMethod: 'pix', status: 'awaiting-payment', paymentStatus: 'pending',
                deliveryFee: details.deliveryFee, allergies: details.allergies, createdAt: new Date(),
                mercadoPagoDetails: { paymentId: '', qrCodeBase64: pixData.qrCodeBase64, qrCode: pixData.copyPaste }
            };
            setPayingOrder(newOrder);
            setPixRetryKey(k => k + 1);
        } catch (error: any) {
            console.error("Failed to initiate PIX payment:", error);
            addToast(error.message || "Erro ao iniciar pagamento PIX.", 'error');
            setPayingOrder(null);
        } finally {
            setIsProcessingOrder(false);
        }
    };

    const handleConfirmReservation = async (details: ReservationDetails) => {
        setIsProcessingOrder(true);
        setIsReservationModalOpen(false);
        try {
            const { orderId, orderNumber } = await firebaseService.createReservation(details);
            addToast(`Reserva #${orderNumber} registrada com sucesso!`, 'success');
            const confirmedReservation: Order = {
                id: orderId, orderNumber,
                customer: { name: details.name, phone: details.phone, orderType: 'local', reservationDate: details.reservationDate, reservationTime: details.reservationTime },
                numberOfPeople: details.numberOfPeople, notes: details.notes, status: 'pending', paymentStatus: 'pending', createdAt: new Date(),
            };
            setConfirmedReservationData(confirmedReservation);
        } catch (error: any) {
            console.error("Failed to create reservation:", error);
            addToast(error.message || "Erro ao criar reserva.", 'error');
        } finally {
            setIsProcessingOrder(false);
        }
    };

    const handlePixPaymentSuccess = useCallback((paidOrder: Order) => {
       if (!paidOrder || !paidOrder.id) { addToast("Erro crítico ao processar pagamento.", 'error'); return; }
       addToast("Pagamento confirmado! Seu pedido foi registrado.", 'success');
       setPayingOrder(null);
       setConfirmedOrderData(paidOrder);
       setCart([]);
       setIsCartOpen(false);
    }, [addToast]);

    const handleSendOrderToWhatsApp = (order: Order) => {
        const isPaid = order.paymentStatus === 'paid_online';
        const details: OrderDetails = {
            name: order.customer.name, phone: order.customer.phone, orderType: order.customer.orderType,
            paymentMethod: order.paymentMethod || 'pix', changeNeeded: order.changeNeeded || false,
            changeAmount: order.changeAmount || '', notes: order.notes || '', cpf: order.customer.cpf || '',
            neighborhood: order.customer.neighborhood || '', street: order.customer.street || '',
            number: order.customer.number || '', complement: order.customer.complement || '',
            allergies: order.allergies || '', deliveryFee: order.deliveryFee || 0,
        };
        const whatsappUrl = generateWhatsAppMessage(details, order.items || cart, order.total || 0, order.orderNumber, isPaid);
        window.open(whatsappUrl, '_blank');
        setConfirmedOrderData(null);
    };

    const handleSendReservationToWhatsApp = (reservation: Order) => {
        const details: ReservationDetails = {
            name: reservation.customer.name, phone: reservation.customer.phone,
            numberOfPeople: reservation.numberOfPeople || 2, reservationDate: reservation.customer.reservationDate || '',
            reservationTime: reservation.customer.reservationTime || '', notes: reservation.notes || '',
        };
        const whatsappUrl = generateReservationWhatsAppMessage(details, reservation.orderNumber);
        window.open(whatsappUrl, '_blank');
        setConfirmedReservationData(null);
    };

    const handleClosePixModal = () => { if (payingOrder) setShowPaymentFailureModal(true); else setPayingOrder(null); };
    const handleTryAgainPix = () => { setShowPaymentFailureModal(false); setPixRetryKey(k => k + 1); };
    const handlePayLaterFromFailure = async () => {
        if (!payingOrder) return;
        const orderToUpdateId = payingOrder.id;
        setShowPaymentFailureModal(false);
        setPayingOrder(null);
        setIsProcessingOrder(true);
        try {
            await firebaseService.updateOrderStatus(orderToUpdateId, 'pending');
            const orderSnapshot = await db.collection('orders').doc(orderToUpdateId).get();
            const finalOrderData = { id: orderSnapshot.id, ...orderSnapshot.data() } as Order;
            addToast("Pedido enviado! O pagamento será feito na entrega/retirada.", 'success');
            setConfirmedOrderData(finalOrderData);
            setCart([]);
            setIsCartOpen(false);
        } catch (error) {
            console.error("Failed to update order to pending:", error);
            addToast("Erro ao processar o pedido. Tente novamente.", 'error');
        } finally {
            setIsProcessingOrder(false);
        }
    };

    const handleSaveProduct = useCallback(async (product: Product) => { try { const { id, ...dataToSave } = product; if (id) await firebaseService.updateProduct(id, dataToSave); else await firebaseService.addProduct({ ...dataToSave, orderIndex: products.length, stockStatus: 'available' }); addToast(id ? "Produto atualizado!" : "Produto adicionado!", 'success'); } catch (error) { console.error("Failed to save product:", error); addToast("Erro ao salvar produto.", 'error'); } }, [products.length, addToast]);
    const handleDeleteProduct = useCallback(async (productId: string) => { try { await firebaseService.deleteProduct(productId); addToast("Produto deletado!", 'success'); } catch (error) { console.error("Failed to delete product:", error); addToast("Erro ao deletar produto.", 'error'); } }, [addToast]);
    const handleProductStatusChange = useCallback(async (productId: string, active: boolean) => { try { await firebaseService.updateProductStatus(productId, active); addToast(`Produto ${active ? 'ativado' : 'desativado'}.`, 'success'); } catch (error) { console.error("Failed to update product status:", error); addToast("Erro ao atualizar status.", 'error'); } }, [addToast]);
    const handleProductStockStatusChange = useCallback(async (productId: string, stockStatus: 'available' | 'out_of_stock') => { try { await firebaseService.updateProductStockStatus(productId, stockStatus); addToast(`Estoque atualizado.`, 'success'); } catch (error) { console.error("Failed to update product stock status:", error); addToast("Erro ao atualizar estoque.", 'error'); } }, [addToast]);
    const handleStoreStatusChange = useCallback(async (isOnline: boolean) => { try { await firebaseService.updateStoreStatus(isOnline); addToast("Status da loja atualizado.", 'success'); } catch (error) { console.error("Failed to update store status:", error); addToast("Erro ao atualizar status da loja.", 'error'); } }, [addToast]);
    const handleSaveCategory = useCallback(async (category: Category) => { try { const { id, ...dataToSave } = category; if (id) await firebaseService.updateCategory(id, dataToSave); else await firebaseService.addCategory({ ...dataToSave, order: categories.length }); addToast(id ? "Categoria atualizada!" : "Categoria adicionada!", 'success'); } catch (error) { console.error("Failed to save category:", error); addToast("Erro ao salvar categoria.", 'error'); } }, [categories.length, addToast]);
    const handleDeleteCategory = useCallback(async (categoryId: string) => { try { await firebaseService.deleteCategory(categoryId, products); addToast("Categoria deletada!", 'success'); } catch (error: any) { console.error("Failed to delete category:", error); addToast(`Erro: ${error.message}`, 'error'); } }, [products, addToast]);
    const handleCategoryStatusChange = useCallback(async (categoryId: string, active: boolean) => { try { await firebaseService.updateCategoryStatus(categoryId, active); addToast(`Categoria ${active ? 'ativada' : 'desativada'}.`, 'success'); } catch (error) { console.error("Failed to update category status:", error); addToast("Erro ao atualizar status.", 'error'); } }, [addToast]);
    const handleReorderProducts = useCallback(async (productsToUpdate: { id: string; orderIndex: number }[]) => { try { await firebaseService.updateProductsOrder(productsToUpdate); addToast("Ordem dos produtos atualizada.", 'success'); } catch (error) { console.error("Failed to reorder products:", error); addToast("Erro ao reordenar produtos.", 'error'); } }, [addToast]);
    const handleReorderCategories = useCallback(async (categoriesToUpdate: { id: string; order: number }[]): Promise<void> => { try { await firebaseService.updateCategoriesOrder(categoriesToUpdate); addToast("Ordem das categorias atualizada.", 'success'); } catch (error) { console.error("Failed to reorder categories:", error); addToast("Erro ao reordenar categorias.", 'error'); } }, [addToast]);
    const handleSaveSiteSettings = useCallback(async (settings: SiteSettings, files: { [key: string]: File | null }) => { try { const settingsToUpdate = JSON.parse(JSON.stringify(settings)); for (const key in files) { const file = files[key]; if (file) { const url = await firebaseService.uploadSiteAsset(file, key); if (key === 'logo') settingsToUpdate.logoUrl = url; else if (key === 'heroBg') settingsToUpdate.heroBgUrl = url; else { const sectionIndex = settingsToUpdate.contentSections.findIndex((s: any) => s.id === key); if (sectionIndex > -1) settingsToUpdate.contentSections[sectionIndex].imageUrl = url; } } } await firebaseService.updateSiteSettings(settingsToUpdate); addToast("Personalização salva!", 'success'); } catch (error) { console.error("Failed to save site settings:", error); addToast("Erro ao salvar configurações.", 'error'); } }, [addToast]);
    const handleUpdateSiteSettingsField = useCallback(async (updates: Partial<SiteSettings>) => {
        try {
            await firebaseService.updateSiteSettings(updates);
            addToast('Configuração salva com sucesso!', 'success');
        } catch (error) {
            console.error('Failed to update site settings field:', error);
            addToast('Erro ao salvar a configuração.', 'error');
            throw error; // Re-throw to allow UI to handle failure states if needed
        }
    }, [addToast]);
    const handleUpdateOrderStatus = useCallback(async (orderId: string, status: OrderStatus, payload?: Partial<Pick<Order, 'pickupTimeEstimate'>>) => { try { let finalStatus = status; const order = orders.find(o => o.id === orderId); if (status === 'accepted' && order?.customer.orderType === 'local') finalStatus = 'reserved'; await firebaseService.updateOrderStatus(orderId, finalStatus, payload); addToast("Status do pedido atualizado!", 'success'); } catch (error) { console.error("Failed to update order status:", error); addToast("Erro ao atualizar status.", 'error'); } }, [orders, addToast]);
    const handleUpdateOrderPaymentStatus = useCallback(async (orderId: string, paymentStatus: PaymentStatus) => { try { await firebaseService.updateOrderPaymentStatus(orderId, paymentStatus); addToast("Status de pagamento atualizado!", 'success'); } catch (error) { console.error("Failed to update order payment status:", error); addToast("Erro ao atualizar pagamento.", 'error'); } }, [addToast]);
    const handleUpdateOrderReservationTime = useCallback(async (orderId: string, reservationTime: string) => { try { await firebaseService.updateOrderReservationTime(orderId, reservationTime); addToast("Horário da reserva atualizado!", 'success'); } catch (error) { console.error("Failed to update reservation time:", error); addToast("Erro ao atualizar horário.", 'error'); } }, [addToast]);
    const handleDeleteOrder = useCallback(async (orderId: string) => { if (window.confirm("Mover este pedido para a lixeira? 🗑️")) { try { await firebaseService.updateOrderStatus(orderId, 'deleted'); addToast("Pedido movido para a lixeira.", 'success'); } catch (error) { console.error("Failed to move order to trash:", error); addToast("Erro ao mover para lixeira.", 'error'); } } }, [addToast]);
    const handlePermanentDeleteOrder = useCallback(async (orderId: string) => { if (window.confirm("Apagar PERMANENTEMENTE? Esta ação não pode ser desfeita.")) { try { await firebaseService.deleteOrder(orderId); addToast("Pedido apagado permanentemente.", 'success'); } catch (error) { console.error("Failed to permanently delete order:", error); addToast("Erro ao apagar permanentemente.", 'error'); } } }, [addToast]);
    
    const handlePermanentDeleteMultipleOrders = useCallback(async (orderIds: string[]) => {
        if (orderIds.length === 0) return;
        if (window.confirm(`Apagar PERMANENTEMENTE ${orderIds.length} pedido(s)? Esta ação não pode ser desfeita.`)) {
            addToast(`Apagando ${orderIds.length} pedido(s)...`, 'success');
            try {
                await firebaseService.permanentDeleteMultipleOrders(orderIds);
                addToast(`${orderIds.length} pedido(s) apagado(s) permanentemente.`, 'success');
            } catch (error) {
                console.error("Failed to permanently delete multiple orders:", error);
                addToast("Erro ao apagar os pedidos.", 'error');
            }
        }
    }, [addToast]);

    const handleRefundOrder = useCallback(async (orderId: string) => { if (window.confirm("Estornar o valor total deste pagamento? Esta ação não pode ser desfeita.")) { const orderToRefund = orders.find(o => o.id === orderId); const paymentId = orderToRefund?.mercadoPagoDetails?.paymentId; if (!paymentId) { addToast("ID do pagamento não encontrado.", 'error'); return; } setRefundingOrderId(orderId); addToast("Processando estorno...", 'success'); try { await firebaseService.refundPayment(orderId); addToast(`Estorno solicitado com sucesso!`, 'success'); } catch (error: any) { console.error("Failed to refund order:", error); addToast(error.message || "Erro ao solicitar estorno.", 'error'); } finally { setRefundingOrderId(null); } } }, [addToast, orders]);

    const cartTotalItems = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

    const scrollToCardapio = () => {
        const cardapioSection = document.getElementById('cardapio');
        if (cardapioSection) {
            const header = document.querySelector('header');
            const statusBanner = document.getElementById('status-banner');
            
            let headerOffset = header ? header.offsetHeight : 80;
            if (statusBanner && !isStoreOnline) {
                const bannerStyle = window.getComputedStyle(statusBanner);
                if (bannerStyle.display !== 'none') {
                     headerOffset += statusBanner.offsetHeight;
                }
            }

            const elementPosition = cardapioSection.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
        }
    };
    
    const activeOrders = useMemo(() => {
        const activeStatuses: OrderStatus[] = ['pending', 'accepted', 'reserved', 'ready', 'awaiting-payment'];
    
        if (currentUser) {
            // User is logged in, filter by their UID
            return orders.filter(order =>
                order.userId === currentUser.uid && activeStatuses.includes(order.status)
            );
        } else {
            // User is a guest, filter by IDs in localStorage
            const guestOrderIds: string[] = JSON.parse(localStorage.getItem('santaSensacaoGuestOrders') || '[]');
            if (guestOrderIds.length === 0) {
                return [];
            }
            const guestOrdersSet = new Set(guestOrderIds);
            return orders.filter(order =>
                guestOrdersSet.has(order.id) && activeStatuses.includes(order.status)
            );
        }
    }, [orders, currentUser]);

    const statusIconMap: { [key in OrderStatus]?: string } = {
        pending: 'fas fa-hourglass-start',
        accepted: 'fas fa-pizza',
        reserved: 'fas fa-chair',
        'awaiting-payment': 'fas fa-clock',
    };

    const getStatusIcon = (order: Order): string => {
        if (order.status === 'ready') {
            return order.customer.orderType === 'delivery' ? 'fas fa-motorcycle' : 'fas fa-store';
        }
        return statusIconMap[order.status] || 'fas fa-receipt';
    };

    return (
        <div className="flex flex-col min-h-screen">
            <Header 
                cartItemCount={cartTotalItems} 
                onCartClick={() => setIsCartOpen(true)} 
                onOpenChatbot={() => setIsChatbotOpen(true)}
                activeSection={activeSection} 
                settings={siteSettings} 
                user={currentUser}
                onUserIconClick={handleUserIconClick}
            />
            
            <div id="status-banner" className={`sticky top-20 z-40 bg-red-600 text-white text-center p-2 font-semibold ${isStoreOnline ? 'hidden' : ''}`}>
                <i className="fas fa-times-circle mr-2"></i>
                Desculpe, estamos fechados no momento.
            </div>

            <main className="flex-grow">
                <HeroSection 
                    settings={siteSettings} 
                    isLoading={isLoading} 
                    onReserveClick={() => setIsReservationModalOpen(true)}
                />
                
                {error && <div className="container mx-auto px-4 py-8"><div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-lg shadow-md" role="alert"><p className="font-bold text-lg mb-2">Falha na Conexão</p><p className="mb-4">{error}</p></div></div>}
                {isLoading ? <div className="text-center py-20"><i className="fas fa-spinner fa-spin text-5xl text-accent"></i><p className="mt-4 text-xl font-semibold text-gray-600">Carregando cardápio...</p></div> : !error && <MenuSection categories={categories} products={products} onAddToCart={handleAddToCart} isStoreOnline={isStoreOnline} activeCategoryId={activeMenuCategory} setActiveCategoryId={setActiveMenuCategory} cartItemCount={cartTotalItems} onCartClick={() => setIsCartOpen(true)} cartItems={cart}/>}
                <div id="sobre">{siteSettings.contentSections?.filter(section => section.isVisible).sort((a, b) => a.order - b.order).map((section, index) => <DynamicContentSection key={section.id} section={section} order={index} />)}</div>
                <ContactSection settings={siteSettings} />
                <AdminSection allProducts={products} allCategories={categories} isStoreOnline={isStoreOnline} siteSettings={siteSettings} orders={orders} onSaveProduct={handleSaveProduct} onDeleteProduct={handleDeleteProduct} onProductStatusChange={handleProductStatusChange} onProductStockStatusChange={handleProductStockStatusChange} onStoreStatusChange={handleStoreStatusChange} onSaveCategory={handleSaveCategory} onDeleteCategory={handleDeleteCategory} onCategoryStatusChange={handleCategoryStatusChange} onReorderProducts={handleReorderProducts} onReorderCategories={handleReorderCategories} onSeedDatabase={seedDatabase} onSaveSiteSettings={handleSaveSiteSettings} onUpdateSiteSettingsField={handleUpdateSiteSettingsField} onUpdateOrderStatus={handleUpdateOrderStatus} onUpdateOrderPaymentStatus={handleUpdateOrderPaymentStatus} onUpdateOrderReservationTime={handleUpdateOrderReservationTime} onDeleteOrder={handleDeleteOrder} onPermanentDeleteOrder={handlePermanentDeleteOrder} onPermanentDeleteMultipleOrders={handlePermanentDeleteMultipleOrders} onRefundOrder={handleRefundOrder} refundingOrderId={refundingOrderId}/>
            </main>
            
            <div id="footer-section">
                <Footer settings={siteSettings} onOpenChatbot={() => setIsChatbotOpen(true)} onOpenPrivacyPolicy={() => setIsPrivacyPolicyOpen(true)} />
            </div>
            
            <div className="fixed bottom-5 right-5 z-40 flex flex-col-reverse items-end gap-3">
                {isFooterVisible ? (
                    <button onClick={scrollToTop} className="w-14 h-14 bg-accent text-white rounded-full shadow-lg flex items-center justify-center transform transition-transform hover:scale-110 animate-fade-in-up" aria-label="Voltar ao topo">
                        <i className="fas fa-arrow-up text-xl"></i>
                    </button>
                ) : cart.length > 0 ? (
                    <button onClick={() => setIsCartOpen(true)} className="bg-accent text-white font-bold py-3 px-5 rounded-full shadow-lg flex items-center gap-3 transform transition-transform hover:scale-105 animate-fade-in-up">
                        <i className="fas fa-shopping-bag text-xl"></i>
                        <div className="text-left">
                            <span className="text-sm block leading-tight">{cartTotalItems} {cartTotalItems > 1 ? 'itens' : 'item'}</span>
                            <span className="font-semibold text-lg block leading-tight">Ver Pedido</span>
                        </div>
                    </button>
                ) : showFloatingButton ? (
                    <button onClick={scrollToCardapio} className="w-14 h-14 bg-accent text-white rounded-full shadow-lg flex items-center justify-center transform transition-transform hover:scale-110 animate-fade-in-up" aria-label="Ver Cardápio">
                        <i className="fas fa-utensils text-xl"></i>
                    </button>
                ) : null}
            </div>

            <div className="fixed bottom-[5.5rem] left-5 z-40 flex flex-col-reverse items-center gap-3">
                {activeOrders.length > 1 && isOrderTrackerExpanded && (
                    <div className="flex flex-col-reverse gap-3 animate-fade-in-up">
                        {activeOrders.map(order => (
                            <button
                                key={order.id}
                                onClick={() => { setTrackingOrder(order); setIsOrderTrackerExpanded(false); }}
                                className="w-14 h-14 bg-brand-green-700/80 backdrop-blur-sm text-white rounded-full shadow-lg flex items-center justify-center transform transition-transform hover:scale-110"
                                aria-label={`Acompanhar pedido #${order.orderNumber}`}
                            >
                                <i className={`${getStatusIcon(order)} text-2xl`}></i>
                            </button>
                        ))}
                    </div>
                )}
                {activeOrders.length > 0 && (
                    <button
                        onClick={() => {
                            if (activeOrders.length === 1) {
                                setTrackingOrder(activeOrders[0]);
                            } else {
                                setIsOrderTrackerExpanded(prev => !prev);
                            }
                        }}
                        className="w-14 h-14 bg-brand-green-700/80 backdrop-blur-sm text-white rounded-full shadow-lg flex items-center justify-center transform transition-transform hover:scale-110"
                        aria-label={activeOrders.length === 1 ? `Acompanhar pedido #${activeOrders[0].orderNumber}` : `${activeOrders.length} pedidos ativos`}
                    >
                        {activeOrders.length === 1 ? (
                            <i className={`${getStatusIcon(activeOrders[0])} text-2xl`}></i>
                        ) : (
                            <span className="text-2xl font-bold">{activeOrders.length}</span>
                        )}
                    </button>
                )}
            </div>

            <button onClick={() => setIsChatbotOpen(true)} className="fixed bottom-5 left-5 z-40 w-14 h-14 bg-brand-green-700/80 backdrop-blur-sm text-white rounded-full shadow-lg flex items-center justify-center transform transition-transform hover:scale-110" aria-label="Abrir assistente virtual"><i className="fas fa-headset text-2xl"></i></button>

            <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} cartItems={cart} onUpdateQuantity={handleUpdateCartQuantity} onCheckout={() => { if (!isStoreOnline) { addToast("A loja está fechada. Não é possível finalizar o pedido.", 'error'); return; } setIsCartOpen(false); setIsCheckoutModalOpen(true); }} isStoreOnline={isStoreOnline} categories={categories} products={products} setActiveCategoryId={setActiveMenuCategory}/>
            <CheckoutModal
                isOpen={isCheckoutModalOpen}
                onClose={() => setIsCheckoutModalOpen(false)}
                cartItems={cart}
                onConfirmCheckout={handleCheckout}
                onInitiatePixPayment={handleInitiatePixPayment}
                isProcessing={isProcessingOrder}
                name={name} setName={setName}
                phone={phone} setPhone={setPhone}
                profile={userProfile}
            />
            <ReservationModal 
                isOpen={isReservationModalOpen} 
                onClose={() => setIsReservationModalOpen(false)} 
                onConfirmReservation={handleConfirmReservation} 
                isProcessing={isProcessingOrder}
                name={name}
                phone={phone}
            />
            <PixPaymentModal key={pixRetryKey} order={payingOrder} onClose={handleClosePixModal} onPaymentSuccess={handlePixPaymentSuccess} isProcessing={isProcessingOrder}/>
            <PaymentFailureModal isOpen={showPaymentFailureModal} onClose={() => { setShowPaymentFailureModal(false); setPayingOrder(null); }} onTryAgain={handleTryAgainPix} onPayLater={handlePayLaterFromFailure}/>
            <OrderConfirmationModal order={confirmedOrderData} onClose={() => setConfirmedOrderData(null)} onSendWhatsApp={handleSendOrderToWhatsApp}/>
            <ReservationConfirmationModal reservation={confirmedReservationData} onClose={() => setConfirmedReservationData(null)} onSendWhatsApp={handleSendReservationToWhatsApp}/>
            <Chatbot isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} messages={chatMessages} onSendMessage={handleSendMessageToBot} isSending={isBotReplying}/>
            <OrderDetailsModal order={trackingOrder} onClose={() => setTrackingOrder(null)} title="Acompanhar Pedido" />
            
            <LoginModal 
                isOpen={isLoginModalOpen} 
                onClose={() => setIsLoginModalOpen(false)} 
                onGoogleSignIn={handleGoogleSignIn} 
                addToast={addToast} 
                onRegisterSuccess={handleRegisterSuccess}
            />
            <UserAreaModal 
                isOpen={isUserAreaModalOpen} 
                onClose={handleUserAreaClose} 
                user={currentUser} 
                profile={userProfile} 
                onLogout={handleLogout} 
                addToast={addToast}
                initialTab={postRegisterAction === 'add_address_flow' ? 'addresses' : undefined}
                showAddAddressForm={postRegisterAction === 'add_address_flow'}
            />
            <PrivacyPolicyModal isOpen={isPrivacyPolicyOpen} onClose={() => setIsPrivacyPolicyOpen(false)} />
            {showCookieBanner && <CookieConsentBanner onAccept={handleAcceptCookies} />}

            {(isProcessingOrder) && <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm text-center p-8"><i className="fas fa-spinner fa-spin text-5xl text-accent"></i><p className="mt-6 font-semibold text-lg text-gray-700">Processando seu pedido...</p><p className="mt-2 text-sm text-gray-500">Por favor, aguarde um instante.</p></div></div>}
            <div aria-live="assertive" className="fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start z-[100]"><div className="w-full flex flex-col items-center space-y-4 sm:items-end">{toasts.map((toast) => (<div key={toast.id} className="max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden animate-fade-in-up"><div className="p-4"><div className="flex items-start"><div className="flex-shrink-0">{toast.type === 'success' ? <i className="fas fa-check-circle h-6 w-6 text-green-500"></i> : <i className="fas fa-exclamation-circle h-6 w-6 text-red-500"></i>}</div><div className="ml-3 w-0 flex-1 pt-0.5"><p className="text-sm font-medium text-gray-900">{toast.message}</p></div></div></div></div>))}</div></div>
        </div>
    );
};

export default App;