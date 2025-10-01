import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, Category, SiteContent } from '../types';
import { ProductModal } from './ProductModal';
import { CategoryModal } from './CategoryModal';
import { ReactSortable } from 'react-sortablejs';


interface AdminSectionProps {
    allProducts: Product[];
    allCategories: Category[];
    isStoreOnline: boolean;
    onSaveProduct: (product: Product, imageFile?: File) => Promise<void>;
    onDeleteProduct: (productId: string) => Promise<void>;
    onStoreStatusChange: (isOnline: boolean) => Promise<void>;
    onReorderProducts: (products: Product[]) => Promise<void>;
    onSaveCategory: (category: Category) => Promise<void>;
    onDeleteCategory: (categoryId: string) => Promise<void>;
    onReorderCategories: (categories: Category[]) => Promise<void>;
    onSeedDatabase: () => Promise<void>;
    siteContent: SiteContent | null;
    onSaveSiteContent: (content: SiteContent, imageFiles: { logo?: File; heroBg?: File; aboutImg?: File }) => Promise<void>;
}

export const AdminSection: React.FC<AdminSectionProps> = ({ 
    allProducts, allCategories, isStoreOnline, 
    onSaveProduct, onDeleteProduct, onStoreStatusChange, onReorderProducts,
    onSaveCategory, onDeleteCategory, onReorderCategories,
    onSeedDatabase, siteContent, onSaveSiteContent
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
    
    // States for Personalização tab
    const [customizationFormData, setCustomizationFormData] = useState<SiteContent | null>(null);
    const [imageFiles, setImageFiles] = useState<{ logo?: File; heroBg?: File; aboutImg?: File }>({});
    const [imagePreviews, setImagePreviews] = useState<{ logo?: string; heroBg?: string; aboutImg?: string }>({});
    const [isSaving, setIsSaving] = useState(false);

    const adminTabs = useMemo(() => [
        { id: 'status', label: 'Status', icon: 'fas fa-toggle-on' },
        { id: 'products', label: 'Produtos', icon: 'fas fa-pizza-slice' },
        { id: 'categories', label: 'Categorias', icon: 'fas fa-tags' },
        { id: 'personalizacao', label: 'Personalização', icon: 'fas fa-paint-brush' },
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
        if (siteContent) {
            setCustomizationFormData(siteContent);
            setImagePreviews({
                logo: siteContent.logoUrl,
                heroBg: siteContent.heroBgUrl,
                aboutImg: siteContent.aboutImgUrl,
            });
        }
    }, [siteContent]);
    
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
                store_config: { status: { isOpen: isStoreOnline }, siteContent },
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
        const newFullProductList: Product[] = [];
        displayCategories.forEach(cat => {
            if (cat.id === categoryId) {
                newFullProductList.push(...reorderedProductsInCategory);
            } else {
                const productsForCategory = allProducts
                    .filter(p => p.categoryId === cat.id)
                    .sort((a, b) => a.orderIndex - b.orderIndex);
                newFullProductList.push(...productsForCategory);
            }
        });

        const reindexedProducts = newFullProductList.map((p, index) => ({
            ...p,
            orderIndex: index
        }));

        onReorderProducts(reindexedProducts);
    }, [allProducts, displayCategories, onReorderProducts]);

    const handleCustomizationFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!customizationFormData) return;
        setCustomizationFormData({ ...customizationFormData, [e.target.name]: e.target.value });
    };

    const handleAchievementChange = (index: number, value: string) => {
        if (!customizationFormData) return;
        const newAchievements = [...customizationFormData.aboutAchievements] as [string, string, string, string];
        newAchievements[index] = value;
        setCustomizationFormData({ ...customizationFormData, aboutAchievements: newAchievements });
    };

    const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>, imageKey: 'logo' | 'heroBg' | 'aboutImg') => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFiles(prev => ({ ...prev, [imageKey]: file }));
            const previewUrl = URL.createObjectURL(file);
            setImagePreviews(prev => ({ ...prev, [imageKey]: previewUrl }));
            // Clear URL field if a file is chosen
             if (customizationFormData) {
                const newFormData = {...customizationFormData};
                if(imageKey === 'logo') newFormData.logoUrl = '';
                if(imageKey === 'heroBg') newFormData.heroBgUrl = '';
                if(imageKey === 'aboutImg') newFormData.aboutImgUrl = '';
                setCustomizationFormData(newFormData);
            }
        }
    };

    const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>, imageKey: 'logo' | 'heroBg' | 'aboutImg') => {
        const url = e.target.value;
        if (!customizationFormData) return;
        
        const newFormData = {...customizationFormData};
        if(imageKey === 'logo') newFormData.logoUrl = url;
        if(imageKey === 'heroBg') newFormData.heroBgUrl = url;
        if(imageKey === 'aboutImg') newFormData.aboutImgUrl = url;
        setCustomizationFormData(newFormData);

        setImagePreviews(prev => ({ ...prev, [imageKey]: url }));
        // Clear file input if URL is typed
        setImageFiles(prev => {
            const newFiles = {...prev};
            delete newFiles[imageKey];
            return newFiles;
        });
    };

    const handleSaveChanges = async () => {
        if (!customizationFormData) return;
        setIsSaving(true);
        try {
            await onSaveSiteContent(customizationFormData, imageFiles);
            alert('Alterações salvas com sucesso!');
        } catch (error) {
            // Error is handled in App.tsx
        } finally {
            setIsSaving(false);
        }
    };

    const renderPersonalizacaoTab = () => {
        if (!customizationFormData) return <div>Carregando configurações...</div>;
        
        const renderImageInput = (label: string, imageKey: 'logo' | 'heroBg' | 'aboutImg') => (
            <div className="p-4 bg-gray-50 rounded-lg border">
                <label className="block text-md font-semibold mb-3">{label}</label>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-32 h-32 bg-gray-200 rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {imagePreviews[imageKey] ? (
                            <img src={imagePreviews[imageKey]} alt={`${label} preview`} className="w-full h-full object-cover" />
                        ) : (
                            <i className="fas fa-image text-4xl text-gray-400"></i>
                        )}
                    </div>
                    <div className="flex-grow w-full">
                        <div className="mb-2">
                            <label className="block text-xs font-medium mb-1">Enviar Nova Imagem</label>
                            <input type="file" accept="image/*" onChange={(e) => handleImageFileChange(e, imageKey)} className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-ivory-50 file:text-accent hover:file:bg-accent/10 w-full" />
                        </div>
                        <div className="flex items-center gap-2 my-2">
                            <hr className="flex-grow border-t border-gray-300" />
                            <span className="text-xs text-gray-500">OU</span>
                            <hr className="flex-grow border-t border-gray-300" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">Usar URL Externa</label>
                            <input type="text" placeholder="https://exemplo.com/imagem.png" value={imageKey === 'logo' ? customizationFormData.logoUrl : imageKey === 'heroBg' ? customizationFormData.heroBgUrl : customizationFormData.aboutImgUrl} onChange={(e) => handleImageUrlChange(e, imageKey)} className="w-full px-3 py-2 border rounded-md text-sm" />
                        </div>
                    </div>
                </div>
            </div>
        );

        return (
            <div>
                <h3 className="text-xl font-bold mb-4">Personalização do Site</h3>
                <div className="space-y-6">
                    <div>
                        <h4 className="text-lg font-semibold mb-3 text-brand-olive-600 pb-1 border-b-2 border-brand-green-300">Identidade Visual</h4>
                        <div className="space-y-4">
                            {renderImageInput("Logo", "logo")}
                            {renderImageInput("Imagem de Fundo (Principal)", "heroBg")}
                            {renderImageInput("Imagem da Seção 'Sobre Nós'", "aboutImg")}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-lg font-semibold mb-3 text-brand-olive-600 pb-1 border-b-2 border-brand-green-300">Textos do Site</h4>
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg border">
                                <h5 className="font-semibold mb-2">Cabeçalho e Título da Página</h5>
                                <div className="space-y-2">
                                    <div>
                                        <label className="block text-sm font-semibold mb-1">Título Principal (Ex: Pizzaria Santa Sensação)</label>
                                        <input type="text" name="headerTitle" value={customizationFormData.headerTitle} onChange={handleCustomizationFormChange} className="w-full px-3 py-2 border rounded-md" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-1">Descrição/Subtítulo (A pizza premiada...)</label>
                                        <textarea name="headerSubtitle" value={customizationFormData.headerSubtitle} onChange={handleCustomizationFormChange} className="w-full px-3 py-2 border rounded-md" rows={2} />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-4 bg-gray-50 rounded-lg border">
                                <h5 className="font-semibold mb-2">Seção Principal (Hero)</h5>
                                <div>
                                    <label className="block text-sm font-semibold mb-1">Texto do Selo (Ex: A pizza nº 1 do ES)</label>
                                    <input type="text" name="heroBadge" value={customizationFormData.heroBadge} onChange={handleCustomizationFormChange} className="w-full px-3 py-2 border rounded-md" />
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-lg border">
                                <h5 className="font-semibold mb-2">Seção "Sobre Nós"</h5>
                                <div className="space-y-2">
                                    <div>
                                        <label className="block text-sm font-semibold mb-1">Título do Selo (Ex: Nossa Conquista)</label>
                                        <input type="text" name="aboutBadge" value={customizationFormData.aboutBadge} onChange={handleCustomizationFormChange} className="w-full px-3 py-2 border rounded-md" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-1">Título Principal (A Melhor Pizza do Estado...)</label>
                                        <input type="text" name="aboutTitle" value={customizationFormData.aboutTitle} onChange={handleCustomizationFormChange} className="w-full px-3 py-2 border rounded-md" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-1">Parágrafo Principal</label>
                                        <textarea name="aboutParagraph" value={customizationFormData.aboutParagraph} onChange={handleCustomizationFormChange} className="w-full px-3 py-2 border rounded-md" rows={4} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-1">Lista de Conquistas</label>
                                        <div className="space-y-2">
                                            {customizationFormData.aboutAchievements.map((ach, index) => (
                                                <input key={index} type="text" value={ach} onChange={(e) => handleAchievementChange(index, e.target.value)} className="w-full px-3 py-2 border rounded-md" />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="pt-4 border-t mt-6">
                        <button onClick={handleSaveChanges} disabled={isSaving} className="bg-accent text-white font-semibold py-3 px-6 rounded-lg hover:bg-opacity-90 transition-all flex items-center">
                            {isSaving ? (<><i className="fas fa-spinner fa-spin mr-2"></i> Salvando...</>) : (<><i className="fas fa-save mr-2"></i> Salvar Alterações</>)}
                        </button>
                    </div>
                </div>
            </div>
        );
    }


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
                    
                    {activeTab === 'personalizacao' && renderPersonalizacaoTab()}

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
