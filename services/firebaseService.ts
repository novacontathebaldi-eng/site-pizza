// FIX: Import the firebase namespace to use for type annotations.
import firebase from 'firebase/compat/app';
import { db, storage, auth, functions } from './firebase';
import { Product, Category, SiteSettings, Order, StoreStatus } from '../types';

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
    const doc = await db.collection('site_config').doc('settings').get();
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

export const updateCategoriesOrder = async (categories: Category[]): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized");
    const batch = db.batch();
    categories.forEach((cat, index) => {
        const docRef = db.collection('categories').doc(cat.id);
        batch.update(docRef, { order: index });
    });
    await batch.commit();
};

// Site Settings
export const updateSiteSettings = async (settings: SiteSettings): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized");
    await db.collection('site_config').doc('settings').set(settings, { merge: true });
};

// Store Status
export const updateStoreStatus = async (status: StoreStatus): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized");
    await db.collection('store_config').doc('status').set(status, { merge: true });
};

// Orders
export const placeOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'status'>): Promise<Order> => {
    if (!db) throw new Error("Firestore not initialized");
    const newOrder = {
        ...orderData,
        status: 'pending' as const,
        createdAt: new Date(),
    };
    const docRef = await db.collection('orders').add(newOrder);
    return { id: docRef.id, ...newOrder };
};

export const onOrdersUpdate = (callback: (orders: Order[]) => void) => {
    if (!db) throw new Error("Firestore not initialized");
    return db.collection('orders').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        const orders: Order[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // Convert Firestore Timestamp to Date if needed by the frontend
            createdAt: doc.data().createdAt.toDate ? doc.data().createdAt.toDate() : new Date(), 
        } as Order));
        callback(orders);
    });
};

export const updateOrderStatus = async (orderId: string, status: Order['status']): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized");
    await db.collection('orders').doc(orderId).update({ status });
};