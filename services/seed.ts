// FIX: Updated Firestore calls to v8 syntax to resolve module import errors.
import { db } from './firebase';
import { Product, Category } from '../types';

// Dados iniciais para popular o banco de dados
const initialCategories: Omit<Category, 'id'>[] = [
    { name: 'Pizzas Salgadas', order: 1, active: true },
    { name: 'Pizzas Doces', order: 2, active: true },
    { name: 'Sobremesas', order: 3, active: true },
    { name: 'Aperitivos', order: 4, active: true },
    { name: 'Bebidas', order: 5, active: true }
];

const initialProducts: Omit<Product, 'id' | 'categoryId'>[] = [
    { name: 'Pizza Margherita', description: 'Molho de tomate, mozzarella de búfala, manjericão fresco e azeite extravirgem', prices: { P: 32.00, M: 42.00, G: 48.00 }, imageUrl: 'https://picsum.photos/seed/margherita/400/300', badge: 'Popular', active: true, orderIndex: 0 },
    { name: 'Calabresa Especial', description: 'Molho de tomate, calabresa artesanal, cebola roxa, azeitonas pretas e orégano', prices: { P: 35.00, M: 45.00, G: 52.00 }, imageUrl: 'https://picsum.photos/seed/calabresa/400/300', active: true, orderIndex: 1 },
    { name: 'Portuguesa Premium', description: 'Presunto parma, ovos caipira, ervilhas fresquinhas e azeitonas portuguesas', prices: { P: 42.00, M: 52.00, G: 58.00 }, imageUrl: 'https://picsum.photos/seed/portuguesa/400/300', badge: 'Premium', active: true, orderIndex: 2 },
    { name: '4 Queijos Gourmet', description: 'Mozzarella, gorgonzola DOP, parmesão reggiano e catupiry premium', prices: { P: 45.00, M: 55.00, G: 62.00 }, imageUrl: 'https://picsum.photos/seed/queijos/400/300', badge: 'Gourmet', active: true, orderIndex: 3 },
    { name: 'Frango com Catupiry', description: 'Frango desfiado temperado, catupiry premium, milho e azeitonas', prices: { P: 40.00, M: 50.00, G: 57.00 }, imageUrl: 'https://picsum.photos/seed/frango/400/300', active: true, orderIndex: 4 },
    { name: 'Chocolate com Morango', description: 'Massa doce, nutella, morangos frescos, banana e açúcar de confeiteiro', prices: { P: 28.00, M: 35.00, G: 42.00 }, imageUrl: 'https://picsum.photos/seed/chocomorango/400/300', badge: 'Popular', active: true, orderIndex: 5 },
    { name: 'Banana com Canela', description: 'Massa doce, banana, canela em pó, açúcar cristal e leite condensado', prices: { P: 25.00, M: 32.00, G: 38.00 }, imageUrl: 'https://picsum.photos/seed/banana/400/300', active: true, orderIndex: 6 },
    { name: 'Coca-Cola 2L', description: 'Refrigerante Coca-Cola 2 litros gelado', prices: { 'Única': 8.00 }, imageUrl: 'https://picsum.photos/seed/coca/400/300', active: true, orderIndex: 7 },
    { name: 'Guaraná Antarctica 2L', description: 'Refrigerante Guaraná Antarctica 2 litros gelado', prices: { 'Única': 8.00 }, imageUrl: 'https://picsum.photos/seed/guarana/400/300', active: true, orderIndex: 8 },
    { name: 'Pudim de Leite Condensado', description: 'Pudim cremoso feito com leite condensado e calda de açúcar', prices: { 'Única': 12.00 }, imageUrl: 'https://picsum.photos/seed/pudim/400/300', active: true, orderIndex: 9 },
    { name: 'Batata Frita Especial', description: 'Batata frita crocante temperada com ervas', prices: { 'Única': 18.00 }, imageUrl: 'https://picsum.photos/seed/batata/400/300', active: true, orderIndex: 10 },
];

const productCategoryMap: { [key: string]: string } = {
    'Pizza Margherita': 'Pizzas Salgadas',
    'Calabresa Especial': 'Pizzas Salgadas',
    'Portuguesa Premium': 'Pizzas Salgadas',
    '4 Queijos Gourmet': 'Pizzas Salgadas',
    'Frango com Catupiry': 'Pizzas Salgadas',
    'Chocolate com Morango': 'Pizzas Doces',
    'Banana com Canela': 'Pizzas Doces',
    'Coca-Cola 2L': 'Bebidas',
    'Guaraná Antarctica 2L': 'Bebidas',
    'Pudim de Leite Condensado': 'Sobremesas',
    'Batata Frita Especial': 'Aperitivos',
};


/**
 * Populates the Firestore database with initial products, categories, and store status.
 * This function is designed to be run once to set up the database.
 */
export const seedDatabase = async () => {
    if (!db) {
        console.error("Firestore database is not initialized.");
        throw new Error("A conexão com o Firestore falhou.");
    }
    
    console.log("Iniciando a população do banco de dados...");
    const batch = db.batch();

    // 1. Configuração da Loja
    const statusRef = db.doc('store_config/status');
    batch.set(statusRef, { isOpen: true });

    // 2. Criar Categorias e guardar seus IDs
    const categoryRefs: { [name: string]: string } = {};
    for (const categoryData of initialCategories) {
        const categoryRef = db.collection('categories').doc();
        batch.set(categoryRef, categoryData);
        categoryRefs[categoryData.name] = categoryRef.id;
    }

    // 3. Criar Produtos associando com os IDs das categorias
    for (const productData of initialProducts) {
        const categoryName = productCategoryMap[productData.name];
        const categoryId = categoryRefs[categoryName];

        if (categoryId) {
            const productRef = db.collection('products').doc();
            batch.set(productRef, { ...productData, categoryId });
        } else {
            console.warn(`Categoria '${categoryName}' não encontrada para o produto '${productData.name}'.`);
        }
    }

    // 4. Executar todas as operações em lote
    await batch.commit();
    console.log("Banco de dados populado com sucesso!");
};
