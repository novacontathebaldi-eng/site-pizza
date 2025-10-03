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
import { PromotionSection } from './components/PromotionSection';
import { ImagePreloader } from './components/ImagePreloader';
import { defaultSiteSettings } from './services/defaultSettings';

interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error';
}

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
        const sectionIds = ['inicio', 'promocoes', 'cardapio', 'sobre', 'contato'];
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
                        'promocoes': 'Promoções',
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
    }, [promotions]);

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
                 setSiteSettings(prev => ({
                    ...defaultSiteSettings,
                    ...prev,
                    ...data,
                    audioSettings: { ...defaultSiteSettings.audioSettings, ...prev.audioSettings, ...data.audioSettings },
                    notificationSettings: { ...defaultSiteSettings.notificationSettings, ...prev.notificationSettings, ...data.notificationSettings },
                 }));
            } else {
                firebaseService.updateSiteSettings(defaultSiteSettings);
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
            const createdOrder: Order = { ...newOrderData, id: docRef.id, createdAt: new Date() };
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

    const handleSaveProduct = useCallback(async (product: Product) => { /* ... */ }, [products.length, addToast]);
    const handleDeleteProduct = useCallback(async (productId: string) => { /* ... */ }, [addToast]);
    const handleProductStatusChange = useCallback(async (productId: string, active: boolean) => { /* ... */ }, [addToast]);
    const handleProductStockStatusChange = useCallback(async (productId: string, stockStatus: 'available' | 'out_of_stock') => { /* ... */ }, [addToast]);
    const handleStoreStatusChange = useCallback(async (isOnline: boolean) => { /* ... */ }, [addToast]);
    const handleSaveCategory = useCallback(async (category: Category) => { /* ... */ }, [categories.length, addToast]);
    const handleDeleteCategory = useCallback(async (categoryId: string) => { /* ... */ }, [products, addToast]);
    const handleCategoryStatusChange = useCallback(async (categoryId: string, active: boolean) => { /* ... */ }, [addToast]);
    const handleReorderProducts = useCallback(async (productsToUpdate: { id: string; orderIndex: number }[]) => { /* ... */ }, [addToast]);
    const handleReorderCategories = useCallback(async (categoriesToUpdate: { id: string; order: number }[]) => { /* ... */ }, [addToast]);

    const handleSaveSiteSettings = useCallback(async (settings: SiteSettings, files: { [key: string]: File | null }, audioFiles: { [key: string]: File | null }) => {
        try {
            const settingsToUpdate = JSON.parse(JSON.stringify(settings)); 
            for (const key in files) { /* ... */ }
            for (const key in audioFiles) { /* ... */ }
            await firebaseService.updateSiteSettings(settingsToUpdate);
            addToast("Configurações do site salvas com sucesso!", 'success');
        } catch (error) {
            console.error("Failed to save site settings:", error);
            addToast("Erro ao salvar as configurações do site.", 'error');
        }
    }, [addToast]);
    
    const handleSavePromotion = useCallback(async (promotion: PromotionPage) => { /* ... */ }, [addToast]);
    const handleDeletePromotion = useCallback(async (promotionId: string) => { /* ... */ }, [addToast]);
    const handleReorderPromotions = useCallback(async (promotionsToUpdate: { id: string; order: number }[]) => { /* ... */ }, [addToast]);

    const handleRestoreDefaults = useCallback(async () => {
        if (window.confirm("Tem certeza que deseja restaurar todas as configurações para o padrão original? Isso afetará a aparência, os links e as configurações de áudio/notificação.")) {
            try {
                await firebaseService.restoreDefaultSettings();
                addToast("Configurações restauradas para o padrão.", 'success');
            } catch (error) {
                console.error("Failed to restore default settings:", error);
                addToast("Erro ao restaurar as configurações.", 'error');
            }
        }
    }, [addToast]);
    
    const handleUpdateOrderStatus = useCallback(async (orderId: string, status: OrderStatus, payload?: Partial<Pick<Order, 'pickupTimeEstimate'>>) => { /* ... */ }, [orders, addToast]);
    const handleUpdateOrderPaymentStatus = useCallback(async (orderId: string, paymentStatus: PaymentStatus) => { /* ... */ }, [addToast]);
    const handleUpdateOrderReservationTime = useCallback(async (orderId: string, reservationTime: string) => { /* ... */ }, [addToast]);
    const handleDeleteOrder = useCallback(async (orderId: string) => { /* ... */ }, [addToast]);
    const handlePermanentDeleteOrder = useCallback(async (orderId: string) => { /* ... */ }, [addToast]);

    const cartTotalItems = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
    const promotionPages = useMemo(() => promotions.filter(p => p.isVisible).sort((a, b) => a.order - b.order), [promotions]);
    const imagePreloadList = useMemo(() => {
        const productImages = products.map(p => p.imageUrl);
        const promotionProductImages = promotions.flatMap(promo => 
            promo.featuredProductIds
                .map(id => products.find(p => p.id === id)?.imageUrl)
                .filter((url): url is string => !!url)
        );
        return [...new Set([...productImages, ...promotionProductImages])];
    }, [products, promotions]);

    return (
        <div className="flex flex-col min-h-screen">
            <ImagePreloader imageUrls={imagePreloadList} />
            {/* ... o resto do JSX ... */}
        </div>
    );
};

export default App;