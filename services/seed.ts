// FIX: Updated Firestore calls to v8 syntax to resolve module import errors.
import { db } from './firebase';
import { Product, Category } from '../types';

// Dados iniciais para popular o banco de dados
const initialCategories: Omit<Category, 'id'>[] = [
    { name: 'Entradas e Aperitivos', order: 0, active: true },
    { name: 'Pizzas Tradicionais', order: 1, active: true },
    { name: 'Pizzas Especiais da Casa', order: 2, active: true },
    { name: 'Pizzas Veganas e Vegetarianas', order: 3, active: true },
    { name: 'Calzones', order: 4, active: true },
    { name: 'Pizzas Doces', order: 5, active: true },
    { name: 'Sobremesas', order: 6, active: true },
    { name: 'Bebidas não Alcoólicas', order: 7, active: true },
    { name: 'Cervejas Artesanais', order: 8, active: true },
    { name: 'Vinhos', order: 9, active: true },
];

const initialProducts: Omit<Product, 'id' | 'categoryId'>[] = [
    // Entradas e Aperitivos
    { name: 'Cornetto de Calabresa', description: 'Casquinha de massa de pizza recheada com calabresa, muçarela e orégano.', prices: { 'Única': 18.00 }, imageUrl: 'https://picsum.photos/seed/cornetto/400/300', active: true, orderIndex: 0 },
    { name: 'Burrata ao Pesto', description: 'Burrata fresca servida com pesto de manjericão, tomates cereja confit e torradas artesanais.', prices: { 'Única': 45.00 }, imageUrl: 'https://picsum.photos/seed/burrata/400/300', badge: 'Novo', active: true, orderIndex: 1 },
    { name: 'Batata Rústica com Alecrim', description: 'Batatas rústicas assadas com alecrim, páprica defumada e um toque de sal grosso.', prices: { 'Única': 25.00 }, imageUrl: 'https://picsum.photos/seed/batatarustica/400/300', active: true, orderIndex: 2 },
    { name: 'Dadinhos de Tapioca', description: 'Crocantes por fora e cremosos por dentro, acompanhados de geleia de pimenta agridoce.', prices: { 'Única': 28.00 }, imageUrl: 'https://picsum.photos/seed/dadinhos/400/300', active: true, orderIndex: 3 },

    // Pizzas Tradicionais
    { name: 'Mussarela', description: 'Clássica pizza com molho de tomate, generosa camada de muçarela e orégano.', prices: { P: 30.00, M: 40.00, G: 46.00 }, imageUrl: 'https://picsum.photos/seed/mussarela/400/300', active: true, orderIndex: 4 },
    { name: 'Margherita', description: 'Molho de tomate, mozzarella de búfala, manjericão fresco e azeite extravirgem.', prices: { P: 32.00, M: 42.00, G: 48.00 }, imageUrl: 'https://picsum.photos/seed/margherita/400/300', badge: 'Popular', active: true, orderIndex: 5 },
    { name: 'Calabresa', description: 'Molho de tomate, calabresa fatiada, cebola e azeitonas pretas.', prices: { P: 35.00, M: 45.00, G: 52.00 }, imageUrl: 'https://picsum.photos/seed/calabresa/400/300', active: true, orderIndex: 6 },
    { name: 'Portuguesa', description: 'Molho, muçarela, presunto, ovos, cebola, pimentão e azeitonas.', prices: { P: 42.00, M: 52.00, G: 58.00 }, imageUrl: 'https://picsum.photos/seed/portuguesa/400/300', active: true, orderIndex: 7 },
    { name: 'Quatro Queijos', description: 'Molho, muçarela, gorgonzola, parmesão e catupiry.', prices: { P: 45.00, M: 55.00, G: 62.00 }, imageUrl: 'https://picsum.photos/seed/queijos/400/300', badge: 'Mais Pedida', active: true, orderIndex: 8 },
    { name: 'Frango com Catupiry', description: 'Frango desfiado temperado, catupiry, milho e azeitonas.', prices: { P: 40.00, M: 50.00, G: 57.00 }, imageUrl: 'https://picsum.photos/seed/frango/400/300', active: true, orderIndex: 9 },
    { name: 'Napolitana', description: 'Molho, muçarela, rodelas de tomate, parmesão e manjericão.', prices: { P: 38.00, M: 48.00, G: 55.00 }, imageUrl: 'https://picsum.photos/seed/napolitana/400/300', active: true, orderIndex: 10 },
    { name: 'Atum', description: 'Molho de tomate, atum sólido, cebola e azeitonas.', prices: { P: 39.00, M: 49.00, G: 56.00 }, imageUrl: 'https://picsum.photos/seed/atum/400/300', active: true, orderIndex: 11 },
    { name: 'Bacon com Milho', description: 'Molho, muçarela, bacon crocante e milho verde.', prices: { P: 41.00, M: 51.00, G: 58.00 }, imageUrl: 'https://picsum.photos/seed/baconmilho/400/300', active: true, orderIndex: 12 },

    // Pizzas Especiais da Casa
    { name: 'Santa Sensação', description: 'Molho especial, queijo brie, presunto parma, figos frescos, rúcula e mel trufado.', prices: { M: 65.00, G: 78.00 }, imageUrl: 'https://picsum.photos/seed/sensacao/400/300', badge: 'Premiada', active: true, orderIndex: 13 },
    { name: 'Delícia do Mestre', description: 'Pesto de manjericão, muçarela de búfala, tomate cereja confit, lascas de amêndoas e parmesão.', prices: { M: 62.00, G: 75.00 }, imageUrl: 'https://picsum.photos/seed/mestre/400/300', badge: 'Gourmet', active: true, orderIndex: 14 },
    { name: 'Capixaba Rústica', description: 'Muçarela, carne seca desfiada, banana da terra grelhada, cebola roxa e queijo coalho.', prices: { M: 60.00, G: 72.00 }, imageUrl: 'https://picsum.photos/seed/capixaba/400/300', active: true, orderIndex: 15 },
    { name: 'Tesouro do Mar', description: 'Molho branco, camarões salteados, catupiry, alho poró e pimenta biquinho.', prices: { M: 70.00, G: 85.00 }, imageUrl: 'https://picsum.photos/seed/camarao/400/300', active: true, orderIndex: 16 },
    { name: 'Sertaneja Nobre', description: 'Muçarela, linguiça de pernil artesanal, queijo minas curado, couve crispy e melaço de cana.', prices: { M: 58.00, G: 69.00 }, imageUrl: 'https://picsum.photos/seed/sertaneja/400/300', badge: 'Novidade', active: true, orderIndex: 17 },

    // Pizzas Veganas e Vegetarianas
    { name: 'Horta Vegana', description: 'Molho, "queijo" de castanha, brócolis, tomate seco, azeitonas e manjericão.', prices: { M: 50.00, G: 60.00 }, imageUrl: 'https://picsum.photos/seed/veganahorta/400/300', badge: 'Vegana', active: true, orderIndex: 18 },
    { name: 'Shitake & Alho Poró (Vegana)', description: 'Molho, "queijo" de castanha, shitake salteado, alho poró e azeite trufado.', prices: { M: 55.00, G: 66.00 }, imageUrl: 'https://picsum.photos/seed/shitake/400/300', badge: 'Vegana', active: true, orderIndex: 19 },
    { name: 'Vegetariana Clássica', description: 'Molho, muçarela, abobrinha, berinjela, pimentões coloridos e azeitonas.', prices: { M: 48.00, G: 58.00 }, imageUrl: 'https://picsum.photos/seed/vegetariana/400/300', active: true, orderIndex: 20 },
    { name: 'Palmito Cremoso', description: 'Molho, muçarela, palmito em pedaços com um toque de catupiry e orégano.', prices: { M: 52.00, G: 62.00 }, imageUrl: 'https://picsum.photos/seed/palmitocremoso/400/300', active: true, orderIndex: 21 },
    
    // Calzones
    { name: 'Calzone de Calabresa', description: 'Massa fechada recheada com calabresa, muçarela, cebola e catupiry.', prices: { M: 50.00 }, imageUrl: 'https://picsum.photos/seed/calzonecalabresa/400/300', active: true, orderIndex: 22 },
    { name: 'Calzone de Frango', description: 'Massa fechada com frango desfiado, catupiry e milho.', prices: { M: 48.00 }, imageUrl: 'https://picsum.photos/seed/calzonefrango/400/300', active: true, orderIndex: 23 },

    // Pizzas Doces
    { name: 'Chocolate com Morango', description: 'Massa doce, Nutella, morangos frescos e açúcar de confeiteiro.', prices: { P: 35.00, M: 45.00 }, imageUrl: 'https://picsum.photos/seed/chocomorango/400/300', active: true, orderIndex: 24 },
    { name: 'Banana com Canela', description: 'Massa doce, banana, canela em pó, açúcar e leite condensado.', prices: { P: 30.00, M: 40.00 }, imageUrl: 'https://picsum.photos/seed/banana/400/300', active: true, orderIndex: 25 },
    { name: 'Romeu e Julieta', description: 'Muçarela coberta com uma generosa camada de goiabada cremosa.', prices: { P: 32.00, M: 42.00 }, imageUrl: 'https://picsum.photos/seed/romeujulieta/400/300', active: true, orderIndex: 26 },

    // Sobremesas
    { name: 'Pudim da Casa', description: 'Pudim de leite condensado cremoso com calda de caramelo.', prices: { 'Única': 15.00 }, imageUrl: 'https://picsum.photos/seed/pudim/400/300', active: true, orderIndex: 27 },
    { name: 'Mousse de Chocolate Belga', description: 'Mousse aerado de chocolate belga 70% cacau.', prices: { 'Única': 18.00 }, imageUrl: 'https://picsum.photos/seed/mousse/400/300', active: true, orderIndex: 28 },
    { name: 'Tiramisù', description: 'Clássica sobremesa italiana com café, biscoitos e creme de mascarpone.', prices: { 'Única': 22.00 }, imageUrl: 'https://picsum.photos/seed/tiramisu/400/300', active: true, orderIndex: 29 },

    // Bebidas não Alcoólicas
    { name: 'Coca-Cola 2L', description: 'Refrigerante Coca-Cola 2 litros gelado.', prices: { 'Única': 12.00 }, imageUrl: 'https://picsum.photos/seed/coca2l/400/300', active: true, orderIndex: 30 },
    { name: 'Guaraná Antarctica 2L', description: 'Refrigerante Guaraná Antarctica 2 litros gelado.', prices: { 'Única': 10.00 }, imageUrl: 'https://picsum.photos/seed/guarana2l/400/300', active: true, orderIndex: 31 },
    { name: 'Coca-Cola Lata 350ml', description: 'Refrigerante Coca-Cola em lata 350ml.', prices: { 'Única': 6.00 }, imageUrl: 'https://picsum.photos/seed/cocalata/400/300', active: true, orderIndex: 32 },
    { name: 'Água Mineral com Gás', description: 'Água mineral com gás 500ml.', prices: { 'Única': 4.00 }, imageUrl: 'https://picsum.photos/seed/aguagas/400/300', active: true, orderIndex: 33 },
    { name: 'Suco de Laranja Natural', description: 'Suco de laranja feito na hora 500ml.', prices: { 'Única': 9.00 }, imageUrl: 'https://picsum.photos/seed/sucolaranja/400/300', active: true, orderIndex: 34 },
    
    // Cervejas Artesanais
    { name: 'Cerveja Artesanal IPA', description: 'Cerveja local do estilo India Pale Ale, com amargor e aroma marcantes. 600ml.', prices: { 'Única': 25.00 }, imageUrl: 'https://picsum.photos/seed/cervejaipa/400/300', active: true, orderIndex: 35 },
    { name: 'Cerveja de Trigo Weiss', description: 'Cerveja de trigo leve e refrescante, com notas de banana e cravo. 500ml.', prices: { 'Única': 22.00 }, imageUrl: 'https://picsum.photos/seed/cervejaweiss/400/300', active: true, orderIndex: 36 },
    
    // Vinhos
    { name: 'Vinho Tinto Cabernet Sauvignon', description: 'Garrafa de vinho tinto seco, ideal para acompanhar pizzas de carnes. 750ml.', prices: { 'Única': 60.00 }, imageUrl: 'https://picsum.photos/seed/vinhotinto/400/300', active: true, orderIndex: 37 },
    { name: 'Vinho Branco Sauvignon Blanc', description: 'Garrafa de vinho branco leve e refrescante, harmoniza com pizzas de queijo. 750ml.', prices: { 'Única': 55.00 }, imageUrl: 'https://picsum.photos/seed/vinhobranco/400/300', active: true, orderIndex: 38 },
];

const productCategoryMap: { [key: string]: string } = {
    'Cornetto de Calabresa': 'Entradas e Aperitivos',
    'Burrata ao Pesto': 'Entradas e Aperitivos',
    'Batata Rústica com Alecrim': 'Entradas e Aperitivos',
    'Dadinhos de Tapioca': 'Entradas e Aperitivos',
    'Mussarela': 'Pizzas Tradicionais',
    'Margherita': 'Pizzas Tradicionais',
    'Calabresa': 'Pizzas Tradicionais',
    'Portuguesa': 'Pizzas Tradicionais',
    'Quatro Queijos': 'Pizzas Tradicionais',
    'Frango com Catupiry': 'Pizzas Tradicionais',
    'Napolitana': 'Pizzas Tradicionais',
    'Atum': 'Pizzas Tradicionais',
    'Bacon com Milho': 'Pizzas Tradicionais',
    'Santa Sensação': 'Pizzas Especiais da Casa',
    'Delícia do Mestre': 'Pizzas Especiais da Casa',
    'Capixaba Rústica': 'Pizzas Especiais da Casa',
    'Tesouro do Mar': 'Pizzas Especiais da Casa',
    'Sertaneja Nobre': 'Pizzas Especiais da Casa',
    'Horta Vegana': 'Pizzas Veganas e Vegetarianas',
    'Shitake & Alho Poró (Vegana)': 'Pizzas Veganas e Vegetarianas',
    'Vegetariana Clássica': 'Pizzas Veganas e Vegetarianas',
    'Palmito Cremoso': 'Pizzas Veganas e Vegetarianas',
    'Calzone de Calabresa': 'Calzones',
    'Calzone de Frango': 'Calzones',
    'Chocolate com Morango': 'Pizzas Doces',
    'Banana com Canela': 'Pizzas Doces',
    'Romeu e Julieta': 'Pizzas Doces',
    'Pudim da Casa': 'Sobremesas',
    'Mousse de Chocolate Belga': 'Sobremesas',
    'Tiramisù': 'Sobremesas',
    'Coca-Cola 2L': 'Bebidas não Alcoólicas',
    'Guaraná Antarctica 2L': 'Bebidas não Alcoólicas',
    'Coca-Cola Lata 350ml': 'Bebidas não Alcoólicas',
    'Água Mineral com Gás': 'Bebidas não Alcoólicas',
    'Suco de Laranja Natural': 'Bebidas não Alcoólicas',
    'Cerveja Artesanal IPA': 'Cervejas Artesanais',
    'Cerveja de Trigo Weiss': 'Cervejas Artesanais',
    'Vinho Tinto Cabernet Sauvignon': 'Vinhos',
    'Vinho Branco Sauvignon Blanc': 'Vinhos',
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
            const fullProductData = { ...productData, categoryId, stockStatus: 'available' as const };
            batch.set(productRef, fullProductData);
        } else {
            console.warn(`Categoria '${categoryName}' não encontrada para o produto '${productData.name}'.`);
        }
    }

    // 4. Executar todas as operações em lote
    await batch.commit();
    console.log("Banco de dados populado com sucesso!");
};
