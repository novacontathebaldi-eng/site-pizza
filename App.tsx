import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Product, Category, CartItem, OrderDetails, SiteSettings, Order, OrderStatus, PaymentStatus, PromotionPage } from './types';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { MenuSection } from './components/MenuSection';
import { DynamicContentSection } from './components/DynamicContentSection';
import { ContactSection } from './components/ContactSection';
import { AdminSection } from './components/AdminSection';
import { Footer } from './components/Footer';
import { CartSidebar } from './components/CartSidebar';
import { CheckoutModal } from './components/CheckoutModal';
import { PixPaymentModal } from './components/PixPaymentModal';
import { db } from './services/firebase';
import * as firebaseService from './services/firebaseService';
import { seedDatabase } from './services/seed';
import defaultLogo from './assets/logo.png';
import defaultHeroBg from './assets/ambiente-pizzaria.webp';
import defaultAboutImg from './assets/sobre-imagem.webp';
import { PromotionSection } from './components/PromotionSection';

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
        notificationSound: 'default-1',
        notificationVolume: 0.5,
        backgroundMusic: '',
        backgroundVolume: 0.2,
    },
    notificationSettings: {
        browserNotificationsEnabled: false,
    }
};

const App: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [promotions, setPromotions] = useState<PromotionPage[]>([]);
    const [isStoreOnline, setIsStoreOnline] = useState<boolean>(true);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [activeSection, setActiveSection] = useState('Início');
    const [activeMenuCategory, setActiveMenuCategory] = useState<string>('');
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [siteSettings, setSiteSettings] = useState<SiteSettings>(defaultSiteSettings);
    const [suggestedNextCategoryId, setSuggestedNextCategoryId] = useState<string | null>(null);
    const [showFinalizeButtonTrigger, setShowFinalizeButtonTrigger] = useState<boolean>(false);
    const [payingOrder, setPayingOrder] = useState<Order | null>(null);
    
    const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        const id = Date.now();
        setToasts(prevToasts => [...prevToasts, { id, message, type }]);
        setTimeout(() => {
            setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
        }, 4000);
    }, []);

    useEffect(() => {
        const savedCart = localStorage.getItem('santaSensacaoCart');
        if (savedCart) {
            setCart(JSON.parse(savedCart));
        }
    }, []);

    useEffect(() => {
        const sectionIds = ['inicio', 'cardapio', 'sobre', 'contato'];
        const sectionElements = sectionIds.map(id => document.getElementById(id));
        
        const observerOptions = {
            root: null,
            rootMargin: '-80px 0px -60% 0px',
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const idToTitle: { [key: string]: string } = {
                        'inicio': 'Início',
                        'cardapio': 'Cardápio',
                        'sobre': 'Sobre Nós',
                        'contato': 'Contato'
                    };
                    setActiveSection(idToTitle[entry.target.id] || 'Início');
                }
            });
        }, observerOptions);

        sectionElements.forEach(el => {
            if (el) observer.observe(el);
        });

        return () => {
            sectionElements.forEach(el => {
                if (el) observer.unobserve(el);
            });
        };
    }, []);

    useEffect(() => {
        if (!db) {
            setError("Falha na conexão com o banco de dados.");
            setIsLoading(false);
            return;
        }

        const handleConnectionError = (err: Error, context: string) => {
            console.error(`Error fetching ${context}:`, err);
            setError("Não foi possível conectar ao banco de dados.");
            setIsLoading(false);
        };
        
        const settingsDocRef = db.doc('store_config/site_settings');
        const unsubSettings = settingsDocRef.onSnapshot(doc => {
            if (doc.exists) {
                 const data = doc.data() as Partial<SiteSettings>;
                 setSiteSettings(prev => ({ ...defaultSiteSettings, ...prev, ...data }));
            }
        }, err => handleConnectionError(err, "site settings"));

        const statusDocRef = db.doc('store_config/status');
        const unsubStatus = statusDocRef.onSnapshot(doc => {
            const data = doc.data();
            if (data) setIsStoreOnline(data.isOpen);
        }, err => handleConnectionError(err, "store status"));

        const categoriesQuery = db.collection('categories').orderBy('order');
        const unsubCategories = categoriesQuery.onSnapshot(snapshot => {
            const fetchedCategories: Category[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
            setCategories(fetchedCategories);
        }, err => handleConnectionError(err, "categories"));

        const productsQuery = db.collection('products').orderBy('orderIndex');
        const unsubProducts = productsQuery.onSnapshot(snapshot => {
            const fetchedProducts: Product[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setProducts(fetchedProducts);
        }, err => handleConnectionError(err, "products"));

        const ordersQuery = db.collection('orders').orderBy('createdAt', 'desc');
        const unsubOrders = ordersQuery.onSnapshot(snapshot => {
            const fetchedOrders: Order[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
            setOrders(fetchedOrders);
        }, err => handleConnectionError(err, "orders"));

        const promotionsQuery = db.collection('promotions').orderBy('order');
        const unsubPromotions = promotionsQuery.onSnapshot(snapshot => {
            const fetchedPromotions: PromotionPage[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PromotionPage));
            setPromotions(fetchedPromotions);
        }, err => handleConnectionError(err, "promotions"));

        // Only set loading to false after the primary data (products) is fetched.
        const unsubLoader = productsQuery.onSnapshot(() => {
             setIsLoading(false);
             setError(null);
        });

        return () => {
            unsubSettings();
            unsubStatus();
            unsubCategories();
            unsubProducts();
            unsubOrders();
            unsubPromotions();
            unsubLoader();
        };
    }, []);

    useEffect(() => {
        if (categories.length > 0 && !activeMenuCategory) {
            const firstActiveCategory = categories.find(c => c.active);
            if (firstActiveCategory) {
                setActiveMenuCategory(firstActiveCategory.id);
            }
        }
    }, [categories, activeMenuCategory]);
    
    useEffect(() => {
        localStorage.setItem('santaSensacaoCart', JSON.stringify(cart));
    }, [cart]);

    const handleAddToCart = useCallback((product: Product, size: string, price: number) => {
        setCart(prevCart => {
            const existingItemIndex = prevCart.findIndex(item => item.productId === product.id && item.size === size);
            if (existingItemIndex > -1) {
                const updatedCart = [...prevCart];
                updatedCart[existingItemIndex].quantity += 1;
                return updatedCart;
            } else {
                const newItem: CartItem = {
                    id: `${product.id}-${size}`,
                    productId: product.id,
                    name: product.name,
                    size,
                    price,
                    quantity: 1,
                    imageUrl: product.imageUrl,
                };
                return [...prevCart, newItem];
            }
        });
        
        const sortedActiveCategories = [...categories].sort((a,b) => a.order - b.order).filter(c => c.active);
        const currentCategoryIndex = sortedActiveCategories.findIndex(c => c.id === product.categoryId);
        const lastCategoryId = sortedActiveCategories.length > 0 ? sortedActiveCategories[sortedActiveCategories.length - 1].id : null;

        if (product.categoryId === lastCategoryId) {
            setShowFinalizeButtonTrigger(true);
            setSuggestedNextCategoryId(null); 
        } else {
            if (currentCategoryIndex > -1 && currentCategoryIndex < sortedActiveCategories.length - 1) {
                const nextCategory = sortedActiveCategories[currentCategoryIndex + 1];
                setSuggestedNextCategoryId(nextCategory.id);
            } else {
                setSuggestedNextCategoryId(null);
            }
        }

    }, [categories]);

    const handleUpdateCartQuantity = useCallback((itemId: string, newQuantity: number) => {
        setCart(prevCart => {
            if (newQuantity <= 0) {
                return prevCart.filter(item => item.id !== itemId);
            }
            return prevCart.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item);
        });
    }, []);

    const generateWhatsAppMessage = (details: OrderDetails, currentCart: CartItem[], total: number, isPaid: boolean) => {
        const orderTypeMap = { delivery: 'Entrega', pickup: 'Retirada na loja', local: 'Consumir no local' };
        const paymentMethodMap = { credit: 'Cartão de Crédito', debit: 'Cartão de Débito', pix: 'PIX', cash: 'Dinheiro' };

        let message = `*🍕 NOVO PEDIDO - PIZZARIA SANTA SENSAÇÃO 🍕*\n\n`;
        if (isPaid) {
            message += `*✅ JÁ PAGO VIA PIX PELO SITE*\n\n`;
        }
        message += `*👤 DADOS DO CLIENTE:*\n`;
        message += `*Nome:* ${details.name}\n`;
        message += `*Telefone:* ${details.phone}\n`;
        message += `*Tipo de Pedido:* ${orderTypeMap[details.orderType]}\n`;
        if (details.orderType === 'delivery') {
            message += `*Endereço:* ${details.address}\n`;
        }
        if (details.orderType === 'local' && details.reservationTime) {
            message += `*Horário da Reserva:* ${details.reservationTime}\n`;
        }
        message += `\n*🛒 ITENS DO PEDIDO:*\n`;
        currentCart.forEach(item => {
            message += `• ${item.quantity}x ${item.name} (${item.size}) - R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}\n`;
        });
        message += `\n*💰 TOTAL: R$ ${total.toFixed(2).replace('.', ',')}*\n\n`;
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
    
    const handleCheckout = async (details: OrderDetails) => {
        const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const whatsappUrl = generateWhatsAppMessage(details, cart, total, false);
        window.open(whatsappUrl, '_blank');
        
        const newOrder = {
            customer: { name: details.name, phone: details.phone, orderType: details.orderType, address: details.orderType === 'delivery' ? details.address : '', reservationTime: details.orderType === 'local' ? details.reservationTime : '', },
            items: cart, total, paymentMethod: details.paymentMethod,
            changeNeeded: details.paymentMethod === 'cash' ? details.changeNeeded : false,
            changeAmount: details.paymentMethod === 'cash' && details.changeNeeded ? details.changeAmount : '',
            notes: details.notes || '', status: 'pending' as OrderStatus, paymentStatus: 'pending' as PaymentStatus,
        };

        try {
            await firebaseService.addOrder(newOrder);
            addToast("Pedido salvo no sistema!", 'success');
        } catch (error) {
            console.error("Failed to save order:", error);
            addToast("Erro ao salvar pedido no sistema.", 'error');
        }
        
        setCart([]);
        setIsCheckoutModalOpen(false);
        setIsCartOpen(false);
    };

    const handleInitiatePixPayment = async (details: OrderDetails) => {
        const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const newOrderData: Omit<Order, 'id' | 'createdAt'> = {
            customer: { name: details.name, phone: details.phone, orderType: details.orderType, address: details.orderType === 'delivery' ? details.address : '', reservationTime: details.orderType === 'local' ? details.reservationTime : '', },
            items: cart, total, paymentMethod: 'pix',
            notes: details.notes || '', status: 'pending' as OrderStatus, paymentStatus: 'pending' as PaymentStatus,
        };

        try {
            const docRef = await firebaseService.addOrder(newOrderData);
            const createdOrder: Order = { ...newOrderData, id: docRef.id, createdAt: new Date() }; // Create a temporary full order object
            addToast("Pedido pré-salvo, aguardando pagamento.", 'success');
            setIsCheckoutModalOpen(false);
            setPayingOrder(createdOrder);
        } catch (error) {
            console.error("Failed to pre-save order:", error);
            addToast("Erro ao iniciar pagamento. Tente novamente.", 'error');
        }
    };

    const handlePixPaymentSuccess = useCallback((paidOrder: Order) => {
        const details: OrderDetails = {
            name: paidOrder.customer.name, phone: paidOrder.customer.phone, orderType: paidOrder.customer.orderType,
            address: paidOrder.customer.address || '', paymentMethod: 'pix', changeNeeded: false,
            notes: paidOrder.notes || '', reservationTime: paidOrder.customer.reservationTime || ''
        };
        const whatsappUrl = generateWhatsAppMessage(details, paidOrder.items, paidOrder.total, true);
        window.open(whatsappUrl, '_blank');

        setCart([]);
        setPayingOrder(null);
        setIsCartOpen(false);
    }, []);


    const handleSaveProduct = useCallback(async (product: Product) => {
        try {
            const { id, ...dataToSave } = product;
            if (id) {
                await firebaseService.updateProduct(id, dataToSave);
                addToast("Produto atualizado com sucesso!", 'success');
            } else {
                await firebaseService.addProduct({ ...dataToSave, orderIndex: products.length, stockStatus: 'available' });
                addToast("Produto adicionado com sucesso!", 'success');
            }
        } catch (error) {
            console.error("Failed to save product:", error);
            addToast("Erro ao salvar produto. Tente novamente.", 'error');
        }
    }, [products.length, addToast]);
    
    const handleDeleteProduct = useCallback(async (productId: string) => {
        try {
            await firebaseService.deleteProduct(productId);
            addToast("Produto deletado com sucesso!", 'success');
        } catch (error) {
            console.error("Failed to delete product:", error);
            addToast("Erro ao deletar produto. Tente novamente.", 'error');
        }
    }, [addToast]);
    
    const handleProductStatusChange = useCallback(async (productId: string, active: boolean) => {
        try {
            await firebaseService.updateProductStatus(productId, active);
            addToast(`Produto ${active ? 'ativado' : 'desativado'}.`, 'success');
        } catch (error) {
            console.error("Failed to update product status:", error);
            addToast("Erro ao atualizar status do produto.", 'error');
        }
    }, [addToast]);

    const handleProductStockStatusChange = useCallback(async (productId: string, stockStatus: 'available' | 'out_of_stock') => {
        try {
            await firebaseService.updateProductStockStatus(productId, stockStatus);
            addToast(`Estoque do produto atualizado.`, 'success');
        } catch (error) {
            console.error("Failed to update product stock status:", error);
            addToast("Erro ao atualizar estoque do produto.", 'error');
        }
    }, [addToast]);

    const handleStoreStatusChange = useCallback(async (isOnline: boolean) => {
        try {
            await firebaseService.updateStoreStatus(isOnline);
            addToast("Status da loja atualizado.", 'success');
        } catch (error) {
            console.error("Failed to update store status:", error);
            addToast("Erro ao atualizar status da loja.", 'error');
        }
    }, [addToast]);
    
    const handleSaveCategory = useCallback(async (category: Category) => {
        try {
            const { id, ...dataToSave } = category;
            if (id) {
                await firebaseService.updateCategory(id, dataToSave);
                addToast("Categoria atualizada com sucesso!", 'success');
            } else {
                await firebaseService.addCategory({ ...dataToSave, order: categories.length });
                addToast("Categoria adicionada com sucesso!", 'success');
            }
        } catch (error) {
            console.error("Failed to save category:", error);
            addToast("Erro ao salvar categoria.", 'error');
        }
    }, [categories.length, addToast]);
    
    const handleDeleteCategory = useCallback(async (categoryId: string) => {
        try {
            await firebaseService.deleteCategory(categoryId, products);
            addToast("Categoria deletada com sucesso!", 'success');
        } catch (error: any) {
            console.error("Failed to delete category:", error);
            addToast(`Erro ao deletar categoria: ${error.message}`, 'error');
        }
    }, [products, addToast]);
    
    const handleCategoryStatusChange = useCallback(async (categoryId: string, active: boolean) => {
        try {
            await firebaseService.updateCategoryStatus(categoryId, active);
            addToast(`Categoria ${active ? 'ativada' : 'desativada'}.`, 'success');
        } catch (error) {
            console.error("Failed to update category status:", error);
            addToast("Erro ao atualizar status da categoria.", 'error');
        }
    }, [addToast]);

    const handleReorderProducts = useCallback(async (productsToUpdate: { id: string; orderIndex: number }[]) => {
        try {
            await firebaseService.updateProductsOrder(productsToUpdate);
            addToast("Ordem dos produtos atualizada.", 'success');
        } catch (error) {
            console.error("Failed to reorder products:", error);
            addToast("Erro ao reordenar produtos.", 'error');
        }
    }, [addToast]);

    const handleReorderCategories = useCallback(async (categoriesToUpdate: { id: string; order: number }[]) => {
        try {
            await firebaseService.updateCategoriesOrder(categoriesToUpdate);
            addToast("Ordem das categorias atualizada.", 'success');
        } catch (error) {
            console.error("Failed to reorder categories:", error);
            addToast("Erro ao reordenar categorias.", 'error');
        }
    }, [addToast]);

    const handleSaveSiteSettings = useCallback(async (settings: SiteSettings, files: { [key: string]: File | null }, audioFiles: { [key: string]: File | null }) => {
        try {
            const settingsToUpdate = JSON.parse(JSON.stringify(settings)); 

            for (const key in files) {
                const file = files[key];
                if (file) {
                    const url = await firebaseService.uploadSiteAsset(file, key);
                    
                    if (key === 'logo') settingsToUpdate.logoUrl = url;
                    else if (key === 'heroBg') settingsToUpdate.heroBgUrl = url;
                    else { 
                        const sectionIndex = settingsToUpdate.contentSections.findIndex((s: any) => s.id === key);
                        if (sectionIndex > -1) settingsToUpdate.contentSections[sectionIndex].imageUrl = url;
                    }
                }
            }
            
            for (const key in audioFiles) {
                const file = audioFiles[key];
                if(file) {
                    const url = await firebaseService.uploadAudioFile(file, key);
                    if(key === 'notificationSound') settingsToUpdate.audioSettings.notificationSound = url;
                    if(key === 'backgroundMusic') settingsToUpdate.audioSettings.backgroundMusic = url;
                }
            }

            await firebaseService.updateSiteSettings(settingsToUpdate);
            addToast("Configurações do site salvas com sucesso!", 'success');
        } catch (error) {
            console.error("Failed to save site settings:", error);
            addToast("Erro ao salvar as configurações do site.", 'error');
        }
    }, [addToast]);
    
    // --- Handlers for new Promotion features ---
    const handleSavePromotion = useCallback(async (promotion: PromotionPage) => {
        try {
            await firebaseService.savePromotion(promotion);
            addToast("Promoção salva com sucesso!", 'success');
        } catch (error) {
            console.error("Failed to save promotion:", error);
            addToast("Erro ao salvar promoção.", 'error');
        }
    }, [addToast]);

    const handleDeletePromotion = useCallback(async (promotionId: string) => {
        try {
            await firebaseService.deletePromotion(promotionId);
            addToast("Promoção deletada com sucesso!", 'success');
        } catch (error) {
            console.error("Failed to delete promotion:", error);
            addToast("Erro ao deletar promoção.", 'error');
        }
    }, [addToast]);

    const handleReorderPromotions = useCallback(async (promotionsToUpdate: { id: string; order: number }[]) => {
        try {
            await firebaseService.updatePromotionsOrder(promotionsToUpdate);
            addToast("Ordem das promoções atualizada.", 'success');
        } catch (error) {
            console.error("Failed to reorder promotions:", error);
            addToast("Erro ao reordenar promoções.", 'error');
        }
    }, [addToast]);
    
    const handleUpdateOrderStatus = useCallback(async (orderId: string, status: OrderStatus, payload?: Partial<Pick<Order, 'pickupTimeEstimate'>>) => {
        try {
            let finalStatus = status;
            const order = orders.find(o => o.id === orderId);

            if (status === 'accepted' && order?.customer.orderType === 'local') {
                finalStatus = 'reserved';
            }
            
            await firebaseService.updateOrderStatus(orderId, finalStatus, payload);
            addToast("Status do pedido atualizado!", 'success');
        } catch (error) {
            console.error("Failed to update order status:", error);
            addToast("Erro ao atualizar o status do pedido.", 'error');
        }
    }, [orders, addToast]);

    const handleUpdateOrderPaymentStatus = useCallback(async (orderId: string, paymentStatus: PaymentStatus) => {
        try {
            await firebaseService.updateOrderPaymentStatus(orderId, paymentStatus);
            addToast("Status de pagamento atualizado!", 'success');
        } catch (error) {
            console.error("Failed to update order payment status:", error);
            addToast("Erro ao atualizar o status de pagamento.", 'error');
        }
    }, [addToast]);

    const handleUpdateOrderReservationTime = useCallback(async (orderId: string, reservationTime: string) => {
        try {
            await firebaseService.updateOrderReservationTime(orderId, reservationTime);
            addToast("Horário da reserva atualizado!", 'success');
        } catch (error) {
            console.error("Failed to update reservation time:", error);
            addToast("Erro ao atualizar horário da reserva.", 'error');
        }
    }, [addToast]);

    const handleDeleteOrder = useCallback(async (orderId: string) => {
        if (window.confirm("Tem certeza que deseja apagar este pedido? Após apagar, o pedido será enviado para a lixeira 🗑️")) {
            try {
                await firebaseService.updateOrderStatus(orderId, 'deleted');
                addToast("Pedido movido para a lixeira.", 'success');
            } catch (error) {
                console.error("Failed to move order to trash:", error);
                addToast("Erro ao mover pedido para a lixeira.", 'error');
            }
        }
    }, [addToast]);

    const handlePermanentDeleteOrder = useCallback(async (orderId: string) => {
        if (window.confirm("Este pedido será apagado PERMANENTEMENTE. Esta ação não pode ser desfeita. Continuar?")) {
            try {
                await firebaseService.deleteOrder(orderId);
                addToast("Pedido apagado permanentemente.", 'success');
            } catch (error) {
                console.error("Failed to permanently delete order:", error);
                addToast("Erro ao apagar o pedido permanentemente.", 'error');
            }
        }
    }, [addToast]);


    const cartTotalItems = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

    return (
        <div className="flex flex-col min-h-screen">
            <Header cartItemCount={cartTotalItems} onCartClick={() => setIsCartOpen(true)} activeSection={activeSection} settings={siteSettings} />
            
            <div id="status-banner" className={`bg-red-600 text-white text-center p-2 font-semibold ${isStoreOnline ? 'hidden' : ''}`}>
                <i className="fas fa-times-circle mr-2"></i>
                Desculpe, estamos fechados no momento.
            </div>

            <main className="flex-grow">
                <HeroSection settings={siteSettings} />
                
                {error && (
                    <div className="container mx-auto px-4 py-8">
                        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-lg shadow-md" role="alert">
                            <p className="font-bold text-lg mb-2">Falha na Conexão</p>
                            <p className="mb-4">{error}</p>
                        </div>
                    </div>
                )}

                {isLoading ? (
                    <div className="text-center py-20">
                        <i className="fas fa-spinner fa-spin text-5xl text-accent"></i>
                        <p className="mt-4 text-xl font-semibold text-gray-600">Carregando cardápio...</p>
                    </div>
                ) : !error && (
                    <>
                    <MenuSection 
                        categories={categories} 
                        products={products} 
                        onAddToCart={handleAddToCart}
                        isStoreOnline={isStoreOnline}
                        activeCategoryId={activeMenuCategory}
                        setActiveCategoryId={setActiveMenuCategory}
                        suggestedNextCategoryId={suggestedNextCategoryId}
                        setSuggestedNextCategoryId={setSuggestedNextCategoryId}
                        cartItemCount={cartTotalItems}
                        onCartClick={() => setIsCartOpen(true)}
                        showFinalizeButtonTrigger={showFinalizeButtonTrigger}
                        setShowFinalizeButtonTrigger={setShowFinalizeButtonTrigger}
                    />
                    {promotions.filter(p => p.isVisible).sort((a,b) => a.order - b.order).map(promo => (
                        <PromotionSection key={promo.id} promotion={promo} allProducts={products} />
                    ))}
                    </>
                )}
                <div id="sobre">
                    {siteSettings.contentSections
                        ?.filter(section => section.isVisible)
                        .sort((a, b) => a.order - b.order)
                        .map((section, index) => (
                            <DynamicContentSection key={section.id} section={section} order={index} />
                    ))}
                </div>
                <ContactSection />
                <AdminSection 
                    allProducts={products}
                    allCategories={categories}
                    isStoreOnline={isStoreOnline}
                    siteSettings={siteSettings}
                    orders={orders}
                    promotions={promotions}
                    onSaveProduct={handleSaveProduct}
                    onDeleteProduct={handleDeleteProduct}
                    onProductStatusChange={handleProductStatusChange}
                    onProductStockStatusChange={handleProductStockStatusChange}
                    onStoreStatusChange={handleStoreStatusChange}
                    onSaveCategory={handleSaveCategory}
                    onDeleteCategory={handleDeleteCategory}
                    onCategoryStatusChange={handleCategoryStatusChange}
                    onReorderProducts={handleReorderProducts}
                    onReorderCategories={handleReorderCategories}
                    onSeedDatabase={seedDatabase}
                    onSaveSiteSettings={handleSaveSiteSettings}
                    onUpdateOrderStatus={handleUpdateOrderStatus}
                    onUpdateOrderPaymentStatus={handleUpdateOrderPaymentStatus}
                    onUpdateOrderReservationTime={handleUpdateOrderReservationTime}
                    onDeleteOrder={handleDeleteOrder}
                    onPermanentDeleteOrder={handlePermanentDeleteOrder}
                    onSavePromotion={handleSavePromotion}
                    onDeletePromotion={handleDeletePromotion}
                    onReorderPromotions={handleReorderPromotions}
                />
            </main>

            <Footer settings={siteSettings} />

            {cart.length > 0 && (
                <div className="fixed bottom-5 right-5 z-40">
                    <button 
                        onClick={() => setIsCartOpen(true)}
                        className="bg-accent text-white font-bold py-3 px-5 rounded-full shadow-lg flex items-center gap-3 transform transition-transform hover:scale-105 animate-fade-in-up">
                        <i className="fas fa-shopping-bag text-xl"></i>
                        <div className="text-left">
                            <span className="text-sm block leading-tight">{cartTotalItems} {cartTotalItems > 1 ? 'itens' : 'item'}</span>
                            <span className="font-semibold text-lg block leading-tight">Ver Pedido</span>
                        </div>
                    </button>
                </div>
            )}

            <CartSidebar 
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                cartItems={cart}
                onUpdateQuantity={handleUpdateCartQuantity}
                onCheckout={() => {
                    if (!isStoreOnline) {
                        addToast("A loja está fechada. Não é possível finalizar o pedido.", 'error');
                        return;
                    }
                    setIsCartOpen(false);
                    setIsCheckoutModalOpen(true);
                }}
                isStoreOnline={isStoreOnline}
                categories={categories}
                products={products}
                setActiveCategoryId={setActiveMenuCategory}
            />

            <CheckoutModal 
                isOpen={isCheckoutModalOpen}
                onClose={() => setIsCheckoutModalOpen(false)}
                cartItems={cart}
                onConfirmCheckout={handleCheckout}
                onInitiatePixPayment={handleInitiatePixPayment}
            />
             <PixPaymentModal
                order={payingOrder}
                onClose={() => setPayingOrder(null)}
                onPaymentSuccess={handlePixPaymentSuccess}
            />
            
            <div aria-live="assertive" className="fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start z-[100]">
                <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
                    {toasts.map((toast) => (
                        <div
                            key={toast.id}
                            className="max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden animate-fade-in-up"
                        >
                            <div className="p-4">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0">
                                        {toast.type === 'success' ? (
                                            <i className="fas fa-check-circle h-6 w-6 text-green-500"></i>
                                        ) : (
                                            <i className="fas fa-exclamation-circle h-6 w-6 text-red-500"></i>
                                        )}
                                    </div>
                                    <div className="ml-3 w-0 flex-1 pt-0.5">
                                        <p className="text-sm font-medium text-gray-900">{toast.message}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
};

export default App;
