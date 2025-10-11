
// A product available for sale.
export interface Product {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    // Maps a size (e.g., "P", "M", "G", "Única") to a price.
    prices: { [size: string]: number };
    categoryId: string;
    active: boolean;
    badge?: string;
    orderIndex: number;
    stockStatus?: 'available' | 'out_of_stock';
}

// A category for grouping products in the menu.
export interface Category {
    id: string;
    name: string;
    order: number;
    active: boolean;
}

// An item in the user's shopping cart.
export interface CartItem {
    id: string; // Unique ID for the cart item instance (e.g., product_id + size)
    productId: string;
    name: string;
    size: string;
    price: number;
    quantity: number;
    imageUrl: string;
}

// Customer and order details collected during checkout.
export interface OrderDetails {
    name: string;
    phone: string;
    cpf?: string;
    orderType: 'delivery' | 'pickup' | 'local';
    address?: string;
    paymentMethod: 'credit' | 'debit' | 'pix' | 'cash';
    changeNeeded: boolean;
    changeAmount: string;
    notes?: string;
    reservationTime?: string;
}

export type OrderStatus = 'pending' | 'accepted' | 'reserved' | 'ready' | 'completed' | 'cancelled' | 'deleted' | 'awaiting-payment';
export type PaymentStatus = 'pending' | 'paid' | 'paid_online' | 'refunded';

// A complete order record as stored in the database.
export interface Order {
    id: string;
    orderNumber: number;
    customer: {
        name: string;
        phone: string;
        orderType: 'delivery' | 'pickup' | 'local';
        address?: string;
        reservationTime?: string;
    };
    items: CartItem[];
    total: number;
    paymentMethod: 'credit' | 'debit' | 'pix' | 'cash';
    changeNeeded: boolean;
    changeAmount: string;
    notes?: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    createdAt: any; // firebase.firestore.Timestamp
    pickupTimeEstimate?: string;
    mercadoPagoDetails?: {
        paymentId: string;
        status: string;
    };
}

export interface ContentSectionListItem {
    id: string;
    icon: string;
    text: string;
}

// A configurable content section for the website's main page.
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

// A configurable link for the website's footer.
export interface FooterLink {
    id: string;
    icon: string;
    text: string;
    url: string;
    isVisible?: boolean;
}

// Global settings for website customization.
export interface SiteSettings {
    logoUrl: string;
    heroSlogan: string;
    heroTitle: string;
    heroSubtitle: string;
    heroBgUrl: string;
    contentSections: ContentSection[];
    footerLinks: FooterLink[];
}
