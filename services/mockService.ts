
import { Product, Category } from '../types';

let mockStoreStatus = { isOnline: true };

const mockCategories: Category[] = [
    { id: 'pizzas-salgadas', name: 'Pizzas Salgadas', order: 1, active: true },
    { id: 'pizzas-doces', name: 'Pizzas Doces', order: 2, active: true },
    { id: 'bebidas', name: 'Bebidas', order: 3, active: true },
    { id: 'sobremesas', name: 'Sobremesas', order: 4, active: true },
    { id: 'aperitivos', name: 'Aperitivos', order: 5, active: true }
];

let mockProducts: Product[] = [
    // FIX: Added 'orderIndex' to each product to match the 'Product' type.
    { id: 'margherita', name: 'Pizza Margherita', description: 'Molho de tomate, mozzarella de búfala, manjericão fresco e azeite extravirgem', categoryId: 'pizzas-salgadas', prices: { P: 32.00, M: 42.00, G: 48.00 }, imageUrl: 'https://picsum.photos/seed/margherita/400/300', badge: 'Popular', active: true, orderIndex: 0 },
    { id: 'calabresa', name: 'Calabresa Especial', description: 'Molho de tomate, calabresa artesanal, cebola roxa, azeitonas pretas e orégano', categoryId: 'pizzas-salgadas', prices: { P: 35.00, M: 45.00, G: 52.00 }, imageUrl: 'https://picsum.photos/seed/calabresa/400/300', active: true, orderIndex: 1 },
    { id: 'portuguesa', name: 'Portuguesa Premium', description: 'Presunto parma, ovos caipira, ervilhas fresquinhas e azeitonas portuguesas', categoryId: 'pizzas-salgadas', prices: { P: 42.00, M: 52.00, G: 58.00 }, imageUrl: 'https://picsum.photos/seed/portuguesa/400/300', badge: 'Premium', active: true, orderIndex: 2 },
    { id: 'quatro-queijos', name: '4 Queijos Gourmet', description: 'Mozzarella, gorgonzola DOP, parmesão reggiano e catupiry premium', categoryId: 'pizzas-salgadas', prices: { P: 45.00, M: 55.00, G: 62.00 }, imageUrl: 'https://picsum.photos/seed/queijos/400/300', badge: 'Gourmet', active: true, orderIndex: 3 },
    { id: 'frango-catupiry', name: 'Frango com Catupiry', description: 'Frango desfiado temperado, catupiry premium, milho e azeitonas', categoryId: 'pizzas-salgadas', prices: { P: 40.00, M: 50.00, G: 57.00 }, imageUrl: 'https://picsum.photos/seed/frango/400/300', active: true, orderIndex: 4 },
    { id: 'chocolate-morango', name: 'Chocolate com Morango', description: 'Massa doce, nutella, morangos frescos, banana e açúcar de confeiteiro', categoryId: 'pizzas-doces', prices: { P: 28.00, M: 35.00, G: 42.00 }, imageUrl: 'https://picsum.photos/seed/chocomorango/400/300', badge: 'Popular', active: true, orderIndex: 5 },
    { id: 'banana-canela', name: 'Banana com Canela', description: 'Massa doce, banana, canela em pó, açúcar cristal e leite condensado', categoryId: 'pizzas-doces', prices: { P: 25.00, M: 32.00, G: 38.00 }, imageUrl: 'https://picsum.photos/seed/banana/400/300', active: true, orderIndex: 6 },
    { id: 'coca-2l', name: 'Coca-Cola 2L', description: 'Refrigerante Coca-Cola 2 litros gelado', categoryId: 'bebidas', prices: { 'Única': 8.00 }, imageUrl: 'https://picsum.photos/seed/coca/400/300', active: true, orderIndex: 7 },
    { id: 'guarana-2l', name: 'Guaraná Antarctica 2L', description: 'Refrigerante Guaraná Antarctica 2 litros gelado', categoryId: 'bebidas', prices: { 'Única': 8.00 }, imageUrl: 'https://picsum.photos/seed/guarana/400/300', active: true, orderIndex: 8 },
    { id: 'pudim', name: 'Pudim de Leite Condensado', description: 'Pudim cremoso feito com leite condensado e calda de açúcar', categoryId: 'sobremesas', prices: { 'Única': 12.00 }, imageUrl: 'https://picsum.photos/seed/pudim/400/300', active: true, orderIndex: 9 },
    { id: 'batata-frita', name: 'Batata Frita Especial', description: 'Batata frita crocante temperada com ervas', categoryId: 'aperitivos', prices: { 'Única': 18.00 }, imageUrl: 'https://picsum.photos/seed/batata/400/300', active: true, orderIndex: 10 },
];

const simulateDelay = <T,>(data: T): Promise<T> => 
    new Promise(resolve => setTimeout(() => resolve(data), 200));

export const getMockData = () => simulateDelay({
    products: [...mockProducts],
    categories: [...mockCategories],
    isOnline: mockStoreStatus.isOnline
});

export const updateMockProduct = (product: Product): Promise<Product> => {
    const index = mockProducts.findIndex(p => p.id === product.id);
    if (index !== -1) {
        mockProducts[index] = product;
        return simulateDelay(product);
    }
    return Promise.reject(new Error("Product not found"));
};

export const addMockProduct = (productData: Omit<Product, 'id'>): Promise<Product> => {
    const newProduct: Product = {
        ...productData,
        id: `prod_${new Date().getTime()}_${Math.random().toString(36).substring(2, 9)}`,
    };
    mockProducts.push(newProduct);
    return simulateDelay(newProduct);
};

export const deleteMockProduct = (productId: string): Promise<{ success: boolean }> => {
    const initialLength = mockProducts.length;
    mockProducts = mockProducts.filter(p => p.id !== productId);
    if (mockProducts.length < initialLength) {
        return simulateDelay({ success: true });
    }
    return Promise.reject(new Error("Product not found"));
};

export const updateMockStoreStatus = (isOnline: boolean): Promise<boolean> => {
    mockStoreStatus.isOnline = isOnline;
    return simulateDelay(true);
};