// FIX: Updated Firestore calls to v8 syntax to resolve module import errors.
import { db } from './firebase';
import { Product, Category } from '../types';

// Dados iniciais para popular o banco de dados
const initialCategories: Omit<Category, 'id'>[] = [
    { name: 'Pizzas Salgadas', order: 0, active: true },
    { name: 'Pizzas Doces', order: 1, active: true },
    { name: 'Calzones', order: 2, active: true },
    { name: 'Bebidas', order: 3, active: true },
];

const productCategoryMap: { [key: string]: string } = {
    'Bragança (bacalhau)': 'Pizzas Salgadas',
    'Tirol (File mignon)': 'Pizzas Salgadas',
    'Califórnia (4 queijos)': 'Pizzas Salgadas',
    'Santa Sensação (lombinho)': 'Pizzas Salgadas',
    'Holanda (Frango/bacon)': 'Pizzas Salgadas',
    'Colina verde (Catubresa) NOVA': 'Pizzas Salgadas',
    'Rio Bonito (Margherita)': 'Pizzas Salgadas',
    'Encantado (costela de boi)': 'Pizzas Salgadas',
    'Suiça (Camarão)': 'Pizzas Salgadas',
    'Caramuru (Frango catupiry)': 'Pizzas Salgadas',
    'Meia Légua (mista 1)': 'Pizzas Salgadas',
    'Barra de Mangarai (Portuguesa)': 'Pizzas Salgadas',
    'Caioaba (Doritos)': 'Pizzas Salgadas',
    'Luxemburgo (Calabresa)': 'Pizzas Salgadas',
    'Chaves (banana)': 'Pizzas Doces',
    'Rio da Prata (Romeu e Julieta)': 'Pizzas Doces',
    'Calzone Portuguesa': 'Calzones',
    'Calzone Calabresa': 'Calzones',
    'Calzone Frango': 'Calzones',
    'Água com gás': 'Bebidas',
    'Cerveja Amstel': 'Bebidas',
    'Coca-Cola 2L': 'Bebidas',
    'Coca-Cola 600ml': 'Bebidas',
    'Coca-Cola Zero 350ml': 'Bebidas',
    'Fanta Uva 350ml': 'Bebidas',
    'Heineken long neck': 'Bebidas',
    'Coca-Cola Zero 1,5L': 'Bebidas',
    'Guaraná Antártica 2L': 'Bebidas',
    'Guaraná Antártica 350ml': 'Bebidas',
    'Coca-Cola 350ml': 'Bebidas',
};

const initialProducts: Omit<Product, 'id' | 'categoryId'>[] = [
    // Pizzas Salgadas
    { name: 'Rio Bonito (Margherita)', description: 'Molho de tomate, muçarela, tomate, manjericão e orégano', prices: { 'M': 42.00, 'G': 54.00 }, imageUrl: 'https://picsum.photos/seed/rio-bonito/400/300', badge: 'Clássica', active: true, orderIndex: 0 },
    { name: 'Luxemburgo (Calabresa)', description: 'Molho de tomate, muçarela, calabresa, cebola e orégano', prices: { 'M': 45.00, 'G': 57.00 }, imageUrl: 'https://picsum.photos/seed/luxemburgo/400/300', active: true, orderIndex: 1 },
    { name: 'Caioaba (Doritos)', description: 'Molho de tomate, queijo muçarela, queijo cheddar, doritos.', prices: { 'M': 48.00, 'G': 58.00 }, imageUrl: 'https://picsum.photos/seed/caioaba/400/300', badge: 'Experimente!', active: true, orderIndex: 2 },
    { name: 'Barra de Mangarai (Portuguesa)', description: 'Molho de tomate, muçarela, presunto, calabresa, cebola, azeitona, palmito, ovo, orégano', prices: { 'M': 50.00, 'G': 62.00 }, imageUrl: 'https://picsum.photos/seed/mangarai/400/300', active: true, orderIndex: 3 },
    { name: 'Santa Sensação (lombinho)', description: 'Molho de tomate, muçarela, bacon, cebola, lombinho canadense, barbecue e oregano', prices: { 'M': 50.00, 'G': 62.00 }, imageUrl: 'https://picsum.photos/seed/santa-sensacao/400/300', badge: 'Da Casa', active: true, orderIndex: 4 },
    { name: 'Holanda (Frango/bacon)', description: 'Molho de tomate, muçarela, frango, bacon, cebola e oregano. Obs: em caso de pizza 1/2, o valor valido será a de maior valor.', prices: { 'M': 50.00, 'G': 62.00 }, imageUrl: 'https://picsum.photos/seed/holanda/400/300', active: true, orderIndex: 5 },
    { name: 'Meia Légua (mista 1)', description: 'Molho de tomate, muçarela, presunto, calabresa, frango, milho, cebola, palmito, orégano', prices: { 'M': 52.00, 'G': 64.00 }, imageUrl: 'https://picsum.photos/seed/meia-legua/400/300', active: true, orderIndex: 6 },
    { name: 'Colina verde (Catubresa) NOVA', description: 'Molho de tomate, muçarela, calabresa, catupiry cebola e orégano', prices: { 'M': 57.00, 'G': 69.00 }, imageUrl: 'https://picsum.photos/seed/colina-verde/400/300', badge: 'NOVA', active: true, orderIndex: 7 },
    { name: 'Caramuru (Frango catupiry)', description: 'Molho de tomate, muçarela, frango, catupiry, azeitona, orégano', prices: { 'M': 60.00, 'G': 72.00 }, imageUrl: 'https://picsum.photos/seed/caramuru/400/300', active: true, orderIndex: 8 },
    { name: 'Califórnia (4 queijos)', description: 'Molho de tomate, muçarela, gorgonzola, catupiry, cheddar', prices: { 'M': 60.00, 'G': 72.00 }, imageUrl: 'https://picsum.photos/seed/california/400/300', active: true, orderIndex: 9 },
    { name: 'Tirol (File mignon)', description: 'Molho de tomate, muçarela, filé mignon, gorgonzola, champignon, salsa, pimenta biquinho', prices: { 'M': 65.00, 'G': 77.00 }, imageUrl: 'https://picsum.photos/seed/tirol/400/300', badge: '⭐', active: true, orderIndex: 10 },
    { name: 'Bragança (bacalhau)', description: 'Molho de tomate, muçarela, bacalhau, batata, catupiry e temperinho verde.', prices: { 'M': 67.00, 'G': 79.00 }, imageUrl: 'https://picsum.photos/seed/braganca/400/300', active: true, orderIndex: 11 },
    { name: 'Encantado (costela de boi)', description: 'Molho de tomate, muçarela, gorgonzola, costela de boi, tomate cereja, cebola e tempero verde.', prices: { 'M': 69.00, 'G': 80.00 }, imageUrl: 'https://picsum.photos/seed/encantado/400/300', active: true, orderIndex: 12 },
    { name: 'Suiça (Camarão)', description: 'Molho de tomate, muçarela, presunto, calabresa, camarão, milho, azeitona, palmito, orégano', prices: { 'M': 70.00, 'G': 82.00 }, imageUrl: 'https://picsum.photos/seed/suica/400/300', active: true, orderIndex: 13 },
    
    // Pizzas Doces
    { name: 'Chaves (banana)', description: 'Muçarela, leite condensado, banana e canela', prices: { 'M': 40.00, 'G': 50.00 }, imageUrl: 'https://picsum.photos/seed/chaves/400/300', active: true, orderIndex: 14 },
    { name: 'Rio da Prata (Romeu e Julieta)', description: 'Muçarela, leite condensado, catupiry, goiabada', prices: { 'M': 45.00, 'G': 55.00 }, imageUrl: 'https://picsum.photos/seed/rio-da-prata/400/300', active: true, orderIndex: 15 },
    
    // Calzones
    { name: 'Calzone Calabresa', description: 'Massa de pizza enrolada, queijo muçarela, calabresa e cebola. Serve uma pessoa.', prices: { 'Única': 27.00 }, imageUrl: 'https://picsum.photos/seed/calzone-calabresa/400/300', active: true, orderIndex: 16 },
    { name: 'Calzone Frango', description: 'Massa de pizza enrolada assada, queijo muçarela e frango. Serve uma pessoa.', prices: { 'Única': 29.00 }, imageUrl: 'https://picsum.photos/seed/calzone-frango/400/300', active: true, orderIndex: 17 },
    { name: 'Calzone Portuguesa', description: 'Massa de pizza enrolada assada, queijo muçarela, presunto, calabresa, palmito, azeitona e cebola', prices: { 'Única': 29.00 }, imageUrl: 'https://picsum.photos/seed/calzone-portuguesa/400/300', active: true, orderIndex: 18 },
    
    // Bebidas
    { name: 'Água com gás', description: 'Água mineral com gás', prices: { 'Única': 4.00 }, imageUrl: 'https://picsum.photos/seed/agua-gas/400/300', active: true, orderIndex: 19 },
    { name: 'Coca-Cola 350ml', description: 'Lata', prices: { 'Única': 7.00 }, imageUrl: 'https://picsum.photos/seed/coca-350/400/300', active: true, orderIndex: 20 },
    { name: 'Coca-Cola Zero 350ml', description: 'Lata', prices: { 'Única': 7.00 }, imageUrl: 'https://picsum.photos/seed/coca-zero-350/400/300', active: true, orderIndex: 21 },
    { name: 'Guaraná Antártica 350ml', description: 'Lata', prices: { 'Única': 7.00 }, imageUrl: 'https://picsum.photos/seed/guarana-350/400/300', active: true, orderIndex: 22 },
    { name: 'Fanta Uva 350ml', description: 'Lata', prices: { 'Única': 7.00 }, imageUrl: 'https://picsum.photos/seed/fanta-uva/400/300', active: true, orderIndex: 23 },
    { name: 'Cerveja Amstel', description: 'Latão', prices: { 'Única': 8.00 }, imageUrl: 'https://picsum.photos/seed/amstel/400/300', active: true, orderIndex: 24 },
    { name: 'Coca-Cola 600ml', description: 'Garrafa pet', prices: { 'Única': 9.00 }, imageUrl: 'https://picsum.photos/seed/coca-600/400/300', active: true, orderIndex: 25 },
    { name: 'Heineken long neck', description: 'Long neck', prices: { 'Única': 10.00 }, imageUrl: 'https://picsum.photos/seed/heineken/400/300', active: true, orderIndex: 26 },
    { name: 'Guaraná Antártica 2L', description: 'Garrafa pet', prices: { 'Única': 14.00 }, imageUrl: 'https://picsum.photos/seed/guarana-2l/400/300', active: true, orderIndex: 27 },
    { name: 'Coca-Cola Zero 1,5L', description: 'Garrafa pet', prices: { 'Única': 14.00 }, imageUrl: 'https://picsum.photos/seed/coca-zero-1.5l/400/300', active: true, orderIndex: 28 },
    { name: 'Coca-Cola 2L', description: 'Garrafa pet', prices: { 'Única': 16.00 }, imageUrl: 'https://picsum.photos/seed/coca-2l/400/300', active: true, orderIndex: 29 },
];


/**
 * Populates the Firestore database with initial products, categories, and store status.
 * This function is designed to be run once to set up the database.
 */
export const seedDatabase = async () => {
    if (!db) {
        console.error("Firestore database is not initialized.");
        throw new Error("A conexão com o Firestore falhou.");
    }
    
    console.log("Iniciando a população do banco de dados com o novo cardápio...");
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
            // Adiciona campos padrão para garantir a conformidade com o tipo Product
            const fullProductData = {
                ...productData,
                categoryId,
                stockStatus: 'available' as 'available' | 'out_of_stock',
                deleted: false,
                isPromotion: false,
            };
            batch.set(productRef, fullProductData);
        } else {
            console.warn(`Categoria '${categoryName}' não encontrada para o produto '${productData.name}'.`);
        }
    }

    // 4. Executar todas as operações em lote
    await batch.commit();
    console.log("Banco de dados populado com sucesso!");
};
