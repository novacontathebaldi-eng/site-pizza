
import { db, storage, functions, auth } from './firebase';
import { Product, Category, SiteSettings, Order, OrderDetails, UserProfile, UserAddress } from '../types';
import firebase from 'firebase/compat/app';
import { seedDatabase as seed } from './seed';

// Re-export seed function
export const seedDatabase = seed;

// --- DATA SUBSCRIPTIONS ---

export const onStoreDataChange = (
    callback: (data: { products: Product[], categories: Category[], settings: SiteSettings, isOnline: boolean }) => void
) => {
    let products: Product[] = [];
    let categories: Category[] = [];
    let settings: SiteSettings | null = null;
    let isOnline: boolean | null = null;

    const maybeCallback = () => {
        if (products && categories && settings && isOnline !== null) {
            callback({ products, categories, settings, isOnline });
        }
    };

    const unsubProducts = db.collection('products').onSnapshot(snapshot => {
        products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        maybeCallback();
    });

    const unsubCategories = db.collection('categories').onSnapshot(snapshot => {
        categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
        maybeCallback();
    });

    const unsubSettings = db.collection('store_config').doc('site_settings').onSnapshot(doc => {
        settings = doc.data() as SiteSettings;
        maybeCallback();
    });
    
    const unsubStatus = db.collection('store_config').doc('status').onSnapshot(doc => {
        isOnline = doc.data()?.isOpen ?? false;
        maybeCallback();
    });

    return () => {
        unsubProducts();
        unsubCategories();
        unsubSettings();
        unsubStatus();
    };
};

export const onOrdersChange = (callback: (orders: Order[]) => void) => {
    return db.collection('orders').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        callback(orders);
    });
};


// --- PRODUCT MANAGEMENT ---

export const saveProduct = async (product: Product): Promise<void> => {
    if (product.id) {
        await db.collection('products').doc(product.id).update(product);
    } else {
        await db.collection('products').add(product);
    }
};

export const deleteProduct = (productId: string) => db.collection('products').doc(productId).delete();
export const updateProductStatus = (productId: string, active: boolean) => db.collection('products').doc(productId).update({ active });
export const updateProductStockStatus = (productId: string, stockStatus: 'available' | 'out_of_stock') => db.collection('products').doc(productId).update({ stockStatus });
export const onReorderProducts = async (updates: { id: string; orderIndex: number }[]) => {
    const batch = db.batch();
    updates.forEach(update => {
        const docRef = db.collection('products').doc(update.id);
        batch.update(docRef, { orderIndex: update.orderIndex });
    });
    await batch.commit();
};


// --- CATEGORY MANAGEMENT ---

export const saveCategory = async (category: Category): Promise<void> => {
    if (category.id) {
        await db.collection('categories').doc(category.id).update(category);
    } else {
        const countSnapshot = await db.collection('categories').get();
        const newCategory = { ...category, order: countSnapshot.docs.length };
        await db.collection('categories').add(newCategory);
    }
};

export const deleteCategory = (categoryId: string) => db.collection('categories').doc(categoryId).delete();
export const updateCategoryStatus = (categoryId: string, active: boolean) => db.collection('categories').doc(categoryId).update({ active });
export const onReorderCategories = async (updates: { id: string; order: number }[]) => {
    const batch = db.batch();
    updates.forEach(update => {
        const docRef = db.collection('categories').doc(update.id);
        batch.update(docRef, { order: update.order });
    });
    await batch.commit();
};


// --- STORE & SITE SETTINGS ---

export const updateStoreStatus = (isOnline: boolean) => db.collection('store_config').doc('status').set({ isOpen: isOnline });

export const uploadImage = async (file: File): Promise<string> => {
    if (!storage) throw new Error("Firebase Storage is not initialized.");
    const storageRef = storage.ref();
    const fileRef = storageRef.child(`site-images/${new Date().getTime()}_${file.name}`);
    await fileRef.put(file);
    return fileRef.getDownloadURL();
};

export const saveSiteSettings = async (settings: SiteSettings, files: { [key: string]: File | null }): Promise<void> => {
    let updatedSettings = { ...settings };
    for (const key in files) {
        if (files[key]) {
            const file = files[key] as File;
            const url = await uploadImage(file);
            if (key === 'logo') updatedSettings.logoUrl = url;
            if (key === 'heroBg') updatedSettings.heroBgUrl = url;
            // Handle content section images
            if (updatedSettings.contentSections.some(s => s.id === key)) {
                updatedSettings.contentSections = updatedSettings.contentSections.map(s => s.id === key ? { ...s, imageUrl: url } : s);
            }
        }
    }
    await db.collection('store_config').doc('site_settings').set(updatedSettings, { merge: true });
};


// --- ORDER MANAGEMENT ---

export const addOrder = async (orderDetails: OrderDetails, cartItems: CartItem[], total: number, userId?: string): Promise<string> => {
    const newOrder: Omit<Order, 'id'> = {
        customer: {
            name: orderDetails.name,
            phone: orderDetails.phone,
            orderType: orderDetails.orderType,
            address: orderDetails.address,
            reservationTime: orderDetails.reservationTime,
        },
        items: cartItems,
        total,
        paymentMethod: orderDetails.paymentMethod,
        changeNeeded: orderDetails.changeNeeded,
        changeAmount: orderDetails.changeAmount,
        notes: orderDetails.notes,
        status: orderDetails.orderType === 'local' ? 'reserved' : 'pending',
        paymentStatus: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        ...(userId && { userId }),
    };
    const docRef = await db.collection('orders').add(newOrder);
    return docRef.id;
};

export const updateOrderStatus = (orderId: string, status: Order['status'], payload: any = {}) => db.collection('orders').doc(orderId).update({ status, ...payload });
export const updateOrderPaymentStatus = (orderId: string, paymentStatus: Order['paymentStatus']) => db.collection('orders').doc(orderId).update({ paymentStatus });
export const updateOrderReservationTime = (orderId: string, reservationTime: string) => db.collection('orders').doc(orderId).update({ 'customer.reservationTime': reservationTime });
export const deleteOrder = (orderId: string) => db.collection('orders').doc(orderId).update({ status: 'deleted' });
export const permanentDeleteOrder = (orderId: string) => db.collection('orders').doc(orderId).delete();


// --- PAYMENT FUNCTIONS ---

export const initiateMercadoPagoPixPayment = async (orderId: string): Promise<{ qrCodeBase64: string; copyPaste: string }> => {
    if (!functions) throw new Error("Firebase Functions not initialized");
    const createOrderFunction = functions.httpsCallable('createMercadoPagoOrder');
    const result = await createOrderFunction({ orderId });
    return result.data;
};

// --- USER PROFILE MANAGEMENT ---
export const getOrCreateUserProfile = async (user: firebase.User): Promise<UserProfile> => {
    const userRef = db.collection('users').doc(user.uid);
    const doc = await userRef.get();
    if (doc.exists) {
        return { uid: doc.id, ...doc.data() } as UserProfile;
    } else {
        const newUserProfile: UserProfile = {
            uid: user.uid,
            name: user.displayName || '',
            email: user.email || '',
            phone: user.phoneNumber || '',
            addresses: [],
            createdAt: firebase.firestore.Timestamp.now(),
        };
        await userRef.set(newUserProfile);
        return newUserProfile;
    }
};

export const onUserProfileChange = (uid: string, callback: (profile: UserProfile | null) => void) => {
    return db.collection('users').doc(uid).onSnapshot(doc => {
        if (doc.exists) {
            callback({ uid: doc.id, ...doc.data() } as UserProfile);
        } else {
            callback(null);
        }
    });
};

export const updateUserProfile = (uid: string, data: Partial<UserProfile>) => db.collection('users').doc(uid).update(data);

export const onUserOrdersChange = (userId: string, callback: (orders: Order[]) => void) => {
    return db.collection('orders')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
            const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
            callback(orders);
        });
};
