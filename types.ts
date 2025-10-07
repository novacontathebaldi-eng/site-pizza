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
    customer: OrderCustomerDetails;
    items: CartItem[];
    total: number;
    paymentMethod: 'credit' | 'debit' | 'pix' | 'cash';
    changeNeeded?: boolean;
    changeAmount?: string;
    notes?: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    createdAt: any;
    pickupTimeEstimate?: string;
    pixChargeId?: string;
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

export interface AudioSettings {
    notificationSound: string;
    notificationVolume: number;
    backgroundMusic: string;
    backgroundVolume: number;
}

export interface NotificationSettings {
    browserNotificationsEnabled: boolean;
}

export interface PromotionPage {
    id: string;
    order: number;
    isVisible: boolean;
    title: string;
    text: string;
    videoUrl: string;
    componentOrder: ('video' | 'text' | 'products')[];
    featuredProductIds: string[];
    isTitleVisible: boolean;
    isTextVisible: boolean;
    isVideoVisible: boolean;
    isProductsVisible: boolean;
    position: 'above' | 'below';
}

export interface SiteSettings {
    logoUrl: string;
    heroSlogan: string;
    heroTitle: string;
    heroSubtitle: string;
    heroBgUrl: string;
    contentSections: ContentSection[];
    footerLinks: FooterLink[];
    audioSettings?: AudioSettings;
    notificationSettings?: NotificationSettings;
}