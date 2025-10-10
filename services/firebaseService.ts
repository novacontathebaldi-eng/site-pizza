// FIX: Import the firebase namespace to use for type annotations.
import firebase from 'firebase/compat/app';
import { db, storage, auth, functions } from './firebase';
import { Product, Category, SiteSettings, Order, StoreStatus, OrderCustomerDetails } from '../types';

if (!functions) {
    throw new Error("Firebase Functions not initialized. Check your firebase.ts configuration.");
}

// --- CALLABLE FUNCTIONS (Mercado Pago) ---

const createMercadoPagoOrderCallable = functions.httpsCallable('createMercadoPagoOrder');
const cancelMercadoPagoOrderCallable = functions.httpsCallable('cancelMercadoPagoOrder');
const refundMercadoPagoOrderCallable = functions.httpsCallable('refundMercadoPagoOrder');

export const initiateMercadoPagoPixPayment = async (orderId: string): Promise<{ qrCodeBase64: string; copyPaste: string }> => {
    try {
        const result = await createMercadoPagoOrderCallable({ orderId });
        return result.data as { qrCodeBase64: string; copyPaste: string };
    } catch (error) {
        console.error("Error calling createMercadoPagoOrder function:", error);
        throw error;
    }
};

export const cancelMercadoPagoOrder = async (orderId: string): Promise<any> => {
     try {
        const result = await cancelMercadoPagoOrderCallable({ orderId });
        return result.data;
    } catch (error) {
        console.error("Error calling cancelMercadoPagoOrder function:", error);
        throw error;
    }
};

export const refundMercadoPagoOrder = async (orderId: string, amount?: number): Promise<any> => {
    try {
        const result = await refundMercadoPagoOrderCallable({ orderId, amount });
        return result.data;
    } catch (error) {
        console.error("Error calling refundMercadoPagoOrder function:", error);
        throw error;
    }
};


/**
 * Uploads an image file to Firebase Storage.
 * @param file The image file to upload.
 * @returns A promise that resolves with the public URL of the uploaded image.
 */
export const uploadImage = async (file: File): Promise<string> => {
    if (!storage) throw new Error("Firebase Storage not initialized");
    const storageRef = storage.ref();
    const fileRef = storageRef.child(`images/${Date.now()}_${file.name}`);
    await fileRef.put(file);
    const url = await fileRef.getDownloadURL();
    return url;
};


// --- AUTHENTICATION ---
export const onAuthUserChanged = (callback: (user: firebase.User | null) => void) => {
    if (!auth) throw new Error("Firebase Auth not initialized");
    return auth.onAuthStateChanged(callback);
};

export const login = (email: string, password: string): Promise<firebase.auth.UserCredential> => {
    if (!auth) throw new Error("Firebase Auth not initialized");
    return auth.signInWithEmailAndPassword(email, password);
};

export const logout = (): Promise<void> => {
    if (!auth) throw new Error("Firebase Auth not initialized");
    return auth.signOut();
};


// --- DATA FETCHING ---
export const getProductsAndCategories = async () => {
    if (!db) throw new Error("Firestore not initialized");

    const categoriesSnapshot = await db.collection('categories').orderBy('order').get();
    const categories: Category[] = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));

    const productsSnapshot = await db.collection('products').orderBy('orderIndex').get();
    const products: Product[] = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    
    const storeStatusDoc = await db.collection('store_config').doc('status').get();
    const storeStatus: StoreStatus = storeStatusDoc.exists ? storeStatusDoc.data() as StoreStatus : { isOpen: false };

    return { products, categories, storeStatus };
};

export const getSiteSettings = async (): Promise<SiteSettings | null> => {
    if (!db) throw new Error("Firestore not initialized");
    // Corrected collection name from 'site_config' to 'store_config' to match other parts of the app
    const doc = await db.collection('store_config').doc('site_settings').get();
    return doc.exists ? doc.data() as SiteSettings : null;
};

// --- DATA MODIFICATION ---

// Products
export const addProduct = async (productData: Omit<Product, 'id'>): Promise<Product> => {
    if (!db) throw new Error("Firestore not initialized");
    const docRef = await db.collection('products').add(productData);
    return { id: docRef.id, ...productData };
};

export const updateProduct = async (product: Product): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized");
    const { id, ...productData } = product;
    await db.collection('products').doc(id).update(productData);
};

export const deleteProduct = async (productId: string): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized");
    await db.collection('products').doc(productId).delete();
};


// Categories
export const addCategory = async (categoryData: Omit<Category, 'id'>): Promise<Category> => {
    if (!db) throw new Error("Firestore not initialized");
    const docRef = await db.collection('categories').add(categoryData);
    return { id: docRef.id, ...categoryData };
};

export const updateCategory = async (category: Category): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized");
    const { id, ...categoryData } = category;
    await db.collection('categories').doc(id).update(categoryData);
};

export const deleteCategory = async (categoryId: string): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized");
    await db.collection('categories').doc(categoryId).delete();
};

export const updateCategoriesOrder = async (categories: {id: string, order: number}[]): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized");
    const batch = db.batch();
    categories.forEach((cat) => {
        const docRef = db.collection('categories').doc(cat.id);
        batch.update(docRef, { order: cat.order });
    });
    await batch.commit();
};

// Site Settings
export const updateSiteSettings = async (settings: SiteSettings): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized");
    await db.collection('store_config').doc('site_settings').set(settings, { merge: true });
};

// Store Status
export const updateStoreStatus = async (status: StoreStatus): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized");
    await db.collection('store_config').doc('status').set(status, { merge: true });
};

// Orders
export const addOrder = async (orderData: Omit<Order, 'id' | 'createdAt'>): Promise<firebase.firestore.DocumentReference> => {
    if (!db) throw new Error("Firestore not initialized");
    const newOrder = {
        ...orderData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    return db.collection('orders').add(newOrder);
};


export const onOrdersUpdate = (callback: (orders: Order[]) => void) => {
    if (!db) throw new Error("Firestore not initialized");
    return db.collection('orders').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        const orders: Order[] = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(), 
            } as Order
        });
        callback(orders);
    });
};

export const updateOrderStatus = async (orderId: string, status: Order['status']): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized");
    await db.collection('orders').doc(orderId).update({ status });
};

export const updateOrderPaymentStatus = async (orderId: string, paymentStatus: Order['paymentStatus']): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized");
    await db.collection('orders').doc(orderId).update({ paymentStatus });
};

export const updateOrderAfterRefund = async (orderId: string, refundId: string, refundAmount: number): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized");
    const orderRef = db.collection('orders').doc(orderId);
    
    await db.runTransaction(async (transaction) => {
        const orderDoc = await transaction.get(orderRef);
        if (!orderDoc.exists) {
            throw new Error("Order not found!");
        }
        const orderData = orderDoc.data() as Order;

        const newRefund = {
            id: refundId,
            amount: refundAmount,
            date: new Date()
        };

        const existingRefunds = orderData.refunds || [];
        const totalRefunded = existingRefunds.reduce((sum, r) => sum + r.amount, 0) + refundAmount;

        const newPaymentStatus = totalRefunded >= orderData.total ? 'refunded' : 'partially_refunded';

        transaction.update(orderRef, {
            paymentStatus: newPaymentStatus,
            refunds: firebase.firestore.FieldValue.arrayUnion(newRefund)
        });
    });
};
