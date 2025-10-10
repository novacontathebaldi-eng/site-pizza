```typescript
import React, { useState } from 'react';
import { Clock, MapPin, User, Phone, CheckCircle, XCircle, RefreshCw, CreditCard, DollarSign } from 'lucide-react';
import { Order, OrderStatus, PaymentStatus } from '../types';
import * as firebaseService from '../services/firebaseService';

interface OrderCardProps {
  order: Order;
  onStatusUpdate: (orderId: string, newStatus: OrderStatus) => void;
  onPaymentStatusUpdate: (orderId: string, newPaymentStatus: PaymentStatus) => void;
  isAdmin?: boolean;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onStatusUpdate,
  onPaymentStatusUpdate,
  isAdmin = false
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const {
    id,
    customer,
    items,
    total,
    paymentMethod,
    changeNeeded,
    changeAmount,
    notes,
    status,
    paymentStatus,
    createdAt,
    pickupTimeEstimate,
    mercadoPagoOrder
  } = order;

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Data não disponível';
    
    let date: Date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }
    
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'awaiting-payment': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (paymentStatus: PaymentStatus) => {
    switch (paymentStatus) {
      case 'paid':
      case 'paid_online': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'refunded':
      case 'partially_refunded': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const orderTypeMap = {
    delivery: 'Entrega',
    pickup: 'Retirada',
    local: 'Local'
  };

  const paymentMethodMap = {
    pix: 'PIX',
    credit: 'Cartão Crédito',
    debit: 'Cartão Débito',
    cash: 'Dinheiro'
  };

  const statusMap = {
    'pending': 'Pendente',
    'accepted': 'Aceito',
    'ready': 'Pronto',
    'completed': 'Finalizado',
    'cancelled': 'Cancelado',
    'awaiting-payment': 'Aguardando Pagamento'
  };

  const paymentStatusMap = {
    'pending': 'Pendente',
    'paid': 'Pago',
    'paid_online': 'Pago Online',
    'partially_paid': 'Pago Parcial',
    'refunded': 'Reembolsado',
    'partially_refunded': 'Reembolso Parcial'
  };

  // Operações do Mercado Pago para Admin
  const handleCancelPayment = async () => {
    if (!mercadoPagoOrder?.orderId || !isAdmin) return;

    setActionLoading('cancel');
    try {
      await firebaseService.cancelMercadoPagoOrder(mercadoPagoOrder.orderId);
      onPaymentStatusUpdate(id, 'pending');
      alert('Pagamento cancelado com sucesso!');
    } catch (error: any) {
      alert(`Erro ao cancelar pagamento: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefund = async (isPartial: boolean = false) => {
    if (!mercadoPagoOrder?.orderId || !mercadoPagoOrder.transactions[0]?.id || !isAdmin) return;

    const transactionId = mercadoPagoOrder.transactions[0].id;
    let refundAmount: number | undefined = undefined;

    if (isPartial) {
      const amountStr = prompt('Digite o valor para reembolso parcial (em R$):');
      if (!amountStr) return;
      refundAmount = parseFloat(amountStr.replace(',', '.'));
      if (isNaN(refundAmount) || refundAmount <= 0) {
        alert('Valor inválido!');
        return;
      }
    }

    setActionLoading(isPartial ? 'partial-refund' : 'full-refund');
    try {
      await firebaseService.refundMercadoPagoOrder(
        mercadoPagoOrder.orderId, 
        transactionId, 
        refundAmount
      );
      
      const newStatus = isPartial ? 'partially_refunded' : 'refunded';
      onPaymentStatusUpdate(id, newStatus);
      
      alert(`Reembolso ${isPartial ? 'parcial' : 'total'} processado com sucesso!`);
    } catch (error: any) {
      alert(`Erro ao processar reembolso: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCapture = async () => {
    if (!mercadoPagoOrder?.orderId || !mercadoPagoOrder.transactions[0]?.id || !isAdmin) return;

    const transactionId = mercadoPagoOrder.transactions[0].id;

    setActionLoading('capture');
    try {
      await firebaseService.captureMercadoPagoOrder(mercadoPagoOrder.orderId, transactionId);
      onPaymentStatusUpdate(id, 'paid_online');
      alert('Pagamento capturado com sucesso!');
    } catch (error: any) {
      alert(`Erro ao capturar pagamento: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (newStatus: OrderStatus) => {
    setIsLoading(true);
    try {
      await firebaseService.updateOrderStatus(id, newStatus);
      onStatusUpdate(id, newStatus);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-lg text-gray-900">Pedido #{id.substring(0, 8)}</h3>
          <p className="text-sm text-gray-600">
            Pedido recebido em: {formatTimestamp(createdAt)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-green-600">
            {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <p className="text-sm text-gray-600">
            {items.reduce((acc, item) => acc + item.quantity, 0)} itens
          </p>
        </div>
      </div>

      {/* Customer Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-y border-gray-100">
        <div className="space-y-2">
          <p className="text-sm">
            <User className="inline w-4 h-4 mr-1" />
            **Nome:** {customer.name}
          </p>
          <p className="text-sm">
            <Phone className="inline w-4 h-4 mr-1" />
            **Telefone:** {customer.phone}
          </p>
          {customer.orderType === 'delivery' && customer.address && (
            <p className="text-sm">
              <MapPin className="inline w-4 h-4 mr-1" />
              **Endereço:** {customer.address}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-sm">
            **Pedido:** {orderTypeMap[customer.orderType]}
          </p>
          {customer.orderType === 'local' && customer.reservationTime && (
            <p className="text-sm">
              <Clock className="inline w-4 h-4 mr-1" />
              **Reserva:** {customer.reservationTime}
            </p>
          )}
          {customer.orderType === 'pickup' && pickupTimeEstimate && (
            <p className="text-sm">
              <Clock className="inline w-4 h-4 mr-1" />
              **Retirada:** {pickupTimeEstimate}
            </p>
          )}
        </div>
      </div>

      {/* Payment Info */}
      <div className="space-y-2">
        <p className="text-sm">
          **Método:** {paymentMethodMap[paymentMethod]}
        </p>
        {paymentMethod === 'cash' && (
          <p className="text-sm">
            **Troco:** {changeNeeded ? `para R$ ${changeAmount}` : 'Não precisa'}
          </p>
        )}
        
        {/* Mercado Pago Details */}
        {mercadoPagoOrder && (
          <div className="bg-blue-50 p-3 rounded-md space-y-1">
            <p className="text-xs font-medium text-blue-800">Detalhes Mercado Pago:</p>
            <p className="text-xs text-blue-700">
              **ID Transação:** {mercadoPagoOrder.orderId}
            </p>
            {mercadoPagoOrder.transactions[0]?.id && (
              <p className="text-xs text-blue-700">
                **ID Pagamento:** {mercadoPagoOrder.transactions[0].id}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      {notes && (
        <div className="bg-gray-50 p-3 rounded-md">
          <p className="text-sm">
            **Obs:** {notes}
          </p>
        </div>
      )}

      {/* Status */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
          {statusMap[status]}
        </span>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(paymentStatus)}`}>
          **Status Pgto:** {paymentStatusMap[paymentStatus]}
        </span>
      </div>

      {/* Admin Actions */}
      {isAdmin && (
        <div className="pt-4 border-t border-gray-200 space-y-4">
          {/* Status Actions */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Atualizar Status:</h4>
            <div className="flex flex-wrap gap-2">
              {['pending', 'accepted', 'ready', 'completed', 'cancelled'].map((newStatus) => (
                <button
                  key={newStatus}
                  onClick={() => handleStatusChange(newStatus as OrderStatus)}
                  disabled={isLoading || status === newStatus}
                  className={`px-3 py-1 text-xs rounded border transition-colors ${
                    status === newStatus
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                  }`}
                >
                  {statusMap[newStatus as OrderStatus]}
                </button>
              ))}
            </div>
          </div>

          {/* Mercado Pago Actions */}
          {mercadoPagoOrder && paymentMethod === 'pix' && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Operações de Pagamento:</h4>
              <div className="flex flex-wrap gap-2">
                {/* Cancel Payment */}
                {paymentStatus === 'pending' && (
                  <button
                    onClick={handleCancelPayment}
                    disabled={actionLoading === 'cancel'}
                    className="flex items-center space-x-1 px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  >
                    {actionLoading === 'cancel' ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    <span>Cancelar</span>
                  </button>
                )}

                {/* Capture Payment (for credit cards) */}
                {paymentMethod === 'credit' && paymentStatus === 'pending' && (
                  <button
                    onClick={handleCapture}
                    disabled={actionLoading === 'capture'}
                    className="flex items-center space-x-1 px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                  >
                    {actionLoading === 'capture' ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <CreditCard className="w-3 h-3" />
                    )}
                    <span>Capturar</span>
                  </button>
                )}

                {/* Refund Actions */}
                {(paymentStatus === 'paid' || paymentStatus === 'paid_online') && (
                  <>
                    <button
                      onClick={() => handleRefund(false)}
                      disabled={actionLoading === 'full-refund'}
                      className="flex items-center space-x-1 px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors"
                    >
                      {actionLoading === 'full-refund' ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <DollarSign className="w-3 h-3" />
                      )}
                      <span>Reembolso Total</span>
                    </button>
                    
                    <button
                      onClick={() => handleRefund(true)}
                      disabled={actionLoading === 'partial-refund'}
                      className="flex items-center space-x-1 px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
                    >
                      {actionLoading === 'partial-refund' ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <DollarSign className="w-3 h-3" />
                      )}
                      <span>Reembolso Parcial</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```