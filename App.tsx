
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { MenuSection } from './components/MenuSection';
import { AboutSection } from './components/AboutSection';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { AdminSection } from './components/AdminSection';
import { CartSidebar } from './components/CartSidebar';
import { CheckoutModal } from './components/CheckoutModal';
import { PixPaymentModal } from './components/PixPaymentModal';
import { AuthModal } from './components/AuthModal';
import { ProfilePage } from './components/ProfilePage';
import { MyOrdersPage } from './components/MyOrdersPage';
import { DynamicContentSection } from './components/DynamicContentSection';
import { Product, Category, SiteSettings, CartItem, Order, OrderDetails, UserProfile } from './types';
import * as firebaseService from './services/firebaseService';
import { auth } from './services/firebase';
import firebase from 'firebase/compat/app';

const App: React.FC = () => {
    // --- APP STATE ---
    const [isStoreOnline, setIsStoreOnline] = useState(true);
    const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [currentUser, setCurrentUser] = useState<firebase.User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

    // --- UI STATE ---
    const [isLoading, setIsLoading] = useState(true);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isPixPaymentOpen, setIsPixPaymentOpen] = useState(false);
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const [orderForPix, setOrderForPix] = useState<Order | null>(null);
    const [activeSection, setActiveSection] = useState('Início');
    const [activeView, setActiveView] = useState('home'); // home, profile, orders

    // --- MENU INTERACTIVITY STATE ---
    const [activeCategoryId, setActiveCategoryId] = useState('');
    const [suggestedNextCategoryId, setSuggestedNextCategoryId] = useState<string | null>(null);
    const [showFinalizeButtonTrigger, setShowFinalizeButtonTrigger] = useState(false);

    // --- DATA FETCHING & SUBSCRIPTIONS ---
    useEffect(() => {
        const unsubStoreData = firebaseService.onStoreDataChange(data => {
            setAllProducts(data.products);
            setAllCategories(data.categories);
            setSiteSettings(data.settings);
            setIsStoreOnline(data.isOnline);
            if (data.categories.length > 0 && !activeCategoryId) {
                setActiveCategoryId(data.categories.find(c => c.active)?.id || data.categories[0].id);
            }
            setIsLoading(false);
        });
        const unsubOrders = firebaseService.onOrdersChange(setOrders);
        const unsubAuth = auth.onAuthStateChanged(async (user) => {
            setCurrentUser(user);
            if (!user) setUserProfile(null);
        });
        return () => { unsubStoreData(); unsubOrders(); unsubAuth(); };
    }, [activeCategoryId]);

    // Profile listener
    useEffect(() => {
        if (currentUser) {
            return firebaseService.onUserProfileChange(currentUser.uid, setUserProfile);
        }
    }, [currentUser]);

    // Cart persistence
    useEffect(() => {
        const savedCart = localStorage.getItem('cart');
        if (savedCart) setCartItems(JSON.parse(savedCart));
    }, []);

    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(cartItems));
    }, [cartItems]);

    // Simple hash-based routing
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash;
            if (hash === '#meu-perfil') setActiveView('profile');
            else if (hash === '#meus-pedidos') setActiveView('orders');
            else setActiveView('home');
        };
        window.addEventListener('hashchange', handleHashChange);
        handleHashChange(); // Initial check
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    // --- CART LOGIC ---
    const handleAddToCart = useCallback((product: Product, size: string, price: number) => {
        setCartItems(prevItems => {
            const existingItem = prevItems.find(item => item.productId === product.id && item.size === size);
            if (existingItem) {
                return prevItems.map(item =>
                    item.id === existingItem.id ? { ...item, quantity: item.quantity + 1 } : item
                );
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
                return [...prevItems, newItem];
            }
        });
    }, []);

    const handleUpdateQuantity = useCallback((itemId: string, newQuantity: number) => {
        if (newQuantity <= 0) {
            setCartItems(prev => prev.filter(item => item.id !== itemId));
        } else {
            setCartItems(prev => prev.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item));
        }
    }, []);

    const cartItemCount = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems]);
    const cartTotal = useMemo(() => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0), [cartItems]);

    // --- CHECKOUT & PAYMENT LOGIC ---
    const handleCheckout = () => {
        if (cartItems.length > 0) {
            setIsCartOpen(false);
            setIsCheckoutOpen(true);
        }
    };
    
    const handleSaveOrder = async (orderDetails: OrderDetails) => {
        try {
            const orderId = await firebaseService.addOrder(orderDetails, cartItems, cartTotal, currentUser?.uid);
            setIsCheckoutOpen(false);
            
            if (orderDetails.paymentMethod === 'pix') {
                setOrderForPix({ id: orderId, ...orderDetails, items: cartItems, total: cartTotal } as Order);
                setIsPixPaymentOpen(true);
            } else {
                alert('Pedido recebido! Acompanhe o status em "Meus Pedidos".');
                setCartItems([]);
            }
        } catch (error) {
            console.error("Error saving order:", error);
            alert("Não foi possível salvar o pedido. Tente novamente.");
        }
    };

    const handlePaymentSuccess = (paidOrder: Order) => {
        alert(`Pagamento do pedido ${paidOrder.id.substring(0,8)} aprovado!`);
        setIsPixPaymentOpen(false);
        setOrderForPix(null);
        setCartItems([]);
    };

    // --- ADMIN HANDLERS ---
    // These are just wrappers around the firebaseService calls
    const adminHandlers = {
        onSaveProduct: firebaseService.saveProduct,
        onDeleteProduct: firebaseService.deleteProduct,
        onProductStatusChange: firebaseService.updateProductStatus,
        onProductStockStatusChange: firebaseService.updateProductStockStatus,
        onStoreStatusChange: firebaseService.updateStoreStatus,
        onSaveCategory: firebaseService.saveCategory,
        onDeleteCategory: firebaseService.deleteCategory,
        onCategoryStatusChange: firebaseService.updateCategoryStatus,
        onReorderProducts: firebaseService.onReorderProducts,
        onReorderCategories: firebaseService.onReorderCategories,
        onSeedDatabase: firebaseService.seedDatabase,
        onSaveSiteSettings: firebaseService.saveSiteSettings,
        onUpdateOrderStatus: firebaseService.updateOrderStatus,
        onUpdateOrderPaymentStatus: firebaseService.updateOrderPaymentStatus,
        onUpdateOrderReservationTime: firebaseService.updateOrderReservationTime,
        onDeleteOrder: firebaseService.deleteOrder,
        onPermanentDeleteOrder: firebaseService.permanentDeleteOrder,
    };
    
    // --- RENDER LOGIC ---
    if (isLoading || !siteSettings) {
        return <div className="fixed inset-0 flex items-center justify-center bg-brand-ivory-50"><i className="fas fa-spinner fa-spin text-4xl text-accent"></i></div>;
    }

    const renderActiveView = () => {
        switch(activeView) {
            case 'profile':
                return <ProfilePage currentUser={currentUser} userProfile={userProfile} />;
            case 'orders':
                return <MyOrdersPage currentUser={currentUser} />;
            case 'home':
            default:
                const visibleContentSections = siteSettings.contentSections?.filter(s => s.isVisible).sort((a,b) => a.order - b.order) ?? [];
                return (
                    <>
                        <HeroSection settings={siteSettings} />
                        <MenuSection 
                            categories={allCategories}
                            products={allProducts}
                            onAddToCart={handleAddToCart}
                            isStoreOnline={isStoreOnline}
                            activeCategoryId={activeCategoryId}
                            setActiveCategoryId={setActiveCategoryId}
                            suggestedNextCategoryId={suggestedNextCategoryId}
                            setSuggestedNextCategoryId={setSuggestedNextCategoryId}
                            cartItemCount={cartItemCount}
                            onCartClick={() => setIsCartOpen(true)}
                            showFinalizeButtonTrigger={showFinalizeButtonTrigger}
                            setShowFinalizeButtonTrigger={setShowFinalizeButtonTrigger}
                        />
                        {/* Dynamic content sections rendering */}
                        {visibleContentSections.map((section, index) => (
                           <DynamicContentSection key={section.id} section={section} order={index + 1} />
                        ))}
                        <ContactSection />
                    </>
                );
        }
    };


    return (
        <>
            <Header
                cartItemCount={cartItemCount}
                onCartClick={() => setIsCartOpen(true)}
                activeSection={activeSection}
                settings={siteSettings}
                currentUser={currentUser}
                onAuthClick={() => setIsAuthOpen(true)}
            />
            <main>
                {renderActiveView()}
                <AdminSection 
                    {...adminHandlers}
                    allProducts={allProducts} 
                    allCategories={allCategories} 
                    isStoreOnline={isStoreOnline} 
                    siteSettings={siteSettings} 
                    orders={orders}
                />
            </main>
            <Footer settings={siteSettings} />

            {/* Modals & Sidebars */}
            <CartSidebar 
                isOpen={isCartOpen} 
                onClose={() => setIsCartOpen(false)} 
                cartItems={cartItems} 
                onUpdateQuantity={handleUpdateQuantity} 
                onCheckout={handleCheckout}
                isStoreOnline={isStoreOnline}
                categories={allCategories}
                products={allProducts}
                setActiveCategoryId={setActiveCategoryId}
            />
            {isCheckoutOpen && (
                <CheckoutModal 
                    isOpen={isCheckoutOpen} 
                    onClose={() => setIsCheckoutOpen(false)} 
                    cartItems={cartItems}
                    total={cartTotal}
                    onSubmit={handleSaveOrder}
                    currentUserProfile={userProfile}
                />
            )}
            {isPixPaymentOpen && (
                <PixPaymentModal
                    order={orderForPix}
                    onClose={() => setIsPixPaymentOpen(false)}
                    onPaymentSuccess={handlePaymentSuccess}
                />
            )}
            {isAuthOpen && (
                <AuthModal
                    isOpen={isAuthOpen}
                    onClose={() => setIsAuthOpen(false)}
                />
            )}
        </>
    );
};

export default App;
