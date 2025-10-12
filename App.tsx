import React, { useState, useEffect, useMemo } from 'react';
import { db } from './services/firebase';
import * as firebaseService from './services/firebaseService';
import { Product, Category, CartItem, SiteSettings, Order, OrderDetails, OrderStatus, PaymentStatus } from './types';

// Components
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { MenuSection } from './components/MenuSection';
import { AboutSection } from './components/AboutSection';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { CartSidebar } from './components/CartSidebar';
import { CheckoutModal } from './components/CheckoutModal';
import { AdminSection } from './components/AdminSection';
import { PixPaymentModal } from './components/PixPaymentModal';
import { PaymentFailureModal } from './components/PaymentFailureModal';
import { DynamicContentSection } from './components/DynamicContentSection';

const DEFAULT_SITE_SETTINGS: SiteSettings = {
  logoUrl: 'https://via.placeholder.com/150x50.png?text=Logo',
  heroSlogan: 'A melhor pizza da cidade',
  heroTitle: 'Santa Sensação Pizzaria',
  heroSubtitle: 'Ingredientes frescos, massa artesanal e sabor inesquecível. Peça agora e experimente a verdadeira pizza!',
  heroBgUrl: 'https://via.placeholder.com/1920x1080.png?text=Hero+BG',
  contentSections: [],
  footerLinks: [],
};

const App: React.FC = () => {
    // Data state
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [isStoreOnline, setIsStoreOnline] = useState(true);
    const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // UI state
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isPixModalOpen, setIsPixModalOpen] = useState(false);
    const [currentPixOrder, setCurrentPixOrder] = useState<Order | null>(null);
    const [isPaymentFailureModalOpen, setIsPaymentFailureModalOpen] = useState(false);
    const [lastOrderAttempt, setLastOrderAttempt] = useState<{ details: OrderDetails; cart: CartItem[]; total: number; } | null>(null);
    const [activeSection, setActiveSection] = useState('Início');
    const [activeCategoryId, setActiveCategoryId] = useState('');

    // Cart state
    const [cartItems, setCartItems] = useState<CartItem[]>(() => {
        try {
            const savedCart = localStorage.getItem('cart');
            return savedCart ? JSON.parse(savedCart) : [];
        } catch (e) {
            console.error("Failed to parse cart from localStorage", e);
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(cartItems));
    }, [cartItems]);

    // Data Fetching Effects
    useEffect(() => {
        if (!db) {
            setError("Falha na conexão com o banco de dados.");
            setLoading(false);
            return;
        }

        const unsubscribes: (() => void)[] = [];
        setLoading(true);

        try {
            unsubscribes.push(db.collection('products').orderBy('orderIndex').onSnapshot(snapshot => {
                setAllProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
            }));
            unsubscribes.push(db.collection('categories').orderBy('order').onSnapshot(snapshot => {
                const categoriesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
                setAllCategories(categoriesData);
                if (categoriesData.length > 0 && !activeCategoryId) {
                    const firstActiveCategory = categoriesData.find(c => c.active);
                    if (firstActiveCategory) {
                        setActiveCategoryId(firstActiveCategory.id);
                    }
                }
            }));
            unsubscribes.push(db.doc('store_config/status').onSnapshot(doc => {
                setIsStoreOnline(doc.data()?.isOpen ?? false);
            }));
            unsubscribes.push(db.doc('store_config/site_settings').onSnapshot(doc => {
                if (doc.exists) {
                    setSiteSettings(doc.data() as SiteSettings);
                }
            }));
             unsubscribes.push(db.collection('orders').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
                setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
            }));
        } catch (err) {
            console.error("Erro ao buscar dados do Firestore:", err);
            setError("Não foi possível carregar os dados. Tente recarregar a página.");
        } finally {
            setLoading(false);
        }

        return () => unsubscribes.forEach(unsub => unsub());
    }, [activeCategoryId]);

    // Scroll spy effect
    const mainSections = useMemo(() => ['inicio', 'cardapio', ...siteSettings.contentSections.filter(s=>s.isVisible).sort((a,b) => a.order - b.order).map(s => `content-${s.id}`), 'contato'], [siteSettings.contentSections]);
    const sectionNames: { [key: string]: string } = useMemo(() => {
        const dynamicSections = siteSettings.contentSections.reduce((acc, s) => {
            // A 'About' section is handled differently in the render logic but still needs a name.
            const sectionKey = s.order === 0 ? 'sobre' : `content-${s.id}`;
            acc[sectionKey] = s.title;
            return acc;
        }, {} as {[key: string]: string});

        return {
            inicio: 'Início', 
            cardapio: 'Cardápio',
            sobre: 'Sobre', // Default name for the first content section.
            contato: 'Contato',
            ...dynamicSections
        };
    }, [siteSettings.contentSections]);
    
    // An effect to handle the about section's ID properly for the scroll spy
    const aboutSectionId = useMemo(() => siteSettings.contentSections?.filter(s => s.isVisible).sort((a,b) => a.order - b.order)[0]?.id, [siteSettings.contentSections]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        let sectionId = entry.target.id;
                        // Special handling for the about section which might have a different ID in the DOM
                        if (sectionId === 'sobre' && aboutSectionId) {
                           setActiveSection(sectionNames[sectionId] || siteSettings.contentSections.find(s => s.id === aboutSectionId)?.title || 'Sobre');
                        } else {
                           setActiveSection(sectionNames[sectionId] || 'Início');
                        }
                    }
                });
            },
            { rootMargin: '-30% 0px -70% 0px' }
        );

        const sectionsToObserve = ['inicio', 'cardapio', 'sobre', 'contato', ...siteSettings.contentSections.filter(s => s.isVisible).map(s => `content-${s.id}`)];
        
        sectionsToObserve.forEach(id => {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        });

        return () => {
             sectionsToObserve.forEach(id => {
                const el = document.getElementById(id);
                if (el) observer.unobserve(el);
            });
        };
    }, [mainSections, sectionNames, siteSettings.contentSections, aboutSectionId]);


    // Cart Handlers
    const handleAddToCart = (product: Product, size: string, price: number) => {
        const existingItem = cartItems.find(item => item.productId === product.id && item.size === size);
        if (existingItem) {
            setCartItems(cartItems.map(item => item.id === existingItem.id ? { ...item, quantity: item.quantity + 1 } : item));
        } else {
            const newItem: CartItem = {
                id: `${product.id}-${size}-${Date.now()}`,
                productId: product.id,
                name: product.name,
                size,
                price,
                quantity: 1,
                imageUrl: product.imageUrl
            };
            setCartItems([...cartItems, newItem]);
        }
        setIsCartOpen(true);
    };

    const handleUpdateCartQuantity = (cartItemId: string, newQuantity: number) => {
        setCartItems(cartItems.map(item => item.id === cartItemId ? { ...item, quantity: newQuantity } : item).filter(item => item.quantity > 0));
    };

    const handleRemoveFromCart = (cartItemId: string) => {
        setCartItems(cartItems.filter(item => item.id !== cartItemId));
    };

    // Checkout Handlers
    const handleCheckout = () => {
        setIsCartOpen(false);
        setIsCheckoutOpen(true);
    };

    const handleConfirmCheckout = async (details: OrderDetails) => {
        try {
            await firebaseService.createOrder(details, cartItems, cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0));
            alert(`Obrigado, ${details.name}! Seu pedido foi enviado e já está sendo preparado.`);
            setCartItems([]);
            setIsCheckoutOpen(false);
        } catch (error) {
            console.error("Erro ao finalizar pedido:", error);
            alert("Desculpe, ocorreu um erro ao enviar seu pedido. Por favor, tente novamente.");
        }
    };
    
    const handleInitiatePixPayment = async (details: OrderDetails, pixOption: 'payNow' | 'payLater') => {
        const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        setLastOrderAttempt({ details, cart: cartItems, total });

        if (pixOption === 'payLater') {
            await handleConfirmCheckout(details);
            return;
        }

        try {
            const { orderId, orderNumber, pixData } = await firebaseService.createOrder(details, cartItems, total, 'payNow');
            
            // Construct a temporary order object for the PIX modal
            const newOrder: Order = { 
                id: orderId, 
                orderNumber: orderNumber,
                customer: { name: details.name, phone: details.phone, orderType: details.orderType, address: details.address, cpf: details.cpf },
                items: cartItems,
                total: total,
                paymentMethod: 'pix',
                status: 'awaiting-payment',
                paymentStatus: 'pending',
                createdAt: new Date(),
                mercadoPagoDetails: { paymentId: '', qrCode: pixData.copyPaste, qrCodeBase64: pixData.qrCodeBase64 },
            };

            setCurrentPixOrder(newOrder);
            setIsCheckoutOpen(false);
            setIsPixModalOpen(true);
        } catch (error) {
            console.error("Erro ao iniciar pagamento PIX:", error);
            setIsCheckoutOpen(false);
            setIsPaymentFailureModalOpen(true);
        }
    };

    const handlePaymentSuccess = (paidOrder: Order) => {
        alert(`Pagamento aprovado! Seu pedido #${paidOrder.orderNumber} já está sendo preparado.`);
        setCartItems([]);
        setIsPixModalOpen(false);
        setCurrentPixOrder(null);
        setLastOrderAttempt(null);
    };
    
    const handlePaymentFailureTryAgain = () => {
        setIsPaymentFailureModalOpen(false);
        if (lastOrderAttempt) {
            handleInitiatePixPayment(lastOrderAttempt.details, 'payNow');
        }
    };
    
    const handlePaymentFailurePayLater = async () => {
        setIsPaymentFailureModalOpen(false);
        if (lastOrderAttempt) {
            alert("Ok, seu pedido será processado para pagamento na entrega/retirada.");
            await handleConfirmCheckout(lastOrderAttempt.details);
        }
    };

    // Admin Handlers
    const handleSaveProduct = async (product: Product) => {
        const { id, ...productData } = product;
        if (id) {
            await firebaseService.updateProduct(id, productData);
        } else {
            await firebaseService.addProduct(productData);
        }
    };

    const handleDeleteProduct = async (productId: string) => {
        await firebaseService.deleteProduct(productId);
    };

    const handleProductStatusChange = async (productId: string, active: boolean) => {
        await firebaseService.updateProductStatus(productId, active);
    };
    
    const handleProductStockStatusChange = async (productId: string, stockStatus: 'available' | 'out_of_stock') => {
        await firebaseService.updateProductStockStatus(productId, stockStatus);
    };

    const handleReorderProducts = async (productsToUpdate: { id: string, orderIndex: number }[]) => {
        await firebaseService.updateProductsOrder(productsToUpdate);
    };

    const handleSaveCategory = async (category: Category) => {
        const { id, ...categoryData } = category;
        if (id) {
            await firebaseService.updateCategory(id, categoryData);
        } else {
            await firebaseService.addCategory(categoryData);
        }
    };

    const handleDeleteCategory = async (categoryId: string) => {
        try {
            await firebaseService.deleteCategory(categoryId, allProducts);
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleCategoryStatusChange = async (categoryId: string, active: boolean) => {
        await firebaseService.updateCategoryStatus(categoryId, active);
    };

    const handleReorderCategories = async (categoriesToUpdate: { id: string, order: number }[]) => {
        await firebaseService.updateCategoriesOrder(categoriesToUpdate);
    };

    const handleStoreStatusChange = async (isOnline: boolean) => {
        await firebaseService.updateStoreStatus(isOnline);
    };

    const handleSeedDatabase = async () => {
        const { seedDatabase } = await import('./services/seed');
        await seedDatabase();
    };
    
    const handleSaveSiteSettings = async (settings: SiteSettings, files: { [key: string]: File | null }) => {
        const updatedSettings = { ...settings };
        for (const key in files) {
            const file = files[key];
            if (file) {
                const downloadURL = await firebaseService.uploadSiteAsset(file, key);
                if (key === 'logo') updatedSettings.logoUrl = downloadURL;
                if (key === 'heroBg') updatedSettings.heroBgUrl = downloadURL;
                // For dynamic sections
                const sectionIndex = updatedSettings.contentSections.findIndex(s => s.id === key);
                if (sectionIndex > -1) {
                    updatedSettings.contentSections[sectionIndex].imageUrl = downloadURL;
                }
            }
        }
        await firebaseService.updateSiteSettings(updatedSettings);
        alert('Configurações salvas!');
    };

    const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus, payload?: Partial<Pick<Order, 'pickupTimeEstimate'>>) => {
        await firebaseService.updateOrderStatus(orderId, status, payload);
    };
    
    const handleUpdateOrderPaymentStatus = async (orderId: string, paymentStatus: PaymentStatus) => {
        await firebaseService.updateOrderPaymentStatus(orderId, paymentStatus);
    };
    
    const handleUpdateOrderReservationTime = async (orderId: string, reservationTime: string) => {
        await firebaseService.updateOrderReservationTime(orderId, reservationTime);
    };

    const handleDeleteOrder = async (orderId: string) => {
        await firebaseService.updateOrderStatus(orderId, 'deleted');
    };
    
    const handlePermanentDeleteOrder = async (orderId: string) => {
        if (window.confirm('Tem certeza que deseja apagar este pedido PERMANENTEMENTE? Esta ação não pode ser desfeita.')) {
            await firebaseService.deleteOrder(orderId);
        }
    };

    const handleRefundOrder = async (orderId: string) => {
         if (window.confirm('Tem certeza que deseja estornar o pagamento deste pedido? Esta ação não pode ser desfeita e irá cancelar o pedido.')) {
            try {
                await firebaseService.refundPayment(orderId);
                alert('Estorno processado com sucesso!');
            } catch (error: any) {
                console.error("Erro ao estornar pagamento:", error);
                alert(`Falha no estorno: ${error.message}`);
            }
        }
    };

    const activeProducts = useMemo(() => allProducts.filter(p => p.active), [allProducts]);
    const sortedActiveCategories = useMemo(() => allCategories.filter(c => c.active).sort((a,b) => a.order - b.order), [allCategories]);
    const visibleContentSections = useMemo(() => siteSettings.contentSections?.filter(s => s.isVisible).sort((a, b) => a.order - b.order) ?? [], [siteSettings]);

    if (loading && !allProducts.length) {
        return <div className="min-h-screen flex items-center justify-center bg-brand-ivory-50"><i className="fas fa-spinner fa-spin text-4xl text-accent"></i></div>;
    }

    if (error) {
        return <div className="min-h-screen flex items-center justify-center bg-red-50 p-4"><p className="text-red-600 font-semibold">{error}</p></div>;
    }

    return (
        <div className="bg-white">
            <Header cartItemCount={cartItems.length} onCartClick={() => setIsCartOpen(true)} activeSection={activeSection} settings={siteSettings} />
            <main>
                <HeroSection settings={siteSettings} />
                <MenuSection 
                    categories={sortedActiveCategories} 
                    products={activeProducts} 
                    onAddToCart={handleAddToCart} 
                    isStoreOnline={isStoreOnline}
                    activeCategoryId={activeCategoryId}
                    setActiveCategoryId={setActiveCategoryId}
                    cartItemCount={cartItems.length}
                    onCartClick={() => setIsCartOpen(true)}
                />
                
                {/* The first visible section is rendered as AboutSection, others are dynamic */}
                {visibleContentSections.length > 0 && <AboutSection settings={siteSettings} />}
                {visibleContentSections.slice(1).map((section, index) => (
                    <DynamicContentSection key={section.id} section={section} order={index + 2} />
                ))}

                <ContactSection />
            </main>
            <Footer settings={siteSettings} />

            <CartSidebar 
                isOpen={isCartOpen} 
                onClose={() => setIsCartOpen(false)} 
                cartItems={cartItems} 
                onUpdateQuantity={handleUpdateCartQuantity}
                onRemoveItem={handleRemoveFromCart}
                onCheckout={handleCheckout}
                isStoreOnline={isStoreOnline}
            />

            <CheckoutModal 
                isOpen={isCheckoutOpen}
                onClose={() => setIsCheckoutOpen(false)}
                cartItems={cartItems}
                onConfirmCheckout={handleConfirmCheckout}
                onInitiatePixPayment={handleInitiatePixPayment}
            />

            <PixPaymentModal
                order={currentPixOrder}
                onClose={() => setIsPixModalOpen(false)}
                onPaymentSuccess={handlePaymentSuccess}
            />
            
             <PaymentFailureModal
                isOpen={isPaymentFailureModalOpen}
                onClose={() => setIsPaymentFailureModalOpen(false)}
                onTryAgain={handlePaymentFailureTryAgain}
                onPayLater={handlePaymentFailurePayLater}
            />

            <AdminSection 
                allProducts={allProducts}
                allCategories={allCategories}
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
                onSeedDatabase={handleSeedDatabase}
                onSaveSiteSettings={handleSaveSiteSettings}
                onUpdateOrderStatus={handleUpdateOrderStatus}
                onUpdateOrderPaymentStatus={handleUpdateOrderPaymentStatus}
                onUpdateOrderReservationTime={handleUpdateOrderReservationTime}
                onDeleteOrder={handleDeleteOrder}
                onPermanentDeleteOrder={handlePermanentDeleteOrder}
                onRefundOrder={handleRefundOrder}
            />
        </div>
    );
};

export default App;
