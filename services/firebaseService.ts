
import { collection, doc, setDoc, addDoc, updateDoc, deleteDoc, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { Product, Category } from '../types';

export const updateStoreStatus = async (isOnline: boolean): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized");
    const statusRef = doc(db, 'store_config', 'status');
    await setDoc(statusRef, { isOpen: isOnline }, { merge: true });
};

// Product Functions
export const addProduct = async (productData: Omit<Product, 'id'>): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized");
    await addDoc(collection(db, 'products'), productData);
};

export const updateProduct = async (product: Product): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized");
    const { id, ...productData } = product;
    if (!id) throw new Error("Product ID is missing for update.");
    const productRef = doc(db, 'products', id);
    await updateDoc(productRef, productData as { [key: string]: any });
};

export const deleteProduct = async (productId: string): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized");
    const productRef = doc(db, 'products', productId);
    await deleteDoc(productRef);
};

export const reorderProducts = async (productsToUpdate: Product[]): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized");
    const batch = writeBatch(db);
    productsToUpdate.forEach(product => {
        if (product.id) {
            const productRef = doc(db, 'products', product.id);
            batch.update(productRef, { orderIndex: product.orderIndex });
        }
    });
    await batch.commit();
};

// Category Functions
export const addCategory = async (categoryData: Omit<Category, 'id'>): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized");
    await addDoc(collection(db, 'categories'), categoryData);
};

export const updateCategory = async (category: Category): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized");
    const { id, ...categoryData } = category;
    if (!id) throw new Error("Category ID is missing for update.");
    const categoryRef = doc(db, 'categories', id);
    await updateDoc(categoryRef, categoryData as { [key: string]: any });
};

export const deleteCategory = async (categoryId: string, allProducts: Product[]): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized");
    // Safety check: prevent deletion if products are using this category
    const isCategoryInUse = allProducts.some(product => product.categoryId === categoryId);
    if (isCategoryInUse) {
        throw new Error("Não é possível excluir esta categoria, pois ela está sendo usada por um ou mais produtos.");
    }
    const categoryRef = doc(db, 'categories', categoryId);
    await deleteDoc(categoryRef);
};

export const reorderCategories = async (categoriesToUpdate: Category[]): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized");
    const batch = writeBatch(db);
    categoriesToUpdate.forEach((category) => {
        if (category.id) {
            const categoryRef = doc(db, 'categories', category.id);
            batch.update(categoryRef, { order: category.order });
        }
    });
    await batch.commit();
};
