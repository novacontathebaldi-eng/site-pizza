// FIX: Updated all functions to use Firebase v8 syntax to resolve module import errors.
import firebase from 'firebase/compat/app';
import { db, storage, functions } from './firebase';
import { Product, Category, SiteSettings, Order, OrderStatus, PaymentStatus, OrderDetails, CartItem, ChatMessage, ReservationDetails, UserProfile, Address } from '../types';

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

export const deleteSiteAsset = async (fileUrl: string): Promise<void> => {
    if (!storage) {
        throw new Error("Firebase Storage não está inicializado.");
    }

    // Don't try to delete default assets or non-firebase URLs
    if (!fileUrl || !fileUrl.includes('firebasestorage.googleapis.com')) {
        return;
    }

    try {
        const fileRef = storage.refFromURL(fileUrl);
        await fileRef.delete();
    } catch (error: any) {
        if (error.code === 'storage/object-not-found') {
            console.warn(`File not found, could not delete: ${fileUrl}`);
            return; // It's fine if it's already gone
        }
        console.error("Error deleting site asset:", error);
        throw error;
    }
};

// --- Cloud Functions ---

export const askChatbot = async (history: ChatMessage[]): Promise<string> => {
    if (!functions) throw new Error("Firebase Functions not initialized.");
    const askSanto = functions.httpsCallable('askSanto');
    const response = await askSanto({ history });
    return response.data.reply;
};

export const verifyGoogleToken = async (idToken: string): Promise<string> => {
    if (!functions) throw new Error("Firebase Functions not initialized.");
    const verifyToken = functions.httpsCallable('verifyGoogleToken');
    const result = await verifyToken({ idToken });
    return result.data.customToken;
};

export const createOrder = async (details: OrderDetails, cart: CartItem[], total: number, orderId: string): Promise<{ orderId: string, orderNumber: number }> => {
    if (!functions) throw new Error("Firebase Functions not initialized.");
    const createOrderFunction = functions.httpsCallable('createOrder');
    const result = await createOrderFunction({ details, cart, total, orderId });
    return result.data;
};

export const createReservation = async (details: ReservationDetails): Promise<{ orderId: string, orderNumber: number }> => {
    if (!functions) throw new Error("Firebase Functions not initialized.");
    const createReservationFunction = functions.httpsCallable('createReservation');
    const result = await createReservationFunction({ details });
    return result.data;
};

export const manageProfilePicture = async (imageBase64: string | null): Promise<{ success: boolean, photoURL: string | null }> => {
    if (!functions) throw new Error("Firebase Functions not initialized.");
    const managePic = functions.httpsCallable('manageProfilePicture');
    const result = await managePic({ imageBase64 });
    return result.data;
};

export const syncGuestOrders = async (uid: string, orderIds: string[]): Promise<{ success: boolean, message: string }> => {
    if (!functions) throw new Error("Firebase Functions not initialized.");
    // The cloud function already gets the UID from the context, so we don't need to pass it.
    const syncOrders = functions.httpsCallable('syncGuestOrders');
    const result = await syncOrders({ orderIds });
    return result.data;
};


// --- User Profile ---

export const createUserProfile = async (user: firebase.User, name: string, phone: string): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const userRef = db.collection('users').doc(user.uid);
    await userRef.set({
        name,
        email: user.email,
        photoURL: user.photoURL,
        phone,
        addresses: [],
    }, { merge: true });
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

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const userRef = db.collection('users').doc(uid);
    await userRef.update(data);
};


// --- User Addresses ---

export const addAddress = async (uid: string, address: Omit<Address, 'id'>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const newAddress = { ...address, id: db.collection('users').doc().id };
    
    const userRef = db.collection('users').doc(uid);
    await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
            throw "User does not exist!";
        }
        const userProfile = userDoc.data() as UserProfile;
        const addresses = userProfile.addresses || [];

        // If this is the only address, or it's marked as favorite, make it the favorite
        if (addresses.length === 0 || newAddress.isFavorite) {
            newAddress.isFavorite = true;
            // Unset other favorites
            addresses.forEach(addr => addr.isFavorite = false);
        }

        const newAddresses = [...addresses, newAddress];
        transaction.update(userRef, { addresses: newAddresses });
    });
};

export const updateAddress = async (uid: string, updatedAddress: Address): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const userRef = db.collection('users').doc(uid);
    await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) throw new Error("User not found.");

        const user = userDoc.data() as UserProfile;
        const addresses = user.addresses || [];
        
        // If setting a new favorite, unset the old one.
        if (updatedAddress.isFavorite) {
            addresses.forEach(a => {
                if (a.id !== updatedAddress.id) a.isFavorite = false;
            });
        }
        
        const addressIndex = addresses.findIndex(a => a.id === updatedAddress.id);
        if (addressIndex > -1) {
            addresses[addressIndex] = updatedAddress;
        } else {
            throw new Error("Address not found.");
        }
        
        transaction.update(userRef, { addresses });
    });
};

export const deleteAddress = async (uid: string, addressId: string): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const userRef = db.collection('users').doc(uid);
    
    await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(userRef);
        if (!doc.exists) throw new Error("User not found.");

        const user = doc.data() as UserProfile;
        let addresses = user.addresses || [];
        const addressToDelete = addresses.find(a => a.id === addressId);
        
        if (!addressToDelete) {
             console.warn("Address to delete not found");
             return;
        }

        addresses = addresses.filter(a => a.id !== addressId);

        // If the deleted address was the favorite, and there are other addresses, make the first one the new favorite.
        if (addressToDelete.isFavorite && addresses.length > 0) {
            addresses[0].isFavorite = true;
        }

        transaction.update(userRef, { addresses });
    });
};

// --- Product CRUD ---

export const addProduct = async (productData: Omit<Product, 'id'>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await db.collection('products').add(productData);
};

export const updateProduct = async (id: string, productData: Partial<Product>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await db.collection('products').doc(id).update(productData);
};

export const deleteProduct = async (productId: string): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await db.collection('products').doc(productId).update({ deleted: true });
};

export const updateProductStatus = async (productId: string, active: boolean): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await db.collection('products').doc(productId).update({ active });
};

export const updateProductStockStatus = async (productId: string, stockStatus: 'available' | 'out_of_stock'): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await db.collection('products').doc(productId).update({ stockStatus });
};

export const updateProductsOrder = async (productsToUpdate: { id: string, orderIndex: number }[]): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const batch = db.batch();
    productsToUpdate.forEach(p => {
        const productRef = db.collection('products').doc(p.id);
        batch.update(productRef, { orderIndex: p.orderIndex });
    });
    await batch.commit();
};

export const bulkDeleteProducts = async (productIds: string[]): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const batch = db.batch();
    productIds.forEach(id => {
        const productRef = db.collection('products').doc(id);
        batch.update(productRef, { deleted: true });
    });
    await batch.commit();
};

export const restoreProduct = async (productId: string): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await db.collection('products').doc(productId).update({ deleted: false });
};

export const permanentDeleteProduct = async (productId: string): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await db.collection('products').doc(productId).delete();
};

export const bulkPermanentDeleteProducts = async (productIds: string[]): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const batch = db.batch();
    productIds.forEach(id => {
        const productRef = db.collection('products').doc(id);
        batch.delete(productRef);
    });
    await batch.commit();
};


// --- Category CRUD ---
export const addCategory = async (categoryData: Omit<Category, 'id'>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await db.collection('categories').add(categoryData);
};

export const updateCategory = async (id: string, categoryData: Partial<Category>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await db.collection('categories').doc(id).update(categoryData);
};

export const deleteCategory = async (categoryId: string, products: Product[]): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const productsInCategory = products.filter(p => p.categoryId === categoryId);
    if (productsInCategory.length > 0) {
        throw new Error("Não é possível excluir categorias que contêm produtos.");
    }
    await db.collection('categories').doc(categoryId).delete();
};

export const updateCategoryStatus = async (categoryId: string, active: boolean): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await db.collection('categories').doc(categoryId).update({ active });
};

export const updateCategoriesOrder = async (categoriesToUpdate: { id: string, order: number }[]): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const batch = db.batch();
    categoriesToUpdate.forEach(c => {
        const categoryRef = db.collection('categories').doc(c.id);
        batch.update(categoryRef, { order: c.order });
    });
    await batch.commit();
};


// --- Site Settings ---
export const updateSiteSettings = async (settings: Partial<SiteSettings>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await db.doc('store_config/site_settings').set(settings, { merge: true });
};


// --- Order Management ---

export const updateOrderStatus = async (orderId: string, status: OrderStatus, payload?: Partial<Pick<Order, 'pickupTimeEstimate'>>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const updateData = payload ? { status, ...payload } : { status };
    await db.collection('orders').doc(orderId).update(updateData);
};

export const updateOrderPaymentStatus = async (orderId: string, paymentStatus: PaymentStatus): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await db.collection('orders').doc(orderId).update({ paymentStatus });
};

export const updateOrderReservationTime = async (orderId: string, reservationTime: string): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await db.collection('orders').doc(orderId).update({ 'customer.reservationTime': reservationTime });
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
