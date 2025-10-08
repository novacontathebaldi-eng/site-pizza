export interface Product {
    id: string;
    name: string;
    description: string;
    categoryId: string;
    prices: { [size: string]: number };
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
    id: string; // Unique ID for the cart item instance
    productId: string;
    name: string;
    size: string;
    price: number;
    quantity: number;
    imageUrl: string;
}

export interface CustomerDetails {
    name: string;
    phone: string;
    address?: string;
    orderType: 'delivery' | 'pickup' | 'local';
    reservationTime?: string;
}

export type OrderStatus = 'pending' | 'accepted' | 'reserved' | 'ready' | 'completed' | 'cancelled' | 'deleted';
export type PaymentStatus = 'pending' | 'paid';

export interface Order {
    id: string;
    customer: CustomerDetails;
    items: CartItem[];
    total: number;
    paymentMethod: 'credit' | 'debit' | 'pix' | 'cash';
    changeNeeded?: boolean;
    changeAmount?: string;
    notes?: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    createdAt: any; // firebase.firestore.Timestamp
    pickupTimeEstimate?: string;
    mercadoPagoPaymentId?: string;
    userId?: string | null; // Link to the user who placed the order
}

export interface OrderDetails {
    name: string;
    phone: string;
    orderType: 'delivery' | 'pickup' | 'local';
    address: string;
    paymentMethod: 'credit' | 'debit' | 'pix' | 'cash';
    changeNeeded: boolean;
    changeAmount: string;
    notes: string;
    reservationTime: string;
}

export interface UserProfile {
    displayName: string | null;
    email: string | null;
    phone: string | null;
    // any other fields
}

export interface OrderConfirmation {
    id: string;
    total: number;
    customerName: string;
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