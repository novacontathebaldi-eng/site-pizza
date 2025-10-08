import React, { useState, useEffect, useCallback, useMemo } from 'react';
import firebase from 'firebase/compat/app';
import { Product, Category, CartItem, OrderDetails, SiteSettings, Order, OrderStatus, PaymentStatus, UserProfile } from './types';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { MenuSection } from './components/MenuSection';
import { DynamicContentSection } from './components/DynamicContentSection';
import { ContactSection } from './components/ContactSection';
import { AdminSection } from './components/AdminSection';
import { Footer } from './components/Footer';
import { CartSidebar } from './components/CartSidebar';
import { CheckoutModal } from './components/CheckoutModal';
import { AuthModal } from './components/AuthModal';
import { PixPaymentModal } from './components/PixPaymentModal';
import { db, auth } from './services/firebase';
import * as firebaseService from './services/firebaseService';
import { seedDatabase } from './services/seed';
// Static assets for default values
import defaultLogo from './assets/logo.png';
import defaultHeroBg from './assets/ambiente-pizzaria.webp';
import defaultAboutImg from './assets/sobre-imagem.webp';

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
            id: 'sobre', // Changed ID to match header link
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

const App: React.FC = () => {
    // App State
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [isStoreOnline, setIsStoreOnline] = useState<boolean>(true);
    const [siteSettings, setSiteSettings] = useState<SiteSettings>(defaultSiteSettings);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // UI State
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState<boolean>(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
    const [payingOrder, setPayingOrder] = useState<Order | null>(null);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [activeSection, setActiveSection] = useState('Início');
    const [activeMenuCategory, setActiveMenuCategory] = useState<string>('');
    const [suggestedNextCategoryId, setSuggestedNextCategoryId] = useState<string | null>(null);
    const [showFinalizeButtonTrigger, setShowFinalizeButtonTrigger] = useState<boolean>(false);

    // User Authentication State
    const [currentUser, setCurrentUser] = useState<firebase.User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        const id = Date.now();
        setToasts(prevToasts => [...prevToasts, { id, message, type }]);
        setTimeout(() => {
            setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
        }, 4000);
    }, []);

    // Effect for Customer Authentication
    useEffect(() => {
        if (!auth) return;
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            setCurrentUser(user);
            if (user) {
                const profile = await firebaseService.findOrCreateUserProfile(user);
                setUserProfile(profile);
            } else {
                setUserProfile(null);
            }
            setIsAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const savedCart = localStorage.getItem('santaSensacaoCart');
        if (savedCart) setCart(JSON.parse(savedCart));
    }, []);

    useEffect(() => {
        const sectionIds = ['inicio', 'cardapio', ...siteSettings.contentSections.filter(s => s.isVisible).map(s => s.id), 'contato'];
        const sectionElements = sectionIds.map(id => document.getElementById(id));
        const observerOptions = { root: null, rootMargin: '-80px 0px -60% 0px', threshold: 0 };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const idToTitle: { [key: string]: string } = { 'inicio': 'Início', 'cardapio': 'Cardápio', 'sobre': 'Sobre Nós', 'contato': 'Contato' };
                    const sectionTitle = siteSettings.contentSections.find(s => s.id === entry.target.id)?.title.split(' ')[0];
                    setActiveSection(idToTitle[entry.target.id] || sectionTitle || 'Início');
                }
            });
        }, observerOptions);
        sectionElements.forEach(el => { if (el) observer.observe(el); });
        return () => { sectionElements.forEach(el => { if (el) observer.unobserve(el); }); };
    }, [siteSettings.contentSections]);

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
        const unsubSettings = db.doc('store_config/site_settings').onSnapshot(doc => { if (doc.exists) setSiteSettings(prev => ({ ...defaultSiteSettings, ...prev, ...doc.data() as Partial<SiteSettings> })); }, err => handleConnectionError(err, "site settings"));
        const unsubStatus = db.doc('store_config/status').onSnapshot(doc => { if (doc.data()) setIsStoreOnline(doc.data()!.isOpen); }, err => handleConnectionError(err, "store status"));
        const unsubCategories = db.collection('categories').orderBy('order').onSnapshot(snapshot => setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category))), err => handleConnectionError(err, "categories"));
        const unsubProducts = db.collection('products').orderBy('orderIndex').onSnapshot(snapshot => { setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product))); setIsLoading(false); setError(null); }, err => handleConnectionError(err, "products"));
        const unsubOrders = db.collection('orders').orderBy('createdAt', 'desc').onSnapshot(snapshot => setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order))), err => handleConnectionError(err, "orders"));
        return () => { unsubSettings(); unsubStatus(); unsubCategories(); unsubProducts(); unsubOrders(); };
    }, []);

    useEffect(() => {
        if (categories.length > 0 && !activeMenuCategory) {
            const firstActiveCategory = categories.find(c => c.active);
            if (firstActiveCategory) setActiveMenuCategory(firstActiveCategory.id);
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
                return [...prevCart, { id: `${product.id}-${size}`, productId: product.id, name: product.name, size, price, quantity: 1, imageUrl: product.imageUrl }];
            }
        });
        const sortedActiveCategories = [...categories].sort((a,b) => a.order - b.order).filter(c => c.active);
        const currentCategoryIndex = sortedActiveCategories.findIndex(c => c.id === product.categoryId);
        // FIX: The line below was incomplete and caused a 'Cannot find name' error.
        // It has been corrected to use 'sortedActiveCategories' and properly access the last item's ID.
        const lastCategoryId = sortedActiveCategories.length > 0 ? sortedActiveCategories[sortedActiveCategories.length - 1].id : null;
        const nextCategory = sortedActiveCategories[currentCategoryIndex + 1];

        if (nextCategory && nextCategory.id !== lastCategoryId) {
            setSuggestedNextCategoryId(nextCategory.id);
        } else if (currentCategoryIndex === sortedActiveCategories.length - 2 && lastCategoryId) {
            setSuggestedNextCategoryId(lastCategoryId);
        } else if (product.categoryId === lastCategoryId) {
            setShowFinalizeButtonTrigger(true);
        }

        addToast(`${product.name} adicionado ao carrinho!`, 'success');
    }, [categories, addToast]);

    const handleUpdateCartQuantity = useCallback((itemId: string, newQuantity: number) => {
        setCart(prevCart => {
            if (newQuantity <= 0) {
                return prevCart.filter(item => item.id !== itemId);
            }
            return prevCart.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item);
        });
    }, []);

    const handleConfirmCheckout = useCallback(async (details: OrderDetails) => {
        if (cart.length === 0) {
            addToast("Seu carrinho está vazio.", "error");
            return;
        }
        const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const orderData: Omit<Order, 'id' | 'createdAt' | 'pickupTimeEstimate'> = {
            userId: currentUser?.uid,
            customer: {
                name: details.name,
                phone: details.phone,
                orderType: details.orderType,
                address: details.address,
                reservationTime: details.reservationTime,
            },
            items: cart,
            total,
            paymentMethod: details.paymentMethod,
            changeNeeded: details.changeNeeded,
            changeAmount: details.changeAmount,
            notes: details.notes,
            status: details.orderType === 'local' ? 'reserved' : 'pending',
            paymentStatus: 'pending'
        };

        try {
            await firebaseService.addOrder(orderData);
            setCart([]);
            setIsCheckoutModalOpen(false);
            addToast("Pedido enviado com sucesso!", "success");
        } catch (error) {
            console.error("Error creating order:", error);
            addToast("Falha ao enviar o pedido.", "error");
        }
    }, [cart, currentUser, addToast]);
    
    const handleInitiatePixPayment = useCallback(async (details: OrderDetails) => {
        if (cart.length === 0) return;
        const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const orderData: Omit<Order, 'id' | 'createdAt' | 'pickupTimeEstimate'> = {
            customer: { name: details.name, phone: details.phone, orderType: details.orderType, address: details.address },
            items: cart, total, paymentMethod: details.paymentMethod,
            changeNeeded: details.changeNeeded, changeAmount: details.changeAmount,
            notes: details.notes, status: 'pending', paymentStatus: 'pending'
        };
        try {
            const docRef = await firebaseService.addOrder(orderData);
            const newOrder: Order = { ...orderData, id: docRef.id, createdAt: new Date() };
            setPayingOrder(newOrder);
            setIsCheckoutModalOpen(false);
        } catch (error) {
            console.error("Error creating order for PIX payment:", error);
            addToast("Falha ao criar o pedido para pagamento.", "error");
        }
    }, [cart, addToast]);
    
    const handlePaymentSuccess = useCallback((paidOrder: Order) => {
        addToast(`Pagamento do pedido #${paidOrder.id.substring(0, 6)} aprovado!`, 'success');
        setPayingOrder(null);
        setCart([]);
    }, [addToast]);

    // Admin Handlers
    const handleStoreStatusChange = useCallback(async (isOnline: boolean) => {
        try {
            await firebaseService.updateStoreStatus(isOnline);
            addToast(`Loja foi ${isOnline ? 'aberta' : 'fechada'}.`, 'success');
        } catch (e: any) {
            console.error("Error updating store status:", e);
            addToast("Erro ao atualizar status da loja.", "error");
        }
    }, [addToast]);

    const handleSaveProduct = useCallback(async (product: Product) => {
        try {
            const { id, ...productData } = product;
            if (id) {
                await firebaseService.updateProduct(id, productData);
                addToast('Produto atualizado com sucesso!', 'success');
            } else {
                const productsInCategory = products.filter(p => p.categoryId === product.categoryId);
                const maxOrderIndex = productsInCategory.reduce((max, p) => Math.max(max, p.orderIndex), -1);
                const newProductData = { ...productData, orderIndex: maxOrderIndex + 1 };
                await firebaseService.addProduct(newProductData);
                addToast('Produto adicionado com sucesso!', 'success');
            }
        } catch (e: any) {
            console.error("Error saving product:", e);
            addToast(`Erro ao salvar produto: ${e.message}`, 'error');
            throw e;
        }
    }, [addToast, products]);

    const handleDeleteProduct = useCallback(async (productId: string) => {
        try {
            await firebaseService.deleteProduct(productId);
            addToast('Produto excluído com sucesso!', 'success');
        } catch (e: any) {
            console.error("Error deleting product:", e);
            addToast(`Erro ao excluir produto: ${e.message}`, 'error');
        }
    }, [addToast]);

    const handleSaveCategory = useCallback(async (category: Category) => {
        try {
            const { id, ...categoryData } = category;
            if (id) {
                await firebaseService.updateCategory(id, categoryData);
                addToast('Categoria atualizada com sucesso!', 'success');
            } else {
                const maxOrder = categories.reduce((max, c) => Math.max(max, c.order), -1);
                const newCategoryData = { ...categoryData, order: maxOrder + 1 };
                await firebaseService.addCategory(newCategoryData);
                addToast('Categoria adicionada com sucesso!', 'success');
            }
        } catch (e: any) {
            console.error("Error saving category:", e);
            addToast(`Erro ao salvar categoria: ${e.message}`, 'error');
            throw e;
        }
    }, [addToast, categories]);

    const handleDeleteCategory = useCallback(async (categoryId: string) => {
        try {
            await firebaseService.deleteCategory(categoryId, products);
            addToast('Categoria excluída com sucesso!', 'success');
        } catch (e: any) {
            console.error("Error deleting category:", e);
            addToast(`Erro ao excluir categoria: ${e.message}`, 'error');
        }
    }, [addToast, products]);

    const handleSeedDatabase = useCallback(async () => {
        await seedDatabase();
    }, []);

    const handleSaveSiteSettings = useCallback(async (settings: SiteSettings, files: { [key: string]: File | null }) => {
        try {
            const newSettings = { ...settings };
            if (files.logo) newSettings.logoUrl = await firebaseService.uploadSiteAsset(files.logo, 'logo');
            if (files.heroBg) newSettings.heroBgUrl = await firebaseService.uploadSiteAsset(files.heroBg, 'heroBg');
            
            const updatedSections = await Promise.all(newSettings.contentSections.map(async (section) => {
                const file = files[section.id];
                if (file) {
                    const imageUrl = await firebaseService.uploadSiteAsset(file, `section_${section.id}`);
                    return { ...section, imageUrl };
                }
                return section;
            }));
            newSettings.contentSections = updatedSections;

            await firebaseService.updateSiteSettings(newSettings);
            addToast('Configurações salvas com sucesso!', 'success');
        } catch (e: any) {
            console.error("Error saving site settings:", e);
            addToast(`Erro ao salvar configurações: ${e.message}`, 'error');
            throw e;
        }
    }, [addToast]);
    
    const handleDeleteOrder = useCallback(async (orderId: string) => {
        if (window.confirm('Tem certeza que deseja mover este pedido para a lixeira?')) {
            try {
                await firebaseService.updateOrderStatus(orderId, 'deleted');
                addToast('Pedido movido para a lixeira.', 'success');
            } catch (e: any) {
                console.error("Error deleting order:", e);
                addToast(`Erro ao mover pedido: ${e.message}`, 'error');
            }
        }
    }, [addToast]);

    const handlePermanentDeleteOrder = useCallback(async (orderId: string) => {
        if (window.confirm('Atenção! Esta ação é irreversível. Deseja apagar permanentemente este pedido?')) {
            try {
                await firebaseService.deleteOrder(orderId);
                addToast('Pedido apagado permanentemente.', 'success');
            } catch (e: any) {
                console.error("Error permanently deleting order:", e);
                addToast(`Erro ao apagar pedido: ${e.message}`, 'error');
            }
        }
    }, [addToast]);


    const cartItemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
    const sortedVisibleContentSections = useMemo(() => siteSettings.contentSections.filter(s => s.isVisible).sort((a, b) => a.order - b.order), [siteSettings.contentSections]);

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-brand-ivory-50"><i className="fas fa-spinner fa-spin text-4xl text-accent"></i></div>;
    }

    if (error) {
        return <div className="min-h-screen flex items-center justify-center bg-red-50 text-red-700 p-4"><p className="font-semibold">{error}</p></div>;
    }
    
    // FIX: The component was missing its return statement, causing a type error.
    // The main JSX structure of the application has been added below.
    return (
        <>
            <div className="fixed top-4 right-4 z-[100] space-y-2">
                {toasts.map(toast => (
                    <div key={toast.id} className={`px-4 py-2 rounded-md shadow-lg text-white font-semibold ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                        {toast.message}
                    </div>
                ))}
            </div>

            <CartSidebar
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                cartItems={cart}
                onUpdateQuantity={handleUpdateCartQuantity}
                onCheckout={() => { setIsCartOpen(false); setIsCheckoutModalOpen(true); }}
                isStoreOnline={isStoreOnline}
                categories={categories}
                products={products}
                setActiveCategoryId={setActiveMenuCategory}
            />

            <CheckoutModal
                isOpen={isCheckoutModalOpen}
                onClose={() => setIsCheckoutModalOpen(false)}
                cartItems={cart}
                onConfirmCheckout={handleConfirmCheckout}
                onInitiatePixPayment={handleInitiatePixPayment}
            />
            
            <PixPaymentModal
                order={payingOrder}
                onClose={() => setPayingOrder(null)}
                onPaymentSuccess={handlePaymentSuccess}
            />

            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
            />

            <Header
                cartItemCount={cartItemCount}
                onCartClick={() => setIsCartOpen(true)}
                activeSection={activeSection}
                settings={siteSettings}
                currentUser={currentUser}
                onAuthClick={() => setIsAuthModalOpen(true)}
            />
            <main>
                <HeroSection settings={siteSettings} />
                <MenuSection
                    categories={categories}
                    products={products}
                    onAddToCart={handleAddToCart}
                    isStoreOnline={isStoreOnline}
                    activeCategoryId={activeMenuCategory}
                    setActiveCategoryId={setActiveMenuCategory}
                    suggestedNextCategoryId={suggestedNextCategoryId}
                    setSuggestedNextCategoryId={setSuggestedNextCategoryId}
                    cartItemCount={cartItemCount}
                    onCartClick={() => setIsCartOpen(true)}
                    showFinalizeButtonTrigger={showFinalizeButtonTrigger}
                    setShowFinalizeButtonTrigger={setShowFinalizeButtonTrigger}
                />
                {sortedVisibleContentSections.map((section, index) => (
                    <DynamicContentSection key={section.id} section={section} order={index} />
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
                    onProductStatusChange={firebaseService.updateProductStatus}
                    onProductStockStatusChange={firebaseService.updateProductStockStatus}
                    onStoreStatusChange={handleStoreStatusChange}
                    onSaveCategory={handleSaveCategory}
                    onDeleteCategory={handleDeleteCategory}
                    onCategoryStatusChange={firebaseService.updateCategoryStatus}
                    onReorderProducts={firebaseService.updateProductsOrder}
                    onReorderCategories={firebaseService.updateCategoriesOrder}
                    onSeedDatabase={handleSeedDatabase}
                    onSaveSiteSettings={handleSaveSiteSettings}
                    onUpdateOrderStatus={firebaseService.updateOrderStatus}
                    onUpdateOrderPaymentStatus={firebaseService.updateOrderPaymentStatus}
                    onUpdateOrderReservationTime={firebaseService.updateOrderReservationTime}
                    onDeleteOrder={handleDeleteOrder}
                    onPermanentDeleteOrder={handlePermanentDeleteOrder}
                />
            </main>
            <Footer settings={siteSettings} />
        </>
    );
};

// FIX: Added a default export to resolve the "Module has no default export" error in index.tsx.
export default App;
