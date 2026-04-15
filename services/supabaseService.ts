import { supabase } from './supabase';
import { Product, Category, SiteSettings, Order, OrderStatus, PaymentStatus, OrderDetails, CartItem, ChatMessage, ReservationDetails, UserProfile, Address, DaySchedule } from '../types';

// DTA Protocol: PostgreSQL (snake_case) <-> Frontend (camelCase)
export const toCamel = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(toCamel);
    
    return Object.keys(obj).reduce((acc, key) => {
        const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        acc[camelKey] = toCamel(obj[key]);
        return acc;
    }, {} as any);
};

export const toSnake = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(toSnake);
    
    return Object.keys(obj).reduce((acc, key) => {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        acc[snakeKey] = toSnake(obj[key]);
        return acc;
    }, {} as any);
};

export const updateStoreStatus = async (isOnline: boolean): Promise<void> => {
    const { error } = await supabase
        .from('store_status')
        .update({ is_open: isOnline })
        .eq('id', 1);
    if (error) throw new Error(error.message);
};

// Product Functions
export const addProduct = async (productData: Omit<Product, 'id'>): Promise<void> => {
    const { error } = await supabase
        .from('products')
        .insert(toSnake(productData));
    if (error) throw new Error(error.message);
};

export const updateProduct = async (productId: string, productData: Partial<Product>): Promise<void> => {
    if (!productId) throw new Error("Product ID is missing for update.");
    const { error } = await supabase
        .from('products')
        .update(toSnake(productData))
        .eq('id', productId);
    if (error) throw new Error(error.message);
};

export const updateProductStatus = async (productId: string, active: boolean): Promise<void> => {
    const { error } = await supabase
        .from('products')
        .update({ is_active: active })
        .eq('id', productId);
    if (error) throw new Error(error.message);
};

export const updateProductStockStatus = async (productId: string, stockStatus: 'available' | 'out_of_stock'): Promise<void> => {
    const { error } = await supabase
        .from('products')
        .update({ stock_status: stockStatus })
        .eq('id', productId);
    if (error) throw new Error(error.message);
};

export const deleteProduct = async (productId: string): Promise<void> => {
    const { error } = await supabase
        .from('products')
        .update({ is_deleted: true })
        .eq('id', productId);
    if (error) throw new Error(error.message);
};

export const restoreProduct = async (productId: string): Promise<void> => {
    const { error } = await supabase
        .from('products')
        .update({ is_deleted: false })
        .eq('id', productId);
    if (error) throw new Error(error.message);
};

export const permanentDeleteProduct = async (productId: string): Promise<void> => {
    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);
    if (error) throw new Error(error.message);
};

export const bulkDeleteProducts = async (productIds: string[]): Promise<void> => {
    const { error } = await supabase
        .from('products')
        .update({ is_deleted: true })
        .in('id', productIds);
    if (error) throw new Error(error.message);
};

export const bulkPermanentDeleteProducts = async (productIds: string[]): Promise<void> => {
    const { error } = await supabase
        .from('products')
        .delete()
        .in('id', productIds);
    if (error) throw new Error(error.message);
};

export const updateProductsOrder = async (productsToUpdate: { id: string; orderIndex: number }[]): Promise<void> => {
    // Supabase can't do bulk dynamic updates directly without an RPC, but we can do a loop of promises for small sets.
    const promises = productsToUpdate.map(p => 
        supabase.from('products').update({ sort_order: p.orderIndex }).eq('id', p.id)
    );
    const results = await Promise.all(promises);
    const errors = results.filter(r => r.error);
    if (errors.length > 0) throw new Error("Some products failed to update their order.");
};


// Category Functions
export const addCategory = async (categoryData: Omit<Category, 'id'>): Promise<void> => {
    const { error } = await supabase
        .from('categories')
        .insert(toSnake(categoryData));
    if (error) throw new Error(error.message);
};

export const updateCategory = async (categoryId: string, categoryData: Partial<Category>): Promise<void> => {
    if (!categoryId) throw new Error("Category ID is missing for update.");
    const { error } = await supabase
        .from('categories')
        .update(toSnake(categoryData))
        .eq('id', categoryId);
    if (error) throw new Error(error.message);
};

export const updateCategoryStatus = async (categoryId: string, active: boolean): Promise<void> => {
    const { error } = await supabase
        .from('categories')
        .update({ is_active: active })
        .eq('id', categoryId);
    if (error) throw new Error(error.message);
};

export const deleteCategory = async (categoryId: string, allProducts: Product[]): Promise<void> => {
    const isCategoryInUse = allProducts.some(product => product.categoryId === categoryId);
    if (isCategoryInUse) {
        throw new Error("Não é possível excluir esta categoria, pois ela está sendo usada por um ou mais produtos.");
    }
    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);
    if (error) throw new Error(error.message);
};

export const updateCategoriesOrder = async (categoriesToUpdate: { id: string; order: number }[]): Promise<void> => {
    const promises = categoriesToUpdate.map(c => 
        supabase.from('categories').update({ sort_order: c.order }).eq('id', c.id)
    );
    const results = await Promise.all(promises);
    const errors = results.filter(r => r.error);
    if (errors.length > 0) throw new Error("Some categories failed to update their order.");
};

// Site Settings
export const updateSiteSettings = async (settings: Partial<SiteSettings>): Promise<void> => {
    const { error } = await supabase
        .from('site_settings')
        .update(toSnake(settings))
        .eq('id', 1);
    if (error) throw new Error(error.message);
};

// Order Functions (Supabase RPC — atomic with SECURITY DEFINER)
export const createOrder = async (
    details: OrderDetails,
    cart: CartItem[],
    total: number
): Promise<{ orderId: string; orderNumber: number }> => {
    const { data: { user } } = await supabase.auth.getUser();

    const orderData = {
        user_id: user?.id || '',
        customer: {
            name: details.name,
            phone: details.phone,
            orderType: details.orderType,
            neighborhood: details.neighborhood || '',
            street: details.street || '',
            number: details.number || '',
            complement: details.complement || '',
        },
        items: cart,
        total,
        delivery_fee: details.deliveryFee || 0,
        payment_method: details.paymentMethod,
        change_needed: details.changeNeeded || false,
        change_amount: details.changeAmount || '',
        notes: details.notes || '',
    };

    const { data, error } = await supabase.rpc('create_order_atomic', {
        order_data: orderData,
    });

    if (error) throw new Error(error.message);
    return { orderId: data.order_id, orderNumber: data.order_number };
};

export const createReservation = async (
    details: ReservationDetails
): Promise<{ orderId: string; orderNumber: number }> => {
    const { data: { user } } = await supabase.auth.getUser();

    const reservationData = {
        user_id: user?.id || '',
        customer: {
            name: details.name,
            phone: details.phone,
            orderType: 'local',
            reservationDate: details.reservationDate,
            reservationTime: details.reservationTime,
        },
        number_of_people: details.numberOfPeople || 2,
        notes: details.notes || '',
    };

    const { data, error } = await supabase.rpc('create_reservation_atomic', {
        reservation_data: reservationData,
    });

    if (error) throw new Error(error.message);
    return { orderId: data.order_id, orderNumber: data.order_number };
};

// Order Updates (Admin)
export const updateOrderStatus = async (orderId: string, status: OrderStatus, payload?: Partial<Pick<Order, 'pickupTimeEstimate'>>): Promise<void> => {
    const updateData: any = { status };
    if (payload?.pickupTimeEstimate) updateData.pickup_time_estimate = payload.pickupTimeEstimate;
    
    const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);
    if (error) throw new Error(error.message);
};

export const updateOrderPaymentStatus = async (orderId: string, paymentStatus: PaymentStatus): Promise<void> => {
    const { error } = await supabase
        .from('orders')
        .update({ payment_status: paymentStatus })
        .eq('id', orderId);
    if (error) throw new Error(error.message);
};

export const updateOrderReservationTime = async (orderId: string, reservationTime: string): Promise<void> => {
    const { error } = await supabase.rpc('update_order_reservation', {
        order_uuid: orderId,
        new_time: reservationTime
    });
    // Fallback if RPC isn't used, fetch, update jsonb, and save
    if (error) {
        // Simple manual JSONB mutation since partial updates on JSONB from client requires selecting first
        const { data } = await supabase.from('orders').select('customer_details').eq('id', orderId).single();
        if (data) {
            const customerDetails = { ...data.customer_details, reservationTime };
            await supabase.from('orders').update({ customer_details: customerDetails }).eq('id', orderId);
        }
    }
};

export const deleteOrder = async (orderId: string): Promise<void> => {
    const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);
    if (error) throw new Error(error.message);
};

export const permanentDeleteMultipleOrders = async (orderIds: string[]): Promise<void> => {
    const { error } = await supabase
        .from('orders')
        .delete()
        .in('id', orderIds);
    if (error) throw new Error(error.message);
};

// Chatbot - Reuses same logic
export const askChatbot = async (
    history: ChatMessage[],
    products: Product[],
    categories: Category[],
    isStoreOnline: boolean,
    operatingHours: DaySchedule[] | undefined,
    userProfile: UserProfile | null,
    myOrders: Order[]
): Promise<string> => {
    const response = await fetch('/api/ask-santo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            history,
            menuData: { products, categories },
            storeStatus: { isOnline: isStoreOnline, operatingHours: operatingHours || [] },
            userProfile,
            myOrders
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        console.error("Chatbot API Error:", errorData);
        throw new Error(`Failed to get response: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.reply;
};

// User Profile & Auth

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();
    if (error || !data) return null;
    return toCamel(data);
};

export const createUserProfile = async (user: any, name: string, phone: string): Promise<void> => {
    // The trigger handle_new_user already creates a basic profile on signup.
    // This function updates it with the full data (name, phone) provided in the form.
    // We use update instead of upsert because the row already exists from the trigger,
    // and the user might not have a valid session yet (email verification pending).
    const { error } = await supabase
        .from('profiles')
        .update({
            name: name || user.user_metadata?.display_name || user.user_metadata?.full_name || 'Usuário',
            phone: phone || '',
            photo_url: user.user_metadata?.avatar_url || '',
        })
        .eq('id', user.id);
    // Silently ignore errors here - the trigger already created a basic profile.
    // The user can update their info later from their profile page.
    if (error) {
        console.warn('createUserProfile update failed (trigger may have handled it):', error.message);
    }
};

export const updateUserProfile = async (uid: string, data: Partial<Pick<UserProfile, 'name' | 'phone'>>): Promise<void> => {
    const { error } = await supabase
        .from('profiles')
        .update(toSnake(data))
        .eq('id', uid);
    if (error) throw new Error(error.message);
};

export const updateUserPreferences = async (uid: string, preferences: { menuView: 'grid' | 'compact' }): Promise<void> => {
    const { error } = await supabase
        .from('profiles')
        .update({ preferences: toSnake(preferences) })
        .eq('id', uid);
    if (error) throw new Error(error.message);
};

export const addAddress = async (uid: string, address: Omit<Address, 'id'>): Promise<void> => {
    const newAddress = { ...address, id: crypto.randomUUID() };
    const { data } = await supabase.from('profiles').select('addresses').eq('id', uid).single();
    let addresses = data?.addresses || [];
    
    if (newAddress.isFavorite) {
        addresses = addresses.map((a: any) => ({ ...a, isFavorite: false }));
    }
    
    addresses.push(newAddress);
    
    const { error } = await supabase
        .from('profiles')
        .update({ addresses })
        .eq('id', uid);
    if (error) throw new Error(error.message);
};

export const updateAddress = async (uid: string, address: Address): Promise<void> => {
    const { data } = await supabase.from('profiles').select('addresses').eq('id', uid).single();
    if (data) {
        let addresses = data.addresses || [];
        if (address.isFavorite) {
            addresses = addresses.map((a: any) => ({ ...a, isFavorite: false }));
        }
        const index = addresses.findIndex((a: any) => a.id === address.id);
        if (index > -1) {
            addresses[index] = address;
        } else {
            addresses.push(address);
        }
        await supabase.from('profiles').update({ addresses }).eq('id', uid);
    }
};

export const deleteAddress = async (uid: string, addressId: string): Promise<void> => {
    const { data } = await supabase.from('profiles').select('addresses').eq('id', uid).single();
    if (data) {
        let addresses = (data.addresses || []).filter((a: any) => a.id !== addressId);
        if (addresses.length > 0 && !addresses.some((a: any) => a.isFavorite)) {
            addresses[0].isFavorite = true;
        }
        await supabase.from('profiles').update({ addresses }).eq('id', uid);
    }
};

export const manageProfilePicture = async (imageBase64: string | null): Promise<void> => {
    throw new Error("Pendente refatoração para Supabase Storage");
};

export const syncGuestOrders = async (uid: string, orderIds: string[]): Promise<{ success: boolean; message: string }> => {
    const { error } = await supabase
        .from('orders')
        .update({ user_id: uid })
        .in('id', orderIds)
        .is('user_id', null);

    if (error) {
        console.error('Failed to sync guest orders:', error);
        return { success: false, message: error.message };
    }
    return { success: true, message: 'Orders synced successfully' };
};

// --- Data Subscriptions (Adapters Replacing onSnapshot) ---

export const subscribeSettings = (onData: (data: Partial<SiteSettings>) => void, onError: (err: any) => void) => {
    supabase.from('site_settings').select('*').eq('id', 1).single().then(({ data, error }) => {
        if (error) onError(error); else if (data) onData(toCamel(data));
    });
    
    const channel = supabase.channel('site_settings_chan')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => {
            supabase.from('site_settings').select('*').eq('id', 1).single().then(({ data, error }) => {
                if (!error && data) onData(toCamel(data));
            });
        }).subscribe();
    return () => { supabase.removeChannel(channel); };
};

export const subscribeStoreStatus = (onData: (isOpen: boolean) => void, onError: (err: any) => void) => {
    supabase.from('store_status').select('is_open').eq('id', 1).single().then(({ data, error }) => {
        if (error) onError(error); else if (data) onData(data.is_open);
    });
    const channel = supabase.channel('store_status_chan')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'store_status' }, () => {
            supabase.from('store_status').select('is_open').eq('id', 1).single().then(({ data, error }) => {
                if (!error && data) onData(data.is_open);
            });
        }).subscribe();
    return () => { supabase.removeChannel(channel); };
};

export const subscribeCategories = (onData: (cats: Category[]) => void, onError: (err: any) => void) => {
    supabase.from('categories').select('*').order('sort_order').then(({ data, error }) => {
        if (error) onError(error); else if (data) onData(toCamel(data));
    });
    const channel = supabase.channel('categories_chan')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
            supabase.from('categories').select('*').order('sort_order').then(({ data, error }) => {
                if (!error && data) onData(toCamel(data));
            });
        }).subscribe();
    return () => { supabase.removeChannel(channel); };
};

export const subscribeProducts = (onData: (prods: Product[]) => void, onError: (err: any) => void) => {
    supabase.from('products').select('*').eq('is_deleted', false).order('sort_order').then(({ data, error }) => {
        if (error) onError(error); else if (data) onData(toCamel(data));
    });
    const channel = supabase.channel('products_chan')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
            supabase.from('products').select('*').eq('is_deleted', false).order('sort_order').then(({ data, error }) => {
                if (!error && data) onData(toCamel(data));
            });
        }).subscribe();
    return () => { supabase.removeChannel(channel); };
};

export const subscribeOrders = (isAdmin: boolean, uid: string | undefined, onData: (orders: Order[]) => void, onError: (err: any) => void) => {
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (!isAdmin) {
        if (!uid) return () => {}; 
        query = query.eq('user_id', uid).limit(10);
    }
    
    query.then(({ data, error }) => {
        if (error) onError(error); else if (data) onData(toCamel(data));
    });

    const channel = supabase.channel('orders_chan_' + (isAdmin ? 'admin' : (uid || 'anon')))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
             let q = supabase.from('orders').select('*').order('created_at', { ascending: false });
             if (!isAdmin && uid) q = q.eq('user_id', uid).limit(10);
             q.then(({ data, error }) => {
                 if (!error && data) onData(toCamel(data));
             });
        }).subscribe();
    return () => { supabase.removeChannel(channel); };
};

export const subscribeUser = (uid: string, onData: (profile: UserProfile | null) => void) => {
    supabase.from('profiles').select('*').eq('id', uid).single().then(({ data, error }) => {
        onData(error || !data ? null : toCamel(data));
    });
    const channel = supabase.channel('profiles_chan_' + uid)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${uid}` }, () => {
            supabase.from('profiles').select('*').eq('id', uid).single().then(({ data, error }) => {
                onData(error || !data ? null : toCamel(data));
            });
        }).subscribe();
    return () => { supabase.removeChannel(channel); };
};

export const getOrder = async (orderId: string): Promise<Order | null> => {
    const { data, error } = await supabase.from('orders').select('*').eq('id', orderId).single();
    if (error || !data) return null;
    return toCamel(data);
};

export const seedDatabase = async (): Promise<void> => {
    const { error } = await supabase.rpc('seed_database');
    if (error) throw error;
};
