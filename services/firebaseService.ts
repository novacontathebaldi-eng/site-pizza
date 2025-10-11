// FIX: Updated all functions to use Firebase v8 syntax to resolve module import errors.

import firebase from 'firebase/compat/app';
import { db, storage, functions } from './firebase';
import { Product, Category, SiteSettings, Order, OrderStatus, PaymentStatus } from '../types';

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

// Product Management Functions
export const addProduct = async (product: Omit<Product, 'id'>): Promise<void> => {
  if (!db) throw new Error("Firestore is not initialized.");
  await db.collection('products').add(product);
};

export const updateProduct = async (id: string, product: Partial<Product>): Promise<void> => {
  if (!db) throw new Error("Firestore is not initialized.");
  await db.collection('products').doc(id).update(product);
};

export const deleteProduct = async (id: string): Promise<void> => {
  if (!db) throw new Error("Firestore is not initialized.");
  await db.collection('products').doc(id).delete();
};

// Category Management Functions
export const addCategory = async (category: Omit<Category, 'id'>): Promise<void> => {
  if (!db) throw new Error("Firestore is not initialized.");
  await db.collection('categories').add(category);
};

export const updateCategory = async (id: string, category: Partial<Category>): Promise<void> => {
  if (!db) throw new Error("Firestore is not initialized.");
  await db.collection('categories').doc(id).update(category);
};

export const deleteCategory = async (id: string): Promise<void> => {
  if (!db) throw new Error("Firestore is not initialized.");
  await db.collection('categories').doc(id).delete();
};

// Site Settings Functions
export const updateSiteSettings = async (settings: SiteSettings): Promise<void> => {
  if (!db) throw new Error("Firestore is not initialized.");
  await db.doc('site_config/settings').set(settings, { merge: true });
};

// Order Management Functions
export const addOrder = async (order: Omit<Order, 'id' | 'createdAt'>): Promise<string> => {
  if (!db) throw new Error("Firestore is not initialized.");
  const orderData = {
    ...order,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
  const docRef = await db.collection('orders').add(orderData);
  return docRef.id;
};

export const updateOrderStatus = async (orderId: string, status: OrderStatus): Promise<void> => {
  if (!db) throw new Error("Firestore is not initialized.");
  await db.collection('orders').doc(orderId).update({ status });
};

export const updatePaymentStatus = async (orderId: string, paymentStatus: PaymentStatus): Promise<void> => {
  if (!db) throw new Error("Firestore is not initialized.");
  await db.collection('orders').doc(orderId).update({ paymentStatus });
};

export const deleteOrder = async (orderId: string): Promise<void> => {
  if (!db) throw new Error("Firestore is not initialized.");
  await db.collection('orders').doc(orderId).delete();
};

// ============================================
// MERCADO PAGO INTEGRATION - FRONTEND FUNCTIONS
// ============================================

/**
 * Cria uma Order no Mercado Pago via Firebase Function
 * @param orderId - ID do pedido no Firestore
 * @returns Promise com dados do PIX
 */
export const createMercadoPagoOrder = async (orderId: string): Promise<{
  mpOrderId: string;
  qrCodeBase64: string;
  qrCode: string;
  status: string;
}> => {
  if (!functions) throw new Error("Firebase Functions não está inicializado.");
  
  try {
    const createMPOrder = functions.httpsCallable('createMercadoPagoOrder');
    const result = await createMPOrder({ orderId });
    
    if (!result.data) {
      throw new Error('Resposta inválida do backend');
    }
    
    return result.data;
  } catch (error: any) {
    console.error('Erro ao criar order no Mercado Pago:', error);
    throw new Error(error.message || 'Falha ao processar pagamento PIX');
  }
};

/**
 * Consulta status de uma Order no Mercado Pago
 * @param mpOrderId - ID da order no Mercado Pago
 * @returns Promise com status da order
 */
export const getMercadoPagoOrder = async (mpOrderId: string): Promise<{
  orderId: string;
  status: string;
  paidAmount: number;
  totalAmount: number;
  transactions: Array<any>;
}> => {
  if (!functions) throw new Error("Firebase Functions não está inicializado.");
  
  try {
    const getMPOrder = functions.httpsCallable('getMercadoPagoOrder');
    const result = await getMPOrder({ mpOrderId });
    
    return result.data;
  } catch (error: any) {
    console.error('Erro ao consultar order no Mercado Pago:', error);
    throw new Error(error.message || 'Falha ao consultar status do pagamento');
  }
};

/**
 * Cancela uma Order no Mercado Pago (para admin)
 * @param mpOrderId - ID da order no Mercado Pago
 * @returns Promise com resultado da operação
 */
export const cancelMercadoPagoOrder = async (mpOrderId: string): Promise<{
  success: boolean;
  status: string;
}> => {
  if (!functions) throw new Error("Firebase Functions não está inicializado.");
  
  try {
    const cancelMPOrder = functions.httpsCallable('cancelMercadoPagoOrder');
    const result = await cancelMPOrder({ mpOrderId });
    
    return result.data;
  } catch (error: any) {
    console.error('Erro ao cancelar order no Mercado Pago:', error);
    throw new Error(error.message || 'Falha ao cancelar pagamento');
  }
};

/**
 * Reembolsa uma Order no Mercado Pago (para admin)
 * @param mpOrderId - ID da order no Mercado Pago
 * @param transactionId - ID da transação
 * @param amount - Valor para reembolso parcial (opcional)
 * @returns Promise com resultado da operação
 */
export const refundMercadoPagoOrder = async (
  mpOrderId: string, 
  transactionId: string, 
  amount?: number
): Promise<{
  success: boolean;
  refund: any;
}> => {
  if (!functions) throw new Error("Firebase Functions não está inicializado.");
  
  try {
    const refundMPOrder = functions.httpsCallable('refundMercadoPagoOrder');
    const result = await refundMPOrder({ mpOrderId, transactionId, amount });
    
    return result.data;
  } catch (error: any) {
    console.error('Erro ao reembolsar order no Mercado Pago:', error);
    throw new Error(error.message || 'Falha ao processar reembolso');
  }
};

/**
 * Captura uma Order no Mercado Pago (somente para cartões)
 * @param mpOrderId - ID da order no Mercado Pago
 * @param transactionId - ID da transação
 * @returns Promise com resultado da operação
 */
export const captureMercadoPagoOrder = async (
  mpOrderId: string, 
  transactionId: string
): Promise<{
  success: boolean;
  transaction: any;
}> => {
  if (!functions) throw new Error("Firebase Functions não está inicializado.");
  
  try {
    const captureMPOrder = functions.httpsCallable('captureMercadoPagoOrder');
    const result = await captureMPOrder({ mpOrderId, transactionId });
    
    return result.data;
  } catch (error: any) {
    console.error('Erro ao capturar order no Mercado Pago:', error);
    throw new Error(error.message || 'Falha ao capturar pagamento');
  }
};

/**
 * Polling para verificar status de pagamento PIX
 * @param mpOrderId - ID da order no Mercado Pago
 * @param onStatusChange - Callback chamado quando status muda
 * @param maxAttempts - Máximo de tentativas (default: 60)
 * @param interval - Intervalo entre verificações em ms (default: 3000)
 */
export const pollPaymentStatus = (
  mpOrderId: string,
  onStatusChange: (status: string, isPaid: boolean) => void,
  maxAttempts: number = 60,
  interval: number = 3000
): () => void => {
  let attempts = 0;
  let isPolling = true;

  const poll = async () => {
    if (!isPolling || attempts >= maxAttempts) return;

    attempts++;

    try {
      const orderData = await getMercadoPagoOrder(mpOrderId);
      const isPaid = orderData.paidAmount >= orderData.totalAmount;

      onStatusChange(orderData.status, isPaid);

      if (isPaid || orderData.status === 'cancelled') {
        isPolling = false;
        return;
      }

      if (isPolling) {
        setTimeout(poll, interval);
      }
    } catch (error) {
      console.error('Erro ao consultar status do pagamento:', error);
      if (isPolling) {
        setTimeout(poll, interval);
      }
    }
  };

  // Iniciar polling
  setTimeout(poll, interval);

  // Retornar função para parar o polling
  return () => {
    isPolling = false;
  };
};
