// FIX: Updated all functions to use Firebase v8 syntax to resolve module import errors.
import firebase from 'firebase/compat/app';
import { db, auth, functions } from './firebase';
import { Product, Category, SiteSettings, Order, OrderStatus, PaymentStatus, OrderDetails, CartItem, ChatMessage, ReservationDetails, UserProfile, Address, DaySchedule } from '../types';

export const updateStoreStatus = async (isOnline: boolean): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const statusRef = db.doc('store_config/status');
    await statusRef.set({ isOpen: isOnline }, { merge: true });
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

// Soft deletes a product by marking it as 'deleted'
export const deleteProduct = async (productId: string): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    if (!productId) throw new Error("Invalid Product ID for deletion.");
    const productRef = db.collection('products').doc(productId);
    await productRef.update({ deleted: true });
};

// Restores a soft-deleted product
export const restoreProduct = async (productId: string): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    if (!productId) throw new Error("Invalid Product ID for restoration.");
    const productRef = db.collection('products').doc(productId);
    await productRef.update({ deleted: false });
};

// Permanently deletes a product from Firestore
export const permanentDeleteProduct = async (productId: string): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    if (!productId) throw new Error("Invalid Product ID for permanent deletion.");
    const productRef = db.collection('products').doc(productId);
    await productRef.delete();
};

// Bulk soft-deletes products
export const bulkDeleteProducts = async (productIds: string[]): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const batch = db.batch();
    productIds.forEach(id => {
        const productRef = db.collection('products').doc(id);
        batch.update(productRef, { deleted: true });
    });
    await batch.commit();
};

// Bulk permanently deletes products
export const bulkPermanentDeleteProducts = async (productIds: string[]): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const batch = db.batch();
    productIds.forEach(id => {
        const productRef = db.collection('products').doc(id);
        batch.delete(productRef);
    });
    await batch.commit();
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

// Site Settings
export const updateSiteSettings = async (settings: Partial<SiteSettings>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const settingsRef = db.doc('store_config/site_settings');
    await settingsRef.set(settings, { merge: true });
};


// Order Functions (Vercel API)
export const createOrderInFirestore = async (
    details: OrderDetails,
    cart: CartItem[],
    total: number,
    orderId: string,
    idToken: string | null
): Promise<number> => {
    const response = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': idToken ? `Bearer ${idToken}` : ''
        },
        body: JSON.stringify({ details, cart, total, orderId })
    });

    if (!response.ok) {
        throw new Error(`Failed to create order: ${response.status}`);
    }

    const data = await response.json();
    return data.orderNumber;
};

export const createReservationInFirestore = async (
    details: ReservationDetails,
    idToken: string | null
): Promise<{orderId: string, orderNumber: number}> => {
    const response = await fetch('/api/create-reservation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': idToken ? `Bearer ${idToken}` : ''
        },
        body: JSON.stringify({ details })
    });

    if (!response.ok) {
        throw new Error(`Failed to create reservation: ${response.status}`);
    }

    const data = await response.json();
    return data;
};


// Firestore Order Updates (Admin)
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
    await db.collection('orders').doc(orderId).delete();
};

export const permanentDeleteMultipleOrders = async (orderIds: string[]): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const batch = db.batch();
    orderIds.forEach(id => {
        const orderRef = db.collection('orders').doc(id);
        batch.delete(orderRef);
    });
    await batch.commit();
};

// Chatbot
export const askChatbot = async (
    history: ChatMessage[],
    products: Product[],
    categories: Category[],
    isStoreOnline: boolean,
    operatingHours: DaySchedule[] | undefined,
    userProfile: UserProfile | null,
    myOrders: Order[]
): Promise<string> => {
    const response = await fetch('/api/ask-santo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            history,
            menuData: { products, categories },
            storeStatus: { isOnline: isStoreOnline, operatingHours: operatingHours || [] },
            userProfile,
            myOrders
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        console.error("Chatbot API Error:", errorData);
        throw new Error(`Failed to get response: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.reply;
};

// User Profile & Auth
export const verifyGoogleTokenAndSignIn = async (idToken: string): Promise<void> => {
    if (!auth) throw new Error("Firebase Auth not initialized.");
    const response = await fetch('/api/verify-google-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
    });

    if (!response.ok) {
        throw new Error(`Token verification failed: ${response.status}`);
    }

    const data = await response.json();
    const customToken = data.customToken;
    await auth.signInWithCustomToken(customToken);
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const userRef = db.collection('users').doc(uid);
    const doc = await userRef.get();
    if (doc.exists) {
        return { uid, ...doc.data() } as UserProfile;
    }
    return null;
};

export const createUserProfile = async (user: firebase.User, name: string, phone: string): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const userRef = db.collection('users').doc(user.uid);
    const profile: Partial<UserProfile> = {
        name: name || user.displayName || 'Usuário',
        email: user.email || '',
        photoURL: user.photoURL || '',
        phone: phone || '',
        addresses: [],
    };
    await userRef.set(profile, { merge: true });
};

export const updateUserProfile = async (uid: string, data: Partial<Pick<UserProfile, 'name' | 'phone'>>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await db.collection('users').doc(uid).update(data);
};

export const addAddress = async (uid: string, address: Omit<Address, 'id'>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const userRef = db.collection('users').doc(uid);
    const newAddress = { ...address, id: db.collection('users').doc().id };

    if (newAddress.isFavorite) {
        const doc = await userRef.get();
        if (doc.exists) {
            const profile = doc.data() as UserProfile;
            const addresses = (profile.addresses || []).map(addr => ({ ...addr, isFavorite: false }));
            await userRef.update({
                addresses: [...addresses, newAddress]
            });
            return;
        }
    }

    await userRef.update({
        addresses: firebase.firestore.FieldValue.arrayUnion(newAddress)
    });
};

export const updateAddress = async (uid: string, address: Address): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const userRef = db.collection('users').doc(uid);
    const doc = await userRef.get();
    if (doc.exists) {
        const profile = doc.data() as UserProfile;
        let addresses = profile.addresses || [];

        if (address.isFavorite) {
            addresses = addresses.map(addr => ({ ...addr, isFavorite: false }));
        }

        const addressIndex = addresses.findIndex(a => a.id === address.id);
        if (addressIndex > -1) {
            addresses[addressIndex] = address;
        } else {
            addresses.push(address);
        }
        await userRef.update({ addresses });
    }
};

export const deleteAddress = async (uid: string, addressId: string): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const userRef = db.collection('users').doc(uid);
    const doc = await userRef.get();
    if (doc.exists) {
        const profile = doc.data() as UserProfile;
        const addresses = (profile.addresses || []).filter(a => a.id !== addressId);
        // If the deleted address was the favorite and there are other addresses, make the first one the new favorite.
        if (addresses.length > 0 && !addresses.some(a => a.isFavorite)) {
            addresses[0].isFavorite = true;
        }
        await userRef.update({ addresses });
    }
};

export const manageProfilePicture = async (imageBase64: string | null): Promise<void> => {
    if (!functions) throw new Error("Firebase Functions is not initialized.");
    const managePic = functions.httpsCallable('manageProfilePicture');
    await managePic({ imageBase64 });
};

export const syncGuestOrders = async (uid: string, orderIds: string[]): Promise<{ success: boolean; message: string; }> => {
    if (!functions) throw new Error("Firebase Functions is not initialized.");
    const syncFunc = functions.httpsCallable('syncGuestOrders');
    const result = await syncFunc({ orderIds });
    return result.data as { success: boolean; message: string; };
};
