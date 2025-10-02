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
