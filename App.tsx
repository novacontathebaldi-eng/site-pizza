

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Product, Category, CartItem, OrderDetails, SiteSettings } from './types';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { MenuSection } from './components/MenuSection';
import { DynamicContentSection } from './components/DynamicContentSection';
import { ContactSection } from './components/ContactSection';
import { AdminSection } from './components/AdminSection';
import { Footer } from './components/Footer';
import { CartSidebar } from './components/CartSidebar';
import { CheckoutModal } from './components/CheckoutModal';
import { db } from './services/firebase';
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
            id: 'section-1',
            order: 0,
            isVisible: true,
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
        { id: 'footer-whatsapp', icon: 'fab fa-whatsapp', text: 'WhatsApp', url: 'https://wa.me/5527996500341' },
        { id: 'footer-instagram', icon: 'fab fa-instagram', text: 'Instagram', url: 'https://www.instagram.com/santasensacao.sl' },
        { id: 'footer-admin', icon: 'fas fa-key', text: 'Painel Administrativo', url: '#admin' }
    ]
};

const App: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
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

    // Observer for active section title
    useEffect(() => {
        const sectionIds = ['inicio', 'cardapio', 'sobre', 'contato'];
        const sectionElements = sectionIds.map(id => document.getElementById(id));
        
        const observerOptions = {
            root: null,
            rootMargin: '-80px 0px -60% 0px', // Focus on the top part of the viewport, below the header
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
            setError("Falha na conexão com o banco de dados. Este é um problema conhecido no ambiente de desenvolvimento atual (sandbox), que bloqueia conexões externas. Seu site funcionará normalmente online. Verifique se as credenciais em services/firebase.ts estão corretas.");
            setIsLoading(false);
            return;
        }

        const handleConnectionError = (err: Error, context: string) => {
            console.error(`Error fetching ${context}:`, err);
            setError("Não foi possível conectar ao banco de dados. Este é um problema conhecido no ambiente de desenvolvimento atual (sandbox), que bloqueia conexões externas. Seu site funcionará normalmente online.");
            setIsLoading(false);
        };
        
        // Listener for site settings
        const settingsDocRef = db.doc('store_config/site_settings');
        const unsubSettings = settingsDocRef.onSnapshot(doc => {
            if (doc.exists) {
                 const data = doc.data() as Partial<SiteSettings>;
                 // Merge fetched data with defaults to ensure all keys exist
                 setSiteSettings(prev => ({
                     ...defaultSiteSettings,
                     ...prev,
                     ...data
                 }));
            }
        }, err => handleConnectionError(err, "site settings"));


        // Listener for store status
        const statusDocRef = db.doc('store_config/status');
        const unsubStatus = statusDocRef.onSnapshot(doc => {
            const data = doc.data();
            if (data) {
                setIsStoreOnline(data.isOpen);
            }
        }, err => handleConnectionError(err, "store status"));

        // Listener for categories
        const categoriesQuery = db.collection('categories').orderBy('order');
        const unsubCategories = categoriesQuery.onSnapshot(snapshot => {
            const fetchedCategories: Category[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
            setCategories(fetchedCategories);
            if (fetchedCategories.length > 0 && !activeMenuCategory) {
                setActiveMenuCategory(fetchedCategories[0].id);
            }
        }, err => handleConnectionError(err, "categories"));

        // Listener for products
        const productsQuery = db.collection('products').orderBy('orderIndex');
        const unsubProducts = productsQuery.onSnapshot(snapshot => {
            const fetchedProducts: Product[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setProducts(fetchedProducts);
            setIsLoading(false);
            setError(null);
        }, err => handleConnectionError(err, "products"));

        return () => {
            unsubSettings();
            unsubStatus();
            unsubCategories();
            unsubProducts();
        };
    }, [activeMenuCategory]);
    
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

    const handleCheckout = (details: OrderDetails) => {
        const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2);
        let message = `*🍕 NOVO PEDIDO - PIZZARIA SANTA SENSAÇÃO 🍕*\n\n`;
        message += `*👤 DADOS DO CLIENTE:*\n`;
        message += `*Nome:* ${details.name}\n`;
        message += `*Telefone:* ${details.phone}\n`;
        message += `*Tipo de Pedido:* ${details.orderType}\n`;
        if (details.orderType === 'delivery') {
            message += `*Endereço:* ${details.address}\n\n`;
        }

        message += `*🛒 ITENS DO PEDIDO:*\n`;
        cart.forEach(item => {
            message += `• ${item.quantity}x ${item.name} (${item.size}) - R$ ${(item.price * item.quantity).toFixed(2)}\n`;
        });
        message += `\n*💰 TOTAL: R$ ${total}*\n\n`;
        
        message += `*💳 PAGAMENTO:*\n`;
        message += `*Forma:* ${details.paymentMethod}\n`;
        if (details.paymentMethod === 'cash') {
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
        
        const whatsappUrl = `https://wa.me/5527996500341?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        
        setCart([]);
        setIsCheckoutModalOpen(false);
        setIsCartOpen(false);
    };

    const handleSaveProduct = useCallback(async (product: Product) => {
        try {
            const { id, ...dataToSave } = product;
            if (id) {
                await firebaseService.updateProduct(id, dataToSave);
                addToast("Produto atualizado com sucesso!", 'success');
            } else {
                await firebaseService.addProduct({ ...dataToSave, orderIndex: products.length });
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
        } catch (error) {
            console.error("Failed to delete category:", error);
            addToast(`Erro ao deletar categoria: ${error.message}`, 'error');
        }
    }, [products, addToast]);

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

    const handleSaveSiteSettings = useCallback(async (settings: SiteSettings, files: { [key: string]: File | null }) => {
        try {
            const settingsToUpdate = JSON.parse(JSON.stringify(settings)); // Deep copy

            for (const key in files) {
                const file = files[key];
                if (file) {
                    const url = await firebaseService.uploadSiteAsset(file, key);
                    
                    if (key === 'logo') {
                        settingsToUpdate.logoUrl = url;
                    } else if (key === 'heroBg') {
                        settingsToUpdate.heroBgUrl = url;
                    } else { // It's a content section file, key is the section ID
                        const sectionIndex = settingsToUpdate.contentSections.findIndex((s: any) => s.id === key);
                        if (sectionIndex > -1) {
                            settingsToUpdate.contentSections[sectionIndex].imageUrl = url;
                        }
                    }
                }
            }

            await firebaseService.updateSiteSettings(settingsToUpdate);
            addToast("Personalização do site salva com sucesso!", 'success');
        } catch (error) {
            console.error("Failed to save site settings:", error);
            addToast("Erro ao salvar as configurações do site.", 'error');
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
                )}
                <div id="sobre">
                    {siteSettings.contentSections
                        .filter(section => section.isVisible)
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
                    onSaveProduct={handleSaveProduct}
                    onDeleteProduct={handleDeleteProduct}
                    onStoreStatusChange={handleStoreStatusChange}
                    onSaveCategory={handleSaveCategory}
                    onDeleteCategory={handleDeleteCategory}
                    onReorderProducts={handleReorderProducts}
                    onReorderCategories={handleReorderCategories}
                    onSeedDatabase={seedDatabase}
                    onSaveSiteSettings={handleSaveSiteSettings}
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
            />
            
            {/* Toast Notification Container */}
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