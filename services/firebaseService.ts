// FIX: Updated all functions to use Firebase v8 syntax to resolve module import errors.
import firebase from 'firebase/compat/app';
import { db, storage, functions } from './firebase';
import { Product, Category, SiteSettings, Order, OrderStatus, PaymentStatus } from '../types';

export const updateStoreStatus = async (isOnline: boolean): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const statusRef = db.doc('store_config/status');
    await statusRef.set({ isOpen: isOnline }, { merge: true });
};

// Image Upload Function
export const uploadImage = async (file: File): Promise<string> => {
    if (!storage) {
        throw new Error("Firebase Storage não está inicializado.");
    }
    const fileExtension = file.name.split('.').pop();
    const fileName = `products/${new Date().getTime()}_${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
    const storageRef = storage.ref(fileName);

    const snapshot = await storageRef.put(file);
    const downloadURL = await snapshot.ref.getDownloadURL();
    
    return downloadURL;
};

// Site Asset Upload Function
export const uploadSiteAsset = async (file: File, assetName: string): Promise<string> => {
    if (!storage) {
        throw new Error("Firebase Storage não está inicializado.");
    }
    const fileExtension = file.name.split('.').pop();
    const fileName = `site/${assetName}_${new Date().getTime()}.${fileExtension}`;
    const storageRef = storage.ref(fileName);
    
    const snapshot = await storageRef.put(file);
    return await snapshot.ref.getDownloadURL();
};


// Product Functions
export const addProduct = async (productData: Omit<Product, 'id'>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await db.collection('products').add(productData);
};

export const updateProduct = async (productId: string, productData: Omit<Product, 'id'>): Promise<void> => {
    if (!productId) throw new Error("Product ID is missing for update.");
    if (!db) throw new Error("Firestore is not initialized.");
    const productRef = db.collection('products').doc(productId);
    await productRef.update(productData as { [key: string]: any });
};

export const updateProductStatus = async (productId: string, active: boolean): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const productRef = db.collection('products').doc(productId);
    await productRef.update({ active });
};

export const updateProductStockStatus = async (productId: string, stockStatus: 'available' | 'out_of_stock'): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const productRef = db.collection('products').doc(productId);
    await productRef.update({ stockStatus });
};

export const deleteProduct = async (productId: string): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    if (!productId) throw new Error("Invalid Product ID for deletion.");
    const productRef = db.collection('products').doc(productId);
    await productRef.delete();
};

export const updateProductsOrder = async (productsToUpdate: { id: string; orderIndex: number }[]): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const batch = db.batch();
    productsToUpdate.forEach(productUpdate => {
        const productRef = db.collection('products').doc(productUpdate.id);
        batch.update(productRef, { orderIndex: productUpdate.orderIndex });
    });
    await batch.commit();
};


// Category Functions
export const addCategory = async (categoryData: Omit<Category, 'id'>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await db.collection('categories').add(categoryData);
};

export const updateCategory = async (categoryId: string, categoryData: Omit<Category, 'id'>): Promise<void> => {
    if (!categoryId) throw new Error("Category ID is missing for update.");
    if (!db) throw new Error("Firestore is not initialized.");
    const categoryRef = db.collection('categories').doc(categoryId);
    await categoryRef.update(categoryData as { [key: string]: any });
};

export const updateCategoryStatus = async (categoryId: string, active: boolean): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const categoryRef = db.collection('categories').doc(categoryId);
    await categoryRef.update({ active });
};

export const deleteCategory = async (categoryId: string, allProducts: Product[]): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    if (!categoryId) throw new Error("Invalid document reference.");
    
    const isCategoryInUse = allProducts.some(product => product.categoryId === categoryId);
    if (isCategoryInUse) {
        throw new Error("Não é possível excluir esta categoria, pois ela está sendo usada por um ou mais produtos.");
    }

    const categoryRef = db.collection('categories').doc(categoryId);
    await categoryRef.delete();
};

export const updateCategoriesOrder = async (categoriesToUpdate: { id: string; order: number }[]): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const batch = db.batch();
    categoriesToUpdate.forEach(categoryUpdate => {
        const categoryRef = db.collection('categories').doc(categoryUpdate.id);
        batch.update(categoryRef, { order: categoryUpdate.order });
    });
    await batch.commit();
};

// Site Settings Function
export const updateSiteSettings = async (settings: Partial<SiteSettings>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const settingsRef = db.doc('store_config/site_settings');
    await settingsRef.set(settings, { merge: true });
};

// Order Management Functions
export const addOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'pickupTimeEstimate'>): Promise<firebase.firestore.DocumentReference> => {
    if (!db) throw new Error("Firestore is not initialized.");
    return db.collection('orders').add({
        ...orderData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
};

export const updateOrderStatus = async (orderId: string, status: OrderStatus, payload?: Partial<Pick<Order, 'pickupTimeEstimate'>>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const orderRef = db.collection('orders').doc(orderId);
    await orderRef.update({ status, ...payload });
};

export const updateOrderPaymentStatus = async (orderId: string, paymentStatus: PaymentStatus): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const orderRef = db.collection('orders').doc(orderId);
    await orderRef.update({ paymentStatus });
};

export const updateOrderReservationTime = async (orderId: string, reservationTime: string): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const orderRef = db.collection('orders').doc(orderId);
    await orderRef.update({ 'customer.reservationTime': reservationTime });
};

export const deleteOrder = async (orderId: string): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const orderRef = db.collection('orders').doc(orderId);
    await orderRef.delete();
};

// --- Mercado Pago Functions ---

export const createMercadoPagoOrder = async (orderId: string, orderData: Omit<Order, 'id' | 'createdAt'>): Promise<any> => {
    if (!functions) {
        throw new Error("Firebase Functions is not initialized.");
    }
    const createOrderFunction = functions.httpsCallable('createMercadoPagoOrder');
    try {
        const result = await createOrderFunction({ orderId, orderData });
        return result.data;
    } catch (error) {
        console.error("Error calling createMercadoPagoOrder function:", error);
        throw new Error("Não foi possível gerar a cobrança PIX. Tente novamente.");
    }
};

export const cancelMercadoPagoOrder = async (mercadoPagoOrderId: string): Promise<any> => {
    if (!functions) {
        throw new Error("Firebase Functions is not initialized.");
    }
    const cancelOrderFunction = functions.httpsCallable('cancelOrder');
    try {
        const result = await cancelOrderFunction({ mercadoPagoOrderId });
        return result.data;
    } catch (error) {
        console.error("Error calling cancelOrder function:", error);
        throw new Error("Não foi possível cancelar o pedido no Mercado Pago.");
    }
};

export const refundMercadoPagoOrder = async (mercadoPagoOrderId: string): Promise<any> => {
    if (!functions) {
        throw new Error("Firebase Functions is not initialized.");
    }
    // This implements a full refund.
    const refundOrderFunction = functions.httpsCallable('refundOrder');
    try {
        const result = await refundOrderFunction({ mercadoPagoOrderId });
        return result.data;
    } catch (error) {
        console.error("Error calling refundOrder function:", error);
        throw new Error("Não foi possível reembolsar o pedido no Mercado Pago.");
    }
};
