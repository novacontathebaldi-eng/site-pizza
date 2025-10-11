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
    reservationTime?: string;
    cpf?: string; // CPF do cliente para pagamentos PIX
}

// New Types for Order Management
export type OrderStatus = 'pending' | 'accepted' | 'ready' | 'completed' | 'cancelled' | 'reserved' | 'deleted' | 'awaiting-payment';
export type PaymentStatus = 'pending' | 'paid' | 'paid_online' | 'refunded';

export interface OrderCustomerDetails {
    name: string;
    phone: string;
    orderType: 'delivery' | 'pickup' | 'local';
    address?: string;
    reservationTime?: string;
    cpf?: string;
}

export interface Order {
    id: string;
    orderNumber: number; // Número sequencial do pedido
    customer: OrderCustomerDetails;
    items: CartItem[];
    total: number;
    paymentMethod: 'credit' | 'debit' | 'pix' | 'cash';
    changeNeeded?: boolean;
    changeAmount?: string;
    notes?: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    createdAt: firebase.firestore.Timestamp | any; // Firestore Timestamp
    pickupTimeEstimate?: string;
    mercadoPagoDetails?: {
        paymentId: string;
        status?: string;
        statusDetail?: string;
        qrCodeBase64?: string;
        qrCode?: string;
        ticketUrl?: string; // URL de fallback para pagamento
        transactionId?: string | null;
        refunds?: any[]; // Armazena informações de estorno
    };
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