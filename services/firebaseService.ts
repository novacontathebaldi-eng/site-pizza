import { collection, doc, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { Product, Category, SiteContent } from '../types';

export const updateStoreStatus = async (isOnline: boolean): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized");
    const statusRef = doc(db, 'store_config', 'status');
    await setDoc(statusRef, { isOpen: isOnline }, { merge: true });
};

// Product Functions
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

export const uploadImage = async (file: File, productId: string): Promise<string> => {
    if (!storage) throw new Error("Firebase Storage not initialized");
    const imagePath = `products/${productId}/${new Date().getTime()}-${file.name}`;
    const imageRef = ref(storage, imagePath);
    await uploadBytes(imageRef, file);
    return getDownloadURL(imageRef);
};

export const addProductWithId = async (product: Product): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized");
    if (!product.id) throw new Error("Product ID is required for this operation.");
    const productRef = doc(db, 'products', product.id);
    // Remove 'id' from the data being set, as it's the document key
    const { id, ...productData } = product;
    await setDoc(productRef, productData);
};


// Category Functions
export const addCategory = async (category: Category): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized");
    if (!category.id) throw new Error("Category ID is required for this operation.");
    const categoryRef = doc(db, 'categories', category.id);
    const { id, ...categoryData } = category;
    await setDoc(categoryRef, categoryData);
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

// Site Content Functions
export const updateSiteContent = async (content: SiteContent): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized");
    const contentRef = doc(db, 'store_config', 'siteContent');
    await setDoc(contentRef, content);
};

export const uploadSiteImage = async (file: File, imageName: 'logo' | 'heroBg' | 'aboutImg'): Promise<string> => {
    if (!storage) throw new Error("Firebase Storage not initialized");
    const imagePath = `site_assets/${imageName}-${new Date().getTime()}`;
    const imageRef = ref(storage, imagePath);
    await uploadBytes(imageRef, file);
    return getDownloadURL(imageRef);
};
