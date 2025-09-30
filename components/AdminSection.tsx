import React, { useState, useEffect, useMemo } from 'react';
import { Product, Category } from '../types';
import { ProductModal } from './ProductModal';
import { CategoryModal } from './CategoryModal';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface AdminSectionProps {
    allProducts: Product[];
    allCategories: Category[];
    isStoreOnline: boolean;
    onSaveProduct: (product: Product) => Promise<void>;
    onDeleteProduct: (productId: string) => Promise<void>;
    onStoreStatusChange: (isOnline: boolean) => Promise<void>;
    onSaveCategory: (category: Category) => Promise<void>;
    onDeleteCategory: (categoryId: string) => Promise<void>;
    onReorderProducts: (productsToUpdate: { id: string; orderIndex: number }[]) => Promise<void>;
    onReorderCategories: (categoriesToUpdate: { id: string; order: number }[]) => Promise<void>;
    onSeedDatabase: () => Promise<void>;
}

interface SortableProductItemProps {
    product: Product;
    onEdit: (product: Product) => void;
    onDelete: (productId: string) => void;
}

const SortableProductItem: React.FC<SortableProductItemProps> = ({ product, onEdit, onDelete }) => {
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

    return (
        <div ref={setNodeRef} style={style} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
            <div className="flex items-center gap-4">
                <button {...attributes} {...listeners} className="cursor-grab touch-none p-2" aria-label="Mover produto">
                    <i className="fas fa-grip-vertical text-gray-500 hover:text-gray-800"></i>
                </button>
                <p className="font-bold">{product.name}</p>
            </div>
            <div className="flex gap-2">
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
}

const SortableCategoryItem: React.FC<SortableCategoryItemProps> = ({ category, onEdit, onDelete }) => {
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
        <div ref={setNodeRef} style={style} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
            <div className="flex items-center gap-4">
                <button {...attributes} {...listeners} className="cursor-grab touch-none p-2" aria-label="Mover categoria">
                    <i className="fas fa-grip-vertical text-gray-500 hover:text-gray-800"></i>
                </button>
                <p className="font-bold">{category.name}</p>
            </div>
            <div className="flex gap-2">
                <button onClick={() => onEdit(category)} className="bg-blue-500 text-white w-8 h-8 rounded-md hover:bg-blue-600" aria-label={`Editar ${category.name}`}><i className="fas fa-edit"></i></button>
                <button onClick={() => window.confirm(`Tem certeza que deseja excluir a categoria "${category.name}"?`) && onDelete(category.id)} className="bg-red-500 text-white w-8 h-8 rounded-md hover:bg-red-600" aria-label={`Deletar ${category.name}`}><i className="fas fa-trash"></i></button>
            </div>
        </div>
    );
};

export const AdminSection: React.FC<AdminSectionProps> = ({ 
    allProducts, allCategories, isStoreOnline, 
    onSaveProduct, onDeleteProduct, onStoreStatusChange,
    onSaveCategory, onDeleteCategory, onReorderProducts, onReorderCategories,
    onSeedDatabase 
}) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [activeTab, setActiveTab] = useState('status');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showAdminPanel, setShowAdminPanel] = useState(window.location.hash === '#admin');
    
    const [localProducts, setLocalProducts] = useState<Product[]>(allProducts);
    const [localCategories, setLocalCategories] = useState<Category[]>(allCategories);

    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    
    useEffect(() => {
        setLocalProducts(allProducts);
    }, [allProducts]);

    useEffect(() => {
        setLocalCategories([...allCategories].sort((a, b) => a.order - b.order));
    }, [allCategories]);

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

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleProductDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            return;
        }

        const activeProduct = localProducts.find(p => p.id === active.id);
        const overProduct = localProducts.find(p => p.id === over.id);
        
        if (!activeProduct || !overProduct || activeProduct.categoryId !== overProduct.categoryId) {
            return;
        }

        const categoryId = activeProduct.categoryId;
        
        setLocalProducts((products) => {
            const categoryProducts = products.filter(p => p.categoryId === categoryId).sort((a, b) => a.orderIndex - b.orderIndex);
            const oldIndex = categoryProducts.findIndex(p => p.id === active.id);
            const newIndex = categoryProducts.findIndex(p => p.id === over.id);
            
            const reorderedCategoryProducts = arrayMove(categoryProducts, oldIndex, newIndex);
            
            const productsToUpdate = reorderedCategoryProducts.map((p, index) => ({
                id: p.id,
                orderIndex: index
            }));

            onReorderProducts(productsToUpdate);

            // Return new state for optimistic update
            const otherProducts = products.filter(p => p.categoryId !== categoryId);
            return [...otherProducts, ...reorderedCategoryProducts.map((p, index) => ({ ...p, orderIndex: index }))];
        });
    };

    const handleCategoryDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            return;
        }

        setLocalCategories((categories) => {
            const oldIndex = categories.findIndex(c => c.id === active.id);
            const newIndex = categories.findIndex(c => c.id === over.id);
            
            const reorderedCategories = arrayMove(categories, oldIndex, newIndex);
            
            const categoriesToUpdate = reorderedCategories.map((c, index) => ({
                id: c.id,
                order: index
            }));

            onReorderCategories(categoriesToUpdate);

            return reorderedCategories.map((c, index) => ({ ...c, order: index }));
        });
    };

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

                    <div className="border-b border-gray-200 mb-6">
                        <div className="flex overflow-x-auto whitespace-nowrap scrollbar-hide -mx-4 px-2 sm:px-4">
                            <button onClick={() => setActiveTab('status')} className={`flex-shrink-0 inline-flex items-center gap-2 py-3 px-4 font-semibold text-sm transition-colors ${activeTab === 'status' ? 'border-b-2 border-accent text-accent' : 'text-gray-500 hover:text-gray-700'}`}>
                                <i className="fas fa-store-alt w-5 text-center"></i>
                                <span>Status</span>
                            </button>
                            <button onClick={() => setActiveTab('products')} className={`flex-shrink-0 inline-flex items-center gap-2 py-3 px-4 font-semibold text-sm transition-colors ${activeTab === 'products' ? 'border-b-2 border-accent text-accent' : 'text-gray-500 hover:text-gray-700'}`}>
                                <i className="fas fa-pizza-slice w-5 text-center"></i>
                                <span>Produtos</span>
                            </button>
                            <button onClick={() => setActiveTab('categories')} className={`flex-shrink-0 inline-flex items-center gap-2 py-3 px-4 font-semibold text-sm transition-colors ${activeTab === 'categories' ? 'border-b-2 border-accent text-accent' : 'text-gray-500 hover:text-gray-700'}`}>
                                <i className="fas fa-tags w-5 text-center"></i>
                                <span>Categorias</span>
                            </button>
                            <button onClick={() => setActiveTab('data')} className={`flex-shrink-0 inline-flex items-center gap-2 py-3 px-4 font-semibold text-sm transition-colors ${activeTab === 'data' ? 'border-b-2 border-accent text-accent' : 'text-gray-500 hover:text-gray-700'}`}>
                                <i className="fas fa-database w-5 text-center"></i>
                                <span>Dados</span>
                            </button>
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
                             <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleProductDragEnd}>
                                <div className="space-y-6">
                                    {localCategories.map(category => {
                                        const categoryProducts = localProducts
                                            .filter(p => p.categoryId === category.id)
                                            .sort((a, b) => a.orderIndex - b.orderIndex);
                                        return (
                                            <div key={category.id}>
                                                <h4 className="text-lg font-semibold mb-2 text-brand-olive-600 pb-1 border-b-2 border-brand-green-300">{category.name}</h4>
                                                <SortableContext items={categoryProducts.map(p => p.id)} strategy={verticalListSortingStrategy}>
                                                    <div className="space-y-3 min-h-[50px]">
                                                        {categoryProducts.map(product => (
                                                            <SortableProductItem
                                                                key={product.id}
                                                                product={product}
                                                                onEdit={handleEditProduct}
                                                                onDelete={onDeleteProduct}
                                                            />
                                                        ))}
                                                    </div>
                                                </SortableContext>
                                            </div>
                                        )
                                    })}
                                </div>
                            </DndContext>
                        </div>
                    )}

                    {activeTab === 'categories' && (
                        <div>
                           <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold">Gerenciar Categorias</h3>
                                <button onClick={handleAddNewCategory} className="bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-all"><i className="fas fa-plus mr-2"></i>Nova Categoria</button>
                            </div>
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}>
                                <SortableContext items={localCategories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-3">
                                        {localCategories.map(cat => (
                                            <SortableCategoryItem
                                                key={cat.id}
                                                category={cat}
                                                onEdit={handleEditCategory}
                                                onDelete={onDeleteCategory}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
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