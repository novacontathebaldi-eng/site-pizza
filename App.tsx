import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { MenuSection } from './components/MenuSection';
import { AboutSection } from './components/AboutSection';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { CartSidebar } from './components/CartSidebar';
import { CheckoutModal, OrderConfirmationModal, ReservationConfirmationModal } from './components/CheckoutModal';
import { AdminSection } from './components/AdminSection';
import { PixPaymentModal } from './components/PixPaymentModal';
import { PaymentFailureModal } from './components/PaymentFailureModal';
import { LoginModal } from './components/LoginModal';
import { UserAreaModal } from './components/UserAreaModal';
import { ReservationModal } from './components/ReservationModal';
import { Chatbot } from './components/Chatbot';
import { DynamicContentSection } from './components/DynamicContentSection';

import { Product, Category, SiteSettings, CartItem, OrderDetails, Order, OrderStatus, PaymentStatus, ChatMessage, UserProfile, ReservationDetails } from './types';
import * as firebaseService from './services/firebaseService';
import { db, auth } from './services/firebase';
import firebase from 'firebase/compat/app';

// Helper for deep merging site settings
const isObject = (item: any) => {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

const mergeDeep = (target: any, source: any): any => {
    const output = { ...target };
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target))
                    Object.assign(output, { [key]: source[key] });
                else
                    output[key] = mergeDeep(target[key], source[key]);
            } else {
                Object.assign(output, { [key]: source[key] });
            }
        });
    }
    return output;
}

const defaultSiteSettings: SiteSettings = {
    logoUrl: 'https://firebasestorage.googleapis.com/v0/b/site-pizza-a2930.firebasestorage.app/o/site%2Flogo_1720124713346.png?alt=media&token=c86c1286-621f-4905-9556-9d8c36199a0f',
    heroSlogan: 'A Melhor Pizza do Estado',
    heroTitle: 'Santa Sensação Pizzaria',
    heroSubtitle: 'Ingredientes frescos, massa artesanal e um sabor que vai te levar ao céu. Peça agora e descubra a sensação!',
    heroBgUrl: 'https://firebasestorage.googleapis.com/v0/b/site-pizza-a2930.firebasestorage.app/o/hero-bg.jpg?alt=media&token=40a37357-a36c-486a-86a0-4a8e8557a07a',
    contentSections: [],
    footerLinks: []
};


function App() {
    // Core data state
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [siteSettings, setSiteSettings] = useState<SiteSettings>(defaultSiteSettings);
    const [isStoreOnline, setIsStoreOnline] = useState(true);
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<firebase.User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);

    // UI state
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isPixPaymentOpen, setIsPixPaymentOpen] = useState(false);
    const [isPaymentFailureOpen, setIsPaymentFailureOpen] = useState(false);
    const [isOrderConfirmationOpen, setIsOrderConfirmationOpen] = useState(false);
    const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
    const [isReservationConfirmationOpen, setIsReservationConfirmationOpen] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isUserAreaModalOpen, setIsUserAreaModalOpen] = useState(false);
    const [isChatbotOpen, setIsChatbotOpen] = useState(false);
    
    // Active states
    const [activeSection, setActiveSection] = useState('Início');
    const [activeCategoryId, setActiveCategoryId] = useState('');
    const [cartItems, setCartItems] = useState<CartItem[]>(() => {
        try {
            const localData = localStorage.getItem('cartItems');
            return localData ? JSON.parse(localData) : [];
        } catch (error) {
            return [];
        }
    });

    // Operation states
    const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
    const [refundingOrderId, setRefundingOrderId] = useState<string | null>(null);
    const [lastOrder, setLastOrder] = useState<Order | null>(null);
    const [lastReservation, setLastReservation] = useState<Order | null>(null);
    const [pendingPixOrder, setPendingPixOrder] = useState<Order | null>(null);
    const [pendingCheckoutDetails, setPendingCheckoutDetails] = useState<OrderDetails | null>(null);
    const [isBotReplying, setIsBotReplying] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [toasts, setToasts] = useState<{ id: number, message: string, type: 'success' | 'error' }[]>([]);

    // User data state for pre-filling forms
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    
    // Effect for handling auth state and fetching profile
    useEffect(() => {
        if (!auth || !db) return;
        const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                const userProfile = await firebaseService.getUserProfile(firebaseUser.uid);
                setProfile(userProfile);
                setCustomerName(userProfile?.name || firebaseUser.displayName || '');
                setCustomerPhone(userProfile?.phone || firebaseUser.phoneNumber || '');
                setIsLoginModalOpen(false); // Close login modal on success
                setIsUserAreaModalOpen(true); // Open user area on login
            } else {
                setUser(null);
                setProfile(null);
                setCustomerName('');
                setCustomerPhone('');
            }
        });
        return () => unsubscribe();
    }, []);

    // Effect for fetching all data from Firebase
    useEffect(() => {
        if (!db) {
            setIsLoading(false);
            console.error("Firestore not initialized.");
            return;
        }

        const unsubscribers: (() => void)[] = [];

        unsubscribers.push(db.collection('products').onSnapshot(snapshot => {
            const fetchedProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)).sort((a,b) => a.orderIndex - b.orderIndex);
            setProducts(fetchedProducts);
        }));

        unsubscribers.push(db.collection('categories').onSnapshot(snapshot => {
            const fetchedCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)).sort((a,b) => a.order - b.order);
            setCategories(fetchedCategories);
            if (fetchedCategories.length > 0 && !activeCategoryId) {
                setActiveCategoryId(fetchedCategories.filter(c => c.active)[0]?.id || '');
            }
        }));
        
        unsubscribers.push(db.doc('store_config/status').onSnapshot(doc => {
            setIsStoreOnline(doc.data()?.isOpen ?? true);
        }));

        unsubscribers.push(db.doc('store_config/site_settings').onSnapshot(doc => {
            const settingsData = doc.data() as Partial<SiteSettings>;
            setSiteSettings(prev => mergeDeep(prev, settingsData));
        }));

        unsubscribers.push(db.collection('orders').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
            const fetchedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
            setOrders(fetchedOrders);
        }));

        setIsLoading(false);

        return () => unsubscribers.forEach(unsub => unsub());
    }, [activeCategoryId]);

    // Persist cart to localStorage
    useEffect(() => {
        localStorage.setItem('cartItems', JSON.stringify(cartItems));
    }, [cartItems]);
    
     // Scroll spy for header active section
    useEffect(() => {
        const sections = ['inicio', 'cardapio', 'sobre', 'contato'];
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const sectionId = entry.target.id;
                    const sectionName = sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
                    setActiveSection(sectionName === 'Sobre' ? 'Sobre Nós' : sectionName);
                }
            });
        }, { rootMargin: '-40% 0px -60% 0px' });

        sections.forEach(id => {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        });

        return () => sections.forEach(id => {
            const el = document.getElementById(id);
            if (el) observer.unobserve(el);
        });
    }, []);

    const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    }, []);
    
    // --- CART LOGIC ---
    const handleAddToCart = (product: Product, size: string, price: number) => {
        setCartItems(prevItems => {
            const existingItem = prevItems.find(item => item.productId === product.id && item.size === size);
            if (existingItem) {
                return prevItems.map(item =>
                    item.id === existingItem.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prevItems, { id: Date.now() + Math.random().toString(36), productId: product.id, name: product.name, size, price, quantity: 1, imageUrl: product.imageUrl }];
        });
    };

    const handleUpdateCartQuantity = (itemId: string, newQuantity: number) => {
        if (newQuantity <= 0) {
            setCartItems(prev => prev.filter(item => item.id !== itemId));
        } else {
            setCartItems(prev => prev.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item));
        }
    };
    
    // --- USER & AUTH LOGIC ---
    const handleUserIconClick = () => {
        if (user) {
            setIsUserAreaModalOpen(true);
        } else {
            setIsLoginModalOpen(true);
        }
    }
    
    const handleGoogleSignIn = async () => {
        if (!auth) return;
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            const result = await auth.signInWithPopup(provider);
            const idToken = await result.user?.getIdToken();
            if (idToken) {
                const customToken = await firebaseService.verifyGoogleToken(idToken);
                await auth.signInWithCustomToken(customToken);
            }
        } catch (error) {
            console.error("Google Sign-In Error:", error);
            addToast("Falha ao entrar com o Google. Tente novamente.", 'error');
        }
    };

    const handleLogout = async () => {
        if (!auth) return;
        await auth.signOut();
        setIsUserAreaModalOpen(false);
        addToast("Você saiu da sua conta.", 'success');
    };
    
    // --- CHECKOUT AND RESERVATION LOGIC ---
    const handleConfirmCheckout = async (details: OrderDetails) => {
        setIsProcessingCheckout(true);
        try {
            const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0) + (details.deliveryFee || 0);
            const { orderId, orderNumber } = await firebaseService.createOrder(details, cartItems, total);
            
            const newOrder: Order = {
                id: orderId,
                orderNumber,
                customer: { name: details.name, phone: details.phone, orderType: details.orderType },
                total
            };
            setLastOrder(newOrder);
            
            setCartItems([]);
            setIsCheckoutOpen(false);
            setIsOrderConfirmationOpen(true);
        } catch (error) {
            console.error(error);
            addToast("Erro ao finalizar o pedido. Tente novamente.", 'error');
        } finally {
            setIsProcessingCheckout(false);
        }
    };
    
    const handleInitiatePixPayment = async (details: OrderDetails, pixOption: 'payNow' | 'payLater') => {
        if (pixOption === 'payLater') {
            await handleConfirmCheckout(details);
            return;
        }

        setIsProcessingCheckout(true);
        setPendingCheckoutDetails(details); // Save details for retry
        try {
            const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0) + (details.deliveryFee || 0);
            const { orderId, orderNumber, pixData } = await firebaseService.createOrder(details, cartItems, total, 'payNow');
            
            const newOrder: Order = {
                id: orderId,
                orderNumber,
                customer: { name: details.name, phone: details.phone, orderType: details.orderType },
                total,
                mercadoPagoDetails: {
                    paymentId: '', // Placeholder, not needed on client
                    qrCode: pixData.copyPaste,
                    qrCodeBase64: pixData.qrCodeBase64
                }
            };
            setPendingPixOrder(newOrder);
            setIsCheckoutOpen(false);
            setIsPixPaymentOpen(true);
        } catch (error) {
            console.error(error);
            addToast("Erro ao gerar o PIX. Tente novamente.", 'error');
        } finally {
            setIsProcessingCheckout(false);
        }
    };
    
    const handlePaymentSuccess = (paidOrder: Order) => {
        setLastOrder(paidOrder);
        setCartItems([]);
        setIsPixPaymentOpen(false);
        setIsOrderConfirmationOpen(true);
        setPendingPixOrder(null);
        setPendingCheckoutDetails(null);
    };
    
    const handlePayLater = async () => {
        if (pendingPixOrder) {
            await firebaseService.updateOrderStatus(pendingPixOrder.id, 'pending');
            setLastOrder(pendingPixOrder);
            setCartItems([]);
            setIsPixPaymentOpen(false);
            setIsPaymentFailureOpen(false);
            setIsOrderConfirmationOpen(true);
            setPendingPixOrder(null);
            setPendingCheckoutDetails(null);
        }
    };
    
    const handleTryAgainPayment = async () => {
        setIsPaymentFailureOpen(false);
        if (pendingCheckoutDetails) {
            await handleInitiatePixPayment(pendingCheckoutDetails, 'payNow');
        }
    };

    const handleConfirmReservation = async (details: ReservationDetails) => {
        setIsProcessingCheckout(true);
        try {
            const { orderId, orderNumber } = await firebaseService.createReservation(details);
            
            const newReservation: Order = {
                id: orderId,
                orderNumber,
                customer: { name: details.name, phone: details.phone, orderType: 'local', reservationDate: details.reservationDate, reservationTime: details.reservationTime },
                numberOfPeople: details.numberOfPeople
            };
            
            setLastReservation(newReservation);
            setIsReservationModalOpen(false);
            setIsReservationConfirmationOpen(true);
        } catch (error) {
            console.error(error);
            addToast("Erro ao enviar sua reserva. Tente novamente.", 'error');
        } finally {
            setIsProcessingCheckout(false);
        }
    };

    const handleSendWhatsApp = (order: Order) => {
        const phone = "5527996500341";
        const message = encodeURIComponent(`Olá! Gostaria de falar sobre o pedido #${order.orderNumber}.`);
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    };
    
    // --- ADMIN LOGIC ---
    const handleSaveProduct = async (product: Product) => {
        if (product.id) {
            await firebaseService.updateProduct(product.id, product);
        } else {
            await firebaseService.addProduct(product);
        }
    };

    const handleDeleteProduct = async (productId: string) => await firebaseService.deleteProduct(productId);
    const handleProductStatusChange = async (productId: string, active: boolean) => await firebaseService.updateProductStatus(productId, active);
    const handleProductStockStatusChange = async (productId: string, stockStatus: 'available' | 'out_of_stock') => await firebaseService.updateProductStockStatus(productId, stockStatus);
    const handleReorderProducts = async (updates: { id: string; orderIndex: number }[]) => await firebaseService.updateProductsOrder(updates);

    const handleSaveCategory = async (category: Category) => {
        if (category.id) {
            await firebaseService.updateCategory(category.id, category);
        } else {
            await firebaseService.addCategory(category);
        }
    };
    
    const handleDeleteCategory = async (categoryId: string) => {
        try {
            await firebaseService.deleteCategory(categoryId, products);
        } catch (error: any) {
            alert(error.message);
        }
    };
    const handleCategoryStatusChange = async (categoryId: string, active: boolean) => await firebaseService.updateCategoryStatus(categoryId, active);
    const handleReorderCategories = async (updates: { id: string; order: number }[]) => await firebaseService.updateCategoriesOrder(updates);
    
    const handleStoreStatusChange = async (isOnline: boolean) => await firebaseService.updateStoreStatus(isOnline);
    
    const handleSaveSiteSettings = async (settings: SiteSettings, files: { [key: string]: File | null }) => {
        let updatedSettings = { ...settings };
        for (const key in files) {
            const file = files[key];
            if (file) {
                const assetName = key; // e.g., 'logo', 'heroBg', or a section ID
                const url = await firebaseService.uploadSiteAsset(file, assetName);
                if (assetName === 'logo') updatedSettings.logoUrl = url;
                else if (assetName === 'heroBg') updatedSettings.heroBgUrl = url;
                else {
                    const sectionIndex = updatedSettings.contentSections.findIndex(s => s.id === assetName);
                    if (sectionIndex > -1) {
                        updatedSettings.contentSections[sectionIndex].imageUrl = url;
                    }
                }
            }
        }
        await firebaseService.updateSiteSettings(updatedSettings);
        addToast('Configurações salvas com sucesso!', 'success');
    };
    
    const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus, payload?: any) => await firebaseService.updateOrderStatus(orderId, status, payload);
    const handleUpdateOrderPaymentStatus = async (orderId: string, paymentStatus: PaymentStatus) => await firebaseService.updateOrderPaymentStatus(orderId, paymentStatus);
    const handleUpdateOrderReservationTime = async (orderId: string, time: string) => await firebaseService.updateOrderReservationTime(orderId, time);
    const handleDeleteOrder = async (orderId: string) => await firebaseService.updateOrderStatus(orderId, 'deleted');
    const handlePermanentDeleteOrder = async (orderId: string) => await firebaseService.deleteOrder(orderId);
    
    const handleRefundOrder = async (orderId: string) => {
        setRefundingOrderId(orderId);
        try {
            await firebaseService.refundPayment(orderId);
            addToast("Pagamento estornado com sucesso!", 'success');
        } catch (error: any) {
            console.error("Refund error:", error);
            addToast(error.message || "Falha ao estornar o pagamento.", 'error');
        } finally {
            setRefundingOrderId(null);
        }
    };
    
    // --- CHATBOT ---
    const handleSendChatMessage = async (message: string) => {
        const userMessage: ChatMessage = { role: 'user', content: message };
        const newMessages = [...chatMessages, userMessage];
        setChatMessages(newMessages);
        setIsBotReplying(true);

        try {
            const reply = await firebaseService.askChatbot(newMessages);
            const botMessage: ChatMessage = { role: 'bot', content: reply };
            setChatMessages(prev => [...prev, botMessage]);
        } catch (error) {
            const errorMessage: ChatMessage = { role: 'bot', content: "Desculpe, não consegui processar sua mensagem. Tente novamente." };
            setChatMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsBotReplying(false);
        }
    };
    
    const handleOpenChatbot = () => {
        if (chatMessages.length === 0) {
             const welcomeMessage: ChatMessage = { role: 'bot', content: "Olá! Eu sou o Sensação, seu assistente virtual da Santa Sensação. Como posso te ajudar hoje? 🍕" };
             setChatMessages([welcomeMessage]);
        }
        setIsChatbotOpen(true);
    };

    const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    const visibleContentSections = useMemo(() =>
        siteSettings.contentSections?.filter(s => s.isVisible).sort((a, b) => a.order - b.order) || [],
        [siteSettings.contentSections]
    );

    return (
        <div className="bg-brand-ivory-50 font-sans">
            {!isStoreOnline && (
                 <div id="status-banner" className="bg-yellow-500 text-center text-white font-bold p-2 fixed top-20 w-full z-40">
                    <i className="fas fa-clock mr-2"></i>
                    No momento estamos fechados. Pedidos podem ser agendados.
                </div>
            )}

            {/* Toasts */}
             <div className="fixed top-24 right-4 z-[9999] space-y-2">
                {toasts.map(toast => (
                    <div key={toast.id} className={`p-4 rounded-lg shadow-lg text-white font-semibold ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                        {toast.message}
                    </div>
                ))}
            </div>

            <Header 
                cartItemCount={cartItemCount} 
                onCartClick={() => setIsCartOpen(true)}
                onOpenChatbot={handleOpenChatbot}
                activeSection={activeSection}
                settings={siteSettings}
                user={user}
                onUserIconClick={handleUserIconClick}
            />
            <main>
                <HeroSection settings={siteSettings} isLoading={isLoading} onReserveClick={() => setIsReservationModalOpen(true)} />
                <MenuSection 
                    categories={categories}
                    products={products}
                    onAddToCart={handleAddToCart}
                    isStoreOnline={isStoreOnline}
                    activeCategoryId={activeCategoryId}
                    setActiveCategoryId={setActiveCategoryId}
                    cartItemCount={cartItemCount}
                    onCartClick={() => setIsCartOpen(true)}
                    cartItems={cartItems}
                />
                
                {visibleContentSections.length > 0 && <AboutSection settings={siteSettings} />}
                {visibleContentSections.slice(1).map((section, index) => (
                    <DynamicContentSection key={section.id} section={section} order={index + 1} />
                ))}
                
                <ContactSection />
                 <AdminSection 
                    allProducts={products}
                    allCategories={categories}
                    isStoreOnline={isStoreOnline}
                    siteSettings={siteSettings}
                    orders={orders}
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
                    onSeedDatabase={firebaseService.seedDatabase}
                    onSaveSiteSettings={handleSaveSiteSettings}
                    onUpdateOrderStatus={handleUpdateOrderStatus}
                    onUpdateOrderPaymentStatus={handleUpdateOrderPaymentStatus}
                    onUpdateOrderReservationTime={handleUpdateOrderReservationTime}
                    onDeleteOrder={handleDeleteOrder}
                    onPermanentDeleteOrder={handlePermanentDeleteOrder}
                    onRefundOrder={handleRefundOrder}
                    refundingOrderId={refundingOrderId}
                />
            </main>
            <Footer settings={siteSettings} onOpenChatbot={handleOpenChatbot} />
            
            <CartSidebar
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                cartItems={cartItems}
                onUpdateQuantity={handleUpdateCartQuantity}
                onCheckout={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }}
                isStoreOnline={isStoreOnline}
                categories={categories}
                products={products}
                setActiveCategoryId={setActiveCategoryId}
            />

            {isCheckoutOpen && (
                 <CheckoutModal 
                    isOpen={isCheckoutOpen}
                    onClose={() => setIsCheckoutOpen(false)}
                    cartItems={cartItems}
                    onConfirmCheckout={handleConfirmCheckout}
                    onInitiatePixPayment={handleInitiatePixPayment}
                    isProcessing={isProcessingCheckout}
                    name={customerName}
                    setName={setCustomerName}
                    phone={customerPhone}
                    setPhone={setCustomerPhone}
                />
            )}
            
            {isPixPaymentOpen && (
                <PixPaymentModal 
                    order={pendingPixOrder} 
                    onClose={() => { setIsPixPaymentOpen(false); setIsPaymentFailureOpen(true); }}
                    onPaymentSuccess={handlePaymentSuccess}
                    isProcessing={isProcessingCheckout}
                />
            )}

            {isPaymentFailureOpen && (
                <PaymentFailureModal
                    isOpen={isPaymentFailureOpen}
                    onClose={() => setIsPaymentFailureOpen(false)}
                    onTryAgain={handleTryAgainPayment}
                    onPayLater={handlePayLater}
                />
            )}
            
            {isOrderConfirmationOpen && (
                <OrderConfirmationModal 
                    order={lastOrder} 
                    onClose={() => setIsOrderConfirmationOpen(false)}
                    onSendWhatsApp={handleSendWhatsApp}
                />
            )}

            {isReservationModalOpen && (
                <ReservationModal 
                    isOpen={isReservationModalOpen}
                    onClose={() => setIsReservationModalOpen(false)}
                    onConfirmReservation={handleConfirmReservation}
                    isProcessing={isProcessingCheckout}
                />
            )}
            
            {isReservationConfirmationOpen && (
                <ReservationConfirmationModal 
                    reservation={lastReservation}
                    onClose={() => setIsReservationConfirmationOpen(false)}
                    onSendWhatsApp={handleSendWhatsApp}
                />
            )}
            
            {isLoginModalOpen && (
                <LoginModal 
                    isOpen={isLoginModalOpen}
                    onClose={() => setIsLoginModalOpen(false)}
                    onGoogleSignIn={handleGoogleSignIn}
                />
            )}

            {isUserAreaModalOpen && (
                <UserAreaModal
                    isOpen={isUserAreaModalOpen}
                    onClose={() => setIsUserAreaModalOpen(false)}
                    user={user}
                    profile={profile}
                    onLogout={handleLogout}
                    addToast={addToast}
                />
            )}
            
            <Chatbot
                isOpen={isChatbotOpen}
                onClose={() => setIsChatbotOpen(false)}
                messages={chatMessages}
                onSendMessage={handleSendChatMessage}
                isSending={isBotReplying}
            />

            {/* Chatbot trigger button */}
            {!isChatbotOpen && (
                <button
                    onClick={handleOpenChatbot}
                    className="fixed bottom-4 right-4 bg-accent text-white w-16 h-16 rounded-full shadow-lg z-40 flex items-center justify-center text-2xl"
                    aria-label="Abrir assistente virtual"
                >
                    <i className="fas fa-headset"></i>
                </button>
            )}

        </div>
    );
}

export default App;
