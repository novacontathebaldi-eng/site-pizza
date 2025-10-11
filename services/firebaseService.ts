import { db } from './firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  orderBy, 
  writeBatch, 
  serverTimestamp,
  where 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';

import { 
  Product, 
  Category, 
  Order, 
  OrderStatus, 
  PaymentStatus, 
  SiteSettings 
} from '../types';

// Firebase Functions
const functions = getFunctions();

// Mercado Pago Functions - Updated for Orders API
const createMercadoPagoOrderFn = httpsCallable(functions, 'createMercadoPagoOrder');
const getMercadoPagoOrderFn = httpsCallable(functions, 'getMercadoPagoOrder');
const cancelMercadoPagoOrderFn = httpsCallable(functions, 'cancelMercadoPagoOrder');
const refundMercadoPagoOrderFn = httpsCallable(functions, 'refundMercadoPagoOrder');
const getPaymentReceiptFn = httpsCallable(functions, 'getPaymentReceipt');

// Product operations
export const addProduct = async (productData: Partial<Product>) => {
  const productsRef = collection(db, 'products');
  const docRef = await addDoc(productsRef, {
    ...productData,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const updateProduct = async (id: string, productData: Partial<Product>) => {
  const productRef = doc(db, 'products', id);
  await updateDoc(productRef, {
    ...productData,
    updatedAt: serverTimestamp()
  });
};

export const deleteProduct = async (id: string) => {
  const productRef = doc(db, 'products', id);
  await deleteDoc(productRef);
};

export const updateProductStatus = async (id: string, active: boolean) => {
  const productRef = doc(db, 'products', id);
  await updateDoc(productRef, { 
    active,
    updatedAt: serverTimestamp()
  });
};

export const updateProductStockStatus = async (id: string, stockStatus: 'available' | 'out_of_stock') => {
  const productRef = doc(db, 'products', id);
  await updateDoc(productRef, { 
    stockStatus,
    updatedAt: serverTimestamp()
  });
};

export const updateProductsOrder = async (productsToUpdate: { id: string; orderIndex: number }[]) => {
  const batch = writeBatch(db);
  
  productsToUpdate.forEach(({ id, orderIndex }) => {
    const productRef = doc(db, 'products', id);
    batch.update(productRef, { 
      orderIndex,
      updatedAt: serverTimestamp()
    });
  });
  
  await batch.commit();
};

// Category operations
export const addCategory = async (categoryData: Partial<Category>) => {
  const categoriesRef = collection(db, 'categories');
  const docRef = await addDoc(categoriesRef, {
    ...categoryData,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const updateCategory = async (id: string, categoryData: Partial<Category>) => {
  const categoryRef = doc(db, 'categories', id);
  await updateDoc(categoryRef, {
    ...categoryData,
    updatedAt: serverTimestamp()
  });
};

export const deleteCategory = async (id: string, products: Product[]) => {
  const productsInCategory = products.filter(p => p.categoryId === id);
  if (productsInCategory.length > 0) {
    throw new Error('Não é possível deletar uma categoria que possui produtos. Mova ou delete os produtos primeiro.');
  }
  
  const categoryRef = doc(db, 'categories', id);
  await deleteDoc(categoryRef);
};

export const updateCategoryStatus = async (id: string, active: boolean) => {
  const categoryRef = doc(db, 'categories', id);
  await updateDoc(categoryRef, { 
    active,
    updatedAt: serverTimestamp()
  });
};

export const updateCategoriesOrder = async (categoriesToUpdate: { id: string; order: number }[]) => {
  const batch = writeBatch(db);
  
  categoriesToUpdate.forEach(({ id, order }) => {
    const categoryRef = doc(db, 'categories', id);
    batch.update(categoryRef, { 
      order,
      updatedAt: serverTimestamp()
    });
  });
  
  await batch.commit();
};

// Store operations
export const updateStoreStatus = async (isOpen: boolean) => {
  const statusRef = doc(db, 'store_config', 'status');
  await updateDoc(statusRef, { 
    isOpen,
    updatedAt: serverTimestamp()
  });
};

// Site settings operations
export const updateSiteSettings = async (settings: SiteSettings) => {
  const settingsRef = doc(db, 'store_config', 'site_settings');
  await updateDoc(settingsRef, {
    ...settings,
    updatedAt: serverTimestamp()
  });
};

export const uploadSiteAsset = async (file: File, assetName: string): Promise<string> => {
  const timestamp = Date.now();
  const fileName = `${assetName}_${timestamp}.${file.name.split('.').pop()}`;
  const storageRef = ref(storage, `site_assets/${fileName}`);
  
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  
  return downloadURL;
};

// Order operations
export const addOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
  const ordersRef = collection(db, 'orders');
  const docRef = await addDoc(ordersRef, {
    ...orderData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
};

export const updateOrderStatus = async (id: string, status: OrderStatus, payload?: Partial<Order>) => {
  const orderRef = doc(db, 'orders', id);
  const updateData: any = { 
    status,
    updatedAt: serverTimestamp()
  };

  if (payload) {
    Object.assign(updateData, payload);
  }

  await updateDoc(orderRef, updateData);
};

export const updateOrderPaymentStatus = async (id: string, paymentStatus: PaymentStatus) => {
  const orderRef = doc(db, 'orders', id);
  await updateDoc(orderRef, { 
    paymentStatus,
    updatedAt: serverTimestamp()
  });
};

export const updateOrderReservationTime = async (id: string, reservationTime: string) => {
  const orderRef = doc(db, 'orders', id);
  await updateDoc(orderRef, { 
    reservationTime,
    updatedAt: serverTimestamp()
  });
};

export const deleteOrder = async (id: string) => {
  const orderRef = doc(db, 'orders', id);
  await deleteDoc(orderRef);
};

// Mercado Pago Operations - Updated for Orders API

export interface MercadoPagoOrderResult {
  orderNumber: string;
  qrCodeBase64: string;
  copyPaste: string;
  ticketUrl?: string;
  mercadoPagoOrderId: string;
  mercadoPagoPaymentId: string;
}

/**
 * Create a PIX payment order with Mercado Pago
 */
export const createMercadoPagoOrder = async (orderId: string): Promise<MercadoPagoOrderResult> => {
  try {
    const result = await createMercadoPagoOrderFn({ orderId });
    return result.data as MercadoPagoOrderResult;
  } catch (error: any) {
    console.error('Error creating Mercado Pago order:', error);
    throw new Error(error.message || 'Erro ao criar pagamento PIX.');
  }
};

/**
 * Get order details from Mercado Pago
 */
export const getMercadoPagoOrder = async (mercadoPagoOrderId: string) => {
  try {
    const result = await getMercadoPagoOrderFn({ mercadoPagoOrderId });
    return result.data;
  } catch (error: any) {
    console.error('Error getting Mercado Pago order:', error);
    throw new Error(error.message || 'Erro ao obter detalhes da order.');
  }
};

/**
 * Cancel order in Mercado Pago
 */
export const cancelMercadoPagoOrder = async (mercadoPagoOrderId: string, orderId?: string) => {
  try {
    const result = await cancelMercadoPagoOrderFn({ mercadoPagoOrderId, orderId });
    return result.data;
  } catch (error: any) {
    console.error('Error cancelling Mercado Pago order:', error);
    throw new Error(error.message || 'Erro ao cancelar pagamento.');
  }
};

/**
 * Refund order in Mercado Pago (total or partial)
 */
export const refundMercadoPagoOrder = async (mercadoPagoOrderId: string, orderId?: string, amount?: number) => {
  try {
    const result = await refundMercadoPagoOrderFn({ mercadoPagoOrderId, orderId, amount });
    return result.data;
  } catch (error: any) {
    console.error('Error refunding Mercado Pago order:', error);
    throw new Error(error.message || 'Erro ao estornar pagamento.');
  }
};

/**
 * Get payment receipt URL
 */
export const getPaymentReceipt = async (mercadoPagoPaymentId: string): Promise<{receiptUrl: string}> => {
  try {
    const result = await getPaymentReceiptFn({ mercadoPagoPaymentId });
    return result.data as {receiptUrl: string};
  } catch (error: any) {
    console.error('Error getting payment receipt:', error);
    throw new Error(error.message || 'Erro ao gerar comprovante.');
  }
};

// Utility function to check payment status
export const checkPaymentStatus = async (orderId: string) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const orderDoc = await orderRef.get();
    
    if (orderDoc.exists()) {
      const orderData = orderDoc.data();
      return {
        paymentStatus: orderData.paymentStatus,
        mercadoPagoDetails: orderData.mercadoPagoDetails
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error checking payment status:', error);
    return null;
  }
};