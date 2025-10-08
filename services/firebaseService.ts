// FIX: Added an import for the 'firebase/compat/app' module.
// This resolves an error where the 'firebase.User' type was not recognized because the 'firebase' namespace was not available in this file.
import firebase from 'firebase/compat/app';
import { db, storage, functions } from './firebase.ts';
import { seedDatabase as seedDb } from './seed.ts';
import { Product, Category, OrderDetails, CartItem, Order, SiteSettings, UserProfile, OrderStatus, PaymentStatus } from '../types.ts';

// --- Data Subscriptions ---
export const subscribeToData = (
    onUpdate: (data: { products: Product[], categories: Category[], siteSettings: SiteSettings, isOnline: boolean }) => void,
    onError: (error: Error) => void
) => {
    let dataCache: { products?: Product[], categories?: Category[], siteSettings?: SiteSettings, isOnline?: boolean } = {};

    const dispatchUpdate = (newData: Partial<typeof dataCache>) => {
        dataCache = { ...dataCache, ...newData };
        if (dataCache.products && dataCache.categories && dataCache.siteSettings && dataCache.isOnline !== undefined) {
            onUpdate(dataCache as { products: Product[], categories: Category[], siteSettings: SiteSettings, isOnline: boolean });
        }
    };
    
    const unsubscribes = [
        db.collection('products').onSnapshot(snapshot => {
            const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
            dispatchUpdate({ products });
        }, onError),
        db.collection('categories').onSnapshot(snapshot => {
            const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Category[];
            dispatchUpdate({ categories });
        }, onError),
        db.doc('store_config/site_settings').onSnapshot(snapshot => {
            const siteSettings = snapshot.data() as SiteSettings;
            dispatchUpdate({ siteSettings });
        }, onError),
        db.doc('store_config/status').onSnapshot(snapshot => {
            const isOnline = snapshot.data()?.isOpen ?? true;
            dispatchUpdate({ isOnline });
        }, onError),
    ];

    return () => unsubscribes.forEach(unsub => unsub());
};

export const subscribeToOrders = (
    onUpdate: (orders: Order[]) => void,
    onError: (error: Error) => void
) => {
    if (!db) {
        onError(new Error("Firestore is not initialized."));
        return () => {};
    }
    return db.collection('orders')
        .orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
            const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
            onUpdate(orders);
        }, onError);
};

// --- Image Upload ---
export const uploadImage = async (file: File): Promise<string> => {
    if (!storage) throw new Error("Firebase Storage not initialized");
    const storageRef = storage.ref();
    const fileRef = storageRef.child(`images/${file.name}-${new Date().getTime()}`);
    await fileRef.put(file);
    return fileRef.getDownloadURL();
};

// --- Product Management ---
export const saveProduct = async (product: Product) => {
    if (!db) throw new Error("Firestore not initialized");
    if (product.id) {
        const { id, ...productData } = product;
        return db.collection('products').doc(id).update(productData);
    }
    return db.collection('products').add(product);
};
export const deleteProduct = (productId: string) => db.collection('products').doc(productId).delete();
export const updateProductStatus = (productId: string, active: boolean) => db.collection('products').doc(productId).update({ active });
export const updateProductStockStatus = (productId: string, stockStatus: 'available' | 'out_of_stock') => db.collection('products').doc(productId).update({ stockStatus });
export const reorderProducts = (updates: { id: string, orderIndex: number }[]) => {
    const batch = db.batch();
    updates.forEach(update => {
        const docRef = db.collection('products').doc(update.id);
        batch.update(docRef, { orderIndex: update.orderIndex });
    });
    return batch.commit();
};

// --- Category Management ---
export const saveCategory = async (category: Category) => {
    if (category.id) {
        const { id, ...categoryData } = category;
        return db.collection('categories').doc(id).update(categoryData);
    }
    const { id, ...categoryData } = category;
    return db.collection('categories').add(categoryData);
};
export const deleteCategory = (categoryId: string) => db.collection('categories').doc(categoryId).delete();
export const updateCategoryStatus = (categoryId: string, active: boolean) => db.collection('categories').doc(categoryId).update({ active });
export const reorderCategories = (updates: { id: string, order: number }[]) => {
    const batch = db.batch();
    updates.forEach(update => {
        const docRef = db.collection('categories').doc(update.id);
        batch.update(docRef, { order: update.order });
    });
    return batch.commit();
};

// --- Store Status ---
export const setStoreStatus = (isOnline: boolean) => db.doc('store_config/status').set({ isOpen: isOnline });

// --- Site Settings ---
export const saveSiteSettings = async (settings: SiteSettings, files: { [key: string]: File | null }) => {
    let updatedSettings = { ...settings };
    for (const key in files) {
        if (files[key]) {
            const file = files[key] as File;
            const url = await uploadImage(file);
            if (key === 'logo') updatedSettings.logoUrl = url;
            if (key === 'heroBg') updatedSettings.heroBgUrl = url;
            // Handle content section images
            const section = updatedSettings.contentSections.find(s => s.id === key);
            if (section) {
                section.imageUrl = url;
            }
        }
    }
    return db.doc('store_config/site_settings').set(updatedSettings, { merge: true });
};

// --- Order Management ---
export const createOrder = async (details: OrderDetails, cartItems: CartItem[], userId?: string | null): Promise<Order> => {
    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const orderData: Omit<Order, 'id'> = {
        customer: {
            name: details.name,
            phone: details.phone,
            orderType: details.orderType,
            address: details.address,
            reservationTime: details.reservationTime,
        },
        items: cartItems,
        total: total,
        paymentMethod: details.paymentMethod,
        changeNeeded: details.changeNeeded,
        changeAmount: details.changeAmount,
        notes: details.notes,
        status: details.orderType === 'local' ? 'reserved' : 'pending',
        paymentStatus: 'pending',
        createdAt: new Date(),
        userId: userId || null, // Link to user
    };
    const docRef = await db.collection('orders').add(orderData);
    const newOrder = { id: docRef.id, ...orderData };
    // We need to cast createdAt because Firestore will convert it to a Timestamp
    return newOrder as Order;
};

export const updateOrderStatus = (orderId: string, status: OrderStatus, payload?: any) => db.collection('orders').doc(orderId).update({ status, ...payload });
export const updateOrderPaymentStatus = (orderId: string, paymentStatus: PaymentStatus) => db.collection('orders').doc(orderId).update({ paymentStatus });
export const updateOrderReservationTime = (orderId: string, reservationTime: string) => db.collection('orders').doc(orderId).update({ 'customer.reservationTime': reservationTime });
export const deleteOrder = (orderId: string) => db.collection('orders').doc(orderId).update({ status: 'deleted' });
export const permanentlyDeleteOrder = (orderId: string) => db.collection('orders').doc(orderId).delete();
export const getOrderById = async (orderId: string): Promise<Order | null> => {
    const doc = await db.collection('orders').doc(orderId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } as Order : null;
};
export const getOrdersByUserId = (userId: string, onUpdate: (orders: Order[]) => void, onError: (error: Error) => void) => {
    return db.collection('orders')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
            const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
            onUpdate(orders);
        }, onError);
};

// --- Auth & User Profile ---
export const findOrCreateUserProfile = async (user: firebase.User): Promise<UserProfile> => {
    const userRef = db.collection('users').doc(user.uid);
    const doc = await userRef.get();

    if (doc.exists) {
        return doc.data() as UserProfile;
    } else {
        const newUserProfile: UserProfile = {
            email: user.email,
            displayName: user.displayName,
            phone: user.phoneNumber || null,
        };
        await userRef.set(newUserProfile);
        return newUserProfile;
    }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
    const doc = await db.collection('users').doc(uid).get();
    return doc.exists ? (doc.data() as UserProfile) : null;
};


// --- Database Seeding ---
export const seedDatabase = async () => seedDb();

// --- Mercado Pago (PIX) ---
export const initiateMercadoPagoPixPayment = async (orderId: string): Promise<{ qrCodeBase64: string; copyPaste: string }> => {
    if (!functions) throw new Error("Firebase Functions not initialized");
    const createOrderFunction = functions.httpsCallable('createMercadoPagoOrder');
    const result = await createOrderFunction({ orderId });
    return result.data;
};