import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AdminSection } from './components/AdminSection';
import { CartSidebar } from './components/CartSidebar';
import { CheckoutModal } from './components/CheckoutModal';
import { ContactSection } from './components/ContactSection';
import { DynamicContentSection } from './components/DynamicContentSection';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { MenuSection } from './components/MenuSection';
import { PixPaymentModal } from './components/PixPaymentModal';
import { PaymentFailureModal } from './components/PaymentFailureModal';
import { SupportModal } from './components/SupportModal';
import * as firebaseService from './services/firebaseService';
import { Product, Category, SiteSettings, StoreStatus, CartItem, Order } from './types';

// Default settings to avoid rendering errors while loading
const defaultSettings: SiteSettings = {
    logoUrl: '',
    heroSlogan: '',
    heroTitle: '',
    heroSubtitle: '',
    heroBgUrl: '',
    contentSections: [],
    footerLinks: [],
};

function App() {
    // --- Data State ---
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
    const [storeStatus, setStoreStatus] = useState<StoreStatus>({ isOpen: true });
    const [isLoading, setIsLoading] = useState(true);

    // --- UI State ---
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isPixModalOpen, setIsPixModalOpen] = useState(false);
    const [isPaymentFailureOpen, setIsPaymentFailureOpen] = useState(false);
    const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
    const [isAdminOpen, setIsAdminOpen] = useState(false);
    const [activeSection, setActiveSection] = useState('Início');
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [successToastMessage, setSuccessToastMessage] = useState('');

    // --- Cart & Order State ---
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [orderForPixPayment, setOrderForPixPayment] = useState<Order | null>(null);
    const [lastCheckoutDetails, setLastCheckoutDetails] = useState<any>(null);

    // --- Menu Navigation State ---
    const [activeCategoryId, setActiveCategoryId] = useState('');
    const [suggestedNextCategoryId, setSuggestedNextCategoryId] = useState<string | null>(null);
    const [showFinalizeButtonTrigger, setShowFinalizeButtonTrigger] = useState(false);
    
    // Check for admin route on load and on hash change
    useEffect(() => {
        const checkAdminHash = () => {
            if (window.location.hash === '#admin') {
                setIsAdminOpen(true);
            }
        };

        checkAdminHash(); // Check on initial load
        window.addEventListener('hashchange', checkAdminHash); // Listen for changes

        return () => {
            window.removeEventListener('hashchange', checkAdminHash); // Cleanup
        };
    }, []);

    // Initial data fetching
    useEffect(() => {
        const fetchData = async () => {
            try {
                const settingsData = await firebaseService.getSiteSettings();
                if (settingsData) {
                    setSettings(settingsData);
                }
                const { products, categories, storeStatus } = await firebaseService.getProductsAndCategories();
                setProducts(products);
                
                const activeSortedCategories = categories.filter(c => c.active).sort((a,b) => a.order - b.order);
                setCategories(activeSortedCategories);
                
                setStoreStatus(storeStatus);
                if (activeSortedCategories.length > 0) {
                    setActiveCategoryId(activeSortedCategories[0].id);
                }
            } catch (error) {
                console.error("Failed to fetch initial data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
        
        // Load cart from local storage
        try {
            const storedCart = localStorage.getItem('cartItems');
            if (storedCart) {
                setCartItems(JSON.parse(storedCart));
            }
        } catch (error) {
            console.error("Failed to load cart from localStorage", error);
        }
    }, []);

    // Persist cart to local storage
    useEffect(() => {
        try {
            localStorage.setItem('cartItems', JSON.stringify(cartItems));
        } catch (error) {
            console.error("Failed to save cart to localStorage", error);
        }
    }, [cartItems]);
    
    // Scrollspy for active header section
    useEffect(() => {
        const sections = document.querySelectorAll('section[id]');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    let name = 'Início';
                    if (id === 'cardapio') name = 'Cardápio';
                    else if (id.startsWith('content-') || id === 'sobre') name = 'Sobre Nós';
                    else if (id === 'contato') name = 'Contato';
                    setActiveSection(name);
                }
            });
        }, { rootMargin: '-50% 0px -50% 0px' });
        
        sections.forEach(section => observer.observe(section));
        return () => sections.forEach(section => observer.unobserve(section));
    }, [isLoading]); // Rerun when sections are rendered

    const showToast = (message: string) => {
        setSuccessToastMessage(message);
        setShowSuccessToast(true);
        setTimeout(() => {
            setShowSuccessToast(false);
        }, 3000);
    };

    const handleAddToCart = useCallback((product: Product, size: string, price: number) => {
        setCartItems(prevItems => {
            const cartItemId = `${product.id}-${size}`;
            const existingItem = prevItems.find(item => item.id === cartItemId);
            if (existingItem) {
                return prevItems.map(item =>
                    item.id === cartItemId ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            const newItem: CartItem = {
                id: cartItemId,
                productId: product.id,
                name: product.name,
                size,
                price,
                quantity: 1,
                imageUrl: product.imageUrl,
            };
            return [...prevItems, newItem];
        });
        showToast(`${product.name} adicionado!`);

        // Suggestion Logic
        const currentCategoryIndex = categories.findIndex(c => c.id === activeCategoryId);
        if (currentCategoryIndex > -1 && currentCategoryIndex < categories.length - 1) {
            setSuggestedNextCategoryId(categories[currentCategoryIndex + 1].id);
        } else {
            // If it's the last category, show the finalize button trigger
            setShowFinalizeButtonTrigger(true);
        }

    }, [activeCategoryId, categories]);

    const handleUpdateCartQuantity = (itemId: string, newQuantity: number) => {
        if (newQuantity <= 0) {
            setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
        } else {
            setCartItems(prevItems =>
                prevItems.map(item =>
                    item.id === itemId ? { ...item, quantity: newQuantity } : item
                )
            );
        }
    };

    const clearCart = () => {
        setCartItems([]);
        localStorage.removeItem('cartItems');
    };

    const handleConfirmOrder = async (details: any, isPixNow: boolean) => {
        const orderData: Omit<Order, 'id' | 'createdAt'> = {
            customer: {
                name: details.name,
                phone: details.phone,
                orderType: details.orderType,
                address: details.address,
                reservationTime: details.reservationTime,
            },
            items: cartItems,
            total: cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
            paymentMethod: details.paymentMethod,
            status: isPixNow ? 'awaiting-payment' : 'pending',
            paymentStatus: 'pending',
            notes: details.notes,
            changeNeeded: details.changeNeeded,
            changeAmount: details.changeAmount,
        };
        
        try {
            const docRef = await firebaseService.addOrder(orderData);
            const newOrder: Order = { ...orderData, id: docRef.id, createdAt: new Date() }; // Approximate createdAt for local state
            return newOrder;
        } catch (error) {
            console.error("Error adding order to Firestore:", error);
            alert("Ocorreu um erro ao enviar seu pedido. Tente novamente.");
            return null;
        }
    };

    const handleInitiatePixPayment = async (details: any) => {
        setIsCheckoutOpen(false);
        setLastCheckoutDetails(details); // Save details for retry logic
        const order = await handleConfirmOrder(details, true);
        if (order) {
            setOrderForPixPayment(order);
            setIsPixModalOpen(true);
        }
    };
    
    const handleConfirmCheckout = async (details: any) => {
        await handleConfirmOrder(details, false);
        setIsCheckoutOpen(false);
        clearCart();
        showToast("Pedido enviado com sucesso!");
    };
    
    const handlePaymentSuccess = (paidOrder: Order) => {
        setIsPixModalOpen(false);
        clearCart();
        showToast("Pagamento aprovado! Seu pedido está na cozinha!");
    };

    const handlePaymentFailure = () => {
        setIsPixModalOpen(false);
        setIsPaymentFailureOpen(true);
    };

    const handleTryAgainPayment = () => {
        setIsPaymentFailureOpen(false);
        if (lastCheckoutDetails) {
            handleInitiatePixPayment(lastCheckoutDetails);
        }
    };

    const handlePayLater = async () => {
        setIsPaymentFailureOpen(false);
        if(orderForPixPayment) {
            // Update order status to a regular pending order
            await firebaseService.updateOrderStatus(orderForPixPayment.id, 'pending');
        }
        clearCart();
        showToast("Seu pedido foi recebido! Pague na entrega.");
    };

    const cartItemCount = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems]);
    
    const visibleContentSections = useMemo(() => 
        settings.contentSections?.filter(s => s.isVisible).sort((a, b) => a.order - b.order) ?? [], 
        [settings.contentSections]
    );

    if (isLoading) {
        return <div className="fixed inset-0 flex items-center justify-center bg-gray-100 text-lg font-semibold">Carregando...</div>;
    }

    if (isAdminOpen) {
        return <AdminSection onExit={() => {
            window.location.hash = ''; // Use hash to avoid reload
            setIsAdminOpen(false);
        }} />;
    }

    return (
        <>
            <Header
                cartItemCount={cartItemCount}
                onCartClick={() => setIsCartOpen(true)}
                activeSection={activeSection}
                settings={settings}
            />
            <main>
                <HeroSection settings={settings} />
                <MenuSection
                    categories={categories}
                    products={products}
                    onAddToCart={handleAddToCart}
                    isStoreOnline={storeStatus.isOpen}
                    activeCategoryId={activeCategoryId}
                    setActiveCategoryId={setActiveCategoryId}
                    suggestedNextCategoryId={suggestedNextCategoryId}
                    setSuggestedNextCategoryId={setSuggestedNextCategoryId}
                    cartItemCount={cartItemCount}
                    onCartClick={() => setIsCartOpen(true)}
                    showFinalizeButtonTrigger={showFinalizeButtonTrigger}
                    setShowFinalizeButtonTrigger={setShowFinalizeButtonTrigger}
                />
                {visibleContentSections.map((section, index) => (
                    <DynamicContentSection key={section.id} section={section} order={index} />
                ))}
                <ContactSection />
            </main>
            <Footer settings={settings} />
            
             {/* --- Floating Cart Button --- */}
            {cartItemCount > 0 && (
                <div className="fixed bottom-5 right-5 z-40 animate-fade-in-up">
                    <button 
                        onClick={() => setIsCartOpen(true)}
                        className="bg-accent text-white font-bold py-3 px-5 rounded-full shadow-lg flex items-center gap-3 transform transition-transform hover:scale-105">
                        <i className="fas fa-shopping-bag text-xl"></i>
                        <div className="text-left">
                            <span className="text-sm block leading-tight">{cartItemCount} {cartItemCount > 1 ? 'itens' : 'item'}</span>
                            <span className="font-semibold text-lg block leading-tight">Ver Pedido</span>
                        </div>
                    </button>
                </div>
            )}

            {/* --- Modals & Sidebars --- */}
            <CartSidebar
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                cartItems={cartItems}
                onUpdateQuantity={handleUpdateCartQuantity}
                onCheckout={() => {
                    setIsCartOpen(false);
                    setIsCheckoutOpen(true);
                }}
                isStoreOnline={storeStatus.isOpen}
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
                />
            )}
             {isPixModalOpen && orderForPixPayment && (
                <PixPaymentModal
                    order={orderForPixPayment}
                    onClose={handlePaymentFailure} // Closing without paying is a failure/cancellation
                    onPaymentSuccess={handlePaymentSuccess}
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
            {isSupportModalOpen && (
                <SupportModal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} />
            )}

            {/* --- Success Toast --- */}
            <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 bg-green-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all duration-300 ${showSuccessToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5 pointer-events-none'}`}>
                 <i className="fas fa-check-circle mr-2"></i>
                 {successToastMessage}
            </div>
        </>
    );
}

export default App;