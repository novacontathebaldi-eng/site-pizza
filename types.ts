```typescript
export interface Product {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  prices: { [key: string]: number };
  imageUrl: string;
  badge?: string;
  active: boolean;
  orderIndex: number;
  stockStatus?: 'available' | 'out_of_stock';
}

export interface Category {
  id: string;
  name: string;
  order: number;
  active: boolean;
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
  address: string;
  paymentMethod: 'credit' | 'debit' | 'pix' | 'cash';
  changeNeeded: boolean;
  changeAmount?: string;
  notes: string;
  reservationTime?: string;
}

// Tipos expandidos para Mercado Pago Orders API
export type OrderStatus = 
  | 'pending' 
  | 'accepted' 
  | 'ready' 
  | 'completed' 
  | 'cancelled' 
  | 'reserved' 
  | 'deleted' 
  | 'awaiting-payment';

export type PaymentStatus = 
  | 'pending' 
  | 'paid' 
  | 'paid_online' 
  | 'partially_paid' 
  | 'refunded' 
  | 'partially_refunded';

export interface OrderCustomerDetails {
  name: string;
  phone: string;
  orderType: 'delivery' | 'pickup' | 'local';
  address?: string;
  reservationTime?: string;
}

// Detalhes completos da Order do Mercado Pago
export interface MercadoPagoOrderDetails {
  orderId: string; // ID da order no Mercado Pago
  status: string; // approved, pending, cancelled, etc
  transactions: Array<{
    id: string;
    type: string; // payment, refund
    amount: number;
    status: string;
    paymentMethodId?: string;
    qrCode?: string;
    qrCodeBase64?: string;
  }>;
  totalAmount: number;
  paidAmount: number;
  refundedAmount: number;
  externalReference: string; // Nossa referência (ID do pedido no Firestore)
  createdAt?: string;
  updatedAt?: string;
}

export interface Order {
  id: string;
  customer: OrderCustomerDetails;
  items: CartItem[];
  total: number;
  paymentMethod: 'credit' | 'debit' | 'pix' | 'cash';
  changeNeeded?: boolean;
  changeAmount?: string;
  notes?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: any; // Firestore Timestamp
  pickupTimeEstimate?: string;
  
  // Dados da Order do Mercado Pago (nova estrutura)
  mercadoPagoOrder?: MercadoPagoOrderDetails;
}

export interface ContentSectionListItem {
  id: string;
  icon: string;
  text: string;
}

export interface ContentSection {
  id: string;
  order: number;
  isVisible: boolean;
  imageUrl: string;
  isTagVisible?: boolean;
  tagIcon?: string;
  tag: string;
  title: string;
  description: string;
  list: ContentSectionListItem[];
}

export interface FooterLink {
  id: string;
  icon: string;
  text: string;
  url: string;
  isVisible?: boolean;
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
```