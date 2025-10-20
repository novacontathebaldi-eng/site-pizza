import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product, Category, SiteSettings, Order, OrderStatus, PaymentStatus } from '../types';
import { ProductModal } from './ProductModal';
import { CategoryModal } from './CategoryModal';
import { SiteCustomizationTab } from './SiteCustomizationTab';
import { OrderCard } from './OrderCard';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import firebase from 'firebase/compat/app';
import { auth } from '../services/firebase';
import { SupportModal } from './SupportModal';
import notificationSound from '../assets/notf1.mp3';

interface AdminSectionProps {
    allProducts: Product[];
    allCategories: Category[];
    isStoreOnline: boolean;
    siteSettings: SiteSettings;
    orders: Order[];
    onSaveProduct: (product: Product) => Promise<void>;
    onDeleteProduct: (productId: string) => Promise<void>;
    onProductStatusChange: (productId: string, active: boolean) => Promise<void>;
    onProductStockStatusChange: (productId: string, stockStatus: 'available' | 'out_of_stock') => Promise<void>;
    onStoreStatusChange: (isOnline: boolean) => Promise<void>;
    onSaveCategory: (category: Category) => Promise<void>;
    onDeleteCategory: (categoryId: string) => Promise<void>;
    onCategoryStatusChange: (categoryId: string, active: boolean) => Promise<void>;
    onReorderProducts: (productsToUpdate: { id: string; orderIndex: number }[]) => Promise<void>;
    onReorderCategories: (categoriesToUpdate: { id: string; order: number }[]) => Promise<void>;
    onSeedDatabase: () => Promise<void>;
    onSaveSiteSettings: (settings: SiteSettings, files: { [key: string]: File | null }) => Promise<void>;
    onUpdateOrderStatus: (orderId: string, status: OrderStatus, payload?: Partial<Pick<Order, 'pickupTimeEstimate'>>) => Promise<void>;
    onUpdateOrderPaymentStatus: (orderId: string, paymentStatus: PaymentStatus) => Promise<void>;
    onUpdateOrderReservationTime: (orderId: string, reservationTime: string) => Promise<void>;
    onDeleteOrder: (orderId: string) => Promise<void>;
    onPermanentDeleteOrder: (orderId: string) => Promise<void>;
    onRefundOrder: (orderId: string) => Promise<void>;
    refundingOrderId: string | null;
}

interface SortableProductItemProps {
    product: Product;
    isCategoryActive: boolean;
    onEdit: (product: Product) => void;
    onDelete: (productId: string) => void;
    onStatusChange: (productId: string, active: boolean) => void;
    onStockStatusChange: (productId: string, stockStatus: 'available' | 'out_of_stock') => void;
}

const SortableProductItem: React.FC<SortableProductItemProps> = ({ product, isCategoryActive, onEdit, onDelete, onStatusChange, onStockStatusChange }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: product.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 'auto',
        boxShadow: isDragging ? '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' : 'none',
    };

    const isAvailable = product.stockStatus !== 'out_of_stock';
    const itemOpacityClass = !isCategoryActive || !product.active ? 'opacity-50' : '';

    return (
        <div ref={setNodeRef} style={style} className={`bg-gray-50 p-3 rounded-lg flex justify-between items-center transition-opacity ${itemOpacityClass}`}>
            <div className="flex items-center gap-4">
                <button {...attributes} {...listeners} className="cursor-grab touch-none p-2" aria-label="Mover produto">
                    <i className="fas fa-grip-vertical text-gray-500 hover:text-gray-800"></i>
                </button>
                <p className={`font-bold ${!isAvailable ? 'line-through text-gray-400' : ''}`}>{product.name}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
                <button 
                    onClick={() => onStockStatusChange(product.id, isAvailable ? 'out_of_stock' : 'available')} 
                    className={`text-white w-8 h-8 rounded-md flex items-center justify-center transition-colors ${isAvailable ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 hover:bg-gray-500'}`}
                    aria-label={isAvailable ? 'Marcar como esgotado' : 'Marcar como disponível'}
                    title={isAvailable ? 'Disponível (clique para esgotar)' : 'Esgotado (clique para disponibilizar)'}
                >
                    <i className={`fas ${isAvailable ? 'fa-box-open' : 'fa-box'}`}></i>
                </button>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={product.active} onChange={e => onStatusChange(product.id, e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
                <button onClick={() => onEdit(product)} className="bg-blue-500 text-white w-8 h-8 rounded-md hover:bg-blue-600" aria-label={`Editar ${product.name}`}><i className="fas fa-edit"></i></button>
                <button onClick={() => window.confirm('Tem certeza que deseja excluir este produto?') && onDelete(product.id)} className="bg-red-500 text-white w-8 h-8 rounded-md hover:bg-red-600" aria-label={`Deletar ${product.name}`}><i className="fas fa-trash"></i></button>
            </div>
        </div>
    );
};

interface SortableCategoryItemProps {
    category: Category;
    onEdit: (category: Category) => void;
    onDelete: (categoryId: string) => void;
    onStatusChange: (categoryId: string, active: boolean) => void;
}

const SortableCategoryItem: React.FC<SortableCategoryItemProps> = ({ category, onEdit, onDelete, onStatusChange }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: category.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 'auto',
        boxShadow: isDragging ? '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' : 'none',
    };

    return (
        <div ref={setNodeRef} style={style} className={`bg-gray-50 p-3 rounded-lg flex justify-between items-center transition-opacity ${!category.active ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-4">
                <button {...attributes} {...listeners} className="cursor-grab touch-none p-2" aria-label="Mover categoria">
                    <i className="fas fa-grip-vertical text-gray-500 hover:text-gray-800"></i>
                </button>
                <p className="font-bold">{category.name}</p>
            </div>
            <div className="flex items-center gap-4">
                 <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={category.active} onChange={e => onStatusChange(category.id, e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
                <button onClick={() => onEdit(category)} className="bg-blue-500 text-white w-8 h-8 rounded-md hover:bg-blue-600" aria-label={`Editar ${category.name}`}><i className="fas fa-edit"></i></button>
                <button onClick={() => window.confirm(`Tem certeza que deseja excluir a categoria "${category.name}"?`) && onDelete(category.id)} className="bg-red-500 text-white w-8 h-8 rounded-md hover:bg-red-600" aria-label={`Deletar ${category.name}`}><i className="fas fa-trash"></i></button>
            </div>
        </div>
    );
};

// Define a type for the tabs in the admin UI to handle the split view
type OrderTabKey = 'accepted' | 'reserved' | 'pronto' | 'emRota' | 'completed' | 'cancelled';


export const AdminSection: React.FC<AdminSectionProps> = (props) => {
    const { 
        allProducts, allCategories, isStoreOnline, siteSettings, orders,
        onSaveProduct, onDeleteProduct, onProductStatusChange, onProductStockStatusChange, onStoreStatusChange,
        onSaveCategory, onDeleteCategory, onCategoryStatusChange, onReorderProducts, onReorderCategories,
        onSeedDatabase, onSaveSiteSettings, onUpdateOrderStatus, onUpdateOrderPaymentStatus, onUpdateOrderReservationTime,
        onDeleteOrder, onPermanentDeleteOrder, onRefundOrder, refundingOrderId
    } = props;
    
    const [user, setUser] = useState<firebase.User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('status');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | React.ReactNode>('');
    const [showAdminPanel, setShowAdminPanel] = useState(window.location.hash === '#admin');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    
    const [localProducts, setLocalProducts] = useState<Product[]>(allProducts);
    const [localCategories, setLocalCategories] = useState<Category[]>(allCategories);

    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

    // State for order management
    const [orderSearchTerm, setOrderSearchTerm] = useState('');
    const [orderFilters, setOrderFilters] = useState({ orderType: '', paymentMethod: '', paymentStatus: '', orderStatus: '' });
    const [showFilters, setShowFilters] = useState(false);
    const [activeOrdersTab, setActiveOrdersTab] = useState<OrderTabKey>('accepted');
    const [isTrashVisible, setIsTrashVisible] = useState(false);

    // State for sound notification
    const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
        const saved = localStorage.getItem('soundNotificationEnabled');
        return saved !== 'false'; // Enabled by default
    });
    const prevPendingOrdersCount = useRef(0);
    const audioRef = useRef<HTMLAudioElement>(null);


    useEffect(() => setLocalProducts(allProducts), [allProducts]);
    useEffect(() => setLocalCategories([...allCategories].sort((a, b) => a.order - b.order)), [allCategories]);

    useEffect(() => {
        if (!auth) {
            setError("Falha na conexão com o serviço de autenticação.");
            setAuthLoading(false);
            return;
        }
        const unsubscribe = auth.onAuthStateChanged(user => { setUser(user); setAuthLoading(false); });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const handleHashChange = () => setShowAdminPanel(window.location.hash === '#admin');
        window.addEventListener('hashchange', handleHashChange, false);
        return () => window.removeEventListener('hashchange', handleHashChange, false);
    }, []);

    // Scroll main admin tabs into view
    useEffect(() => {
        if (activeTab) {
            const activeTabElement = document.getElementById(`admin-tab-${activeTab}`);
            if (activeTabElement) {
                activeTabElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }
        }
    }, [activeTab]);

    // Scroll order status sub-tabs into view
    useEffect(() => {
        if (activeOrdersTab) {
            const activeSubTabElement = document.getElementById(`order-status-tab-${activeOrdersTab}`);
            if (activeSubTabElement) {
                activeSubTabElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }
        }
    }, [activeOrdersTab]);


    const pendingOrdersCount = useMemo(() => orders.filter(o => o.status === 'pending').length, [orders]);
    
    // Counter for the main "Pedidos" tab. Sums all active orders.
    const activeOrdersCount = useMemo(() => {
        // Active statuses are all those that are not final (completed, cancelled) or meta-states (deleted).
        const activeStatuses: OrderStatus[] = ['pending', 'accepted', 'reserved', 'ready'];
        return orders.filter(o => activeStatuses.includes(o.status)).length;
    }, [orders]);


    // Effect for sound notification using HTML <audio> element
    useEffect(() => {
        if (isSoundEnabled && user && pendingOrdersCount > prevPendingOrdersCount.current) {
            audioRef.current?.play().catch(error => console.error("Audio play failed:", error));
        }
        prevPendingOrdersCount.current = pendingOrdersCount;
    }, [pendingOrdersCount, isSoundEnabled, user]);


    const toggleSound = () => {
        const newState = !isSoundEnabled;
        setIsSoundEnabled(newState);
        localStorage.setItem('soundNotificationEnabled', String(newState));

        // Mobile/iOS unlock: play and immediately pause on the first user interaction
        // to grant permission for programmatic playback later.
        if (newState && audioRef.current) {
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise.then(_ => {
                    audioRef.current?.pause();
                }).catch(error => {
                    // Autoplay was prevented. This is expected on some browsers.
                    // The user interaction of clicking the button is what matters.
                    console.info("Audio unlock interaction complete.", error);
                });
            }
        }
    };


    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

    const handleProductDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const sortedProducts = [...localProducts].sort((a, b) => a.orderIndex - b.orderIndex);
        const oldIndex = sortedProducts.findIndex(p => p.id === active.id);
        const newIndex = sortedProducts.findIndex(p => p.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;
        const reordered = arrayMove(sortedProducts, oldIndex, newIndex);
        onReorderProducts(reordered.map((p, index) => ({ id: p.id, orderIndex: index })));
    };

    const handleCategoryDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = localCategories.findIndex(c => c.id === active.id);
        const newIndex = localCategories.findIndex(c => c.id === over.id);
        const reordered = arrayMove(localCategories, oldIndex, newIndex);
        onReorderCategories(reordered.map((c, index) => ({ id: c.id, order: index })));
    };
    
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoggingIn(true);
        if (!auth) {
            setError('Serviço de autenticação não disponível.');
            setIsLoggingIn(false);
            return;
        }
        try {
            await auth.signInWithEmailAndPassword(email, password);
        } catch (err: any) {
             let friendlyMessage: string | React.ReactNode = 'Ocorreu um erro inesperado.';
            switch (err.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                     friendlyMessage = (
                        <div className="text-center text-sm"><p className="font-bold">Acesso negado.</p><p className="mt-2">Se você é um administrador e está com problemas, entre em contato com o suporte.</p><button type="button" onClick={() => setIsSupportModalOpen(true)} className="mt-4 w-full bg-brand-olive-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-opacity-90"><i className="fas fa-envelope mr-2"></i>Entrar em Contato</button></div>
                    );
                    break;
                case 'auth/invalid-email': friendlyMessage = 'O formato do e-mail é inválido.'; break;
                case 'auth/network-request-failed': friendlyMessage = 'Erro de rede. Verifique sua conexão.'; break;
            }
            setError(friendlyMessage);
        } finally {
            setIsLoggingIn(false);
        }
    };
    
    const handleLogout = async () => {
        if (!auth) return;
        try { await auth.signOut(); setEmail(''); setPassword(''); window.location.hash = ''; }
        catch (error) { console.error("Error signing out: ", error); }
    };

    const handleAddNewProduct = () => { setEditingProduct(null); setIsProductModalOpen(true); };
    const handleEditProduct = (p: Product) => { setEditingProduct(p); setIsProductModalOpen(true); };
    const handleAddNewCategory = () => { setEditingCategory(null); setIsCategoryModalOpen(true); };
    const handleEditCategory = (c: Category) => { setEditingCategory(c); setIsCategoryModalOpen(true); };

    const handleSeedDatabase = async () => { if (window.confirm('Tem certeza? Isso adicionará dados iniciais.')) { try { await onSeedDatabase(); alert('Banco de dados populado!'); } catch (e) { console.error(e); alert("Erro ao popular o banco."); } } };
    const handleBackup = () => { try { const backupData = { products: allProducts, categories: allCategories, store_config: { status: { isOpen: isStoreOnline }, site_settings: siteSettings }, backupDate: new Date().toISOString() }; const jsonString = JSON.stringify(backupData, null, 2); const blob = new Blob([jsonString], { type: 'application/json' }); const href = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = href; link.download = `backup_${new Date().toISOString().split('T')[0]}.json`; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(href); alert('Backup concluído!'); } catch (e) { console.error(e); alert("Falha no backup."); } };
    
    const activeOrders = useMemo(() => orders.filter(o => o.status !== 'deleted' && o.status !== 'awaiting-payment'), [orders]);
    const deletedOrders = useMemo(() => orders.filter(o => o.status === 'deleted'), [orders]);

    const filteredOrders = useMemo(() => {
        const source = isTrashVisible ? deletedOrders : activeOrders;
        return source.filter(order => {
            const searchTermLower = orderSearchTerm.toLowerCase();
            const matchesSearch = !searchTermLower ||
                order.customer.name.toLowerCase().includes(searchTermLower) ||
                order.customer.phone.toLowerCase().includes(searchTermLower);
            
            const matchesOrderType = !orderFilters.orderType || order.customer.orderType === orderFilters.orderType;
            const matchesPaymentMethod = !orderFilters.paymentMethod || order.paymentMethod === orderFilters.paymentMethod;
            const matchesPaymentStatus = !orderFilters.paymentStatus || order.paymentStatus === orderFilters.paymentStatus;
            const matchesOrderStatus = !orderFilters.orderStatus || order.status === orderFilters.orderStatus;

            return matchesSearch && matchesOrderType && matchesPaymentMethod && matchesPaymentStatus && matchesOrderStatus;
        });
    }, [orders, orderSearchTerm, orderFilters, isTrashVisible, activeOrders, deletedOrders]);

    const getOrderTabCount = (tab: OrderTabKey) => {
        switch(tab) {
            case 'pronto':
                return filteredOrders.filter(o => o.status === 'ready' && o.customer.orderType === 'pickup').length;
            case 'emRota':
                 return filteredOrders.filter(o => o.status === 'ready' && o.customer.orderType === 'delivery').length;
            case 'accepted':
            case 'reserved':
            case 'completed':
            case 'cancelled':
                return filteredOrders.filter(o => o.status === tab).length;
            default:
                return 0;
        }
    };
    
    const tabOrders = useMemo(() => {
        switch (activeOrdersTab) {
            case 'pronto':
                return filteredOrders.filter(o => o.status === 'ready' && o.customer.orderType === 'pickup');
            case 'emRota':
                return filteredOrders.filter(o => o.status === 'ready' && o.customer.orderType === 'delivery');
            default:
                return filteredOrders.filter(o => o.status === activeOrdersTab);
        }
    }, [filteredOrders, activeOrdersTab]);
    
    const scrollToContent = (elementId: string) => {
        const element = document.getElementById(elementId);
        if (!element) return;
    
        const mainHeaderHeight = 80; // Height of the main sticky header
        let totalOffset = mainHeaderHeight;
    
        // Check if the sticky order tabs are visible and add their height
        if (activeTab === 'orders') {
            const orderTabsHeader = document.getElementById('sticky-order-tabs');
            if (orderTabsHeader) {
                // Check if it's actually sticky (in the viewport)
                const rect = orderTabsHeader.getBoundingClientRect();
                if (rect.top <= mainHeaderHeight) {
                    totalOffset += orderTabsHeader.offsetHeight;
                }
            }
        }
    
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - totalOffset;
    
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    };

    const handleMainTabClick = (tab: string) => {
        setActiveTab(tab);
        setTimeout(() => scrollToContent(`admin-content-${tab}`), 50);
    };

    const handleOrderSubTabClick = (tabKey: OrderTabKey) => {
        setActiveOrdersTab(tabKey);
        setTimeout(() => scrollToContent('order-list-container'), 50);
    };


    if (!showAdminPanel) return null;
    if (authLoading) return <section id="admin" className="py-20 bg-brand-ivory-50"><div className="text-center"><i className="fas fa-spinner fa-spin text-4xl text-accent"></i></div></section>;
    if (!user) return (<> <section id="admin" className="py-20 bg-brand-ivory-50"> <div className="container mx-auto px-4 max-w-md"> <div className="bg-white p-8 rounded-2xl shadow-lg border"> <h2 className="text-3xl font-bold text-center mb-6"><i className="fas fa-shield-alt mr-2"></i>Painel</h2> <form onSubmit={handleLogin}> <div className="mb-4"> <label className="block font-semibold mb-2" htmlFor="admin-email">Email</label> <input id="admin-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-accent" required disabled={isLoggingIn} /> </div> <div className="mb-6"> <label className="block font-semibold mb-2" htmlFor="admin-password">Senha</label> <input id="admin-password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-accent" required disabled={isLoggingIn} /> </div> {error && <div className="text-red-600 mb-4 bg-red-50 p-3 rounded-lg border border-red-200">{error}</div>} <button type="submit" className="w-full bg-accent text-white font-bold py-3 rounded-lg hover:bg-opacity-90 disabled:bg-opacity-70 flex justify-center" disabled={isLoggingIn}>{isLoggingIn ? <i className="fas fa-spinner fa-spin"></i> : 'Entrar'}</button> </form> </div> </div> </section> <SupportModal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} /> </>);

    const OrderStatusTabs: OrderTabKey[] = ['accepted', 'reserved', 'pronto', 'emRota', 'completed', 'cancelled'];

    return (
        <>
            <audio ref={audioRef} src={notificationSound} preload="auto" />
            <section id="admin" className="py-20 bg-brand-ivory-50">
                <div className="container mx-auto px-4">
                    <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b">
                            <div className="flex items-center gap-4">
                                <h2 className="text-3xl font-bold">Painel Administrativo</h2>
                                <button 
                                    onClick={toggleSound} 
                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isSoundEnabled ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                    title={isSoundEnabled ? 'Desativar som de notificação' : 'Ativar som de notificação'}
                                >
                                    <i className={`fas ${isSoundEnabled ? 'fa-bell' : 'fa-bell-slash'}`}></i>
                                </button>
                            </div>
                            <button onClick={handleLogout} className="bg-red-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-600"><i className="fas fa-sign-out-alt mr-2"></i>Sair</button>
                        </div>
                        <div className="border-b mb-6">
                            <div className="flex overflow-x-auto whitespace-nowrap scrollbar-hide -mx-4 px-2 sm:px-4">
                                {['status', 'orders', 'products', 'categories', 'customization', 'data'].map(tab => {
                                    const icons: { [key: string]: string } = { status: 'fa-store-alt', orders: 'fa-receipt', products: 'fa-pizza-slice', categories: 'fa-tags', customization: 'fa-paint-brush', data: 'fa-database' };
                                    const labels: { [key: string]: string } = { status: 'Status', orders: 'Pedidos', products: 'Produtos', categories: 'Categorias', customization: 'Personalização', data: 'Dados' };
                                    return (
                                        <button 
                                            key={tab} 
                                            id={`admin-tab-${tab}`}
                                            onClick={() => handleMainTabClick(tab)} 
                                            className={`relative flex-shrink-0 inline-flex items-center gap-2 py-3 px-4 font-semibold text-sm transition-colors ${activeTab === tab ? 'border-b-2 border-accent text-accent' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            <i className={`fas ${icons[tab]} w-5 text-center`}></i> <span>{labels[tab]}</span>
                                            {tab === 'orders' && activeOrdersCount > 0 && <span className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">{activeOrdersCount}</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div id="admin-content-status"> {activeTab === 'status' && ( <div> <h3 className="text-xl font-bold mb-4">Status da Pizzaria</h3> <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg"> <label htmlFor="store-status-toggle" className="relative inline-flex items-center cursor-pointer"> <input type="checkbox" id="store-status-toggle" className="sr-only peer" checked={isStoreOnline} onChange={e => onStoreStatusChange(e.target.checked)} /> <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 peer-checked:bg-green-600"></div> </label> <span className={`font-semibold text-lg ${isStoreOnline ? 'text-green-600' : 'text-red-600'}`}>{isStoreOnline ? 'Aberta' : 'Fechada'}</span> </div> </div> )} </div>
                        
                        <div id="admin-content-orders"> {activeTab === 'orders' && (
                             <div>
                                <h3 className="text-xl font-bold mb-4">Gerenciar Pedidos</h3>
                                <div className="bg-gray-50 p-3 rounded-lg border mb-4">
                                    <div className="flex flex-nowrap flex-row items-center gap-2 sm:gap-3">
                                        <div className="relative flex-grow">
                                            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                            <input type="text" placeholder="Buscar por nome ou telefone..." value={orderSearchTerm} onChange={e => setOrderSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-md" />
                                        </div>
                                        <div className="hidden sm:flex items-center gap-3">
                                            <select value={orderFilters.paymentStatus} onChange={e => setOrderFilters(f => ({...f, paymentStatus: e.target.value}))} className="px-3 py-2 border rounded-md bg-white">
                                                <option value="">Status Pgto.</option> <option value="paid">Pago</option> <option value="pending">Pendente</option>
                                            </select>
                                            <select value={orderFilters.orderStatus} onChange={e => setOrderFilters(f => ({...f, orderStatus: e.target.value}))} className="px-3 py-2 border rounded-md bg-white">
                                                <option value="">Status Pedido</option> <option value="completed">Finalizado</option> <option value="cancelled">Cancelado</option>
                                            </select>
                                            <select value={orderFilters.orderType} onChange={e => setOrderFilters(f => ({...f, orderType: e.target.value}))} className="px-3 py-2 border rounded-md bg-white">
                                                <option value="">Tipo</option> <option value="delivery">Entrega</option> <option value="pickup">Retirada</option> <option value="local">Local</option>
                                            </select>
                                        </div>
                                        <div className="sm:hidden flex-shrink-0 relative">
                                            <button onClick={() => setShowFilters(!showFilters)} className="w-10 h-10 bg-white border rounded-md flex items-center justify-center hover:bg-gray-100"><i className="fas fa-filter"></i></button>
                                            <div className={`absolute top-full right-0 mt-2 bg-white border rounded-lg shadow-xl p-4 z-40 w-64 ${showFilters ? 'block' : 'hidden'}`}>
                                                <div className="space-y-4">
                                                    <div><label className="block text-sm font-semibold mb-1">Status Pgto.</label><select value={orderFilters.paymentStatus} onChange={e => setOrderFilters(f => ({...f, paymentStatus: e.target.value}))} className="w-full px-3 py-2 border rounded-md bg-white"><option value="">Todos</option><option value="paid">Pago</option><option value="pending">Pendente</option></select></div>
                                                    <div><label className="block text-sm font-semibold mb-1">Status Pedido</label><select value={orderFilters.orderStatus} onChange={e => setOrderFilters(f => ({...f, orderStatus: e.target.value}))} className="w-full px-3 py-2 border rounded-md bg-white"><option value="">Todos</option><option value="completed">Finalizado</option><option value="cancelled">Cancelado</option></select></div>
                                                    <div><label className="block text-sm font-semibold mb-1">Tipo</label><select value={orderFilters.orderType} onChange={e => setOrderFilters(f => ({...f, orderType: e.target.value}))} className="w-full px-3 py-2 border rounded-md bg-white"><option value="">Todos</option><option value="delivery">Entrega</option><option value="pickup">Retirada</option><option value="local">Consumo Local</option></select></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {filteredOrders.filter(o => o.status === 'pending').length > 0 && !isTrashVisible && (
                                    <div className="mb-6">
                                        <h4 className="font-bold text-lg mb-2 text-yellow-600">Pendentes</h4>
                                        <div className="space-y-4">
                                            {filteredOrders.filter(o => o.status === 'pending').map(order => <OrderCard key={order.id} order={order} onUpdateStatus={onUpdateOrderStatus} onUpdatePaymentStatus={onUpdateOrderPaymentStatus} onUpdateReservationTime={onUpdateOrderReservationTime} onDelete={onDeleteOrder} onPermanentDelete={onPermanentDeleteOrder} onRefund={onRefundOrder} isRefunding={refundingOrderId === order.id} />)}
                                        </div>
                                    </div>
                                )}

                                <div className="border-t pt-4">
                                    <div id="sticky-order-tabs" className="sticky top-20 bg-brand-ivory-50/95 backdrop-blur-sm z-30 shadow-sm -mx-8">
                                        <div className="border-b">
                                            <div className="flex overflow-x-auto whitespace-nowrap scrollbar-hide px-8">
                                                {!isTrashVisible && OrderStatusTabs.map(tabKey => {
                                                    const count = getOrderTabCount(tabKey);
                                                    const showCounter = count > 0 && !['completed', 'cancelled'].includes(tabKey);
                                                    return (
                                                    <button 
                                                        key={tabKey} 
                                                        id={`order-status-tab-${tabKey}`}
                                                        onClick={() => handleOrderSubTabClick(tabKey)} 
                                                        className={`relative flex-shrink-0 inline-flex items-center gap-2 py-2 px-4 font-semibold text-sm ${activeOrdersTab === tabKey && !isTrashVisible ? 'border-b-2 border-accent text-accent' : 'text-gray-500 hover:text-gray-700'}`}
                                                    >
                                                        {{accepted: 'Aceitos', reserved: 'Reservas', pronto: 'Prontos', emRota: 'Em Rota', completed: 'Finalizados', cancelled: 'Cancelados'}[tabKey]}
                                                        {showCounter && <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{count}</span>}
                                                    </button>
                                                    )
                                                })}
                                                {isTrashVisible && (<div className="py-2 px-4 font-semibold text-accent"><i className="fas fa-trash-alt mr-2"></i>Lixeira</div>)}
                                            </div>
                                        </div>
                                    </div>

                                    <div id="order-list-container" className="mt-4 space-y-4">
                                        {isTrashVisible ? (
                                            deletedOrders.length > 0 ? deletedOrders.map(order => <OrderCard key={order.id} order={order} onUpdateStatus={onUpdateOrderStatus} onUpdatePaymentStatus={onUpdateOrderPaymentStatus} onUpdateReservationTime={onUpdateOrderReservationTime} onDelete={onDeleteOrder} onPermanentDelete={onPermanentDeleteOrder} onRefund={onRefundOrder} isRefunding={refundingOrderId === order.id} />) : <div className="text-center py-12"><p className="text-gray-500">Lixeira vazia.</p></div>
                                        ) : (
                                            tabOrders.length > 0 ? tabOrders.map(order => <OrderCard key={order.id} order={order} onUpdateStatus={onUpdateOrderStatus} onUpdatePaymentStatus={onUpdateOrderPaymentStatus} onUpdateReservationTime={onUpdateOrderReservationTime} onDelete={onDeleteOrder} onPermanentDelete={onPermanentDeleteOrder} onRefund={onRefundOrder} isRefunding={refundingOrderId === order.id} />) : <div className="text-center py-12"><p className="text-gray-500">Nenhum pedido nesta aba.</p></div>
                                        )}
                                    </div>
                                    
                                    <div className="mt-6 pt-6 border-t flex justify-end">
                                        <button onClick={() => setIsTrashVisible(!isTrashVisible)} className={`flex items-center gap-2 font-semibold py-2 px-4 rounded-lg transition-colors ${isTrashVisible ? 'bg-accent text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`} aria-label="Ver lixeira">
                                            <i className="fas fa-trash-alt"></i>
                                            <span>{isTrashVisible ? 'Voltar aos Pedidos' : 'Ver Lixeira'}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )} </div>
                        
                        <div id="admin-content-customization"> {activeTab === 'customization' && ( <SiteCustomizationTab settings={siteSettings} onSave={onSaveSiteSettings} /> )} </div>
                        <div id="admin-content-products"> {activeTab === 'products' && ( <div> <div className="flex justify-between items-center mb-4"> <h3 className="text-xl font-bold">Gerenciar Produtos</h3> <button onClick={handleAddNewProduct} className="bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90"><i className="fas fa-plus mr-2"></i>Novo Produto</button> </div> <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleProductDragEnd}> <div className="space-y-6"> {localCategories.map(category => { const categoryProducts = localProducts.filter(p => p.categoryId === category.id).sort((a, b) => a.orderIndex - b.orderIndex); return ( <div key={category.id}> <h4 className={`text-lg font-semibold mb-2 text-brand-olive-600 pb-1 border-b-2 border-brand-green-300 transition-opacity ${!category.active ? 'opacity-40' : ''}`}>{category.name}</h4> <SortableContext items={categoryProducts.map(p => p.id)} strategy={verticalListSortingStrategy}> <div className="space-y-3 min-h-[50px]"> {categoryProducts.map(product => <SortableProductItem key={product.id} product={product} isCategoryActive={category.active} onEdit={handleEditProduct} onDelete={onDeleteProduct} onStatusChange={onProductStatusChange} onStockStatusChange={onProductStockStatusChange} />)} </div> </SortableContext> </div> ) })} </div> </DndContext> </div> )} </div>
                        <div id="admin-content-categories"> {activeTab === 'categories' && ( <div> <div className="flex justify-between items-center mb-4"> <h3 className="text-xl font-bold">Gerenciar Categorias</h3> <button onClick={handleAddNewCategory} className="bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90"><i className="fas fa-plus mr-2"></i>Nova Categoria</button> </div> <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}> <SortableContext items={localCategories.map(c => c.id)} strategy={verticalListSortingStrategy}> <div className="space-y-3"> {localCategories.map(cat => <SortableCategoryItem key={cat.id} category={cat} onEdit={handleEditCategory} onDelete={onDeleteCategory} onStatusChange={onCategoryStatusChange} />)} </div> </SortableContext> </DndContext> </div> )} </div>
                        <div id="admin-content-data"> {activeTab === 'data' && ( <div> <h3 className="text-xl font-bold mb-4">Gerenciamento de Dados</h3> <div className="bg-gray-50 p-4 rounded-lg mb-6 border"> <h4 className="font-semibold text-lg mb-2">Backup</h4> <p className="text-gray-600 mb-3">Crie um backup completo dos seus dados.</p> <button onClick={handleBackup} className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700"><i className="fas fa-download mr-2"></i>Fazer Backup</button> </div> <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200"> <h4 className="font-semibold text-lg mb-2 text-yellow-800"><i className="fas fa-exclamation-triangle mr-2"></i>Ação Perigosa</h4> <p className="text-yellow-700 mb-3">Popula o banco com dados iniciais. Use apenas uma vez.</p> <button onClick={handleSeedDatabase} className="bg-yellow-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-yellow-600"><i className="fas fa-database mr-2"></i>Popular Banco</button> </div> </div> )} </div>
                    </div>
                </div>
            </section>
            <ProductModal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} onSave={onSaveProduct} product={editingProduct} categories={allCategories} />
            <CategoryModal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} onSave={onSaveCategory} category={editingCategory} />
            <SupportModal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} />
        </>
    );
};