import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from './services/firebase';
import * as firebaseService from './services/firebaseService';
// FIX: Corrected import for seedDatabase from its actual location to resolve property not found error.
import { seedDatabase } from './services/seed';
import { Product, Category, SiteSettings, CartItem, OrderDetails, Order, OrderStatus, PaymentStatus } from './types';

// Import Components
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { MenuSection } from './components/MenuSection';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { CartSidebar } from './components/CartSidebar';
import { CheckoutModal } from './components/CheckoutModal';
import { AdminSection } from './components/AdminSection';
import { DynamicContentSection } from './components/DynamicContentSection';
import { PixPaymentModal } from './components/PixPaymentModal';
import { PaymentFailureModal } from './components/PaymentFailureModal';

interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error';
}

const defaultSettings: SiteSettings = {
    logoUrl: '/logo-placeholder.png',
    heroSlogan: 'A melhor pizza da região',
    heroTitle: 'Santa Sensação Pizzaria',
    heroSubtitle: 'Qualidade e sabor que você nunca viu. Peça agora e se surpreenda!',
    heroBgUrl: '/hero-bg-placeholder.jpg',
    contentSections: [],
    footerLinks: [],
};

function App() {
    // Data state
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isStoreOnline, setIsStoreOnline] = useState(true);
    const [siteSettings, setSiteSettings] = useState<SiteSettings>(defaultSettings);
    const [orders, setOrders] = useState<Order[]>([]);

    // UI State
    const [loading, setLoading] = useState(true);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isPixModalOpen, setIsPixModalOpen] = useState(false);
    const [isPaymentFailureModalOpen, setIsPaymentFailureModalOpen] = useState(false);
    const [isCreatingPixPayment, setIsCreatingPixPayment] = useState(false);
    const [activeSection, setActiveSection] = useState('Início');
    const [activeCategoryId, setActiveCategoryId] = useState('');
    const [toasts, setToasts] = useState<Toast[]>([]);

    // Cart State
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    
    // Order State
    const [payingOrder, setPayingOrder] = useState<Order | null>(null);
    // FIX: Added missing state variables that were used in handlers and passed as props.
    const [suggestedNextCategoryId, setSuggestedNextCategoryId] = useState<string | null>(null);
    const [showFinalizeButtonTrigger, setShowFinalizeButtonTrigger] = useState(false);
    const [pixData, setPixData] = useState<{ qrCodeBase64: string; qrCode: string; } | null>(null);
    
    // Toast notifications
    const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        const id = Date.now();
        setToasts(prevToasts => [...prevToasts, { id, message, type }]);
        setTimeout(() => {
            setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
        }, 4000);
    }, []);

    // Local Storage for Cart
    useEffect(() => {
        const savedCart = localStorage.getItem('pizzariaCart');
        if (savedCart) {
            setCartItems(JSON.parse(savedCart));
        }
    }, []);
    useEffect(() => {
        localStorage.setItem('pizzariaCart', JSON.stringify(cartItems));
    }, [cartItems]);
    
    // Data Fetching from Firebase
    useEffect(() => {
        if (!db) {
            setLoading(false);
            return;
        };
        const unsubscribes = [
            db.collection('products').orderBy('orderIndex').onSnapshot(snapshot => {
                const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
                setProducts(productsData);
            }),
            db.collection('categories').orderBy('order').onSnapshot(snapshot => {
                const categoriesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
                setCategories(categoriesData);
                if (!activeCategoryId && categoriesData.length > 0) {
                    const firstActive = categoriesData.find(c => c.active);
                    if (firstActive) setActiveCategoryId(firstActive.id);
                }
            }),
            db.doc('store_config/status').onSnapshot(doc => {
                setIsStoreOnline(doc.data()?.isOpen ?? true);
            }),
            db.doc('store_config/site_settings').onSnapshot(doc => {
                if (doc.exists) setSiteSettings(doc.data() as SiteSettings);
            }),
            db.collection('orders').orderBy('createdAt', 'desc').limit(50).onSnapshot(snapshot => {
                const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
                setOrders(ordersData);
            })
        ];

        setLoading(false);
        return () => unsubscribes.forEach(unsub => unsub());
    }, [activeCategoryId]);

    // Active Section Tracking for Header
    useEffect(() => {
        const sections = document.querySelectorAll('section');
        const options = { rootMargin: '-40% 0px -60% 0px' };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    const name = { 'inicio': 'Início', 'cardapio': 'Cardápio', 'sobre': 'Sobre Nós', 'contato': 'Contato' }[id];
                    if (name) setActiveSection(name);
                }
            });
        }, options);
        sections.forEach(section => observer.observe(section));
        return () => sections.forEach(section => observer.unobserve(section));
    }, [loading]); 

    // Cart Logic Handlers
    const handleAddToCart = (product: Product, size: string, price: number) => {
        const itemId = `${product.id}-${size}`;
        setCartItems(prevItems => {
            const existingItem = prevItems.find(item => item.id === itemId);
            if (existingItem) {
                return prevItems.map(item => item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item);
            } else {
                return [...prevItems, { id: itemId, productId: product.id, name: product.name, size, price, quantity: 1, imageUrl: product.imageUrl }];
            }
        });

        const sortedActiveCategories = categories.filter(c => c.active).sort((a, b) => a.order - b.order);
        const currentIndex = sortedActiveCategories.findIndex(c => c.id === product.categoryId);
        
        if (currentIndex !== -1 && currentIndex < sortedActiveCategories.length - 1) {
            setSuggestedNextCategoryId(sortedActiveCategories[currentIndex + 1].id);
        } else {
            setSuggestedNextCategoryId(null);
            setShowFinalizeButtonTrigger(true);
        }
    };

    const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
        if (newQuantity <= 0) {
            setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
        } else {
            setCartItems(prevItems => prevItems.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item));
        }
    };

    const cartItemCount = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems]);
    
    // Checkout and Payment Flow Handlers
    const handleCheckout = () => {
        setIsCartOpen(false);
        setIsCheckoutOpen(true);
    };

    const handleConfirmCheckout = async (details: OrderDetails) => {
        const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        try {
            await firebaseService.createOrder(details, cartItems, total, details.paymentMethod === 'pix' ? 'payLater' : undefined);
            addToast('Pedido enviado com sucesso!', 'success');
            setIsCheckoutOpen(false);
            setCartItems([]);
        } catch (error) {
            console.error(error);
            addToast('Falha ao enviar o pedido.', 'error');
        }
    };
    
    const handleInitiatePixPayment = async (details: OrderDetails, pixOption: 'payNow' | 'payLater') => {
        if (pixOption === 'payLater') {
            handleConfirmCheckout(details);
            return;
        }

        setIsCreatingPixPayment(true);
        setIsCheckoutOpen(false);
        const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        
        try {
            const { orderId, orderNumber, pixData: receivedPixData } = await firebaseService.createOrder(details, cartItems, total, pixOption);
            
            // Re-fetch the order from Firestore to have the complete object with timestamp
            const orderDoc = await db?.collection('orders').doc(orderId).get();
            if (!orderDoc?.exists) throw new Error("Failed to retrieve created order.");
            
            setPayingOrder({ id: orderId, ...(orderDoc.data() as Omit<Order, 'id'>) });
            
            if (receivedPixData) {
                setPixData(receivedPixData);
                setIsPixModalOpen(true);
            }
        } catch (error) {
            console.error("Error initiating PIX payment:", error);
            addToast('Falha ao gerar PIX. Tente novamente.', 'error');
            setIsPaymentFailureModalOpen(true);
        } finally {
            setIsCreatingPixPayment(false);
        }
    };
    
    const handlePixPaymentSuccess = useCallback(async (paidOrder: Order) => {
        setIsPixModalOpen(false);
        setCartItems([]);
        addToast("Pagamento confirmado! Seu pedido foi enviado.", 'success');
        // The WhatsApp message is now triggered by the webhook updating the status.
        // The frontend's job is done.
    }, [addToast]);
    
    // FIX: Added a useEffect to listen for payment confirmation, replacing the logic that was incorrectly expected in PixPaymentModal.
    useEffect(() => {
        if (!db || !payingOrder?.id || !isPixModalOpen) return;

        const unsubscribe = db.collection('orders').doc(payingOrder.id).onSnapshot(doc => {
            if (doc.exists) {
                const updatedOrder = { id: doc.id, ...doc.data() } as Order;
                if (updatedOrder.paymentStatus === 'paid_online') {
                    handlePixPaymentSuccess(updatedOrder);
                    unsubscribe();
                }
            }
        });

        return () => unsubscribe();
    }, [payingOrder, isPixModalOpen, handlePixPaymentSuccess]);

    const handleClosePixModal = () => {
        setIsPixModalOpen(false);
        if (payingOrder?.paymentStatus === 'pending') {
            setIsPaymentFailureModalOpen(true);
        }
    };

    // Admin Handlers (memoized for performance)
    const memoizedAdminHandlers = useMemo(() => ({
        onSaveProduct: async (product: Product) => {
            const { id, ...dataToSave } = product;
            if (id) await firebaseService.updateProduct(id, dataToSave);
            else await firebaseService.addProduct(dataToSave);
            addToast(`Produto ${id ? 'atualizado' : 'adicionado'}!`, 'success');
        },
        onDeleteProduct: async (id: string) => { await firebaseService.deleteProduct(id); addToast('Produto deletado!', 'success'); },
        onProductStatusChange: firebaseService.updateProductStatus,
        onProductStockStatusChange: firebaseService.updateProductStockStatus,
        onStoreStatusChange: firebaseService.updateStoreStatus,
        onSaveCategory: async (category: Category) => {
            const { id, ...dataToSave } = category;
            if (id) await firebaseService.updateCategory(id, dataToSave);
            else await firebaseService.addCategory({ ...dataToSave, order: categories.length });
            addToast(`Categoria ${id ? 'atualizada' : 'adicionada'}!`, 'success');
        },
        onDeleteCategory: async (id: string) => { 
            try {
                await firebaseService.deleteCategory(id, products);
                addToast('Categoria deletada!', 'success');
            } catch (e: any) {
                addToast(e.message, 'error');
            }
        },
        onCategoryStatusChange: firebaseService.updateCategoryStatus,
        onReorderProducts: firebaseService.updateProductsOrder,
        onReorderCategories: firebaseService.updateCategoriesOrder,
        // FIX: Changed firebaseService.seedDatabase to the correctly imported seedDatabase function.
        onSeedDatabase: seedDatabase,
        onSaveSiteSettings,
        onUpdateOrderStatus: firebaseService.updateOrderStatus,
        onUpdateOrderPaymentStatus: firebaseService.updateOrderPaymentStatus,
        onUpdateOrderReservationTime: firebaseService.updateOrderReservationTime,
        onDeleteOrder: (id: string) => firebaseService.updateOrderStatus(id, 'deleted'),
        onPermanentDeleteOrder: firebaseService.deleteOrder,
        onRefundOrder: async (orderId: string) => {
            if (!window.confirm("Estornar o pagamento deste pedido? Esta ação não pode ser desfeita.")) return;
            try {
                await firebaseService.refundPayment(orderId);
                addToast("Pedido estornado com sucesso!", 'success');
            } catch (error: any) {
                addToast(`Falha ao estornar: ${error.message || 'Erro desconhecido.'}`, 'error');
            }
        },
    }), [products, categories.length, addToast]);

    async function onSaveSiteSettings(settings: SiteSettings, files: { [key: string]: File | null }) {
        let updatedSettings = { ...settings };
        for (const key in files) {
            const file = files[key];
            if (file) {
                try {
                    const downloadURL = await firebaseService.uploadSiteAsset(file, key);
                    if (key === 'logo') updatedSettings.logoUrl = downloadURL;
                    else if (key === 'heroBg') updatedSettings.heroBgUrl = downloadURL;
                    else {
                        const sectionIndex = updatedSettings.contentSections.findIndex(s => s.id === key);
                        if (sectionIndex > -1) updatedSettings.contentSections[sectionIndex].imageUrl = downloadURL;
                    }
                } catch (error) {
                    addToast(`Falha ao enviar a imagem para ${key}.`, 'error');
                    return;
                }
            }
        }
        await firebaseService.updateSiteSettings(updatedSettings);
        addToast('Configurações salvas!', 'success');
    }

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center"><i className="fas fa-spinner fa-spin text-4xl text-accent"></i></div>;
    }

    return (
        <>
            {isCreatingPixPayment && (
                 <div className="fixed inset-0 bg-black/70 z-[100] flex flex-col items-center justify-center text-white">
                    <i className="fas fa-spinner fa-spin text-5xl"></i>
                    <p className="mt-4 text-xl font-semibold">Conectando ao sistema de pagamento...</p>
                    <p className="text-sm">Por favor, aguarde.</p>
                </div>
            )}
            <Header cartItemCount={cartItemCount} onCartClick={() => setIsCartOpen(true)} activeSection={activeSection} settings={siteSettings} />
            <main>
                <HeroSection settings={siteSettings} />
                <MenuSection
                    categories={categories}
                    products={products}
                    onAddToCart={handleAddToCart}
                    isStoreOnline={isStoreOnline}
                    activeCategoryId={activeCategoryId}
                    setActiveCategoryId={setActiveCategoryId}
                    suggestedNextCategoryId={suggestedNextCategoryId}
                    setSuggestedNextCategoryId={setSuggestedNextCategoryId}
                    cartItemCount={cartItemCount}
                    onCartClick={handleCheckout}
                    showFinalizeButtonTrigger={showFinalizeButtonTrigger}
                    setShowFinalizeButtonTrigger={setShowFinalizeButtonTrigger}
                />
                
                {siteSettings.contentSections?.filter(s => s.isVisible).sort((a,b) => a.order - b.order).map((section, index) => 
                     <DynamicContentSection key={section.id} section={section} order={index} />
                )}

                <ContactSection />
                <AdminSection 
                    allProducts={products}
                    allCategories={categories}
                    isStoreOnline={isStoreOnline}
                    siteSettings={siteSettings}
                    orders={orders}
                    {...memoizedAdminHandlers}
                />
            </main>
            <Footer settings={siteSettings}/>

            <CartSidebar 
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                cartItems={cartItems}
                onUpdateQuantity={handleUpdateQuantity}
                onCheckout={handleCheckout}
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
                />
            )}
            
            {/* FIX: Corrected props for PixPaymentModal to match its definition. Removed 'order' and 'onPaymentSuccess' and added 'isOpen', 'pixData', and 'orderNumber'. */}
            {isPixModalOpen && payingOrder && pixData && (
                <PixPaymentModal
                    isOpen={isPixModalOpen}
                    onClose={handleClosePixModal}
                    pixData={pixData}
                    orderNumber={payingOrder.orderNumber}
                />
            )}
            
            <PaymentFailureModal
                isOpen={isPaymentFailureModalOpen}
                onClose={() => { setIsPaymentFailureModalOpen(false); setPayingOrder(null); }}
                onTryAgain={() => {
                    setIsPaymentFailureModalOpen(false);
                    const details = payingOrder?.customer as OrderDetails;
                    if(details) handleInitiatePixPayment(details, 'payNow');
                }}
                onPayLater={() => {
                    setIsPaymentFailureModalOpen(false);
                    const details = payingOrder?.customer as OrderDetails;
                    if (details) handleConfirmCheckout(details);
                }}
            />
             {/* Toast Container */}
            <div aria-live="assertive" className="fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start z-[100]">
                <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
                    {toasts.map((toast) => (
                        <div key={toast.id} className="max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden animate-fade-in-up">
                            <div className="p-4">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0">
                                        {toast.type === 'success' ? (<i className="fas fa-check-circle h-6 w-6 text-green-500"></i>) : (<i className="fas fa-exclamation-circle h-6 w-6 text-red-500"></i>)}
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
        </>
    );
}

export default App;