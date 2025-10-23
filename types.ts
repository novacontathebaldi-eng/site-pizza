import firebase from 'firebase/compat/app';

// FIX: The type `Partial` is a built-in TypeScript utility type and does not need to be imported or exported.
// The incorrect export from 'react' has been removed.

export interface Address {
    id: string;
    label: string; // 'Casa', 'Trabalho', etc.
    localidade: string;
    street: string;
    number: string;
    complement?: string;
    isDeliveryArea: boolean;
    city: string;
    cep: string;
    state: string;
    isFavorite?: boolean;
    bairro?: string;
}

export interface UserProfile {
    uid: string;
    name: string;
    email: string;
    photoURL: string;
    // User-provided info
    phone?: string;
    addresses?: Address[];
}

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
    deleted?: boolean;
    isPromotion?: boolean;
    promotionalPrice?: number;
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
    isHalfAndHalf?: boolean;
    secondHalf?: {
        productId: string;
        name: string;
    };
}

export interface OrderDetails {
    name: string;
    phone: string;
    orderType: 'delivery' | 'pickup' | 'local';
    address?: string;
    // Detalhes do endereço para entrega
    neighborhood?: string;
    street?: string;
    number?: string;
    complement?: string;
    // Fim dos detalhes de endereço
    paymentMethod: 'credit' | 'debit' | 'pix' | 'cash';
    changeNeeded: boolean;
    changeAmount?: string;
    notes: string;
    deliveryFee?: number;
    reservationTime?: string;
}

export interface ReservationDetails {
    name: string;
    phone: string;
    numberOfPeople: number;
    reservationDate: string;
    reservationTime: string;
    notes: string;
}


// New Types for Order Management
export type OrderStatus = 'pending' | 'accepted' | 'ready' | 'completed' | 'cancelled' | 'reserved' | 'deleted' | 'awaiting-payment';
export type PaymentStatus = 'pending' | 'paid' | 'refunded';

export interface OrderCustomerDetails {
    name: string;
    phone: string;
    orderType: 'delivery' | 'pickup' | 'local';
    address?: string;
    reservationDate?: string;
    reservationTime?: string;
    // Detalhes do endereço
    neighborhood?: string;
    street?: string;
    number?: string;
    complement?: string;
    numberOfPeople?: number;
}

export interface Order {
    id: string;
    userId?: string;
    orderNumber: number; // Número sequencial do pedido
    customer: OrderCustomerDetails;
    items?: CartItem[];
    total?: number;
    deliveryFee?: number;
    paymentMethod?: 'credit' | 'debit' | 'pix' | 'cash';
    changeNeeded?: boolean;
    changeAmount?: string;
    notes?: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    createdAt: firebase.firestore.Timestamp | any; // Firestore Timestamp
    pickupTimeEstimate?: string;
    numberOfPeople?: number;
    // FIX: Added optional mercadoPagoDetails to support the PIX payment flow, resolving type errors in PixPaymentModal.tsx.
    mercadoPagoDetails?: {
        qrCodeBase64: string;
        qrCode: string;
    };
    // FIX: Added the optional `allergies` property to match its usage in OrderCard.tsx.
    allergies?: string;
}

export interface DaySchedule {
    dayOfWeek: number; // 0 = Sunday, 6 = Saturday
    dayName: string;
    isOpen: boolean;
    openTime: string; // HH:mm
    closeTime: string; // HH:mm
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
    automaticSchedulingEnabled?: boolean;
    operatingHours?: DaySchedule[];
}

export interface ChatMessage {
    role: 'user' | 'bot';
    content: string;
}