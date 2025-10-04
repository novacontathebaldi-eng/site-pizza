import React from 'react';
import { Order } from '../types';

interface PixPaymentModalProps {
    order: Order | null;
    onClose: () => void;
    onPaymentSuccess: (paidOrder: Order) => void;
}

// This component is no longer used in the new checkout flow.
// The payment process is handled by redirecting to InfinitePay.
export const PixPaymentModal: React.FC<PixPaymentModalProps> = () => {
    return null;
};