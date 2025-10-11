export interface Product {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  imageUrl: string;
  prices: { [key: string]: number }; // e.g., { small: 25, medium: 35, large: 45 }
  orderIndex: number;
  active: boolean;
  stockStatus: 'available' | 'out_of_stock';
  createdAt?: any;
  updatedAt?: any;
}

export interface Category {
  id: string;
  name: string;
  order: number;
  active: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  size: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

export interface OrderDetails {
  name: string;
  phone: string;
  orderType: 'delivery' | 'pickup' | 'local';
  address?: string;
  paymentMethod: 'credit' | 'debit' | 'pix' | 'cash';
  changeNeeded?: boolean;
  changeAmount?: string;
  notes?: string;
  reservationTime?: string;
}

export type OrderStatus = 
  | 'pending' 
  | 'accepted' 
  | 'preparing' 
  | 'ready' 
  | 'delivering' 
  | 'completed' 
  | 'cancelled' 
  | 'reserved'
  | 'deleted';

export type PaymentStatus = 
  | 'pending' 
  | 'paid' 
  | 'failed' 
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded';

// Updated Order interface with Mercado Pago integration
export interface Order {
  id: string;
  orderNumber?: string; // New field for display
  customer: OrderDetails;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: any;
  updatedAt?: any;
  paidAt?: any;
  cancelledAt?: any;
  refundedAt?: any;
  refundedAmount?: number;
  reservationTime?: string;
  // Mercado Pago specific fields
  mercadoPagoOrderId?: string;
  mercadoPagoPaymentId?: string;
  mercadoPagoDetails?: {
    orderId?: string;
    paymentId?: string;
    status?: string;
    paymentStatus?: string;
    transactionId?: string;
    ticketUrl?: string;
    refundStatus?: string;
  };
}

export interface ContentSection {
  id: string;
  order: number;
  isVisible: boolean;
  isTagVisible: boolean;
  tagIcon: string;
  imageUrl: string;
  tag: string;
  title: string;
  description: string;
  list: ContentSectionListItem[];
}

export interface ContentSectionListItem {
  id: string;
  icon: string;
  text: string;
}

export interface FooterLink {
  id: string;
  icon: string;
  text: string;
  url: string;
  isVisible: boolean;
}

export interface SiteSettings {
  logoUrl: string;
  heroSlogan: string;
  heroTitle: string;
  heroSubtitle: string;
  heroBgUrl: string;
  contentSections: ContentSection[];
  footerLinks: FooterLink[];
}

// New interface for admin order management
export interface AdminOrderActions {
  canCancel: boolean;
  canRefund: boolean;
  canViewReceipt: boolean;
  canRefundPartial: boolean;
}

// Helper function to determine available actions for an order
export const getOrderActions = (order: Order): AdminOrderActions => {
  const actions: AdminOrderActions = {
    canCancel: false,
    canRefund: false,
    canViewReceipt: false,
    canRefundPartial: false,
  };

  if (order.paymentStatus === 'paid') {
    actions.canRefund = true;
    actions.canRefundPartial = true;
    actions.canViewReceipt = true;
  }

  if (order.paymentStatus === 'pending' && order.status !== 'completed') {
    actions.canCancel = true;
  }

  if (order.mercadoPagoDetails?.paymentId) {
    actions.canViewReceipt = true;
  }

  return actions;
};

export default {
  Product,
  Category,
  CartItem,
  OrderDetails,
  OrderStatus,
  PaymentStatus,
  Order,
  ContentSection,
  ContentSectionListItem,
  FooterLink,
  SiteSettings,
  AdminOrderActions,
  getOrderActions,
};