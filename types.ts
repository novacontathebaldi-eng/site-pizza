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

// Represents a customer order
export interface Order {
    id: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    items: CartItem[];
    total: number;
    status: 'pending' | 'preparing' | 'delivering' | 'completed' | 'cancelled';
    paymentMethod: 'pix' | 'card' | 'cash';
    paymentStatus: 'pending' | 'paid' | 'failed';
    createdAt: any; // Firestore Timestamp
    notes?: string;
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
