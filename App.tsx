
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { HeroSection } from './components/HeroSection.tsx';
import { MenuSection } from './components/MenuSection.tsx';
import { ContactSection } from './components/ContactSection.tsx';
import { Footer } from './components/Footer.tsx';
import { AdminSection } from './components/AdminSection.tsx';
import { CartSidebar } from './components/CartSidebar.tsx';
import { CheckoutModal } from './components/CheckoutModal.tsx';
import { OrderConfirmationModal } from './components/OrderConfirmationModal.tsx';
import { PixPaymentModal } from './components/PixPaymentModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { MyOrdersPage } from './components/MyOrdersPage.tsx';
import { TrackOrderPage } from './components/TrackOrderPage.tsx';
import { DynamicContentSection } from './components/DynamicContentSection.tsx';
import * as firebaseService from './services/firebaseService.ts';
import { auth } from './services/firebase.ts';
import { Product, Category, CartItem, SiteSettings, Order, OrderDetails, UserProfile, OrderStatus, PaymentStatus } from './types.ts';
import firebase from 'firebase/compat/app';

const App: React.FC = () => {
    // Data state
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
    const [isStoreOnline, setIsStoreOnline] = useState(true);
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // UI State
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
    const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
    const [isPixModalOpen, setIsPixModalOpen] = useState(false);
    const [pixOrder, setPixOrder] = useState<Order | null>(null);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [toasts, setToasts] = useState<{ id: number, message: string, type: 'success' | 'error' }[]>([]);

    // Menu state
    const [activeCategoryId, setActiveCategoryId] = useState('');
    const [suggestedNextCategoryId, setSuggestedNextCategoryId] = useState<string | null>(null);
    const [showFinalizeButtonTrigger, setShowFinalizeButtonTrigger] = useState(false);

    // Cart state
    const [cartItems, setCartItems] = useState<CartItem[]>([]);

    // Auth state
    const [currentUser, setCurrentUser] = useState<firebase.User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    const addToast = (message: string, type: 'success' | 'error' = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(toast => toast.id !== id));
        }, 3000);
    };

    // --- Effects for data fetching and subscriptions ---
    useEffect(() => {
        const onDataUpdate = (data: { products?: Product[], categories?: Category[], siteSettings?: SiteSettings, isOnline?: boolean }) => {
            if (data.products) setProducts(data.products);
            if (data.categories) {
                 const activeCategories = data.categories.filter(c => c.active).sort((a,b) => a.order - b.order);
                setCategories(activeCategories);
                if (activeCategories.length > 0 && !activeCategoryId) {
                    setActiveCategoryId(activeCategories[0].id);
                }
            }
            if (data.siteSettings) setSiteSettings(data.siteSettings);
            if (data.isOnline !== undefined) setIsStoreOnline(data.isOnline);
            
            if (products.length > 0 && categories.length > 0 && siteSettings) {
                setIsLoading(false);
            }
        };

        const unsubscribe = firebaseService.subscribeToData(
            onDataUpdate,
            (err) => {
                console.error(err);
                setError("Não foi possível carregar os dados. Tente recarregar a página.");
                setIsLoading(false);
            }
        );
        return () => unsubscribe();
    }, [activeCategoryId, products.length, categories.length, siteSettings]);

    useEffect(() => {
        const unsubscribe = firebaseService.subscribeToOrders(setOrders, (err) => {
            console.error("Failed to subscribe to orders:", err);
            addToast("Erro ao carregar pedidos.", "error");
        });
        return () => unsubscribe();
    }, []);
    
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            setCurrentUser(user);
            if (user) {
                const profile = await firebaseService.getUserProfile(user.uid);
                setUserProfile(profile);
            } else {
                setUserProfile(null);
            }
            setIsAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // --- Cart Management ---
    const handleAddToCart = (product: Product, size: string, price: number) => {
        const existingItem = cartItems.find(item => item.productId === product.id && item.size === size);
        if (existingItem) {
            handleUpdateQuantity(existingItem.id, existingItem.quantity + 1);
        } else {
            const newItem: CartItem = {
                id: `${product.id}-${size}-${Date.now()}`,
                productId: product.id,
                name: product.name,
                size,
                price,
                quantity: 1,
                imageUrl: product.imageUrl,
            };
            setCartItems([...cartItems, newItem]);
        }
        addToast(`${product.name} (${size}) adicionado!`, 'success');
        
        // Suggestion logic
        const currentCategoryIndex = categories.findIndex(c => c.id === product.categoryId);
        if (currentCategoryIndex !== -1 && currentCategoryIndex < categories.length - 1) {
            setSuggestedNextCategoryId(categories[currentCategoryIndex + 1].id);
        } else {
             setShowFinalizeButtonTrigger(true); // Trigger finalize button on last category
        }
    };

    const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
        if (newQuantity <= 0) {
            setCartItems(cartItems.filter(item => item.id !== itemId));
        } else {
            setCartItems(cartItems.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item));
        }
    };

    // --- Checkout Flow ---
    const handleCheckout = () => {
        setIsCartOpen(false);
        if (currentUser) {
            setIsCheckoutOpen(true);
        } else {
            setIsAuthModalOpen(true);
        }
    };

    const handleConfirmCheckout = async (details: OrderDetails) => {
        try {
            const newOrder = await firebaseService.createOrder(details, cartItems);
            setConfirmedOrder(newOrder);
            setIsCheckoutOpen(false);
            setIsConfirmationOpen(true);
            setCartItems([]);
        } catch (error) {
            console.error("Error creating order:", error);
            addToast("Erro ao finalizar o pedido. Tente novamente.", "error");
        }
    };

    const handleInitiatePixPayment = async (details: OrderDetails) => {
        try {
            const newOrder = await firebaseService.createOrder(details, cartItems);
            setPixOrder(newOrder);
            setIsCheckoutOpen(false);
            setIsPixModalOpen(true);
        } catch (error) {
            console.error("Error initiating PIX payment:", error);
            addToast("Erro ao iniciar pagamento PIX. Tente novamente.", "error");
        }
    };
    
    const handlePaymentSuccess = (paidOrder: Order) => {
        setConfirmedOrder(paidOrder);
        setIsPixModalOpen(false);
        setIsConfirmationOpen(true);
        setCartItems([]);
    };

    // --- Admin Functions ---
    const onSaveProduct = async (product: Product) => {
        await firebaseService.saveProduct(product);
        addToast('Produto salvo com sucesso!', 'success');
    };
    const onDeleteProduct = async (productId: string) => {
        await firebaseService.deleteProduct(productId);
        addToast('Produto excluído!', 'success');
    };
    const onProductStatusChange = async (productId: string, active: boolean) => await firebaseService.updateProductStatus(productId, active);
    const onProductStockStatusChange = async (productId: string, stockStatus: 'available' | 'out_of_stock') => await firebaseService.updateProductStockStatus(productId, stockStatus);
    const onStoreStatusChange = async (isOnline: boolean) => await firebaseService.setStoreStatus(isOnline);
    const onSaveCategory = async (category: Category) => {
        await firebaseService.saveCategory(category);
        addToast('Categoria salva com sucesso!', 'success');
    };
    const onDeleteCategory = async (categoryId: string) => {
        await firebaseService.deleteCategory(categoryId);
        addToast('Categoria excluída!', 'success');
    };
    const onCategoryStatusChange = async (categoryId: string, active: boolean) => await firebaseService.updateCategoryStatus(categoryId, active);
    const onReorderProducts = async (updates: {id: string, orderIndex: number}[]) => await firebaseService.reorderProducts(updates);
    const onReorderCategories = async (updates: {id: string, order: number}[]) => await firebaseService.reorderCategories(updates);
    const onSeedDatabase = async () => await firebaseService.seedDatabase();
    const onSaveSiteSettings = async (settings: SiteSettings, files: {[key: string]: File | null}) => {
        await firebaseService.saveSiteSettings(settings, files);
        addToast('Configurações salvas!', 'success');
    };
    const onUpdateOrderStatus = async (orderId: string, status: OrderStatus, payload?: any) => await firebaseService.updateOrderStatus(orderId, status, payload);
    const onUpdateOrderPaymentStatus = async (orderId: string, paymentStatus: PaymentStatus) => await firebaseService.updateOrderPaymentStatus(orderId, paymentStatus);
    const onUpdateOrderReservationTime = async (orderId: string, reservationTime: string) => await firebaseService.updateOrderReservationTime(orderId, reservationTime);
    const onDeleteOrder = async (orderId: string) => await firebaseService.deleteOrder(orderId);
    const onPermanentDeleteOrder = async (orderId: string) => await firebaseService.permanentlyDeleteOrder(orderId);
    

    if (isLoading || !siteSettings) {
        return <div className="min-h-screen flex items-center justify-center bg-brand-ivory-50"><i className="fas fa-spinner fa-spin text-4xl text-accent"></i></div>;
    }

    if (error) {
        return <div className="min-h-screen flex items-center justify-center bg-red-50 text-red-700 p-4">{error}</div>;
    }
    
    // Simple routing based on hash
    const renderPage = () => {
        const hash = window.location.hash;
        if (hash.startsWith('#/meus-pedidos')) return <MyOrdersPage />;
        if (hash.startsWith('#/acompanhar/')) {
            const orderId = hash.split('/')[2];
            return <TrackOrderPage orderId={orderId} />;
        }

        return (
            <>
                <HeroSection settings={siteSettings} />
                {siteSettings.contentSections?.filter(s => s.isVisible).sort((a,b) => a.order - b.order).map((section, index) => (
                    <DynamicContentSection key={section.id} section={section} order={index} />
                ))}
                <MenuSection
                    categories={categories}
                    products={products}
                    onAddToCart={handleAddToCart}
                    isStoreOnline={isStoreOnline}
                    activeCategoryId={activeCategoryId}
                    setActiveCategoryId={setActiveCategoryId}
                    suggestedNextCategoryId={suggestedNextCategoryId}
                    setSuggestedNextCategoryId={setSuggestedNextCategoryId}
                    cartItemCount={cartItems.length}
                    onCartClick={() => setIsCartOpen(true)}
                    showFinalizeButtonTrigger={showFinalizeButtonTrigger}
                    setShowFinalizeButtonTrigger={setShowFinalizeButtonTrigger}
                />
                <ContactSection />
            </>
        );
    }

    return (
        <div className="bg-brand-ivory-50">
            <Header 
                logoUrl={siteSettings.logoUrl}
                cartItemCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)} 
                onCartClick={() => setIsCartOpen(true)}
                isStoreOnline={isStoreOnline}
                currentUser={currentUser}
                onAuthClick={() => setIsAuthModalOpen(true)}
                isAuthLoading={isAuthLoading}
            />
            <main>
                {renderPage()}
            </main>
            <Footer settings={siteSettings} />
            
            <AdminSection 
                allProducts={products}
                allCategories={categories}
                isStoreOnline={isStoreOnline}
                siteSettings={siteSettings}
                orders={orders}
                onSaveProduct={onSaveProduct}
                onDeleteProduct={onDeleteProduct}
                onProductStatusChange={onProductStatusChange}
                onProductStockStatusChange={onProductStockStatusChange}
                onStoreStatusChange={onStoreStatusChange}
                onSaveCategory={onSaveCategory}
                onDeleteCategory={onDeleteCategory}
                onCategoryStatusChange={onCategoryStatusChange}
                onReorderProducts={onReorderProducts}
                onReorderCategories={onReorder