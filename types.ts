import firebase from 'firebase/compat/app';

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
    reservationTime?: string; // Added for dine-in
}

export type OrderStatus = 'pending' | 'accepted' | 'ready' | 'completed' | 'cancelled' | 'reserved' | 'deleted';
export type PaymentStatus = 'pending' | 'paid';

export interface OrderCustomerDetails {
    name: string;
    phone: string;
    orderType: 'delivery' | 'pickup' | 'local';
    address?: string;
    reservationTime?: string;
}

export interface Order {
    id: string;
    userId?: string; // Link to the user who placed the order
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
    mercadoPagoPaymentId?: string;
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

// --- NEW CUSTOMER PROFILE TYPES ---

export interface UserAddress {
  id: string;
  label: 'Casa' | 'Trabalho' | 'Outro';
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  reference?: string;
  isDefault: boolean;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  cpf?: string;
  birthDate?: string; // Format: YYYY-MM-DD
  addresses: UserAddress[];
  preferences?: {
    dietaryRestrictions?: string[]; // e.g., ['lactose_intolerant', 'vegetarian']
    favoriteItems?: string[]; // array of product IDs
  };
  generalNotes?: string;
  createdAt: firebase.firestore.Timestamp;
  lastOrderAt?: firebase.firestore.Timestamp;
}
