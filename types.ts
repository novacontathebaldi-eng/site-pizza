// This file defines the core data structures used throughout the application.

// Represents a product in the menu
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

// Represents a category of products
export interface Category {
    id: string;
    name: string;
    order: number;
    active: boolean;
}

// Represents an item in the shopping cart
export interface CartItem {
    id: string; // Unique ID for the cart item instance (e.g., product + size)
    productId: string;
    name: string;
    size: string;
    price: number;
    quantity: number;
    imageUrl: string;
}

export interface OrderCustomerDetails {
    name: string;
    phone: string;
    orderType: 'delivery' | 'pickup' | 'local';
    address?: string;
    reservationTime?: string;
}


// Expanded PaymentStatus to include online-specific statuses
export type PaymentStatus = 'pending' | 'paid' | 'paid_online' | 'refunded' | 'partially_refunded' | 'failed';

// Expanded OrderStatus to include a state for waiting on online payment
// FIX: Added 'preparing' and 'delivering' to OrderStatus to align with usage in OrderCard.tsx.
export type OrderStatus = 'awaiting-payment' | 'pending' | 'preparing' | 'delivering' | 'accepted' | 'reserved' | 'ready' | 'completed' | 'cancelled' | 'deleted';


// Represents a customer order with added fields for payment gateway integration
export interface Order {
    id: string;
    customer: OrderCustomerDetails;
    items: CartItem[];
    total: number;
    paymentMethod: 'pix' | 'credit' | 'debit' | 'cash';
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    createdAt: any; // Firestore Timestamp

    notes?: string;
    changeNeeded?: boolean;
    changeAmount?: string;
    pickupTimeEstimate?: string;

    // Mercado Pago specific fields
    mercadoPagoOrderId?: string;
    mercadoPagoPaymentId?: string;
    refunds?: {
        id: string; // MP Refund ID
        amount: number;
        date: any; // Firestore Timestamp
    }[];
}


// Represents a list item within a dynamic content section
export interface ContentSectionListItem {
    id: string;
    icon: string;
    text: string;
}

// Represents a dynamic, editable content section on the website
export interface ContentSection {
    id:string;
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

// Represents a link in the website footer
export interface FooterLink {
    id: string;
    icon: string;
    text: string;
    url: string;
    isVisible?: boolean;
}

// Represents the global settings for the website
export interface SiteSettings {
    logoUrl: string;
    heroSlogan: string;
    heroTitle: string;
    heroSubtitle: string;
    heroBgUrl: string;
    contentSections: ContentSection[];
    footerLinks: FooterLink[];
}

// Represents the store's operational status
export interface StoreStatus {
    isOpen: boolean;
    message?: string;
}