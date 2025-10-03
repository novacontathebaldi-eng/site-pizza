import firebase from 'firebase/compat/app';
import { db, storage, functions } from './firebase';
import { Product, Category, SiteSettings, Order, OrderStatus, PaymentStatus, PromotionPage } from '../types';
import { defaultSiteSettings } from './defaultSettings';

export const updateStoreStatus = async (isOnline: boolean): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const statusRef = db.doc('store_config/status');
    await statusRef.set({ isOpen: isOnline }, { merge: true });
};

export const uploadImage = async (file: File): Promise<string> => {
    if (!storage) throw new Error("Firebase Storage não está inicializado.");
    const fileExtension = file.name.split('.').pop();
    const fileName = `products/${new Date().getTime()}_${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
    const storageRef = storage.ref(fileName);
    const snapshot = await storageRef.put(file);
    return await snapshot.ref.getDownloadURL();
};

export const uploadSiteAsset = async (file: File, assetName: string): Promise<string> => {
    if (!storage) throw new Error("Firebase Storage não está inicializado.");
    const fileExtension = file.name.split('.').pop();
    const fileName = `site/${assetName}_${new Date().getTime()}.${fileExtension}`;
    const storageRef = storage.ref(fileName);
    const snapshot = await storageRef.put(file);
    return await snapshot.ref.getDownloadURL();
};

export const uploadAudioFile = async (file: File, audioType: string): Promise<string> => {
    if (!storage) throw new Error("Firebase Storage não está inicializado.");
    const fileExtension = file.name.split('.').pop();
    const fileName = `audio/${audioType}_${new Date().getTime()}.${fileExtension}`;
    const storageRef = storage.ref(fileName);
    const snapshot = await storageRef.put(file);
    return await snapshot.ref.getDownloadURL();
};

export const addProduct = async (productData: Omit<Product, 'id'>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await db.collection('products').add(productData);
};

export const updateProduct = async (productId: string, productData: Omit<Product, 'id'>): Promise<void> => {
    if (!productId) throw new Error("Product ID is missing for update.");
    if (!db) throw new Error("Firestore is not initialized.");
    await db.collection('products').doc(productId).update(productData as { [key: string]: any });
};

export const updateProductStatus = async (productId: string, active: boolean): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await db.collection('products').doc(productId).update({ active });
};

export const updateProductStockStatus = async (productId: string, stockStatus: 'available' | 'out_of_stock'): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await db.collection('products').doc(productId).update({ stockStatus });
};

export const deleteProduct = async (productId: string): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await db.collection('products').doc(productId).delete();
};

export const updateProductsOrder = async (productsToUpdate: { id: string; orderIndex: number }[]): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const batch = db.batch();
    productsToUpdate.forEach(productUpdate => {
        batch.update(db.collection('products').doc(productUpdate.id), { orderIndex: productUpdate.orderIndex });
    });
    await batch.commit();
};

export const addCategory = async (categoryData: Omit<Category, 'id'>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await db.collection('categories').add(categoryData);
};

export const updateCategory = async (categoryId: string, categoryData: Omit<Category, 'id'>): Promise<void> => {
    if (!categoryId) throw new Error("Category ID is missing for update.");
    if (!db) throw new Error("Firestore is not initialized.");
    await db.collection('categories').doc(categoryId).update(categoryData as { [key: string]: any });
};

export const updateCategoryStatus = async (categoryId: string, active: boolean): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await db.collection('categories').doc(categoryId).update({ active });
};

export const deleteCategory = async (categoryId: string, allProducts: Product[]): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    if (allProducts.some(product => product.categoryId === categoryId)) {
        throw new Error("Não é possível excluir esta categoria, pois ela está sendo usada por um ou mais produtos.");
    }
    await db.collection('categories').doc(categoryId).delete();
};

export const updateCategoriesOrder = async (categoriesToUpdate: { id: string; order: number }[]): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const batch = db.batch();
    categoriesToUpdate.forEach(categoryUpdate => {
        batch.update(db.collection('categories').doc(categoryUpdate.id), { order: categoryUpdate.order });
    });
    await batch.commit();
};

export const updateSiteSettings = async (settings: Partial<SiteSettings>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await db.doc('store_config/site_settings').set(settings, { merge: true });
};

export const restoreDefaultSettings = async (): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await db.doc('store_config/site_settings').set(defaultSiteSettings);
};

export const addOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'pickupTimeEstimate'>): Promise<firebase.firestore.DocumentReference> => {
    if (!db) throw new Error("Firestore is not initialized.");
    return db.collection('orders').add({
        ...orderData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
};

export const updateOrderStatus = async (orderId: string, status: OrderStatus, payload?: Partial<Pick<Order, 'pickupTimeEstimate'>>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await db.collection('orders').doc(orderId).update({ status, ...payload });
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

export const savePromotion = async (promotion: PromotionPage): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    if (promotion.id) {
        const { id, ...dataToSave } = promotion;
        await db.collection('promotions').doc(id).set(dataToSave, { merge: true });
    } else {
        const { id, ...dataToSave } = promotion;
        await db.collection('promotions').add(dataToSave);
    }
};

export const deletePromotion = async (promotionId: string): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await db.collection('promotions').doc(promotionId).delete();
};

export const updatePromotionsOrder = async (promotionsToUpdate: { id: string; order: number }[]): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const batch = db.batch();
    promotionsToUpdate.forEach(promoUpdate => {
        batch.update(db.collection('promotions').doc(promoUpdate.id), { order: promoUpdate.order });
    });
    await batch.commit();
};

export const initiatePixPayment = async (orderId: string): Promise<any> => {
    if (!functions) throw new Error("Firebase Functions is not initialized.");
    const generatePixCharge = functions.httpsCallable('generatePixCharge');
    try {
        const result = await generatePixCharge({ orderId });
        return result.data;
    } catch (error) {
        console.error("Error calling generatePixCharge function:", error);
        throw new Error("Não foi possível gerar a cobrança PIX. Tente novamente.");
    }
};