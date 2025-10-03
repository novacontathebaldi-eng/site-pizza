import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product, Category, SiteSettings, Order, OrderStatus, PaymentStatus, Promotion, AnnouncementAudio } from '../types';
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
import { PromotionModal } from './PromotionModal';
import { AudioSettingsTab } from './AudioSettingsTab';
import { NotificationSettingsTab } from './NotificationSettingsTab';

interface AdminSectionProps {
    allProducts: Product[];
    allCategories: Category[];
    isStoreOnline: boolean;
    siteSettings: SiteSettings;
    orders: Order[];
    promotions: Promotion[];
    activeTab: string;
    setActiveTab: (tab: string) => void;
    activeOrdersTab: OrderStatus;
    setActiveOrdersTab: (tab: OrderStatus) => void;
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
    onSavePromotion: (promotion: Promotion, imageFile: File | null) => Promise<void>;
    onDeletePromotion: (promotionId: string) => Promise<void>;
    onReorderPromotions: (promosToUpdate: { id: string; order: number }[]) => Promise<void>;
}

export const AdminSection: React.FC<AdminSectionProps> = (props) => {
    const { 
        allProducts, allCategories, isStoreOnline, siteSettings, orders, promotions,
        activeTab, setActiveTab, activeOrdersTab, setActiveOrdersTab,
        onSaveProduct, onDeleteProduct, onProductStatusChange, onProductStockStatusChange, onStoreStatusChange,
        onSaveCategory, onDeleteCategory, onCategoryStatusChange, onReorderProducts, onReorderCategories,
        onSeedDatabase, onSaveSiteSettings, onUpdateOrderStatus, onUpdateOrderPaymentStatus, onUpdateOrderReservationTime,
        onDeleteOrder, onPermanentDeleteOrder, onSavePromotion, onDeletePromotion, onReorderPromotions
    } = props;
    
    const [user, setUser] = useState<firebase.User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | React.ReactNode>('');
    const [showAdminPanel, setShowAdminPanel] = useState(window.location.hash === '#admin');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    
    const [localProducts, setLocalProducts] = useState<Product[]>(allProducts);
    const [localCategories, setLocalCategories] = useState<Category[]>(allCategories);
    const [localPromotions, setLocalPromotions] = useState<Promotion[]>(promotions);

    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);

    const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

    const [activeSettingsTab, setActiveSettingsTab] = useState('audio');

    // State for order management
    const [orderSearchTerm, setOrderSearchTerm] = useState('');
    const [orderFilters, setOrderFilters] = useState({ orderType: '', paymentMethod: '', paymentStatus: '', orderStatus: '' });
    const [showFilters, setShowFilters] = useState(false);
    const [isTrashVisible, setIsTrashVisible] = useState(false);


    useEffect(() => setLocalProducts(allProducts), [allProducts]);
    useEffect(() => setLocalCategories([...allCategories].sort((a, b) => a.order - b.order)), [allCategories]);
    useEffect(() => setLocalPromotions([...promotions].sort((a, b) => a.order - b.order)), [promotions]);


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

    const pendingOrdersCount = useMemo(() => orders.filter(o => o.status === 'pending').length, [orders]);


    // Effect for scrolling order tabs into view
    useEffect(() => {
        if (activeTab === 'orders') {
            const tabId = isTrashVisible ? `order-tab-trash` : `order-tab-${activeOrdersTab}`;
            const activeTabElement = document.getElementById(tabId);
            
            if (activeTabElement) {
                activeTabElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }
        }
    }, [activeOrdersTab, isTrashVisible, activeTab]);

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

    const handlePromotionDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = localPromotions.findIndex(p => p.id === active.id);
        const newIndex = localPromotions.findIndex(p => p.id === over.id);
        const reordered = arrayMove(localPromotions, oldIndex, newIndex);
        onReorderPromotions(reordered.map((p, index) => ({ id: p.id, order: index })));
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
    const handleAddNewPromotion = () => { setEditingPromotion(null); setIsPromotionModalOpen(true); };
    const handleEditPromotion = (p: Promotion) => { setEditingPromotion(p); setIsPromotionModalOpen(true); };


    const handleSeedDatabase = async () => { if (window.confirm('Tem certeza? Isso recriará todos os dados iniciais e não deve ser usado em um site em produção.')) { try { await onSeedDatabase(); alert('Banco de dados populado!'); } catch (e) { console.error(e); alert("Erro ao popular o banco."); } } };
    const handleBackup = () => { try { const backupData = { products: allProducts, categories: allCategories, promotions: promotions, store_config: { status: { isOpen: isStoreOnline }, site_settings: siteSettings }, backupDate: new Date().toISOString() }; const jsonString = JSON.stringify(backupData, null, 2); const blob = new Blob([jsonString], { type: 'application/json' }); const href = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = href; link.download = `backup_${new Date().toISOString().split('T')[0]}.json`; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(href); alert('Backup concluído!'); } catch (e) { console.error(e); alert("Falha no backup."); } };
    
    const activeOrders = useMemo(() => orders.filter(o => o.status !== 'deleted'), [orders]);
    const deletedOrders = useMemo(() => orders.filter(o => o.status === 'deleted'), [orders]);

    const filteredOrders = useMemo(() => {
        const source = isTrashVisible ? deletedOrders : activeOrders;
        return source.filter(order => {
            const searchTermLower = orderSearchTerm.toLowerCase();
            const matchesSearch = !searchTermLower ||
                order.customer.name.toLowerCase().includes(searchTermLower) ||
                order.customer.phone.toLowerCase().includes(searchTermLower) ||
                order.id.toLowerCase().includes(searchTermLower);
            
            const matchesOrderType = !orderFilters.orderType || order.customer.orderType === orderFilters.orderType;
            const matchesPaymentMethod = !orderFilters.paymentMethod || order.paymentMethod === orderFilters.paymentMethod;
            const matchesPaymentStatus = !orderFilters.paymentStatus || order.paymentStatus === orderFilters.paymentStatus;
            
            // This filter should only apply if we are NOT in a specific status tab
            const matchesOrderStatus = !orderFilters.orderStatus || order.status === orderFilters.orderStatus;

            return matchesSearch && matchesOrderType && matchesPaymentMethod && matchesPaymentStatus && matchesOrderStatus;
        });
    }, [orders, orderSearchTerm, orderFilters, isTrashVisible, activeOrders, deletedOrders]);

    const getOrderStatusCount = (status: OrderStatus) => filteredOrders.filter(o => o.status === status).length;
    const tabOrders = useMemo(() => filteredOrders.filter(o => o.status === activeOrdersTab), [filteredOrders, activeOrdersTab]);
    
    if (!showAdminPanel) return null;
    if (authLoading) return <section id="admin" className="py-20 bg-brand-ivory-50"><div className="text-center"><i className="fas fa-spinner fa-spin text-4xl text-accent"></i></div></section>;
    if (!user) return (<> <section id="admin" className="py-20 bg-brand-ivory-50"> <div className="container mx-auto px-4 max-w-md"> <div className="bg-white p-8 rounded-2xl shadow-lg border"> <h2 className="text-3xl font-bold text-center mb-6"><i className="fas fa-shield-alt mr-2"></i>Painel</h2> <form onSubmit={handleLogin}> <div className="mb-4"> <label className="block font-semibold mb-2" htmlFor="admin-email">Email</label> <input id="admin-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-accent" required disabled={isLoggingIn} /> </div> <div className="mb-6"> <label className="block font-semibold mb-2" htmlFor="admin-password">Senha</label> <input id="admin-password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-accent" required disabled={isLoggingIn} /> </div> {error && <div className="text-red-600 mb-4 bg-red-50 p-3 rounded-lg border border-red-200">{error}</div>} <button type="submit" className="w-full bg-accent text-white font-bold py-3 rounded-lg hover:bg-opacity-90 disabled:bg-opacity-70 flex justify-center" disabled={isLoggingIn}>{isLoggingIn ? <i className="fas fa-spinner fa-spin"></i> : 'Entrar'}</button> </form> </div> </div> </section> <SupportModal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} /> </>);

    const OrderStatusTabs: OrderStatus[] = ['pending', 'accepted', 'reserved', 'ready', 'completed', 'cancelled'];
    
    const SortableProductItem: React.FC<{
        product: Product;
        isCategoryActive: boolean;
        onEdit: (product: Product) => void;
        onDelete: () => void;
        onStatusChange: (productId: string, active: boolean) => void;
        onStockStatusChange: (productId: string, stockStatus: 'available' | 'out_of_stock') => void;
    }> = ({ product, isCategoryActive, onEdit, onDelete, onStatusChange, onStockStatusChange }) => {
        const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: product.id });
        const style = { transform: CSS.Transform.toString(transform), transition };
    
        return (
            <div ref={setNodeRef} style={style} className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${!product.active || !isCategoryActive ? 'bg-gray-100 opacity-60' : 'bg-white'}`}>
                <button type="button" {...attributes} {...listeners} className="cursor-grab p-2 text-gray-400 hover:text-gray-600">
                    <i className="fas fa-grip-vertical"></i>
                </button>
                <img src={product.imageUrl} alt={product.name} className="w-16 h-16 rounded-md object-cover flex-shrink-0" />
                <div className="flex-grow">
                    <p className="font-bold">{product.name}</p>
                    <p className="text-sm text-gray-500">{Object.entries(product.prices).map(([size, price]) => `${size}: R$${price.toFixed(2)}`).join(' / ')}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <select 
                        value={product.stockStatus || 'available'} 
                        onChange={(e) => onStockStatusChange(product.id, e.target.value as 'available' | 'out_of_stock')}
                        className={`text-xs font-semibold p-1 rounded border ${product.stockStatus === 'out_of_stock' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200'}`}
                    >
                        <option value="available">Disponível</option>
                        <option value="out_of_stock">Esgotado</option>
                    </select>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={product.active} onChange={e => onStatusChange(product.id, e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 peer-checked:bg-green-600"></div>
                    </label>
                    <button type="button" onClick={() => onEdit(product)} className="w-9 h-9 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center hover:bg-blue-200"><i className="fas fa-pen"></i></button>
                    <button type="button" onClick={onDelete} className="w-9 h-9 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-200"><i className="fas fa-trash"></i></button>
                </div>
            </div>
        );
    };
    const SortableCategoryItem: React.FC<{
        category: Category;
        onEdit: (category: Category) => void;
        onDelete: () => void;
        onStatusChange: (categoryId: string, active: boolean) => void;
    }> = ({ category, onEdit, onDelete, onStatusChange }) => {
        const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: category.id });
        const style = { transform: CSS.Transform.toString(transform), transition };
    
        return (
            <div ref={setNodeRef} style={style} className={`flex items-center gap-4 p-3 rounded-lg ${!category.active ? 'bg-gray-100 opacity-60' : 'bg-white'}`}>
                <button type="button" {...attributes} {...listeners} className="cursor-grab p-2 text-gray-400 hover:text-gray-600">
                    <i className="fas fa-grip-vertical"></i>
                </button>
                <div className="flex-grow">
                    <p className="font-bold">{category.name}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={category.active} onChange={e => onStatusChange(category.id, e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 peer-checked:bg-green-600"></div>
                    </label>
                    <button type="button" onClick={() => onEdit(category)} className="w-9 h-9 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center hover:bg-blue-200"><i className="fas fa-pen"></i></button>
                    <button type="button" onClick={onDelete} className="w-9 h-9 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-200"><i className="fas fa-trash"></i></button>
                </div>
            </div>
        );
    };

    const SortablePromotionItem: React.FC<{ promotion: Promotion }> = ({ promotion }) => {
        const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: promotion.id });
        const style = { transform: CSS.Transform.toString(transform), transition };

        return (
             <div ref={setNodeRef} style={style} className={`flex items-center gap-4 p-3 rounded-lg ${!promotion.active ? 'bg-gray-100 opacity-60' : 'bg-white'}`}>
                <button type="button" {...attributes} {...listeners} className="cursor-grab p-2 text-gray-400 hover:text-gray-600">
                    <i className="fas fa-grip-vertical"></i>
                </button>
                 <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center border overflow-hidden flex-shrink-0">
                    {promotion.imageUrl ? <img src={promotion.imageUrl} alt="Prévia" className="w-full h-full object-cover" /> : <i className="fas fa-bullhorn text-3xl text-gray-300"></i>}
                </div>
                <div className="flex-grow">
                    <p className="font-bold">{promotion.title}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={promotion.active} onChange={e => onSavePromotion({ ...promotion, active: e.target.checked }, null)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 peer-checked:bg-green-600"></div>
                    </label>
                    <button type="button" onClick={() => handleEditPromotion(promotion)} className="w-9 h-9 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center hover:bg-blue-200"><i className="fas fa-pen"></i></button>
                    <button type="button" onClick={() => window.confirm(`Tem certeza que quer deletar "${promotion.title}"?`) && onDeletePromotion(promotion.id)} className="w-9 h-9 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-200"><i className="fas fa-trash"></i></button>
                </div>
            </div>
        )
    }

    return (
        <>
            <section id="admin" className="py-20 bg-brand-ivory-50">
                <div className="container mx-auto px-4">
                    <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b">
                            <h2 className="text-3xl font-bold">Painel Administrativo</h2>
                            <button onClick={handleLogout} className="bg-red-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-600"><i className="fas fa-sign-out-alt mr-2"></i>Sair</button>
                        </div>
                        <div className="border-b mb-6">
                            <div className="flex overflow-x-auto whitespace-nowrap scrollbar-hide -mx-4 px-2 sm:px-4">
                                {['status', 'orders', 'products', 'categories', 'promotions', 'settings'].map(tab => {
                                    const icons: { [key: string]: string } = { status: 'fa-store-alt', orders: 'fa-receipt', products: 'fa-pizza-slice', categories: 'fa-tags', promotions: 'fa-bullhorn', settings: 'fa-cogs' };
                                    const labels: { [key: string]: string } = { status: 'Status', orders: 'Pedidos', products: 'Produtos', categories: 'Categorias', promotions: 'Promoções e Anúncios', settings: 'Configurações' };
                                    return (
                                        <button key={tab} onClick={() => setActiveTab(tab)} className={`relative flex-shrink-0 inline-flex items-center gap-2 py-3 px-4 font-semibold text-sm transition-colors ${activeTab === tab ? 'border-b-2 border-accent text-accent' : 'text-gray-500 hover:text-gray-700'}`}>
                                            <i className={`fas ${icons[tab]} w-5 text-center`}></i> <span>{labels[tab]}</span>
                                            {tab === 'orders' && pendingOrdersCount > 0 && <span className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">{pendingOrdersCount}</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {activeTab === 'status' && ( <div> <h3 className="text-xl font-bold mb-4">Status da Pizzaria</h3> <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg"> <label htmlFor="store-status-toggle" className="relative inline-flex items-center cursor-pointer"> <input type="checkbox" id="store-status-toggle" className="sr-only peer" checked={isStoreOnline} onChange={e => onStoreStatusChange(e.target.checked)} /> <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 peer-checked:bg-green-600"></div> </label> <span className={`font-semibold text-lg ${isStoreOnline ? 'text-green-600' : 'text-red-600'}`}>{isStoreOnline ? 'Aberta' : 'Fechada'}</span> </div> </div> )}
                        
                        {activeTab === 'orders' && ( 
                            <div>
                                <h3 className="text-xl font-bold mb-4">Gerenciar Pedidos</h3>
                                 <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
                                    <div className="flex flex-wrap items-center gap-4">
                                        <div className="relative flex-grow">
                                            <input type="text" placeholder="Buscar por cliente, telefone ou ID..." value={orderSearchTerm} onChange={e => setOrderSearchTerm(e.target.value)} className="w-full px-4 py-2 border rounded-lg pl-10" />
                                            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                        </div>
                                        <button onClick={() => setShowFilters(!showFilters)} className="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">
                                            <i className="fas fa-filter mr-2"></i>Filtros
                                        </button>
                                    </div>
                                    {showFilters && (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 animate-fade-in-up">
                                            {/* Filter selects here */}
                                        </div>
                                    )}
                                </div>

                                <div className="border-b mb-4">
                                    <div className="flex overflow-x-auto whitespace-nowrap scrollbar-hide -mx-4 px-2 sm:px-4">
                                        {OrderStatusTabs.map(status => {
                                             const labels: { [key in OrderStatus]?: string } = { pending: 'Pendentes', accepted: 'Aceitos', reserved: 'Reservas', ready: 'Prontos', completed: 'Finalizados', cancelled: 'Cancelados' };
                                             if (!labels[status]) return null;
                                             const count = getOrderStatusCount(status);
                                            return (
                                                <button key={status} id={`order-tab-${status}`} onClick={() => { setActiveOrdersTab(status); setIsTrashVisible(false); }} className={`relative flex-shrink-0 inline-flex items-center gap-2 py-2 px-4 font-semibold text-sm ${activeOrdersTab === status && !isTrashVisible ? 'border-b-2 border-accent text-accent' : 'text-gray-500'}`}>
                                                   {labels[status]} {count > 0 && <span className="bg-gray-200 text-gray-600 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{count}</span>}
                                                </button>
                                            )
                                        })}
                                        <button id="order-tab-trash" onClick={() => setIsTrashVisible(true)} className={`relative flex-shrink-0 inline-flex items-center gap-2 py-2 px-4 font-semibold text-sm ${isTrashVisible ? 'border-b-2 border-red-500 text-red-500' : 'text-gray-500'}`}>
                                           <i className="fas fa-trash-alt"></i> Lixeira {deletedOrders.length > 0 && <span className="bg-gray-200 text-gray-600 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{deletedOrders.length}</span>}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {(isTrashVisible ? deletedOrders : tabOrders).length > 0 ? (
                                        (isTrashVisible ? deletedOrders : tabOrders).map(order => (
                                            <OrderCard key={order.id} order={order} onUpdateStatus={onUpdateOrderStatus} onUpdatePaymentStatus={onUpdateOrderPaymentStatus} onUpdateReservationTime={onUpdateOrderReservationTime} onDelete={onDeleteOrder} onPermanentDelete={onPermanentDeleteOrder} />
                                        ))
                                    ) : (
                                        <div className="text-center py-10 bg-gray-50 rounded-lg">
                                            <i className="fas fa-inbox text-4xl text-gray-300"></i>
                                            <p className="mt-4 font-semibold text-gray-500">Nenhum pedido encontrado nesta categoria.</p>
                                        </div>
                                    )}
                                </div>
                            </div> 
                        )}
                        
                        {activeTab === 'settings' && ( 
                             <div>
                                <h3 className="text-xl font-bold mb-4">Configurações</h3>
                                <div className="border-b mb-6">
                                    <div className="flex overflow-x-auto whitespace-nowrap scrollbar-hide -mx-4 px-2 sm:px-4">
                                        {['audio', 'notifications', 'personalization', 'data'].map(tab => {
                                            const labels: { [key: string]: string } = { audio: 'Áudio', notifications: 'Notificações', personalization: 'Personalização', data: 'Dados' };
                                            return (
                                                <button key={tab} onClick={() => setActiveSettingsTab(tab)} className={`flex-shrink-0 py-2 px-4 font-semibold text-sm ${activeSettingsTab === tab ? 'border-b-2 border-accent text-accent' : 'text-gray-500'}`}>
                                                    {labels[tab]}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                {activeSettingsTab === 'audio' && <AudioSettingsTab settings={siteSettings} onSave={onSaveSiteSettings} />}
                                {activeSettingsTab === 'notifications' && <NotificationSettingsTab settings={siteSettings} onSave={onSaveSiteSettings} />}
                                {activeSettingsTab === 'personalization' && <SiteCustomizationTab settings={siteSettings} onSave={onSaveSiteSettings} />}
                                {activeSettingsTab === 'data' && (
                                    <div>
                                        <div className="p-4 mb-6 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
                                            <h4 className="font-bold"><i className="fas fa-exclamation-triangle mr-2"></i>Área Técnica - Ações Perigosas</h4>
                                            <p className="text-sm mt-2">Atenção: As funcionalidades nesta seção são destinadas a usuários técnicos e podem impactar permanentemente o seu site. A opção 'Fazer Backup' é segura e recomendada. A opção 'Popular Banco' recriará todos os dados iniciais e não deve ser usada em um site em produção.</p>
                                        </div>
                                        <div className="flex gap-4">
                                            <button onClick={handleBackup} className="bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600"><i className="fas fa-download mr-2"></i>Fazer Backup</button>
                                            <button onClick={handleSeedDatabase} className="bg-orange-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-orange-600"><i className="fas fa-database mr-2"></i>Popular Banco</button>
                                        </div>
                                    </div>
                                )}
                             </div>
                        )}

                        {activeTab === 'promotions' && ( 
                            <div>
                                <h3 className="text-xl font-bold mb-4">Gerenciar Promoções e Anúncios</h3>
                                <div className="flex justify-between items-center mb-4">
                                    <p className="text-gray-600">Arraste os itens para reordenar.</p>
                                    <button onClick={handleAddNewPromotion} className="bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90">
                                        <i className="fas fa-plus mr-2"></i>Adicionar Anúncio
                                    </button>
                                </div>
                                <div className="space-y-2 bg-gray-50 p-2 rounded-lg">
                                     <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePromotionDragEnd}>
                                        <SortableContext items={localPromotions.map(p => p.id)} strategy={verticalListSortingStrategy}>
                                            {localPromotions.map(p => <SortablePromotionItem key={p.id} promotion={p} />)}
                                        </SortableContext>
                                    </DndContext>
                                </div>
                            </div>
                         )}

                        {activeTab === 'products' && ( 
                            <div>
                                <h3 className="text-xl font-bold mb-4">Gerenciar Produtos</h3>
                                <div className="flex justify-between items-center mb-4">
                                    <p className="text-gray-600">Arraste os produtos para reordenar.</p>
                                    <button onClick={handleAddNewProduct} className="bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90">
                                        <i className="fas fa-plus mr-2"></i>Adicionar Produto
                                    </button>
                                </div>
                                <div className="space-y-2 bg-gray-50 p-2 rounded-lg">
                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleProductDragEnd}>
                                        <SortableContext items={localProducts.map(p => p.id)} strategy={verticalListSortingStrategy}>
                                            {localProducts.map(p => {
                                                const category = allCategories.find(c => c.id === p.categoryId);
                                                return (
                                                    <SortableProductItem
                                                        key={p.id}
                                                        product={p}
                                                        isCategoryActive={category?.active ?? false}
                                                        onEdit={handleEditProduct}
                                                        onDelete={() => window.confirm(`Tem certeza que quer deletar "${p.name}"?`) && onDeleteProduct(p.id)}
                                                        onStatusChange={onProductStatusChange}
                                                        onStockStatusChange={onProductStockStatusChange}
                                                    />
                                                );
                                            })}
                                        </SortableContext>
                                    </DndContext>
                                </div>
                            </div> 
                        )}
                        {activeTab === 'categories' && ( 
                            <div>
                                <h3 className="text-xl font-bold mb-4">Gerenciar Categorias</h3>
                                <div className="flex justify-between items-center mb-4">
                                    <p className="text-gray-600">Arraste as categorias para reordenar.</p>
                                    <button onClick={handleAddNewCategory} className="bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90">
                                        <i className="fas fa-plus mr-2"></i>Adicionar Categoria
                                    </button>
                                </div>
                                <div className="space-y-2 bg-gray-50 p-2 rounded-lg">
                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}>
                                        <SortableContext items={localCategories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                                            {localCategories.map(c => (
                                                <SortableCategoryItem
                                                    key={c.id}
                                                    category={c}
                                                    onEdit={handleEditCategory}
                                                    onDelete={() => window.confirm(`Tem certeza que quer deletar "${c.name}"?`) && onDeleteCategory(c.id)}
                                                    onStatusChange={onCategoryStatusChange}
                                                />
                                            ))}
                                        </SortableContext>
                                    </DndContext>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>
            <ProductModal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} onSave={onSaveProduct} product={editingProduct} categories={allCategories} />
            <CategoryModal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} onSave={onSaveCategory} category={editingCategory} />
            <PromotionModal 
                isOpen={isPromotionModalOpen} 
                onClose={() => setIsPromotionModalOpen(false)}
                onSave={onSavePromotion}
                promotion={editingPromotion}
                allProducts={allProducts}
            />
            <SupportModal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} />
        </>
    );
};
