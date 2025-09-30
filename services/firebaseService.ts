import { collection, doc, setDoc, addDoc, updateDoc, deleteDoc, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from './firebase';
import { Product, Category } from '../types';

export const updateStoreStatus = async (isOnline: boolean): Promise<void> => {
    const statusRef = doc(db, 'store_config', 'status');
    await setDoc(statusRef, { isOpen: isOnline }, { merge: true });
};

// Image Upload Function
export const uploadImage = async (file: File): Promise<string> => {
    if (!storage) {
        throw new Error("Firebase Storage não está inicializado.");
    }
    const fileExtension = file.name.split('.').pop();
    const fileName = `products/${new Date().getTime()}_${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
    const storageRef = ref(storage, fileName);

    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
};

// Product Functions
export const addProduct = async (productData: Omit<Product, 'id'>): Promise<void> => {
    await addDoc(collection(db, 'products'), productData);
};

export const updateProduct = async (product: Product): Promise<void> => {
    const { id, ...productData } = product;
    if (!id) throw new Error("Product ID is missing for update.");
    const productRef = doc(db, 'products', id);
    await updateDoc(productRef, productData as { [key: string]: any });
};

export const deleteProduct = async (productId: string): Promise<void> => {
    const productRef = doc(db, 'products', productId);
    await deleteDoc(productRef);
};

export const updateProductsOrder = async (productsToUpdate: { id: string; orderIndex: number }[]): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const batch = writeBatch(db);
    productsToUpdate.forEach(productUpdate => {
        const productRef = doc(db, 'products', productUpdate.id);
        batch.update(productRef, { orderIndex: productUpdate.orderIndex });
    });
    await batch.commit();
};


// Category Functions
export const addCategory = async (categoryData: Omit<Category, 'id'>): Promise<void> => {
    await addDoc(collection(db, 'categories'), categoryData);
};

export const updateCategory = async (category: Category): Promise<void> => {
    const { id, ...categoryData } = category;
    if (!id) throw new Error("Category ID is missing for update.");
    const categoryRef = doc(db, 'categories', id);
    await updateDoc(categoryRef, categoryData as { [key: string]: any });
};

export const deleteCategory = async (categoryId: string, allProducts: Product[]): Promise<void> => {
    // Safety check: prevent deletion if products are using this category
    const isCategoryInUse = allProducts.some(product => product.categoryId === categoryId);
    if (isCategoryInUse) {
        throw new Error("Não é possível excluir esta categoria, pois ela está sendo usada por um ou mais produtos.");
    }
    const categoryRef = doc(db, 'categories', categoryId);
    await deleteDoc(categoryRef);
};

export const updateCategoriesOrder = async (categoriesToUpdate: { id: string; order: number }[]): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const batch = writeBatch(db);
    categoriesToUpdate.forEach(categoryUpdate => {
        const categoryRef = doc(db, 'categories', categoryUpdate.id);
        batch.update(categoryRef, { order: categoryUpdate.order });
    });
    await batch.commit();
};