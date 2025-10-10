import React, { useState, useEffect } from 'react';
// FIX: Import the firebase namespace to use for type annotations.
import firebase from 'firebase/compat/app';
import * as firebaseService from '../services/firebaseService';
import { Product, Category, Order, SiteSettings, StoreStatus } from '../types';
import { ProductModal } from './ProductModal';
import { CategoryModal } from './CategoryModal';
import { SiteCustomizationTab } from './SiteCustomizationTab';
import { OrderCard } from './OrderCard';

type AdminTab = 'orders' | 'products' | 'categories' | 'settings';

export const AdminSection: React.FC<{ onExit: () => void }> = ({ onExit }) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('orders');
    
    // Data states
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [settings, setSettings] = useState<SiteSettings | null>(null);
    const [storeStatus, setStoreStatus] = useState<StoreStatus>({ isOpen: true });
    
    // Auth and loading states
    const [user, setUser] = useState<firebase.User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [authError, setAuthError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Modal states
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

    // Authentication and initial data fetch
    useEffect(() => {
        const unsubscribeAuth = firebaseService.onAuthUserChanged(async (user) => {
            setUser(user);
            if (user) {
                try {
                    const settingsData = await firebaseService.getSiteSettings();
                    const { products, categories, storeStatus } = await firebaseService.getProductsAndCategories();
                    setSettings(settingsData);
                    setProducts(products);
                    setCategories(categories);
                    setStoreStatus(storeStatus);
                } catch (e) {
                    console.error("Error fetching admin data:", e);
                    setAuthError("Falha ao carregar dados do admin.");
                }
            }
            setIsLoading(false);
        });

        const unsubscribeOrders = firebaseService.onOrdersUpdate(setOrders);

        return () => {
            unsubscribeAuth();
            unsubscribeOrders();
        };
    }, []);
    
    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setAuthError('');
        const email = e.currentTarget.email.value;
        const password = e.currentTarget.password.value;
        try {
            await firebaseService.login(email, password);
        } catch (error: any) {
            console.error("Login failed:", error);
            setAuthError(error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' ? 'Email ou senha inválidos.' : 'Ocorreu um erro no login.');
        }
    };
    
    const handleLogout = async () => {
        await firebaseService.logout();
        onExit();
    };

    // Handlers for Products
    const handleSaveProduct = async (product: Product) => {
        if (product.id) {
            await firebaseService.updateProduct(product);
        } else {
            await firebaseService.addProduct(product);
        }
        const { products } = await firebaseService.getProductsAndCategories();
        setProducts(products);
    };

    // Handlers for Categories
    const handleSaveCategory = async (category: Category) => {
        if (category.id) {
            await firebaseService.updateCategory(category);
        } else {
            await firebaseService.addCategory(category);
        }
        const { categories } = await firebaseService.getProductsAndCategories();
        setCategories(categories);
    };
    
    // Handlers for Settings
    const handleSaveSettings = async (newSettings: SiteSettings, files: { [key: string]: File | null }) => {
        setIsSaving(true);
        let updatedSettings = { ...newSettings };
        
        try {
            for (const key in files) {
                const file = files[key];
                if(file) {
                    const url = await firebaseService.uploadImage(file);
                    if (key === 'logo') updatedSettings.logoUrl = url;
                    if (key === 'heroBg') updatedSettings.heroBgUrl = url;
                    if (updatedSettings.contentSections.some(s => s.id === key)) {
                         updatedSettings.contentSections = updatedSettings.contentSections.map(s => s.id === key ? {...s, imageUrl: url} : s);
                    }
                }
            }
            await firebaseService.updateSiteSettings(updatedSettings);
            setSettings(updatedSettings);
            alert('Configurações salvas com sucesso!');
        } catch (error) {
            console.error("Error saving settings:", error);
            alert('Falha ao salvar as configurações.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleStoreStatusToggle = async () => {
        const newStatus = !storeStatus.isOpen;
        await firebaseService.updateStoreStatus({isOpen: newStatus});
        setStoreStatus({isOpen: newStatus});
    }

    if (isLoading) {
        return <div className="fixed inset-0 flex items-center justify-center bg-gray-100">Carregando...</div>;
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
                    <h1 className="text-2xl font-bold text-center mb-6">Login do Administrador</h1>
                    <form onSubmit={handleLogin}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1" htmlFor="email">Email</label>
                            <input type="email" id="email" name="email" required className="w-full px-3 py-2 border rounded-md" />
                        </div>
                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-1" htmlFor="password">Senha</label>
                            <input type="password" id="password" name="password" required className="w-full px-3 py-2 border rounded-md" />
                        </div>
                        {authError && <p className="text-red-500 text-sm mb-4 text-center">{authError}</p>}
                        <button type="submit" className="w-full bg-accent text-white font-bold py-2 px-4 rounded-lg hover:bg-opacity-90">Entrar</button>
                    </form>
                </div>
            </div>
        );
    }
    
    const renderContent = () => {
        switch (activeTab) {
            case 'orders':
                return (
                     <div className="space-y-4">
                        {orders.length > 0 ? orders.map(order => <OrderCard key={order.id} order={order} />) : <p>Nenhum pedido encontrado.</p>}
                    </div>
                );
            case 'products':
                return (
                    <div>
                        <button onClick={() => { setSelectedProduct(null); setIsProductModalOpen(true); }} className="mb-4 bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600">Novo Produto</button>
                        <div className="space-y-2">
                            {products.map(p => <div key={p.id} className="bg-white p-3 rounded-md shadow-sm flex justify-between items-center"><span>{p.name}</span><button onClick={() => { setSelectedProduct(p); setIsProductModalOpen(true); }} className="text-sm text-blue-600">Editar</button></div>)}
                        </div>
                    </div>
                );
            case 'categories':
                 return (
                    <div>
                        <button onClick={() => { setSelectedCategory(null); setIsCategoryModalOpen(true); }} className="mb-4 bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600">Nova Categoria</button>
                        <div className="space-y-2">
                            {categories.map(c => <div key={c.id} className="bg-white p-3 rounded-md shadow-sm flex justify-between items-center"><span>{c.name}</span><button onClick={() => { setSelectedCategory(c); setIsCategoryModalOpen(true); }} className="text-sm text-blue-600">Editar</button></div>)}
                        </div>
                    </div>
                );
            case 'settings':
                return settings ? <SiteCustomizationTab settings={settings} onSave={handleSaveSettings} /> : <p>Carregando configurações...</p>;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-white shadow-md p-4 flex justify-between items-center">
                 <div>
                    <h1 className="text-xl font-bold">Painel de Administração</h1>
                    <label className="relative inline-flex items-center cursor-pointer mt-2">
                        <input type="checkbox" checked={storeStatus.isOpen} onChange={handleStoreStatusToggle} className="sr-only peer" />
                        <div className="w-14 h-7 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
                        <span className="ml-3 text-sm font-medium text-gray-900">{storeStatus.isOpen ? 'Loja Aberta (Online)' : 'Loja Fechada (Offline)'}</span>
                    </label>
                 </div>
                <div>
                    <button onClick={onExit} className="text-gray-600 hover:text-gray-900 mr-4">Sair do Admin</button>
                    <button onClick={handleLogout} className="bg-red-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-600">Logout</button>
                </div>
            </header>
            <div className="p-4 md:p-8">
                <div className="max-w-6xl mx-auto">
                    <div className="border-b border-gray-200 mb-6">
                        <nav className="-mb-px flex space-x-6">
                            {(['orders', 'products', 'categories', 'settings'] as AdminTab[]).map(tab => (
                                <button key={tab} onClick={() => setActiveTab(tab)} className={`py-3 px-1 border-b-2 font-medium text-sm capitalize ${activeTab === tab ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                                    {tab}
                                </button>
                            ))}
                        </nav>
                    </div>
                    {renderContent()}
                </div>
            </div>

            {isProductModalOpen && <ProductModal isOpen={true} onClose={() => setIsProductModalOpen(false)} onSave={handleSaveProduct} product={selectedProduct} categories={categories} />}
            {isCategoryModalOpen && <CategoryModal isOpen={true} onClose={() => setIsCategoryModalOpen(false)} onSave={handleSaveCategory} category={selectedCategory} />}
        </div>
    );
};