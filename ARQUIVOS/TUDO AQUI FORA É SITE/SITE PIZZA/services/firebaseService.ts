// FIX: Updated all functions to use Firebase v8 syntax to resolve module import errors.
import firebase from 'firebase/compat/app';
import { db, storage, functions } from './firebase';
import { Product, Category, SiteSettings, Order, OrderStatus, PaymentStatus, OrderDetails, CartItem, ChatMessage, ReservationDetails, UserProfile, Address, DaySchedule } from '../types';

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

/**
 * Deletes a file from Firebase Storage based on its public URL.
 * Ignores errors if the file doesn't exist.
 * @param url The public URL of the file to delete.
 */
export const deleteImageByUrl = async (url: string): Promise<void> => {
    if (!storage || !url || !url.includes('firebasestorage.googleapis.com')) {
        // Not a Firebase Storage URL we should manage, or storage not initialized.
        return;
    }

    try {
        const fileRef = storage.refFromURL(url);
        await fileRef.delete();
    } catch (error: any) {
        // It's common to try to delete a file that's already gone, so we'll ignore 'object-not-found' errors.
        if (error.code !== 'storage/object-not-found') {
            console.error("Error deleting image from storage:", error);
            // Re-throw if the caller needs to handle other errors
            throw error;
        }
    }
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


// Order Functions (Cloud Functions)
export const createOrder = async (details: OrderDetails, cart: CartItem[], total: number, orderId: string): Promise<{ orderId: string; orderNumber: number; }> => {
    if (!functions) throw new Error("Firebase Functions not initialized.");
    const createOrderFunction = functions.httpsCallable('createOrder');
    const response = await createOrderFunction({ details, cart, total, orderId });
    return response.data as { orderId: string; orderNumber: number; };
};

export const createReservation = async (details: ReservationDetails): Promise<{ orderId: string; orderNumber: number; }> => {
    if (!functions) throw new Error("Firebase Functions not initialized.");
    const createReservationFunction = functions.httpsCallable('createReservation');
    const response = await createReservationFunction({ details });
    return response.data as { orderId: string; orderNumber: number; };
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
export const askChatbot = async (history: ChatMessage[], products: Product[], categories: Category[], isStoreOnline: boolean, operatingHours: DaySchedule[] | undefined): Promise<string> => {
    if (!functions) throw new Error("Firebase Functions not initialized.");
    try {
        const askSanto = functions.httpsCallable('askSanto');
        const response = await askSanto({
            history,
            menuData: { products, categories },
            storeStatus: { isOnline: isStoreOnline, operatingHours: operatingHours || [] }
        });
        return (response.data as any).reply;
    } catch (error) {
        console.error("Error calling chatbot function:", error);
        throw new Error("Failed to get a response from the assistant.");
    }
};

// User Profile & Auth
export const verifyGoogleToken = async (idToken: string): Promise<string> => {
    if (!functions) throw new Error("Firebase Functions is not initialized.");
    const verifyToken = functions.httpsCallable('verifyGoogleToken');
    const result = await verifyToken({ idToken });
    return result.data.customToken;
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