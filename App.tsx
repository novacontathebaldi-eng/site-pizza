import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { SiteSettings, Product, Category, CartItem, StoreStatus, Order, OrderStatus, PaymentStatus, OrderCustomerDetails } from './types';
import * as firebaseService from './services/firebaseService';

interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error';
}

const generateWhatsAppMessage = (details: any, currentCart: CartItem[], total: number, isPaid: boolean) => {
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

    // PIX Payment Flow State
    const [payingOrder, setPayingOrder] = useState<Order | null>(null);
    const [isPixModalOpen, setIsPixModalOpen] = useState(false);
    const [isPaymentFailureModalOpen, setIsPaymentFailureModalOpen] = useState(false);
    
    // Toasts
    const [toasts, setToasts] = useState<Toast[]>([]);
    const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    }, []);

    // Initial data load
    useEffect(() => {
        const fetchData = async () => {
            try {
                const settingsData = await firebaseService.getSiteSettings();
                const { products: productsData, categories: categoriesData, storeStatus: statusData } = await firebaseService.getProductsAndCategories();
                
                if (settingsData) setSettings(settingsData);
                setProducts(productsData);
                setCategories(categoriesData);
                setStoreStatus(statusData);

                if (categoriesData.length > 0) {
                    const sortedActive = categoriesData.filter(c => c.active).sort((a,b) => a.order - b.order);
                    if (sortedActive.length > 0) setActiveCategoryId(sortedActive[0].id);
                }
            } catch (error) {
                console.error("Failed to fetch initial data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);
    
    const handleOrderPlaced = () => {
        setCartItems([]);
        setIsCheckoutOpen(false);
    };

    // --- PIX PAYMENT FLOW HANDLERS ---
    const handleInitiatePixPayment = async (details: any) => {
        setIsCheckoutOpen(false);
        const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        
        const newOrderData: Omit<Order, 'id' | 'createdAt'> = {
            customer: { name: details.name, phone: details.phone, orderType: details.orderType, address: details.address, reservationTime: details.reservationTime },
            items: cartItems,
            total,
            paymentMethod: 'pix',
            status: 'awaiting-payment',
            paymentStatus: 'pending',
            notes: details.notes,
            changeNeeded: false
        };

        try {
            const docRef = await firebaseService.addOrder(newOrderData);
            const createdOrder: Order = { ...newOrderData, id: docRef.id, createdAt: new Date() };
            setPayingOrder(createdOrder);
            setIsPixModalOpen(true);
        } catch (error) {
            console.error("Failed to pre-save order for PIX:", error);
            addToast("Erro ao iniciar pagamento. Tente novamente.", 'error');
        }
    };

    const handlePixPaymentSuccess = useCallback((paidOrder: Order) => {
        addToast("Pagamento confirmado! Seu pedido foi enviado.", 'success');
        
        const details = {
            name: paidOrder.customer.name,
            phone: paidOrder.customer.phone,
            orderType: paidOrder.customer.orderType,
            address: paidOrder.customer.address || '',
            paymentMethod: 'pix',
            notes: paidOrder.notes || '',
        };
        const whatsappUrl = generateWhatsAppMessage(details, paidOrder.items, paidOrder.total, true);
        window.open(whatsappUrl, '_blank');
        
        setCartItems([]);
        setIsPixModalOpen(false);
        setPayingOrder(null);
    }, [addToast]);

    const handleClosePixModal = () => {
        if (payingOrder) {
            setIsPaymentFailureModalOpen(true);
        }
        setIsPixModalOpen(false);
    };
    
    const handlePayLaterFromFailure = async () => {
        if (!payingOrder) return;
        
        await firebaseService.updateOrderStatus(payingOrder.id, 'pending');
        
        const details = { ...payingOrder.customer, paymentMethod: 'pix' };
        const whatsappUrl = generateWhatsAppMessage(details, payingOrder.items, payingOrder.total, false);
        window.open(whatsappUrl, '_blank');
        
        addToast("Pedido enviado! O pagamento será feito na entrega.", 'success');
        
        setCartItems([]);
        setIsPaymentFailureModalOpen(false);
        setPayingOrder(null);
    };

    // --- DEFAULT CHECKOUT HANDLER ---
    const handleConfirmCheckout = async (details: any) => {
        const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

        const newOrderData: Omit<Order, 'id' | 'createdAt'> = {
            customer: { name: details.name, phone: details.phone, orderType: details.orderType, address: details.address, reservationTime: details.reservationTime },
            items: cartItems,
            total,
            paymentMethod: details.paymentMethod,
            status: 'pending',
            paymentStatus: 'pending',
            notes: details.notes,
            changeNeeded: details.changeNeeded,
            changeAmount: details.changeAmount
        };

        try {
            await firebaseService.addOrder(newOrderData);
            addToast("Pedido enviado com sucesso!", 'success');
            const whatsappUrl = generateWhatsAppMessage(details, cartItems, total, false);
            window.open(whatsappUrl, '_blank');
            handleOrderPlaced();
        } catch (error) {
            console.error("Failed to save order:", error);
            addToast("Erro ao salvar pedido no sistema.", 'error');
        }
    };


    // Cart Logic
    const handleAddToCart = (product: Product, size: string, price: number) => {
        const cartItemId = `${product.id}-${size}`;
        const existingItem = cartItems.find(item => item.id === cartItemId);

        if (existingItem) {
            handleUpdateQuantity(cartItemId, existingItem.quantity + 1);
        } else {
            const newItem: CartItem = {
                id: cartItemId, productId: product.id, name: product.name,
                size: size, price: price, quantity: 1, imageUrl: product.imageUrl,
            };
            setCartItems(prevItems => [...prevItems, newItem]);
        }
    };

    const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
        if (newQuantity <= 0) {
            setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
        } else {
            setCartItems(prevItems => prevItems.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item));
        }
    };
    
    if (isLoading || !settings) { return <div className="fixed inset-0 flex items-center justify-center bg-gray-100">Carregando...</div>; }
    
    if (isAdminVisible) { return <AdminSection onExit={() => setIsAdminVisible(false)} />; }

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
                onCheckout={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }}
                isStoreOnline={storeStatus.isOpen}
                categories={categories}
                products={products}
                setActiveCategoryId={setActiveCategoryId}
            />
            
            <CheckoutModal
                isOpen={isCheckoutOpen}
                onClose={() => setIsCheckoutOpen(false)}
                cartItems={cartItems}
                onConfirmCheckout={handleConfirmCheckout}
                onInitiatePixPayment={handleInitiatePixPayment}
            />

            <PixPaymentModal 
                order={payingOrder}
                onClose={handleClosePixModal}
                onPaymentSuccess={handlePixPaymentSuccess}
            />

            <PaymentFailureModal
                isOpen={isPaymentFailureModalOpen}
                onClose={() => setIsPaymentFailureModalOpen(false)}
                onTryAgain={() => {
                    setIsPaymentFailureModalOpen(false);
                    setIsPixModalOpen(true); // Reopen the PIX modal to try again
                }}
                onPayLater={handlePayLaterFromFailure}
            />
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
        </div>
    );
};

export default App;
