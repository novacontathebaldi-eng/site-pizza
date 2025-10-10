import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { MenuSection } from './components/MenuSection';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { CartSidebar } from './components/CartSidebar';
import { CheckoutModal } from './components/CheckoutModal';
import { AdminSection } from './components/AdminSection';
import { DynamicContentSection } from './components/DynamicContentSection';
import { SiteSettings, Product, Category, CartItem, StoreStatus } from './types';
import * as firebaseService from './services/firebaseService';

const App: React.FC = () => {
    // Data State
    const [settings, setSettings] = useState<SiteSettings | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [storeStatus, setStoreStatus] = useState<StoreStatus>({ isOpen: true });

    // UI State
    const [isLoading, setIsLoading] = useState(true);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [activeSection, setActiveSection] = useState('Início');
    const [activeCategoryId, setActiveCategoryId] = useState('');
    const [isAdminVisible, setIsAdminVisible] = useState(false);
    
    // Cart State
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const cartItemCount = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems]);
    
    // Menu navigation state
    const [suggestedNextCategoryId, setSuggestedNextCategoryId] = useState<string | null>(null);
    const [showFinalizeButtonTrigger, setShowFinalizeButtonTrigger] = useState(false);

    // Initial data load
    useEffect(() => {
        const fetchData = async () => {
            try {
                const settingsData = await firebaseService.getSiteSettings();
                const { products: productsData, categories: categoriesData, storeStatus: statusData } = await firebaseService.getProductsAndCategories();

                if (settingsData) {
                    setSettings(settingsData);
                }
                setProducts(productsData);
                setCategories(categoriesData);
                setStoreStatus(statusData);

                if (categoriesData.length > 0) {
                    const sortedActiveCategories = categoriesData.filter(c => c.active).sort((a, b) => a.order - b.order);
                    if (sortedActiveCategories.length > 0) {
                        setActiveCategoryId(sortedActiveCategories[0].id);
                    }
                }

            } catch (error) {
                console.error("Failed to fetch initial data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
        
        const handleHashChange = () => {
            if (window.location.hash === '#admin') {
                setIsAdminVisible(true);
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        handleHashChange(); // Check on initial load

        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    // Scroll observer for active section
    useEffect(() => {
        if (isLoading || isAdminVisible) return;

        const sections = document.querySelectorAll('section[id]');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    const capitalizedId = id.charAt(0).toUpperCase() + id.slice(1);
                    if (id === 'sobre' ) setActiveSection('Sobre Nós');
                    else if (id === 'cardapio') setActiveSection('Cardápio');
                    else if (id.startsWith('content-')) {
                        const section = settings?.contentSections.find(s => `content-${s.id}` === id);
                        if (section) setActiveSection(section.title);
                    }
                    else setActiveSection(capitalizedId);
                }
            });
        }, { rootMargin: "-50% 0px -50% 0px" });

        sections.forEach(section => observer.observe(section));

        return () => sections.forEach(section => observer.unobserve(section));
    }, [isLoading, settings, isAdminVisible]);
    
    // Cart Logic
    const handleAddToCart = (product: Product, size: string, price: number) => {
        const cartItemId = `${product.id}-${size}`;
        const existingItem = cartItems.find(item => item.id === cartItemId);

        if (existingItem) {
            handleUpdateQuantity(cartItemId, existingItem.quantity + 1);
        } else {
            const newItem: CartItem = {
                id: cartItemId,
                productId: product.id,
                name: product.name,
                size: size,
                price: price,
                quantity: 1,
                imageUrl: product.imageUrl,
            };
            setCartItems(prevItems => [...prevItems, newItem]);
        }
    };

    const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
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
    
    const handleCheckout = () => {
        if (cartItems.length > 0) {
            setIsCartOpen(false);
            setIsCheckoutOpen(true);
        }
    };
    
    const handleOrderPlaced = () => {
        setCartItems([]);
        setIsCheckoutOpen(false);
    };

    if (isLoading || !settings) {
        return (
            <div className="fixed inset-0 bg-brand-green-700 flex flex-col items-center justify-center text-white">
                <div className="animate-pulse">
                    {/* A simple div can be a placeholder to avoid 404s if the image doesn't exist */}
                    <div className="h-24 w-24 mb-4 bg-white/20 rounded-full"></div>
                </div>
                <p className="text-xl font-semibold">Carregando a melhor pizza...</p>
            </div>
        );
    }
    
    if (isAdminVisible) {
        return <AdminSection onExit={() => {
            window.location.hash = '';
            setIsAdminVisible(false);
        }} />;
    }

    return (
        <div className="bg-white">
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
                
                {(settings.contentSections ?? []).filter(s => s.isVisible).sort((a,b) => a.order - b.order).map((section, index) => (
                    <DynamicContentSection key={section.id} section={section} order={index + 1} />
                ))}

                <ContactSection />
            </main>
            <Footer settings={settings} />

            <CartSidebar 
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                cartItems={cartItems}
                onUpdateQuantity={handleUpdateQuantity}
                onCheckout={handleCheckout}
                isStoreOnline={storeStatus.isOpen}
                categories={categories}
                products={products}
                setActiveCategoryId={setActiveCategoryId}
            />
            
            <CheckoutModal
                isOpen={isCheckoutOpen}
                onClose={() => setIsCheckoutOpen(false)}
                cartItems={cartItems}
                onOrderPlaced={handleOrderPlaced}
            />
        </div>
    );
};

export default App;
