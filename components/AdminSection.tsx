import React, { useState, useEffect, useMemo } from 'react';
import { Product, Category, SiteSettings, Order, OrderStatus } from '../types';
import { ProductModal } from './ProductModal';
import { CategoryModal } from './CategoryModal';
import { SiteCustomizationTab } from './SiteCustomizationTab';
import { OrderCard } from './OrderCard'; // Import the new OrderCard component
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import firebase from 'firebase/compat/app';
import { auth } from '../services/firebase';
import { SupportModal } from './SupportModal';

interface AdminSectionProps {
    allProducts: Product[];
    allCategories: Category[];
    isStoreOnline: boolean;
    siteSettings: SiteSettings;
    orders: Order[]; // Add orders prop
    onSaveProduct: (product: Product) => Promise<void>;
    onDeleteProduct: (productId: string) => Promise<void>;
    onProductStatusChange: (productId: string, active: boolean) => Promise<void>;
    onStoreStatusChange: (isOnline: boolean) => Promise<void>;
    onSaveCategory: (category: Category) => Promise<void>;
    onDeleteCategory: (categoryId: string) => Promise<void>;
    onCategoryStatusChange: (categoryId: string, active: boolean) => Promise<void>;
    onReorderProducts: (productsToUpdate: { id: string; orderIndex: number }[]) => Promise<void>;
    onReorderCategories: (categoriesToUpdate: { id: string; order: number }[]) => Promise<void>;
    onSeedDatabase: () => Promise<void>;
    onSaveSiteSettings: (settings: SiteSettings, files: { [key: string]: File | null }) => Promise<void>;
    onUpdateOrderStatus: (orderId: string, status: OrderStatus, payload?: Partial<Pick<Order, 'pickupTimeEstimate'>>) => Promise<void>;
    onDeleteOrder: (orderId: string) => Promise<void>;
}

interface SortableProductItemProps {
    product: Product;
    isCategoryActive: boolean;
    onEdit: (product: Product) => void;
    onDelete: (productId: string) => void;
    onStatusChange: (productId: string, active: boolean) => void;
}

const SortableProductItem: React.FC<SortableProductItemProps> = ({ product, isCategoryActive, onEdit, onDelete, onStatusChange }) => {
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

    const itemOpacityClass = !isCategoryActive || !product.active ? 'opacity-50' : '';

    return (
        <div ref={setNodeRef} style={style} className={`bg-gray-50 p-3 rounded-lg flex justify-between items-center transition-opacity ${itemOpacityClass}`}>
            <div className="flex items-center gap-4">
                <button {...attributes} {...listeners} className="cursor-grab touch-none p-2" aria-label="Mover produto">
                    <i className="fas fa-grip-vertical text-gray-500 hover:text-gray-800"></i>
                </button>
                <p className="font-bold">{product.name}</p>
            </div>
            <div className="flex items-center gap-4">
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

export const AdminSection: React.FC<AdminSectionProps> = (props) => {
    const { 
        allProducts, allCategories, isStoreOnline, siteSettings, orders,
        onSaveProduct, onDeleteProduct, onProductStatusChange, onStoreStatusChange,
        onSaveCategory, onDeleteCategory, onCategoryStatusChange, onReorderProducts, onReorderCategories,
        onSeedDatabase, onSaveSiteSettings, onUpdateOrderStatus, onDeleteOrder
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
    const [orderFilters, setOrderFilters] = useState({ orderType: '', paymentMethod: '' });
    const [showFilters, setShowFilters] = useState(false);
    const [activeOrdersTab, setActiveOrdersTab] = useState<OrderStatus>('accepted');

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

    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

    // Reordering handlers remain the same
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

    // Modal handlers
    const handleAddNewProduct = () => { setEditingProduct(null); setIsProductModalOpen(true); };
    const handleEditProduct = (p: Product) => { setEditingProduct(p); setIsProductModalOpen(true); };
    const handleAddNewCategory = () => { setEditingCategory(null); setIsCategoryModalOpen(true); };
    const handleEditCategory = (c: Category) => { setEditingCategory(c); setIsCategoryModalOpen(true); };

    // Data management handlers
    const handleSeedDatabase = async () => { if (window.confirm('Tem certeza? Isso adicionará dados iniciais.')) { try { await onSeedDatabase(); alert('Banco de dados populado!'); } catch (e) { console.error(e); alert("Erro ao popular o banco."); } } };
    const handleBackup = () => { try { const backupData = { products: allProducts, categories: allCategories, store_config: { status: { isOpen: isStoreOnline }, site_settings: siteSettings }, backupDate: new Date().toISOString() }; const jsonString = JSON.stringify(backupData, null, 2); const blob = new Blob([jsonString], { type: 'application/json' }); const href = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = href; link.download = `backup_${new Date().toISOString().split('T')[0]}.json`; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(href); alert('Backup concluído!'); } catch (e) { console.error(e); alert("Falha no backup."); } };
    
    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const searchTermLower = orderSearchTerm.toLowerCase();
            const matchesSearch = !searchTermLower ||
                order.customer.name.toLowerCase().includes(searchTermLower) ||
                order.customer.phone.toLowerCase().includes(searchTermLower);
            
            const matchesOrderType = !orderFilters.orderType || order.customer.orderType === orderFilters.orderType;
            const matchesPaymentMethod = !orderFilters.paymentMethod || order.paymentMethod === orderFilters.paymentMethod;

            return matchesSearch && matchesOrderType && matchesPaymentMethod;
        });
    }, [orders, orderSearchTerm, orderFilters]);

    const pendingOrders = useMemo(() => filteredOrders.filter(o => o.status === 'pending'), [filteredOrders]);
    const tabOrders = useMemo(() => filteredOrders.filter(o => o.status === activeOrdersTab), [filteredOrders, activeOrdersTab]);
    const pendingOrdersCount = useMemo(() => orders.filter(o => o.status === 'pending').length, [orders]);

    if (!showAdminPanel) return null;
    if (authLoading) return <section id="admin" className="py-20 bg-brand-ivory-50"><div className="text-center"><i className="fas fa-spinner fa-spin text-4xl text-accent"></i></div></section>;
    if (!user) return (<> <section id="admin" className="py-20 bg-brand-ivory-50"> <div className="container mx-auto px-4 max-w-md"> <div className="bg-white p-8 rounded-2xl shadow-lg border"> <h2 className="text-3xl font-bold text-center mb-6"><i className="fas fa-shield-alt mr-2"></i>Painel</h2> <form onSubmit={handleLogin}> <div className="mb-4"> <label className="block font-semibold mb-2" htmlFor="admin-email">Email</label> <input id="admin-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-accent" required disabled={isLoggingIn} /> </div> <div className="mb-6"> <label className="block font-semibold mb-2" htmlFor="admin-password">Senha</label> <input id="admin-password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-accent" required disabled={isLoggingIn} /> </div> {error && <div className="text-red-600 mb-4 bg-red-50 p-3 rounded-lg border border-red-200">{error}</div>} <button type="submit" className="w-full bg-accent text-white font-bold py-3 rounded-lg hover:bg-opacity-90 disabled:bg-opacity-70 flex justify-center" disabled={isLoggingIn}>{isLoggingIn ? <i className="fas fa-spinner fa-spin"></i> : 'Entrar'}</button> </form> </div> </div> </section> <SupportModal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} /> </>);

    return (
        <>
            <section id="admin" className="py-20 bg-brand-ivory-50">
                <div className="container mx-auto px-4">
                    <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b"> <h2 className="text-3xl font-bold">Painel Administrativo</h2> <button onClick={handleLogout} className="bg-red-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-600"><i className="fas fa-sign-out-alt mr-2"></i>Sair</button> </div>
                        <div className="border-b mb-6">
                            <div className="flex overflow-x-auto whitespace-nowrap scrollbar-hide -mx-4 px-2 sm:px-4">
                                {['status', 'orders', 'products', 'categories', 'customization', 'data'].map(tab => {
                                    const icons: { [key: string]: string } = { status: 'fa-store-alt', orders: 'fa-receipt', products: 'fa-pizza-slice', categories: 'fa-tags', customization: 'fa-paint-brush', data: 'fa-database' };
                                    const labels: { [key: string]: string } = { status: 'Status', orders: 'Pedidos', products: 'Produtos', categories: 'Categorias', customization: 'Personalização', data: 'Dados' };
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
                                <div className="bg-gray-50 p-3 rounded-lg border mb-4">
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <div className="relative flex-grow">
                                            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                            <input type="text" placeholder="Buscar por nome ou telefone..." value={orderSearchTerm} onChange={e => setOrderSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-md" />
                                        </div>
                                        <div className="flex-shrink-0 relative">
                                            <button onClick={() => setShowFilters(!showFilters)} className="w-full sm:w-auto bg-white border rounded-md px-4 py-2 flex items-center justify-center gap-2 hover:bg-gray-100">
                                                <i className="fas fa-filter"></i> <span className="sm:hidden">Filtros</span>
                                            </button>
                                            <div className={`sm:hidden absolute top-full right-0 mt-2 bg-white border rounded-lg shadow-xl p-4 z-10 w-64 ${showFilters ? 'block' : 'hidden'}`}>
                                                <div className="space-y-4">
                                                    <div> <label className="block text-sm font-semibold mb-1">Tipo</label> <select value={orderFilters.orderType} onChange={e => setOrderFilters(f => ({...f, orderType: e.target.value}))} className="w-full px-3 py-2 border rounded-md bg-white"> <option value="">Todos</option> <option value="delivery">Entrega</option> <option value="pickup">Retirada</option> <option value="local">Consumo Local</option> </select> </div>
                                                    <div> <label className="block text-sm font-semibold mb-1">Pagamento</label> <select value={orderFilters.paymentMethod} onChange={e => setOrderFilters(f => ({...f, paymentMethod: e.target.value}))} className="w-full px-3 py-2 border rounded-md bg-white"> <option value="">Todos</option> <option value="credit">Crédito</option> <option value="debit">Débito</option> <option value="pix">PIX</option> <option value="cash">Dinheiro</option> </select> </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="hidden sm:flex flex-row gap-3">
                                            <select value={orderFilters.orderType} onChange={e => setOrderFilters(f => ({...f, orderType: e.target.value}))} className="px-3 py-2 border rounded-md bg-white"> <option value="">Tipo: Todos</option> <option value="delivery">Entrega</option> <option value="pickup">Retirada</option> <option value="local">Consumo Local</option> </select>
                                            <select value={orderFilters.paymentMethod} onChange={e => setOrderFilters(f => ({...f, paymentMethod: e.target.value}))} className="px-3 py-2 border rounded-md bg-white"> <option value="">Pgto: Todos</option> <option value="credit">Crédito</option> <option value="debit">Débito</option> <option value="pix">PIX</option> <option value="cash">Dinheiro</option> </select>
                                        </div>
                                    </div>
                                </div>

                                {pendingOrders.length > 0 && (
                                    <div className="mb-6">
                                        <h4 className="font-bold text-lg mb-2 text-yellow-600">Pendentes</h4>
                                        <div className="space-y-4">
                                            {pendingOrders.map(order => <OrderCard key={order.id} order={order} onUpdateStatus={onUpdateOrderStatus} onDelete={onDeleteOrder} />)}
                                        </div>
                                    </div>
                                )}

                                <div className="border-t pt-4">
                                    <div className="flex overflow-x-auto whitespace-nowrap scrollbar-hide border-b -mx-4 px-2 sm:px-4">
                                        {(['accepted', 'ready', 'completed', 'cancelled'] as OrderStatus[]).map(status => (
                                            <button key={status} onClick={() => setActiveOrdersTab(status)} className={`flex-shrink-0 py-2 px-4 font-semibold text-sm ${activeOrdersTab === status ? 'border-b-2 border-accent text-accent' : 'text-gray-500 hover:text-gray-700'}`}>
                                                {{accepted: 'Aceitos', ready: 'Prontos/Em Rota', completed: 'Finalizados', cancelled: 'Cancelados'}[status]}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="mt-4 space-y-4">
                                        {tabOrders.length > 0 ? (
                                            tabOrders.map(order => <OrderCard key={order.id} order={order} onUpdateStatus={onUpdateOrderStatus} onDelete={onDeleteOrder} />)
                                        ) : (
                                            <div className="text-center py-12"><p className="text-gray-500">Nenhum pedido nesta aba.</p></div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'customization' && ( <SiteCustomizationTab settings={siteSettings} onSave={onSaveSiteSettings} /> )}
                        {activeTab === 'products' && ( <div> <div className="flex justify-between items-center mb-4"> <h3 className="text-xl font-bold">Gerenciar Produtos</h3> <button onClick={handleAddNewProduct} className="bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90"><i className="fas fa-plus mr-2"></i>Novo Produto</button> </div> <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleProductDragEnd}> <div className="space-y-6"> {localCategories.map(category => { const categoryProducts = localProducts.filter(p => p.categoryId === category.id).sort((a, b) => a.orderIndex - b.orderIndex); return ( <div key={category.id}> <h4 className={`text-lg font-semibold mb-2 text-brand-olive-600 pb-1 border-b-2 border-brand-green-300 transition-opacity ${!category.active ? 'opacity-40' : ''}`}>{category.name}</h4> <SortableContext items={categoryProducts.map(p => p.id)} strategy={verticalListSortingStrategy}> <div className="space-y-3 min-h-[50px]"> {categoryProducts.map(product => <SortableProductItem key={product.id} product={product} isCategoryActive={category.active} onEdit={handleEditProduct} onDelete={onDeleteProduct} onStatusChange={onProductStatusChange} />)} </div> </SortableContext> </div> ) })} </div> </DndContext> </div> )}
                        {activeTab === 'categories' && ( <div> <div className="flex justify-between items-center mb-4"> <h3 className="text-xl font-bold">Gerenciar Categorias</h3> <button onClick={handleAddNewCategory} className="bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90"><i className="fas fa-plus mr-2"></i>Nova Categoria</button> </div> <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}> <SortableContext items={localCategories.map(c => c.id)} strategy={verticalListSortingStrategy}> <div className="space-y-3"> {localCategories.map(cat => <SortableCategoryItem key={cat.id} category={cat} onEdit={handleEditCategory} onDelete={onDeleteCategory} onStatusChange={onCategoryStatusChange} />)} </div> </SortableContext> </DndContext> </div> )}
                        {activeTab === 'data' && ( <div> <h3 className="text-xl font-bold mb-4">Gerenciamento de Dados</h3> <div className="bg-gray-50 p-4 rounded-lg mb-6 border"> <h4 className="font-semibold text-lg mb-2">Backup</h4> <p className="text-gray-600 mb-3">Crie um backup completo dos seus dados.</p> <button onClick={handleBackup} className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700"><i className="fas fa-download mr-2"></i>Fazer Backup</button> </div> <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200"> <h4 className="font-semibold text-lg mb-2 text-yellow-800"><i className="fas fa-exclamation-triangle mr-2"></i>Ação Perigosa</h4> <p className="text-yellow-700 mb-3">Popula o banco com dados iniciais. Use apenas uma vez.</p> <button onClick={handleSeedDatabase} className="bg-yellow-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-yellow-600"><i className="fas fa-database mr-2"></i>Popular Banco</button> </div> </div> )}
                    </div>
                </div>
            </section>
            <ProductModal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} onSave={onSaveProduct} product={editingProduct} categories={allCategories} />
            <CategoryModal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} onSave={onSaveCategory} category={editingCategory} />
            <SupportModal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} />
        </>
    );
};