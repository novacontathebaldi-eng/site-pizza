// FIX: Updated all functions to use Firebase v8 syntax to resolve module import errors.
import firebase from 'firebase/compat/app';
import { db, storage, functions } from './firebase';
import { Product, Category, SiteSettings, Order, OrderStatus, PaymentStatus, OrderDetails, CartItem } from '../types';

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

// --- Order Management Functions (Calling Cloud Functions) ---

/**
 * Creates an order document in Firestore and, if it's a PIX payment,
 * initiates the payment with Mercado Pago.
 * @param details The customer and order details from the checkout form.
 * @param cart The items in the shopping cart.
 * @param total The total amount of the order.
 * @returns An object containing the new order's ID, its number, and PIX data if applicable.
 */
export const createOrder = async (details: OrderDetails, cart: CartItem[], total: number, pixOption?: 'payNow' | 'payLater'): Promise<{ orderId: string, orderNumber: number, pixData?: any }> => {
    if (!functions) {
        throw new Error("Firebase Functions is not initialized.");
    }
    const createOrderFunction = functions.httpsCallable('createOrder');
    try {
        const result = await createOrderFunction({ details, cart, total, pixOption });
        return result.data;
    } catch (error) {
        console.error("Error calling createOrder function:", error);
        throw new Error("Não foi possível criar o pedido. Tente novamente.");
    }
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


/**
 * Calls a cloud function to process a full refund for a given order via Mercado Pago.
 * @param orderId The ID of the order to be refunded.
 * @returns The result from the cloud function, typically a success message.
 */
export const refundPayment = async (orderId: string): Promise<any> => {
    if (!functions) {
        throw new Error("Firebase Functions is not initialized.");
    }
    const refundPaymentFunction = functions.httpsCallable('refundPayment');
    try {
        const result = await refundPaymentFunction({ orderId });
        return result.data;
    } catch (error) {
        console.error("Error calling refundPayment function:", error);
        // The error from the cloud function is more user-friendly
        throw error;
    }
};