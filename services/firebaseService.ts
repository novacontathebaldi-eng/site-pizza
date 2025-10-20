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

export const createReservation = async (details: ReservationDetails): Promise<{ orderId: string, orderNumber: number }> => {
    if (!functions) {
        throw new Error("Firebase Functions is not initialized.");
    }
    const createReservationFunction = functions.httpsCallable('createReservation');
    try {
        const result = await createReservationFunction({ details });
        return result.data;
    } catch (error) {
        console.error("Error calling createReservation function:", error);
        throw new Error("Não foi possível criar a reserva. Tente novamente.");
    }
};

// --- User Profile & Auth Functions ---

export const manageProfilePicture = async (imageBase64: string | null): Promise<{success: boolean, photoURL: string | null}> => {
    if (!functions) {
        throw new Error("Firebase Functions is not initialized.");
    }
    const manageFunction = functions.httpsCallable('manageProfilePicture');
    try {
        const result = await manageFunction({ imageBase64 });
        return result.data as {success: boolean, photoURL: string | null};
    } catch (error) {
        console.error("Error calling manageProfilePicture function:", error);
        throw new Error("Falha ao gerenciar a foto do perfil.");
    }
};

export const verifyGoogleToken = async (idToken: string): Promise<string> => {
    if (!functions) {
        throw new Error("Firebase Functions is not initialized.");
    }
    const verifyFunction = functions.httpsCallable('verifyGoogleToken');
    try {
        const result = await verifyFunction({ idToken });
        return result.data.customToken;
    } catch (error) {
        console.error("Error calling verifyGoogleToken function:", error);
        throw new Error("Falha na autenticação com o Google.");
    }
};

export const createUserProfile = async (user: firebase.User, name: string, phone: string, cpf: string): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized.");
    const userRef = db.collection('users').doc(user.uid);
    const profile: UserProfile = {
        uid: user.uid,
        name: name,
        email: user.email!,
        photoURL: user.photoURL || '',
        phone: phone,
        cpf: cpf,
        addresses: [],
    };
    await userRef.set(profile);
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
    if (!db) return null;
    const doc = await db.collection('users').doc(uid).get();
    if (!doc.exists) return null;
    return { uid, ...doc.data() } as UserProfile;
};

export const updateUserProfile = async (uid: string, data: Partial<Pick<UserProfile, 'name' | 'phone' | 'cpf'>>): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized.");
    await db.collection('users').doc(uid).set(data, { merge: true });
};

// Address management functions
export const addAddress = async (uid: string, address: Omit<Address, 'id'>): Promise<string> => {
    if (!db) throw new Error("Firestore not initialized.");
    const userRef = db.collection('users').doc(uid);
    const newAddressId = db.collection('users').doc().id;

    await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) throw "Documento de usuário não existe!";
        
        const userData = userDoc.data() as UserProfile;
        let addresses = userData.addresses || [];
        const newAddress: Address = { ...address, id: newAddressId };

        // If this is the very first address, make it the favorite
        if (addresses.length === 0) {
            newAddress.isFavorite = true;
        } else if (newAddress.isFavorite) {
            // If this new address is marked as favorite, unfavorite all others
            addresses = addresses.map(addr => ({ ...addr, isFavorite: false }));
        }
        
        addresses.push(newAddress);

        transaction.update(userRef, { addresses });
    });
    return newAddressId;
};

export const updateAddress = async (uid: string, updatedAddress: Address): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized.");
    const userRef = db.collection('users').doc(uid);
    
    await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) throw "Documento de usuário não existe!";

        const userData = userDoc.data() as UserProfile;
        let addresses = userData.addresses || [];

        if (updatedAddress.isFavorite) {
            addresses = addresses.map(addr => ({ ...addr, isFavorite: false }));
        }

        const addressIndex = addresses.findIndex(addr => addr.id === updatedAddress.id);
        if (addressIndex > -1) {
            addresses[addressIndex] = updatedAddress;
        } else {
            addresses.push(updatedAddress);
        }

        transaction.update(userRef, { addresses });
    });
};

export const deleteAddress = async (uid: string, addressId: string): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized.");
    const userRef = db.collection('users').doc(uid);
    
    await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) throw "Documento de usuário não existe!";
        
        const userData = userDoc.data() as UserProfile;
        const addresses = (userData.addresses || []).filter(addr => addr.id !== addressId);
        
        transaction.update(userRef, { addresses });
    });
};


// --- Chatbot Function ---
export const askChatbot = async (messages: ChatMessage[]): Promise<string> => {
    if (!functions) {
        throw new Error("Firebase Functions is not initialized.");
    }
    const askSantoFunction = functions.httpsCallable('askSanto');
    try {
        // Enviamos o histórico completo no payload com a chave 'history'
        const result = await askSantoFunction({ history: messages });
        return result.data.reply;
    } catch (error) {
        console.error("Error calling askSanto function:", error);
        return "Desculpe, estou com um problema para me conectar. Tente novamente mais tarde.";
    }
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
    } catch (error: any) {
        console.error("Error calling refundPayment function:", error);
        // The error from the cloud function is more user-friendly
        throw error;
    }
};