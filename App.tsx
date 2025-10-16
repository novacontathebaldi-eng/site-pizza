import React, { useState, useEffect, useCallback, useMemo } from 'react';
// FIX: Moved ReservationDetails import from ReservationModal to here, where it is defined.
import { Product, Category, CartItem, OrderDetails, SiteSettings, Order, OrderStatus, PaymentStatus, ChatMessage, ReservationDetails } from './types';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { MenuSection } from './components/MenuSection';
import { DynamicContentSection } from './components/DynamicContentSection';
import { ContactSection } from './components/ContactSection';
import { AdminSection } from './components/AdminSection';
import { Footer } from './components/Footer';
import { CartSidebar } from './components/CartSidebar';
import { CheckoutModal, OrderConfirmationModal, ReservationConfirmationModal } from './components/CheckoutModal';
// FIX: Removed ReservationDetails from this import as it's not exported from the component file.
import { ReservationModal } from './components/ReservationModal';
import { PixPaymentModal } from './components/PixPaymentModal';
import { PaymentFailureModal } from './components/PaymentFailureModal';
import { Chatbot } from '@/components/Chatbot';
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

const generateWhatsAppMessage = (details: OrderDetails, currentCart: CartItem[], total: number, orderNumber: number, isPaid: boolean) => {
    const orderTypeMap = { delivery: 'Entrega', pickup: 'Retirada na loja', local: 'Consumo no Local' };
    const paymentMethodMap = { credit: 'Cartão de Crédito', debit: 'Cartão de Débito', pix: 'PIX', cash: 'Dinheiro' };

    let message = `*🍕 NOVO PEDIDO #${orderNumber} - SANTA SENSAÇÃO 🍕*\n\n`;
    if (isPaid) {
        message += `*✅ JÁ PAGO VIA PIX PELO SITE*\n\n`;
    }
    message += `*👤 DADOS DO CLIENTE:*\n`;
    message += `*Nome:* ${details.name}\n`;
    message += `*Telefone:* ${details.phone}\n`;
    message += `*Tipo de Pedido:* ${orderTypeMap[details.orderType]}\n`;
    
    if (details.orderType === 'delivery') {
        message += `\n*📍 ENDEREÇO DE ENTREGA:*\n`;
        message += `*Localidade:* ${details.neighborhood}\n`;
        message += `*Rua:* ${details.street}\n`;
        message += `*Número:* ${details.number}\n`;
        if (details.complement) {
            message += `*Complemento:* ${details.complement}\n`;
        }
    }
    
    if (details.allergies) {
        message += `\n*⚠️ ALERGIAS/RESTRIÇÕES:*\n${details.allergies}\n`;
    }

    message += `\n*🛒 ITENS DO PEDIDO:*\n`;
    currentCart.forEach(item => {
        message += `• ${item.quantity}x ${item.name} (${item.size}) - R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}\n`;
    });

    const subtotal = currentCart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    message += `\n*🧾 RESUMO FINANCEIRO:*\n`;
    message += `*Subtotal:* R$ ${subtotal.toFixed(2).replace('.', ',')}\n`;
    if (details.orderType === 'delivery' && details.deliveryFee) {
        message += `*Taxa de Entrega:* R$ ${details.deliveryFee.toFixed(2).replace('.', ',')}\n`;
    }
    message += `*💰 TOTAL: R$ ${total.toFixed(2).replace('.', ',')}*\n\n`;
    
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

const generateReservationWhatsAppMessage = (details: ReservationDetails, orderNumber: number) => {
    let message = `*📅 NOVA RESERVA #${orderNumber} - SANTA SENSAÇÃO 📅*\n\n`;
    message += `Uma nova reserva foi feita pelo site.\n\n`;
    message += `*👤 DADOS DO CLIENTE:*\n`;
    message += `*Nome:* ${details.name}\n`;
    message += `*Telefone:* ${details.phone}\n\n`;
    message += `*📋 DETALHES DA RESERVA:*\n`;
    const [year, month, day] = details.reservationDate.split('-');
    const formattedDate = `${day}/${month}/${year}`;
    message += `*Data:* ${formattedDate}\n`;
    message += `*Horário:* ${details.reservationTime}\n`;
    message += `*Quantidade de Pessoas:* ${details.numberOfPeople}\n`;
    if (details.notes) {
        message += `\n*📝 OBSERVAÇÕES:*\n${details.notes}\n`;
    }
    message += `\n_Reserva gerada pelo nosso site._`;
    return `https://wa.me/5527996500341?text=${encodeURIComponent(message)}`;
};

const App: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [isStoreOnline, setIsStoreOnline] = useState<boolean>(true);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState<boolean>(false);
    const [isReservationModalOpen, setIsReservationModalOpen] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [activeSection, setActiveSection] = useState('Início');
    const [activeMenuCategory, setActiveMenuCategory] = useState<string>('');
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [siteSettings, setSiteSettings] = useState<SiteSettings>(defaultSiteSettings);
    const [payingOrder, setPayingOrder] = useState<Order | null>(null);
    const [showPaymentFailureModal, setShowPaymentFailureModal] = useState<boolean>(false);
    const [pixRetryKey, setPixRetryKey] = useState<number>(0);
    const [isCreatingPixPayment, setIsCreatingPixPayment] = useState<boolean>(false);
    const [isProcessingOrder, setIsProcessingOrder] = useState<boolean>(false);
    const [refundingOrderId, setRefundingOrderId] = useState<string | null>(null);
    const [isChatbotOpen, setIsChatbotOpen] = useState<boolean>(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
        { role: 'bot', content: `🍕 Olá! Bem-vindo(a) à Pizzaria Santa Sensação!\n\nEu sou o Sensação, seu assistente virtual. Estou aqui para te ajudar a fazer pedidos, tirar dúvidas sobre nosso cardápio, acompanhar entregas e muito mais.\n\nComo posso te ajudar hoje?` }
    ]);
    const [isBotReplying, setIsBotReplying] = useState<boolean>(false);
    const [confirmedOrderData, setConfirmedOrderData] = useState<Order | null>(null);
    const [confirmedReservationData, setConfirmedReservationData] = useState<Order | null>(null);
    
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

    useEffect(() => {
        const sectionIds = ['inicio', 'cardapio', 'sobre', 'contato'];
        const sectionElements = sectionIds.map(id => document.getElementById(id));
        
        const observerOptions = {
            root: null,
            rootMargin: '-80px 0px -60% 0px',
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
            setError("Falha na conexão com o banco de dados.");
            setIsLoading(false);
            return;
        }

        const handleConnectionError = (err: Error, context: string) => {
            console.error(`Error fetching ${context}:`, err);
            setError("Não foi possível conectar ao banco de dados.");
            setIsLoading(false);
        };
        
        const settingsDocRef = db.doc('store_config/site_settings');
        const unsubSettings = settingsDocRef.onSnapshot(doc => {
            if (doc.exists) {
                 const data = doc.data() as Partial<SiteSettings>;
                 setSiteSettings(prev => ({ ...defaultSiteSettings, ...prev, ...data }));
            }
        }, err => handleConnectionError(err, "site settings"));

        const statusDocRef = db.doc('store_config/status');
        const unsubStatus = statusDocRef.onSnapshot(doc => {
            const data = doc.data();
            if (data) setIsStoreOnline(data.isOpen);
        }, err => handleConnectionError(err, "store status"));

        const categoriesQuery = db.collection('categories').orderBy('order');
        const unsubCategories = categoriesQuery.onSnapshot(snapshot => {
            const fetchedCategories: Category[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
            setCategories(fetchedCategories);
        }, err => handleConnectionError(err, "categories"));

        const productsQuery = db.collection('products').orderBy('orderIndex');
        const unsubProducts = productsQuery.onSnapshot(snapshot => {
            const fetchedProducts: Product[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setProducts(fetchedProducts);
            setIsLoading(false);
            setError(null);
        }, err => handleConnectionError(err, "products"));

        const ordersQuery = db.collection('orders').orderBy('createdAt', 'desc');
        const unsubOrders = ordersQuery.onSnapshot(snapshot => {
            const fetchedOrders: Order[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
            setOrders(fetchedOrders);
        }, err => handleConnectionError(err, "orders"));

        return () => {
            unsubSettings();
            unsubStatus();
            unsubCategories();
            unsubProducts();
            unsubOrders();
        };
    }, []);

    useEffect(() => {
        if (categories.length > 0 && !activeMenuCategory) {
            const firstActiveCategory = categories.find(c => c.active);
            if (firstActiveCategory) {
                setActiveMenuCategory(firstActiveCategory.id);
            }
        }
    }, [categories, activeMenuCategory]);
    
    useEffect(() => {
        localStorage.setItem('santaSensacaoCart', JSON.stringify(cart));
    }, [cart]);

    const handleSendMessageToBot = async (message: string) => {
        if (!message.trim() || isBotReplying) return;

        const newUserMessage: ChatMessage = { role: 'user', content: message };
        // Criamos uma nova lista de mensagens para enviar ao backend
        const updatedMessages = [...chatMessages, newUserMessage];
        setChatMessages(updatedMessages);
        setIsBotReplying(true);

        try {
            // Agora enviamos o histórico completo
            const botReply = await firebaseService.askChatbot(updatedMessages);
            const newBotMessage: ChatMessage = { role: 'bot', content: botReply };
            setChatMessages(prev => [...prev, newBotMessage]);
        } catch (error) {
            const errorMessage: ChatMessage = { role: 'bot', content: 'Desculpe, não consegui processar sua mensagem. Tente novamente.' };
            setChatMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsBotReplying(false);
        }
    };

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
    }, []);

    const handleUpdateCartQuantity = useCallback((itemId: string, newQuantity: number) => {
        setCart(prevCart => {
            if (newQuantity <= 0) {
                return prevCart.filter(item => item.id !== itemId);
            }
            return prevCart.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item);
        });
    }, []);
    
    const handleCheckout = async (details: OrderDetails) => {
        setIsProcessingOrder(true);
        setIsCheckoutModalOpen(false);
    
        const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const total = subtotal + (details.deliveryFee || 0);
    
        try {
            const { orderId, orderNumber } = await firebaseService.createOrder(details, cart, total, 'payLater');
            addToast(`Pedido #${orderNumber} criado!`, 'success');
    
            const confirmedOrder: Order = {
                id: orderId,
                orderNumber,
                customer: { name: details.name, phone: details.phone, orderType: details.orderType, ...details },
                items: cart,
                total,
                paymentMethod: details.paymentMethod,
                paymentStatus: 'pending',
                status: 'pending',
                createdAt: new Date(),
                notes: details.notes,
                allergies: details.allergies,
                deliveryFee: details.deliveryFee,
            };
    
            setConfirmedOrderData(confirmedOrder);
            setCart([]);
            setIsCartOpen(false);
        } catch (error: any) {
            console.error("Failed to create order:", error);
            addToast(error.message || "Erro ao criar pedido.", 'error');
        } finally {
            setIsProcessingOrder(false);
        }
    };

    const handleInitiatePixPayment = async (details: OrderDetails, pixOption: 'payNow' | 'payLater') => {
        setIsProcessingOrder(true); // Reuse the same loading state
        setIsCheckoutModalOpen(false);

        const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const total = subtotal + (details.deliveryFee || 0);
        
        try {
            const { orderId, orderNumber, pixData } = await firebaseService.createOrder(details, cart, total, pixOption);
            
            if (!pixData || !pixData.qrCodeBase64) {
                 throw new Error("A resposta do servidor não incluiu os dados do PIX.");
            }

            const newOrder: Order = {
                id: orderId,
                orderNumber: orderNumber,
                customer: { name: details.name, phone: details.phone, orderType: details.orderType, address: details.address, cpf: details.cpf },
                items: cart, total, paymentMethod: 'pix', status: 'awaiting-payment', paymentStatus: 'pending',
                deliveryFee: details.deliveryFee,
                allergies: details.allergies,
                createdAt: new Date(),
                mercadoPagoDetails: { paymentId: '', qrCodeBase64: pixData.qrCodeBase64, qrCode: pixData.copyPaste }
            };

            setPayingOrder(newOrder);
            setPixRetryKey(k => k + 1);
        } catch (error: any) {
            console.error("Failed to initiate PIX payment:", error);
            addToast(error.message || "Erro ao iniciar pagamento PIX.", 'error');
            setPayingOrder(null);
        } finally {
            setIsProcessingOrder(false);
        }
    };

    const handleConfirmReservation = async (details: ReservationDetails) => {
        setIsProcessingOrder(true);
        setIsReservationModalOpen(false);
    
        try {
            const { orderId, orderNumber } = await firebaseService.createReservation(details);
            addToast(`Reserva #${orderNumber} registrada com sucesso!`, 'success');
    
            const confirmedReservation: Order = {
                id: orderId,
                orderNumber,
                customer: {
                    name: details.name,
                    phone: details.phone,
                    orderType: 'local',
                    reservationDate: details.reservationDate,
                    reservationTime: details.reservationTime,
                },
                numberOfPeople: details.numberOfPeople,
                notes: details.notes,
                status: 'pending',
                paymentStatus: 'pending',
                createdAt: new Date(),
            };
            
            setConfirmedReservationData(confirmedReservation);
    
        } catch (error: any) {
            console.error("Failed to create reservation:", error);
            addToast(error.message || "Erro ao criar reserva.", 'error');
        } finally {
            setIsProcessingOrder(false);
        }
    };

    const handlePixPaymentSuccess = useCallback((paidOrder: Order) => {
       if (!paidOrder || !paidOrder.id) {
           addToast("Erro crítico ao processar pagamento.", 'error');
           return;
       }
       addToast("Pagamento confirmado! Seu pedido foi registrado.", 'success');
       setPayingOrder(null);
       setConfirmedOrderData(paidOrder);
       setCart([]);
       setIsCartOpen(false);
    }, [addToast]);

    const handleSendOrderToWhatsApp = (order: Order) => {
        const isPaid = order.paymentStatus === 'paid_online';
        
        const details: OrderDetails = {
            name: order.customer.name,
            phone: order.customer.phone,
            orderType: order.customer.orderType,
            paymentMethod: order.paymentMethod || 'pix',
            changeNeeded: order.changeNeeded || false,
            changeAmount: order.changeAmount || '',
            notes: order.notes || '',
            cpf: order.customer.cpf || '',
            neighborhood: order.customer.neighborhood || '',
            street: order.customer.street || '',
            number: order.customer.number || '',
            complement: order.customer.complement || '',
            allergies: order.allergies || '',
            deliveryFee: order.deliveryFee || 0,
        };
        
        const whatsappUrl = generateWhatsAppMessage(details, order.items || cart, order.total || 0, order.orderNumber, isPaid);
        window.open(whatsappUrl, '_blank');
        setConfirmedOrderData(null);
    };

    const handleSendReservationToWhatsApp = (reservation: Order) => {
        const details: ReservationDetails = {
            name: reservation.customer.name,
            phone: reservation.customer.phone,
            numberOfPeople: reservation.numberOfPeople || 2,
            reservationDate: reservation.customer.reservationDate || '',
            reservationTime: reservation.customer.reservationTime || '',
            notes: reservation.notes || '',
        };
    
        const whatsappUrl = generateReservationWhatsAppMessage(details, reservation.orderNumber);
        window.open(whatsappUrl, '_blank');
        setConfirmedReservationData(null);
    };

    const handleClosePixModal = () => {
        if (payingOrder) {
            setShowPaymentFailureModal(true);
        } else {
            setPayingOrder(null);
        }
    };
    
    const handleTryAgainPix = () => {
        setShowPaymentFailureModal(false);
        // Re-opens the PixPaymentModal by setting a new key
        setPixRetryKey(k => k + 1);
    };

    const handlePayLaterFromFailure = async () => {
        if (!payingOrder) return;
    
        const orderToUpdateId = payingOrder.id;
        setShowPaymentFailureModal(false);
        setPayingOrder(null);
        setIsProcessingOrder(true);
        
        try {
            await firebaseService.updateOrderStatus(orderToUpdateId, 'pending');
            const orderSnapshot = await db.collection('orders').doc(orderToUpdateId).get();
            const finalOrderData = { id: orderSnapshot.id, ...orderSnapshot.data() } as Order;
            
            addToast("Pedido enviado! O pagamento será feito na entrega/retirada.", 'success');
            setConfirmedOrderData(finalOrderData);
            setCart([]);
            setIsCartOpen(false);

        } catch (error) {
            console.error("Failed to update order to pending:", error);
            addToast("Erro ao processar o pedido. Tente novamente.", 'error');
        } finally {
            setIsProcessingOrder(false);
        }
    };


    const handleSaveProduct = useCallback(async (product: Product) => {
        try {
            const { id, ...dataToSave } = product;
            if (id) {
                await firebaseService.updateProduct(id, dataToSave);
                addToast("Produto atualizado com sucesso!", 'success');
            } else {
                await firebaseService.addProduct({ ...dataToSave, orderIndex: products.length, stockStatus: 'available' });
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
    
    const handleProductStatusChange = useCallback(async (productId: string, active: boolean) => {
        try {
            await firebaseService.updateProductStatus(productId, active);
            addToast(`Produto ${active ? 'ativado' : 'desativado'}.`, 'success');
        } catch (error) {
            console.error("Failed to update product status:", error);
            addToast("Erro ao atualizar status do produto.", 'error');
        }
    }, [addToast]);

    const handleProductStockStatusChange = useCallback(async (productId: string, stockStatus: 'available' | 'out_of_stock') => {
        try {
            await firebaseService.updateProductStockStatus(productId, stockStatus);
            addToast(`Estoque do produto atualizado.`, 'success');
        } catch (error) {
            console.error("Failed to update product stock status:", error);
            addToast("Erro ao atualizar estoque do produto.", 'error');
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
        } catch (error: any) {
            console.error("Failed to delete category:", error);
            addToast(`Erro ao deletar categoria: ${error.message}`, 'error');
        }
    }, [products, addToast]);
    
    const handleCategoryStatusChange = useCallback(async (categoryId: string, active: boolean) => {
        try {
            await firebaseService.updateCategoryStatus(categoryId, active);
            addToast(`Categoria ${active ? 'ativada' : 'desativada'}.`, 'success');
        } catch (error) {
            console.error("Failed to update category status:", error);
            addToast("Erro ao atualizar status da categoria.", 'error');
        }
    }, [addToast]);

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
    
    const handleUpdateOrderStatus = useCallback(async (orderId: string, status: OrderStatus, payload?: Partial<Pick<Order, 'pickupTimeEstimate'>>) => {
        try {
            let finalStatus = status;
            const order = orders.find(o => o.id === orderId);

            if (status === 'accepted' && order?.customer.orderType === 'local') {
                finalStatus = 'reserved';
            }
            
            await firebaseService.updateOrderStatus(orderId, finalStatus, payload);
            addToast("Status do pedido atualizado!", 'success');
        } catch (error) {
            console.error("Failed to update order status:", error);
            addToast("Erro ao atualizar o status do pedido.", 'error');
        }
    }, [orders, addToast]);

    const handleUpdateOrderPaymentStatus = useCallback(async (orderId: string, paymentStatus: PaymentStatus) => {
        try {
            await firebaseService.updateOrderPaymentStatus(orderId, paymentStatus);
            addToast("Status de pagamento atualizado!", 'success');
        } catch (error) {
            console.error("Failed to update order payment status:", error);
            addToast("Erro ao atualizar o status de pagamento.", 'error');
        }
    }, [addToast]);

    const handleUpdateOrderReservationTime = useCallback(async (orderId: string, reservationTime: string) => {
        try {
            await firebaseService.updateOrderReservationTime(orderId, reservationTime);
            addToast("Horário da reserva atualizado!", 'success');
        } catch (error) {
            console.error("Failed to update reservation time:", error);
            addToast("Erro ao atualizar horário da reserva.", 'error');
        }
    }, [addToast]);

    const handleDeleteOrder = useCallback(async (orderId: string) => {
        if (window.confirm("Tem certeza que deseja apagar este pedido? Após apagar, o pedido será enviado para a lixeira 🗑️")) {
            try {
                await firebaseService.updateOrderStatus(orderId, 'deleted');
                addToast("Pedido movido para a lixeira.", 'success');
            } catch (error) {
                console.error("Failed to move order to trash:", error);
                addToast("Erro ao mover pedido para a lixeira.", 'error');
            }
        }
    }, [addToast]);

    const handlePermanentDeleteOrder = useCallback(async (orderId: string) => {
        if (window.confirm("Este pedido será apagado PERMANENTEMENTE. Esta ação não pode ser desfeita. Continuar?")) {
            try {
                await firebaseService.deleteOrder(orderId);
                addToast("Pedido apagado permanentemente.", 'success');
            } catch (error) {
                console.error("Failed to permanently delete order:", error);
                addToast("Erro ao apagar o pedido permanentemente.", 'error');
            }
        }
    }, [addToast]);
    
    const handleRefundOrder = useCallback(async (orderId: string) => {
        if (window.confirm("Tem certeza que deseja estornar o valor total deste pagamento? Esta ação não pode ser desfeita.")) {
            const orderToRefund = orders.find(o => o.id === orderId);
            const paymentId = orderToRefund?.mercadoPagoDetails?.paymentId;

            if (!paymentId) {
                addToast("ID do pagamento não encontrado. Não é possível estornar.", 'error');
                return;
            }

            setRefundingOrderId(orderId);
            addToast("Processando estorno...", 'success');

            try {
                await firebaseService.refundPayment(orderId);
                addToast(`Estorno solicitado com sucesso! O pedido ${paymentId} foi cancelado`, 'success');
            } catch (error: any) {
                console.error("Failed to refund order:", error);
                addToast(error.message || "Erro ao solicitar estorno.", 'error');
            } finally {
                setRefundingOrderId(null);
            }
        }
    }, [addToast, orders]);


    const cartTotalItems = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

    return (
        <div className="flex flex-col min-h-screen">
            <Header 
                cartItemCount={cartTotalItems} 
                onCartClick={() => setIsCartOpen(true)} 
                onOpenChatbot={() => setIsChatbotOpen(true)}
                activeSection={activeSection} 
                settings={siteSettings} 
            />
            
            <div id="status-banner" className={`bg-red-600 text-white text-center p-2 font-semibold ${isStoreOnline ? 'hidden' : ''}`}>
                <i className="fas fa-times-circle mr-2"></i>
                Desculpe, estamos fechados no momento.
            </div>

            <main className="flex-grow">
                <HeroSection 
                    settings={siteSettings} 
                    isLoading={isLoading} 
                    onReserveClick={() => setIsReservationModalOpen(true)}
                />
                
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
                        cartItemCount={cartTotalItems}
                        onCartClick={() => setIsCartOpen(true)}
                        cartItems={cart}
                    />
                )}
                <div id="sobre">
                    {siteSettings.contentSections
                        ?.filter(section => section.isVisible)
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
                    onSeedDatabase={seedDatabase}
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

            <Footer settings={siteSettings} onOpenChatbot={() => setIsChatbotOpen(true)} />

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

            {/* Floating Chatbot Button */}
            <button
                onClick={() => setIsChatbotOpen(true)}
                className="fixed bottom-5 left-5 z-40 w-14 h-14 bg-brand-green-700/80 backdrop-blur-sm text-white rounded-full shadow-lg flex items-center justify-center transform transition-transform hover:scale-110"
                aria-label="Abrir assistente virtual"
            >
                <i className="fas fa-headset text-2xl"></i>
            </button>

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
                onInitiatePixPayment={handleInitiatePixPayment}
                isProcessing={isProcessingOrder}
            />
            <ReservationModal
                isOpen={isReservationModalOpen}
                onClose={() => setIsReservationModalOpen(false)}
                onConfirmReservation={handleConfirmReservation}
                isProcessing={isProcessingOrder}
            />
             <PixPaymentModal
                key={pixRetryKey}
                order={payingOrder}
                onClose={handleClosePixModal}
                onPaymentSuccess={handlePixPaymentSuccess}
                isProcessing={isProcessingOrder}
            />

            <PaymentFailureModal
                isOpen={showPaymentFailureModal}
                onClose={() => {
                    setShowPaymentFailureModal(false);
                    setPayingOrder(null);
                }}
                onTryAgain={handleTryAgainPix}
                onPayLater={handlePayLaterFromFailure}
            />

            <OrderConfirmationModal
                order={confirmedOrderData}
                onClose={() => setConfirmedOrderData(null)}
                onSendWhatsApp={handleSendOrderToWhatsApp}
            />

            <ReservationConfirmationModal
                reservation={confirmedReservationData}
                onClose={() => setConfirmedReservationData(null)}
                onSendWhatsApp={handleSendReservationToWhatsApp}
            />
            
            <Chatbot
                isOpen={isChatbotOpen}
                onClose={() => setIsChatbotOpen(false)}
                messages={chatMessages}
                onSendMessage={handleSendMessageToBot}
                isSending={isBotReplying}
            />

            {(isProcessingOrder || isCreatingPixPayment) && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm text-center p-8">
                        <i className="fas fa-spinner fa-spin text-5xl text-accent"></i>
                        <p className="mt-6 font-semibold text-lg text-gray-700">{isCreatingPixPayment ? 'Conectando com o Mercado Pago...' : 'Processando seu pedido...'}</p>
                        <p className="mt-2 text-sm text-gray-500">{isCreatingPixPayment ? 'Estamos gerando seu PIX seguro.' : 'Por favor, aguarde um instante.'}</p>
                    </div>
                </div>
            )}

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

// FIX: Added a default export for the App component. The index.tsx file was trying
// to import it as a default, but it was not exported, causing an error.
export default App;