// FIX: Updated all functions to use Firebase v8 syntax to resolve module import errors.
import { db, storage } from './firebase';
import { Product, Category, SiteSettings } from '../types';

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

    // FIX: Reverted to the simpler put() method from the user's working old version.
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
    
    // FIX: Reverted to the simpler put() method for consistency and to ensure it works.
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
    if (!categoryId) throw new Error("Invalid document reference. Document references must have an even number of segments, but categories has 1.");
    
    // Safety check: prevent deletion if products are using this category
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