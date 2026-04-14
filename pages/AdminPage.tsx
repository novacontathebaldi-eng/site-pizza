import React from 'react';
import { Navigate } from 'react-router-dom';
import { AdminSection } from '../components/AdminSection';
import { Product, Category, SiteSettings, Order, OrderStatus, PaymentStatus } from '../types';

interface AdminPageProps {
    isCurrentUserAdmin: boolean;
    products: Product[];
    categories: Category[];
    isStoreOnline: boolean;
    siteSettings: SiteSettings;
    orders: Order[];
    onSaveProduct: (product: Product) => Promise<void>;
    onDeleteProduct: (productId: string) => Promise<void>;
    onProductStatusChange: (productId: string, active: boolean) => Promise<void>;
    onProductStockStatusChange: (productId: string, stockStatus: 'available' | 'out_of_stock') => Promise<void>;
    onStoreStatusChange: (isOnline: boolean) => Promise<void>;
    onSaveCategory: (category: Category) => Promise<void>;
    onDeleteCategory: (categoryId: string) => Promise<void>;
    onCategoryStatusChange: (categoryId: string, active: boolean) => Promise<void>;
    onReorderProducts: (productsToUpdate: { id: string; orderIndex: number }[]) => Promise<void>;
    onReorderCategories: (categoriesToUpdate: { id: string; order: number }[]) => Promise<void>;
    onSeedDatabase: () => Promise<void>;
    onSaveSiteSettings: (settings: SiteSettings, files: { [key: string]: File | null }) => Promise<void>;
    onUpdateSiteSettingsField: (updates: Partial<SiteSettings>) => Promise<void>;
    onUpdateOrderStatus: (orderId: string, status: OrderStatus, payload?: Partial<Pick<Order, 'pickupTimeEstimate'>>) => Promise<void>;
    onUpdateOrderPaymentStatus: (orderId: string, paymentStatus: PaymentStatus) => Promise<void>;
    onUpdateOrderReservationTime: (orderId: string, reservationTime: string) => Promise<void>;
    onDeleteOrder: (orderId: string) => Promise<void>;
    onPermanentDeleteOrder: (orderId: string) => Promise<void>;
    onPermanentDeleteMultipleOrders: (orderIds: string[]) => Promise<void>;
    onBulkDeleteProducts: (productIds: string[]) => Promise<void>;
    onRestoreProduct: (productId: string) => Promise<void>;
    onPermanentDeleteProduct: (productId: string) => Promise<void>;
    onBulkPermanentDeleteProducts: (productIds: string[]) => Promise<void>;
}

export const AdminPage: React.FC<AdminPageProps> = (props) => {
    const { isCurrentUserAdmin, ...adminProps } = props;

    // Route guard: redirect non-admins to the landing page
    if (!isCurrentUserAdmin) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="min-h-screen bg-brand-ivory-50">
            <AdminSection
                isCurrentUserAdmin={isCurrentUserAdmin}
                allProducts={adminProps.products}
                allCategories={adminProps.categories}
                isStoreOnline={adminProps.isStoreOnline}
                siteSettings={adminProps.siteSettings}
                orders={adminProps.orders}
                onSaveProduct={adminProps.onSaveProduct}
                onDeleteProduct={adminProps.onDeleteProduct}
                onProductStatusChange={adminProps.onProductStatusChange}
                onProductStockStatusChange={adminProps.onProductStockStatusChange}
                onStoreStatusChange={adminProps.onStoreStatusChange}
                onSaveCategory={adminProps.onSaveCategory}
                onDeleteCategory={adminProps.onDeleteCategory}
                onCategoryStatusChange={adminProps.onCategoryStatusChange}
                onReorderProducts={adminProps.onReorderProducts}
                onReorderCategories={adminProps.onReorderCategories}
                onSeedDatabase={adminProps.onSeedDatabase}
                onSaveSiteSettings={adminProps.onSaveSiteSettings}
                onUpdateSiteSettingsField={adminProps.onUpdateSiteSettingsField}
                onUpdateOrderStatus={adminProps.onUpdateOrderStatus}
                onUpdateOrderPaymentStatus={adminProps.onUpdateOrderPaymentStatus}
                onUpdateOrderReservationTime={adminProps.onUpdateOrderReservationTime}
                onDeleteOrder={adminProps.onDeleteOrder}
                onPermanentDeleteOrder={adminProps.onPermanentDeleteOrder}
                onPermanentDeleteMultipleOrders={adminProps.onPermanentDeleteMultipleOrders}
                onBulkDeleteProducts={adminProps.onBulkDeleteProducts}
                onRestoreProduct={adminProps.onRestoreProduct}
                onPermanentDeleteProduct={adminProps.onPermanentDeleteProduct}
                onBulkPermanentDeleteProducts={adminProps.onBulkPermanentDeleteProducts}
            />
        </div>
    );
};
