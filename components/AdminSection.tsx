import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, Category } from '../types';
import { ProductModal } from './ProductModal';
import { CategoryModal } from './CategoryModal';
import Sortable from 'sortablejs';
import { ReactSortable } from 'react-sortablejs';


interface AdminSectionProps {
    allProducts: Product[];
    allCategories: Category[];
    isStoreOnline: boolean;
    onSaveProduct: (product: Product) => Promise<void>;
    onDeleteProduct: (productId: string) => Promise<void>;
    onStoreStatusChange: (isOnline: boolean) => Promise<void>;
    onReorderProducts: (products: Product[]) => Promise<void>;
    onSaveCategory: (category: Category) => Promise<void>;
    onDeleteCategory: (categoryId: string) => Promise<void>;
    onReorderCategories: (categories: Category[]) => Promise<void>;
    onSeedDatabase: () => Promise<void>;
}

export const AdminSection: React.FC<AdminSectionProps> = ({ 
    allProducts, allCategories, isStoreOnline, 
    onSaveProduct, onDeleteProduct, onStoreStatusChange, onReorderProducts,
    onSaveCategory, onDeleteCategory, onReorderCategories,
    onSeedDatabase 
}) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [activeTab, setActiveTab] = useState('status');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showAdminPanel, setShowAdminPanel] = useState(window.location.hash === '#admin');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    const [displayCategories, setDisplayCategories] = useState<Category[]>([]);

    const adminTabs = useMemo(() => [
        { id: 'status', label: 'Status', icon: 'fas fa-toggle-on' },
        { id: 'products', label: 'Produtos', icon: 'fas fa-pizza-slice' },
        { id: 'categories', label: 'Categorias', icon: 'fas fa-tags' },
        { id: 'data', label: 'Dados', icon: 'fas fa-database' }
    ], []);

    const activeTabInfo = useMemo(() => adminTabs.find(tab => tab.id === activeTab), [activeTab, adminTabs]);


    const sortedCategoriesMemo = useMemo(() => 
        [...allCategories].sort((a, b) => a.order - b.order),
    [allCategories]);

    useEffect(() => {
        setDisplayCategories(sortedCategoriesMemo);
    }, [sortedCategoriesMemo]);
    
    useEffect(() => {
        const handleHashChange = () => {
            setShowAdminPanel(window.location.hash === '#admin');
        };
        
        window.addEventListener('hashchange', handleHashChange, false);
        handleHashChange();

        return () => {
            window.removeEventListener('hashchange', handleHashChange, false);
        };
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (email === 'admin@santa.com' && password === 'admin123') {
            setIsLoggedIn(true);
            setError('');
        } else {
            setError('Email ou senha incorretos.');
        }
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        setEmail('');
        setPassword('');
        window.location.hash = '';
    };

    const handleAddNewProduct = () => {
        setEditingProduct(null);
        setIsProductModalOpen(true);
    };

    const handleEditProduct = (product: Product) => {
        setEditingProduct(product);
        setIsProductModalOpen(true);
    };

    const handleAddNewCategory = () => {
        setEditingCategory(null);
        setIsCategoryModalOpen(true);
    };

    const handleEditCategory = (category: Category) => {
        setEditingCategory(category);
        setIsCategoryModalOpen(true);
    };

    const handleSeedDatabase = async () => {
        if (window.confirm('Você tem certeza que deseja popular o banco de dados? Isso adicionará os produtos e categorias iniciais. Esta ação só deve ser feita uma vez em um banco de dados vazio.')) {
            try {
                await onSeedDatabase();
                alert('Banco de dados populado com sucesso!');
            } catch (error) {
                console.error("Failed to seed database:", error);
                alert("Erro ao popular o banco de dados. Verifique o console para mais detalhes.");
            }
        }
    };

    const handleBackup = () => {
        try {
            const backupData = {
                products: allProducts,
                categories: allCategories,
                store_config: { status: { isOpen: isStoreOnline } },
                backupDate: new Date().toISOString(),
            };
    
            const jsonString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const href = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = href;
            link.download = `santasensacao_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(href);
            alert('Backup concluído com sucesso!');
        } catch (error) {
            console.error("Backup failed:", error);
            alert("Falha ao criar o backup.");
        }
    };

    const handleProductReorder = useCallback((reorderedProductsInCategory: Product[], categoryId: string) => {
        // Create a new, full list of products in the correct visual order.
        const newFullProductList: Product[] = [];
        displayCategories.forEach(cat => {
            if (cat.id === categoryId) {
                // For the modified category, use the newly reordered list of products.
                newFullProductList.push(...reorderedProductsInCategory);
            } else {
                // For all other categories, add their products from the original source.
                const productsForCategory = allProducts
                    .filter(p => p.categoryId === cat.id)
                    .sort((a, b) => a.orderIndex - b.orderIndex);
                newFullProductList.push(...productsForCategory);
            }
        });

        // Re-assign the global orderIndex to every product to ensure consistency.
        const reindexedProducts = newFullProductList.map((p, index) => ({
            ...p,
            orderIndex: index
        }));

        onReorderProducts(reindexedProducts);
    }, [allProducts, displayCategories, onReorderProducts]);


    if (!showAdminPanel) return null;

    if (!isLoggedIn) {
        return (
            <section id="admin" className="py-20 bg-brand-ivory-50">
                <div className="container mx-auto px-4 max-w-md">
                    <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
                        <h2 className="text-3xl font-bold text-center mb-6 text-text-on-light"><i className="fas fa-shield-alt mr-2"></i>Painel Administrativo</h2>
                        <form onSubmit={handleLogin}>
                            <div className="mb-4">
                                <label className="block text-gray-700 font-semibold mb-2" htmlFor="admin-email">Email</label>
                                <input id="admin-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent" required />
                            </div>
                            <div className="mb-6">
                                <label className="block text-gray-700 font-semibold mb-2" htmlFor="admin-password">Senha</label>
                                <input id="admin-password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent" required />
                            </div>
                            {error && <p className="text-red-500 text-center mb-4">{error}</p>}
                            <button type="submit" className="w-full bg-accent text-white font-bold py-3 px-6 rounded-lg hover:bg-opacity-90 transition-all">Entrar</button>
                        </form>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section id="admin" className="py-20 bg-brand-ivory-50">
            <div className="container mx-auto px-4">
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                        <h2 className="text-3xl font-bold text-text-on-light">Painel Administrativo</h2>
                        <button onClick={handleLogout} className="bg-red-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-600 transition-all"><i className="fas fa-sign-out-alt mr-2"></i>Sair</button>
                    </div>

                    <div className="mb-6">
                        {/* Mobile Dropdown Menu */}
                        <div className="md:hidden relative">
                            <button 
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
                                className="w-full flex justify-between items-center py-3 px-4 font-semibold text-lg bg-gray-50 border border-gray-200 rounded-lg"
                                aria-haspopup="true"
                                aria-expanded={isDropdownOpen}
                            >
                                <span>
                                    <i className={`${activeTabInfo?.icon} mr-3 text-accent w-5 text-center`}></i>
                                    {activeTabInfo?.label}
                                </span>
                                <i className={`fas fa-chevron-down transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}></i>
                            </button>
                            {isDropdownOpen && (
                                <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg z-10 animate-fade-in-up">
                                    {adminTabs.map(tab => (
                                        <button 
                                            key={tab.id}
                                            onClick={() => {
                                                setActiveTab(tab.id);
                                                setIsDropdownOpen(false);
                                            }}
                                            className={`w-full text-left py-3 px-4 font-semibold flex items-center gap-3 ${activeTab === tab.id ? 'bg-brand-ivory-50 text-accent' : 'text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            <i className={`${tab.icon} w-5 text-center`}></i>
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Desktop Tabs */}
                        <div className="hidden md:flex border-b border-gray-200">
                            {adminTabs.map(tab => (
                                <button 
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)} 
                                    className={`py-3 px-6 font-semibold flex items-center gap-2 transition-colors duration-200 ${activeTab === tab.id ? 'border-b-2 border-accent text-accent' : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'}`}
                                >
                                    <i className={tab.icon}></i>
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {activeTab === 'status' && (
                        <div>
                            <h3 className="text-xl font-bold mb-4">Status da Pizzaria</h3>
                            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg mb-6">
                                <label htmlFor="store-status-toggle" className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="store-status-toggle" className="sr-only peer" checked={isStoreOnline} onChange={e => onStoreStatusChange(e.target.checked)} />
                                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-green-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                </label>
                                <span className={`font-semibold text-lg ${isStoreOnline ? 'text-green-600' : 'text-red-600'}`}>
                                    {isStoreOnline ? 'Aberta para pedidos' : 'Fechada'}
                                </span>
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'products' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold">Gerenciar Produtos</h3>
                                <button onClick={handleAddNewProduct} className="bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-all"><i className="fas fa-plus mr-2"></i>Novo Produto</button>
                            </div>
                            <div className="space-y-6">
                                {displayCategories.map(category => {
                                    const categoryProducts = allProducts
                                        .filter(p => p.categoryId === category.id)
                                        .sort((a, b) => a.orderIndex - b.orderIndex);
                                    
                                    return (
                                        <div key={category.id}>
                                            <h4 className="text-lg font-semibold mb-2 text-brand-olive-600 pb-1 border-b-2 border-brand-green-300">{category.name}</h4>
                                            <ReactSortable
                                                list={categoryProducts}
                                                setList={(newList) => handleProductReorder(newList, category.id)}
                                                group={{ name: 'products', pull: false, put: false }}
                                                animation={200}
                                                delay={2}
                                                className="space-y-3 min-h-[50px]"
                                                handle=".handle"
                                            >
                                                {categoryProducts.map((product) => (
                                                    <div key={product.id} className="bg-gray-50 p-3 rounded-lg flex items-center">
                                                        <div className="handle cursor-grab text-gray-400 mr-4" aria-label={`Arrastar para reordenar ${product.name}`}>
                                                            <i className="fas fa-grip-vertical"></i>
                                                        </div>
                                                        <p className="font-bold flex-grow">{product.name}</p>
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={() => handleEditProduct(product)} className="bg-blue-500 text-white w-8 h-8 rounded-md hover:bg-blue-600" aria-label={`Editar ${product.name}`}><i className="fas fa-edit"></i></button>
                                                            <button onClick={() => window.confirm('Tem certeza que deseja excluir este produto?') && onDeleteProduct(product.id)} className="bg-red-500 text-white w-8 h-8 rounded-md hover:bg-red-600" aria-label={`Deletar ${product.name}`}><i className="fas fa-trash"></i></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </ReactSortable>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {activeTab === 'categories' && (
                        <div>
                           <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold">Gerenciar Categorias</h3>
                                <button onClick={handleAddNewCategory} className="bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-all"><i className="fas fa-plus mr-2"></i>Nova Categoria</button>
                            </div>
                            <ReactSortable
                                list={displayCategories}
                                setList={(newList) => {
                                    setDisplayCategories(newList);
                                    onReorderCategories(newList);
                                }}
                                animation={200}
                                delay={2}
                                className="space-y-3"
                                handle=".handle"
                            >
                                {displayCategories.map((cat) => (
                                    <div key={cat.id} className="bg-gray-50 p-3 rounded-lg flex items-center">
                                        <div className="handle cursor-grab text-gray-400 mr-4" aria-label={`Arrastar para reordenar ${cat.name}`}>
                                            <i className="fas fa-grip-vertical"></i>
                                        </div>
                                        <p className="font-bold flex-grow">{cat.name}</p>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleEditCategory(cat)} className="bg-blue-500 text-white w-8 h-8 rounded-md hover:bg-blue-600" aria-label={`Editar ${cat.name}`}><i className="fas fa-edit"></i></button>
                                            <button onClick={() => window.confirm(`Tem certeza que deseja excluir a categoria "${cat.name}"?`) && onDeleteCategory(cat.id)} className="bg-red-500 text-white w-8 h-8 rounded-md hover:bg-red-600" aria-label={`Deletar ${cat.name}`}><i className="fas fa-trash"></i></button>
                                        </div>
                                    </div>
                                ))}
                            </ReactSortable>
                        </div>
                    )}

                    {activeTab === 'data' && (
                        <div>
                            <h3 className="text-xl font-bold mb-4">Gerenciamento de Dados</h3>
                            <div className="bg-gray-50 p-4 rounded-lg mb-6 border">
                                <h4 className="font-semibold text-lg mb-2">Backup</h4>
                                <p className="text-gray-600 mb-3">Crie um backup de todos os seus produtos, categorias e configurações da loja. O backup será salvo como um arquivo JSON no seu computador.</p>
                                <button onClick={handleBackup} className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 transition-all">
                                    <i className="fas fa-download mr-2"></i>Fazer Backup
                                </button>
                            </div>
                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                <h4 className="font-semibold text-lg mb-2 text-yellow-800"><i className="fas fa-exclamation-triangle mr-2"></i>Ação Perigosa: Popular Banco de Dados</h4>
                                <p className="text-yellow-700 mb-3">Esta ação irá adicionar os produtos e categorias iniciais ao seu banco de dados. Use apenas uma vez na configuração inicial ou se você limpou o banco de dados. Isso não substituirá itens existentes com o mesmo nome.</p>
                                <button onClick={handleSeedDatabase} className="bg-yellow-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-yellow-600 transition-all">
                                    <i className="fas fa-database mr-2"></i>Popular Banco de Dados
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <ProductModal 
                isOpen={isProductModalOpen}
                onClose={() => setIsProductModalOpen(false)}
                onSave={onSaveProduct}
                product={editingProduct}
                categories={allCategories}
            />
            <CategoryModal
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                onSave={onSaveCategory}
                category={editingCategory}
            />
        </section>
    );
};