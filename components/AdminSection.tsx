

import React, { useState, useEffect, useMemo, useRef } from 'react';
// FIX: The 'Partial' type is a built-in TypeScript utility and does not need to be imported.
import { Product, Category, SiteSettings, Order, OrderStatus, PaymentStatus, DaySchedule } from '../types';
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
    onUpdateSiteSettingsField: (updates: Partial<SiteSettings>) => Promise<void>;
    onUpdateOrderStatus: (orderId: string, status: OrderStatus, payload?: Partial<Pick<Order, 'pickupTimeEstimate'>>) => Promise<void>;
    onUpdateOrderPaymentStatus: (orderId: string, paymentStatus: PaymentStatus) => Promise<void>;
    onUpdateOrderReservationTime: (orderId: string, reservationTime: string) => Promise<void>;
    onDeleteOrder: (orderId: string) => Promise<void>;
    onPermanentDeleteOrder: (orderId: string) => Promise<void>;
    onPermanentDeleteMultipleOrders: (orderIds: string[]) => Promise<void>;
    onBulkDeleteProducts: (productIds: string[]) => Promise<void>;
    onRestoreProduct: (productId: string) => Promise<void>;
    onPermanentDeleteProduct: (productId: string) => Promise<void>;
    onBulkPermanentDeleteProducts: (productIds: string[]) => Promise<void>;
}

interface SortableProductItemProps {
    product: Product;
    isCategoryActive: boolean;
    onEdit: (product: Product) => void;
    onDelete: (productId: string) => void;
    onStatusChange: (productId: string, active: boolean) => void;
    onStockStatusChange: (productId: string, stockStatus: 'available' | 'out_of_stock') => void;
    isDeleteMode: boolean;
    isSelected: boolean;
    onSelect: (productId: string) => void;
}

const SortableProductItem: React.FC<SortableProductItemProps> = ({ product, isCategoryActive, onEdit, onDelete, onStatusChange, onStockStatusChange, isDeleteMode, isSelected, onSelect }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: product.id, disabled: isDeleteMode });

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
                {isDeleteMode ? (
                     <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onSelect(product.id)}
                        className="h-5 w-5 rounded border-gray-400 text-accent focus:ring-accent cursor-pointer"
                        aria-label={`Selecionar ${product.name}`}
                    />
                ) : (
                    <button {...attributes} {...listeners} className="cursor-grab touch-none p-2" aria-label="Mover produto">
                        <i className="fas fa-grip-vertical text-gray-500 hover:text-gray-800"></i>
                    </button>
                )}
                <p className={`font-bold ${!isAvailable ? 'line-through text-gray-400' : ''}`}>{product.name}</p>
            </div>
            {!isDeleteMode && (
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
                    <button onClick={() => window.confirm('Tem certeza que deseja mover este produto para a lixeira?') && onDelete(product.id)} className="bg-red-500 text-white w-8 h-8 rounded-md hover:bg-red-600" aria-label={`Deletar ${product.name}`}><i className="fas fa-trash"></i></button>
                </div>
            )}
        </div>
    );
};

interface SortableCategoryItemProps {
    category: Category;
    onEdit: (category: Category) => void;
    onDelete: (categoryId: string) => void;
    onStatusChange: (categoryId: string, active: boolean) => void;
    isCategoryDisabled: boolean;
}

const SortableCategoryItem: React.FC<SortableCategoryItemProps> = ({ category, onEdit, onDelete, onStatusChange, isCategoryDisabled }) => {
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

    const handleToggleClick = (e: React.MouseEvent) => {
        if (isCategoryDisabled) {
            e.preventDefault();
            alert("Esta categoria não pode ser ativada pois não contém produtos ou todos os seus produtos estão inativos.");
        }
    };
    
    const isEffectivelyActive = !isCategoryDisabled && category.active;

    return (
        <div ref={setNodeRef} style={style} className={`bg-gray-50 p-3 rounded-lg flex justify-between items-center transition-opacity ${!isEffectivelyActive ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-4">
                <button {...attributes} {...listeners} className="cursor-grab touch-none p-2" aria-label="Mover categoria">
                    <i className="fas fa-grip-vertical text-gray-500 hover:text-gray-800"></i>
                </button>
                <p className="font-bold">{category.name}</p>
            </div>
            <div className="flex items-center gap-4">
                 <label 
                    onClick={handleToggleClick}
                    className={`relative inline-flex items-center ${isCategoryDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    title={isCategoryDisabled ? "Adicione ou ative um produto nesta categoria para poder ativá-la." : (category.active ? 'Desativar categoria' : 'Ativar categoria')}
                >
                    <input 
                        type="checkbox" 
                        checked={isEffectivelyActive} 
                        onChange={e => onStatusChange(category.id, e.target.checked)} 
                        className="sr-only peer"
                        disabled={isCategoryDisabled}
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 peer-disabled:bg-gray-300"></div>
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
        onSeedDatabase, onSaveSiteSettings, onUpdateSiteSettingsField, onUpdateOrderStatus, onUpdateOrderPaymentStatus, onUpdateOrderReservationTime,
        onDeleteOrder, onPermanentDeleteOrder, onPermanentDeleteMultipleOrders,
        onBulkDeleteProducts, onRestoreProduct, onPermanentDeleteProduct, onBulkPermanentDeleteProducts
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
    const [selectedOrderIds, setSelectedOrderIds] = useState(new Set<string>());

    // State for product management
    const [isProductDeleteMode, setIsProductDeleteMode] = useState(false);
    const [selectedProductIds, setSelectedProductIds] = useState(new Set<string>());
    const [isProductTrashVisible, setIsProductTrashVisible] = useState(false);


    // State for Status Tab
    const [localSettings, setLocalSettings] = useState<SiteSettings>(siteSettings);
    const [hasSettingsChanged, setHasSettingsChanged] = useState(false);
    const [isSavingStatus, setIsSavingStatus] = useState(false);
    const [isSavingAutoSchedule, setIsSavingAutoSchedule] = useState(false);


    // State for sound notification
    const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
        const saved = localStorage.getItem('soundNotificationEnabled');
        return saved !== 'false'; // Enabled by default
    });
    const prevPendingOrdersCount = useRef(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    // Sync Status tab settings with props, but don't overwrite local changes
    useEffect(() => {
        // This effect runs when siteSettings prop changes from Firestore listener
        // We want to update our local state with the new values, but without
        // destroying unsaved changes in operatingHours.
        setLocalSettings(currentLocalSettings => ({
            ...currentLocalSettings, // Keep current local values (like dirty operatingHours)
            ...siteSettings, // Overwrite with fresh data from Firestore
            operatingHours: hasSettingsChanged // If operatingHours are dirty...
                ? currentLocalSettings.operatingHours // ...keep the dirty version
                : siteSettings.operatingHours, // ...otherwise, take the fresh version.
        }));
    }, [siteSettings]);


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
    
    // Clear selection when leaving trash view
    useEffect(() => {
        if (!isTrashVisible) {
            setSelectedOrderIds(new Set());
        }
        if (!isProductTrashVisible) {
            setSelectedProductIds(new Set());
        }
    }, [isTrashVisible, isProductTrashVisible]);

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
        // FIX: Explicitly typed the 'p' parameter in findIndex callbacks to 'Product' to resolve an 'unknown' type error.
        const oldIndex = sortedProducts.findIndex((p: Product) => p.id === active.id);
        const newIndex = sortedProducts.findIndex((p: Product) => p.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;
        const reordered = arrayMove(sortedProducts, oldIndex, newIndex);
        // FIX: Explicitly typed 'p' as Product to resolve the 'unknown' type error during mapping.
        onReorderProducts(reordered.map((p: Product, index) => ({ id: p.id, orderIndex: index })));
    };

    const handleCategoryDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        // FIX: Explicitly typed the 'c' parameter in findIndex callbacks to 'Category' to resolve an 'unknown' type error.
        const oldIndex = localCategories.findIndex((c: Category) => c.id === active.id);
        const newIndex = localCategories.findIndex((c: Category) => c.id === over.id);
        const reordered = arrayMove(localCategories, oldIndex, newIndex);
        // FIX: Explicitly typed 'c' as Category to resolve the 'unknown' type error during mapping.
        onReorderCategories(reordered.map((c: Category, index) => ({ id: c.id, order: index })));
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
    
     // --- Handlers for Bulk Selection in Trash ---
    const handleSelectOrder = (orderId: string) => {
        setSelectedOrderIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(orderId)) {
                newSet.delete(orderId);
            } else {
                newSet.add(orderId);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        if (selectedOrderIds.size === deletedOrders.length) {
            setSelectedOrderIds(new Set());
        } else {
            setSelectedOrderIds(new Set(deletedOrders.map(o => o.id)));
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedOrderIds.size === 0) return;
        await onPermanentDeleteMultipleOrders(Array.from(selectedOrderIds));
        setSelectedOrderIds(new Set());
    };

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

    // --- Handlers for Status Tab ---
    const handleAutomaticSchedulingChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const isEnabled = e.target.checked;
        setIsSavingAutoSchedule(true);
        try {
            await onUpdateSiteSettingsField({ automaticSchedulingEnabled: isEnabled });
        } catch (error) {
            // Error toast is shown by the parent App component.
        } finally {
            setIsSavingAutoSchedule(false);
        }
    };

    const handleOperatingHoursChange = (dayOfWeek: number, field: keyof DaySchedule, value: any) => {
        const newHours = (localSettings.operatingHours || []).map(schedule => {
            if (schedule.dayOfWeek === dayOfWeek) {
                const updatedSchedule = { ...schedule };
                (updatedSchedule as any)[field] = value;
                return updatedSchedule;
            }
            return schedule;
        });

        setLocalSettings(prev => ({
            ...prev,
            operatingHours: newHours,
        }));
        setHasSettingsChanged(true);
    };

    const handleSaveStatusSettings = async () => {
        setIsSavingStatus(true);
        try {
            // Merge the latest siteSettings (which has the correct auto-schedule value)
            // with the local changes (which has the correct operating hours).
            const settingsToSave = {
                ...siteSettings, // Start with the most up-to-date settings from props
                operatingHours: localSettings.operatingHours, // Overwrite with only the locally managed field
            };
            await onSaveSiteSettings(settingsToSave, {});
            setHasSettingsChanged(false);
        } catch (e) {
            console.error("Failed to save status settings", e);
        } finally {
            setIsSavingStatus(false);
        }
    };
    
    // --- Product Deletion Mode Handlers ---
    const activeProducts = useMemo(() => localProducts.filter(p => !p.deleted), [localProducts]);
    const deletedProducts = useMemo(() => localProducts.filter(p => p.deleted), [localProducts]);
    
    const handleSelectProduct = (productId: string) => {
        setSelectedProductIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(productId)) newSet.delete(productId);
            else newSet.add(productId);
            return newSet;
        });
    };

    const handleSelectAllProductsInCategory = (categoryId: string, isSelecting: boolean) => {
        const productIdsInCategory = activeProducts.filter(p => p.categoryId === categoryId).map(p => p.id);
        setSelectedProductIds(prev => {
            const newSet = new Set(prev);
            if (isSelecting) {
                productIdsInCategory.forEach(id => newSet.add(id));
            } else {
                productIdsInCategory.forEach(id => newSet.delete(id));
            }
            return newSet;
        });
    };

    const handleSelectAllActiveProducts = () => {
        if (selectedProductIds.size === activeProducts.length) {
            setSelectedProductIds(new Set());
        } else {
            setSelectedProductIds(new Set(activeProducts.map(p => p.id)));
        }
    };

    const handleDeleteSelectedProducts = async () => {
        if (selectedProductIds.size === 0) return;
        if (window.confirm(`Tem certeza que deseja mover ${selectedProductIds.size} produto(s) para a lixeira?`)) {
            await onBulkDeleteProducts(Array.from(selectedProductIds));
            setSelectedProductIds(new Set());
            setIsProductDeleteMode(false);
        }
    };
    
    const handleSelectAllDeletedProducts = () => {
        if(selectedProductIds.size === deletedProducts.length) {
            setSelectedProductIds(new Set());
        } else {
            setSelectedProductIds(new Set(deletedProducts.map(p => p.id)));
        }
    };
    
    const handlePermanentDeleteSelectedProducts = async () => {
        if (selectedProductIds.size === 0) return;
        if (window.confirm(`Apagar PERMANENTEMENTE ${selectedProductIds.size} produto(s)? Esta ação não pode ser desfeita.`)) {
            await onBulkPermanentDeleteProducts(Array.from(selectedProductIds));
            setSelectedProductIds(new Set());
        }
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

                        <div id="admin-content-status">
                            {activeTab === 'status' && (
                                <div>
                                    <h3 className="text-xl font-bold mb-4">Status da Pizzaria</h3>
                                    <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg border">
                                        <label htmlFor="store-status-toggle" className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                id="store-status-toggle"
                                                className="sr-only peer"
                                                checked={isStoreOnline}
                                                onChange={e => onStoreStatusChange(e.target.checked)}
                                                disabled={siteSettings.automaticSchedulingEnabled}
                                            />
                                            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 peer-checked:bg-green-600 peer-disabled:bg-gray-300 peer-disabled:cursor-not-allowed"></div>
                                        </label>
                                        <div>
                                            <span className={`font-semibold text-lg ${siteSettings.automaticSchedulingEnabled ? 'text-gray-500' : (isStoreOnline ? 'text-green-600' : 'text-red-600')}`}>
                                                {isStoreOnline ? 'Aberta' : 'Fechada'}
                                            </span>
                                            {siteSettings.automaticSchedulingEnabled && <span className="text-sm text-gray-500 ml-2">(Gerenciado automaticamente)</span>}
                                        </div>
                                    </div>

                                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                                        <div className="flex items-center gap-4">
                                            <label htmlFor="automatic-scheduling-toggle" className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    id="automatic-scheduling-toggle"
                                                    className="sr-only peer"
                                                    checked={siteSettings.automaticSchedulingEnabled ?? false}
                                                    onChange={handleAutomaticSchedulingChange}
                                                    disabled={isSavingAutoSchedule}
                                                />
                                                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 peer-checked:bg-green-600 peer-disabled:opacity-50 peer-disabled:cursor-wait"></div>
                                            </label>
                                            <span className="font-semibold text-gray-800">Gerir horário automaticamente.</span>
                                            {isSavingAutoSchedule && <i className="fas fa-spinner fa-spin text-accent ml-2"></i>}
                                        </div>
                                        <p className="text-sm text-gray-500 mt-2 pl-14">Quando ativado, o status da loja mudará para "Aberta" ou "Fechada" conforme o horário de funcionamento definido abaixo, mesmo com o painel fechado.</p>
                                    </div>

                                    <div className="mt-8">
                                        <h3 className="text-xl font-bold mb-4">Editar Horário de Funcionamento</h3>
                                        <div className="space-y-3 bg-white p-4 rounded-lg border">
                                            {(localSettings.operatingHours || []).map((schedule) => (
                                                <div key={schedule.dayOfWeek} className="grid grid-cols-1 md:grid-cols-[120px_1fr_2fr] items-center gap-4 p-3 rounded-md border bg-gray-50/50">
                                                    <div className="font-semibold">{schedule.dayName}</div>
                                                    <div className="flex items-center gap-3">
                                                        <label className="relative inline-flex items-center cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                className="sr-only peer"
                                                                checked={schedule.isOpen}
                                                                onChange={e => handleOperatingHoursChange(schedule.dayOfWeek, 'isOpen', e.target.checked)}
                                                            />
                                                            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                                        </label>
                                                        <span className={`font-medium ${schedule.isOpen ? 'text-green-600' : 'text-gray-500'}`}>{schedule.isOpen ? 'Aberto' : 'Fechado'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="time"
                                                            value={schedule.openTime}
                                                            onChange={e => handleOperatingHoursChange(schedule.dayOfWeek, 'openTime', e.target.value)}
                                                            disabled={!schedule.isOpen}
                                                            className="w-full px-2 py-1 border rounded-md bg-white disabled:bg-gray-200 disabled:cursor-not-allowed"
                                                        />
                                                        <span>às</span>
                                                        <input
                                                            type="time"
                                                            value={schedule.closeTime}
                                                            onChange={e => handleOperatingHoursChange(schedule.dayOfWeek, 'closeTime', e.target.value)}
                                                            disabled={!schedule.isOpen}
                                                            className="w-full px-2 py-1 border rounded-md bg-white disabled:bg-gray-200 disabled:cursor-not-allowed"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {hasSettingsChanged && (
                                        <div className="mt-6 pt-6 border-t flex justify-end">
                                            <button
                                                onClick={handleSaveStatusSettings}
                                                disabled={isSavingStatus}
                                                className="bg-accent text-white font-semibold py-2 px-6 rounded-lg hover:bg-opacity-90 flex items-center justify-center min-w-[200px] disabled:bg-opacity-70"
                                            >
                                                {isSavingStatus ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-save mr-2"></i> Salvar Alterações</>}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        
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
                                            {filteredOrders.filter(o => o.status === 'pending').map(order => <OrderCard key={order.id} order={order} onUpdateStatus={onUpdateOrderStatus} onUpdatePaymentStatus={onUpdateOrderPaymentStatus} onUpdateReservationTime={onUpdateOrderReservationTime} onDelete={onDeleteOrder} onPermanentDelete={onPermanentDeleteOrder} />)}
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
                                            <>
                                                {deletedOrders.length > 0 && (
                                                    <div className="bg-gray-100 p-2 rounded-lg mb-4 flex items-center gap-4 border sticky top-[12.5rem] z-20">
                                                        <input
                                                            type="checkbox"
                                                            className="h-5 w-5 rounded border-gray-400 text-accent focus:ring-accent cursor-pointer"
                                                            checked={selectedOrderIds.size > 0 && selectedOrderIds.size === deletedOrders.length}
                                                            onChange={handleSelectAll}
                                                            aria-label="Selecionar todos os pedidos na lixeira"
                                                        />
                                                        <span className="font-semibold text-sm text-gray-700">{selectedOrderIds.size} selecionado(s)</span>
                                                        <button
                                                            onClick={handleDeleteSelected}
                                                            disabled={selectedOrderIds.size === 0}
                                                            className="ml-auto bg-red-500 text-white font-semibold py-1 px-3 rounded-md text-sm hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                                        >
                                                            <i className="fas fa-trash-alt mr-2"></i>
                                                            Apagar Selecionados
                                                        </button>
                                                    </div>
                                                )}
                                                {deletedOrders.length > 0 ? deletedOrders.map(order => 
                                                    <OrderCard 
                                                        key={order.id} 
                                                        order={order} 
                                                        onUpdateStatus={onUpdateOrderStatus} 
                                                        onUpdatePaymentStatus={onUpdateOrderPaymentStatus} 
                                                        onUpdateReservationTime={onUpdateOrderReservationTime} 
                                                        onDelete={onDeleteOrder} 
                                                        onPermanentDelete={onPermanentDeleteOrder} 
                                                        isSelectable={true}
                                                        isSelected={selectedOrderIds.has(order.id)}
                                                        onSelect={handleSelectOrder}
                                                    />
                                                ) : <div className="text-center py-12"><p className="text-gray-500">Lixeira vazia.</p></div>}
                                            </>
                                        ) : (
                                            tabOrders.length > 0 ? tabOrders.map(order => <OrderCard key={order.id} order={order} onUpdateStatus={onUpdateOrderStatus} onUpdatePaymentStatus={onUpdateOrderPaymentStatus} onUpdateReservationTime={onUpdateOrderReservationTime} onDelete={onDeleteOrder} onPermanentDelete={onPermanentDeleteOrder} />) : <div className="text-center py-12"><p className="text-gray-500">Nenhum pedido nesta aba.</p></div>
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
                        <div id="admin-content-products">
                            {activeTab === 'products' && (
                                isProductTrashVisible ? (
                                    <div>
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-xl font-bold">Lixeira de Produtos</h3>
                                            <button onClick={() => { setIsProductTrashVisible(false); setSelectedProductIds(new Set()); }} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">
                                                <i className="fas fa-arrow-left mr-2"></i>Voltar aos Produtos
                                            </button>
                                        </div>
                                        {deletedProducts.length > 0 ? (
                                             <div className="space-y-3">
                                                <div className="bg-gray-100 p-2 rounded-lg mb-4 flex items-center gap-4 border sticky top-20 z-20">
                                                    <input type="checkbox" onChange={handleSelectAllDeletedProducts} checked={selectedProductIds.size > 0 && selectedProductIds.size === deletedProducts.length} className="h-5 w-5 rounded border-gray-400 text-accent focus:ring-accent cursor-pointer" />
                                                    <span className="font-semibold text-sm text-gray-700">{selectedProductIds.size} selecionado(s)</span>
                                                    <button onClick={handlePermanentDeleteSelectedProducts} disabled={selectedProductIds.size === 0} className="ml-auto bg-red-500 text-white font-semibold py-1 px-3 rounded-md text-sm hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed">
                                                        <i className="fas fa-trash-alt mr-2"></i>Apagar Selecionados
                                                    </button>
                                                </div>
                                                {deletedProducts.map(product => (
                                                    <div key={product.id} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                                                        <div className="flex items-center gap-4">
                                                            <input type="checkbox" checked={selectedProductIds.has(product.id)} onChange={() => handleSelectProduct(product.id)} className="h-5 w-5 rounded border-gray-400 text-accent focus:ring-accent cursor-pointer" />
                                                            <p className="font-bold text-gray-500 line-through">{product.name}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={() => onRestoreProduct(product.id)} className="bg-blue-500 text-white font-semibold py-1 px-3 rounded-md text-sm hover:bg-blue-600"><i className="fas fa-undo mr-2"></i>Restaurar</button>
                                                            <button onClick={() => onPermanentDeleteProduct(product.id)} className="bg-red-500 text-white font-semibold py-1 px-3 rounded-md text-sm hover:bg-red-600"><i className="fas fa-trash-alt mr-2"></i>Apagar Perm.</button>
                                                        </div>
                                                    </div>
                                                ))}
                                             </div>
                                        ) : (
                                            <div className="text-center py-12"><p className="text-gray-500">Lixeira de produtos vazia.</p></div>
                                        )}
                                    </div>
                                ) : (
                                    <div> 
                                        <div className="flex justify-between items-center mb-4"> 
                                            <h3 className="text-xl font-bold">Gerenciar Produtos</h3> 
                                            {!isProductDeleteMode && <button onClick={handleAddNewProduct} className="bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90"><i className="fas fa-plus mr-2"></i>Novo Produto</button>}
                                        </div>
                                        {isProductDeleteMode && (
                                            <div className="bg-blue-50 p-2 rounded-lg mb-4 flex items-center gap-4 border border-blue-200 sticky top-20 z-20">
                                                <input type="checkbox" onChange={handleSelectAllActiveProducts} checked={selectedProductIds.size > 0 && selectedProductIds.size === activeProducts.length} className="h-5 w-5 rounded border-gray-400 text-accent focus:ring-accent cursor-pointer" />
                                                <span className="font-semibold text-sm text-blue-800">{selectedProductIds.size} selecionado(s)</span>
                                                <button onClick={handleDeleteSelectedProducts} disabled={selectedProductIds.size === 0} className="ml-auto bg-red-500 text-white font-semibold py-1 px-3 rounded-md text-sm hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed">
                                                    <i className="fas fa-trash-alt mr-2"></i>Mover para Lixeira
                                                </button>
                                                <button onClick={() => { setIsProductDeleteMode(false); setSelectedProductIds(new Set()); }} className="bg-gray-200 text-gray-800 font-semibold py-1 px-3 rounded-md text-sm hover:bg-gray-300">Cancelar</button>
                                            </div>
                                        )}
                                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleProductDragEnd}> 
                                            <div className="space-y-6"> 
                                                {localCategories.map(category => { 
                                                    const categoryProducts = activeProducts.filter(p => p.categoryId === category.id).sort((a, b) => a.orderIndex - b.orderIndex); 
                                                    const areAllInCategorySelected = categoryProducts.length > 0 && categoryProducts.every(p => selectedProductIds.has(p.id));
                                                    return ( 
                                                        <div key={category.id}> 
                                                            <div className="flex items-center gap-3 mb-2 pb-1 border-b-2 border-brand-green-300">
                                                                {isProductDeleteMode && categoryProducts.length > 0 && (
                                                                    // FIX: Corrected function call from handleSelectAllInCategory to handleSelectAllProductsInCategory
                                                                    <input type="checkbox" checked={areAllInCategorySelected} onChange={e => handleSelectAllProductsInCategory(category.id, e.target.checked)} className="h-5 w-5 rounded border-gray-400 text-accent focus:ring-accent cursor-pointer" />
                                                                )}
                                                                <h4 className={`text-lg font-semibold text-brand-olive-600 transition-opacity ${!category.active ? 'opacity-40' : ''}`}>{category.name}</h4>
                                                            </div>
                                                            {/* FIX: Wrapped the sortable items in a div to resolve a TypeScript error about a missing 'children' prop on SortableContext. This may impact drag-and-drop behavior but addresses the compilation error. */}
                                                            <SortableContext items={categoryProducts.map(p => p.id)} strategy={verticalListSortingStrategy}>
                                                                <div className="space-y-2">
                                                                    {categoryProducts.map(product => <SortableProductItem key={product.id} product={product} isCategoryActive={category.active} onEdit={handleEditProduct} onDelete={onDeleteProduct} onStatusChange={onProductStatusChange} onStockStatusChange={onProductStockStatusChange} isDeleteMode={isProductDeleteMode} isSelected={selectedProductIds.has(product.id)} onSelect={handleSelectProduct} />)}
                                                                </div>
                                                            </SortableContext>
                                                        </div> 
                                                    ) 
                                                })} 
                                            </div> 
                                        </DndContext>
                                        <div className="mt-6 pt-6 border-t flex justify-end items-center gap-4">
                                            <button onClick={() => setIsProductTrashVisible(true)} className="font-semibold text-gray-600 hover:text-gray-900 text-sm py-2 px-4 rounded-lg hover:bg-gray-100">
                                                <i className="fas fa-trash-alt mr-2"></i>Ver Lixeira
                                            </button>
                                            {!isProductDeleteMode && (
                                                <button onClick={() => setIsProductDeleteMode(true)} className="w-10 h-10 bg-red-50 text-red-600 rounded-full flex items-center justify-center hover:bg-red-100" title="Excluir múltiplos produtos">
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                        <div id="admin-content-categories">
                            {activeTab === 'categories' && (
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-xl font-bold">Gerenciar Categorias</h3>
                                        <button onClick={handleAddNewCategory} className="bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90">
                                            <i className="fas fa-plus mr-2"></i>Nova Categoria
                                        </button>
                                    </div>
                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}>
                                        {/* FIX: Wrapped the sortable items in a div to resolve a TypeScript error about a missing 'children' prop on SortableContext. This may impact drag-and-drop behavior but addresses the compilation error. */}
                                        <SortableContext items={localCategories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                                            <div className="space-y-2">
                                                {localCategories.map(cat => {
                                                    const productsInCategory = allProducts.filter(p => p.categoryId === cat.id && !p.deleted);
                                                    const isCategoryDisabled = productsInCategory.length === 0 || productsInCategory.every(p => !p.active);
                                                    return (
                                                        <SortableCategoryItem
                                                            key={cat.id}
                                                            category={cat}
                                                            onEdit={handleEditCategory}
                                                            onDelete={onDeleteCategory}
                                                            onStatusChange={onCategoryStatusChange}
                                                            isCategoryDisabled={isCategoryDisabled}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                </div>
                            )}
                        </div>
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