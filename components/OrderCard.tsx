import React, { useState } from 'react';
import { Order, OrderStatus, PaymentStatus, getOrderActions } from '../types';
import * as firebaseService from '../services/firebaseService';

interface OrderCardProps {
  order: Order;
  onStatusChange: (orderId: string, status: OrderStatus, payload?: Partial<Order>) => void;
  onPaymentStatusChange: (orderId: string, paymentStatus: PaymentStatus) => void;
  onReservationTimeChange: (orderId: string, reservationTime: string) => void;
  onDelete: (orderId: string) => void;
  onPermanentDelete: (orderId: string) => void;
  addToast: (message: string, type: 'success' | 'error') => void;
}

const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onStatusChange,
  onPaymentStatusChange,
  onReservationTimeChange,
  onDelete,
  onPermanentDelete,
  addToast,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [showRefundModal, setShowRefundModal] = useState(false);

  const formatDate = (date: any) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleString('pt-BR');
  };

  const getStatusBadgeClass = (status: OrderStatus) => {
    const baseClass = 'px-2 py-1 rounded-full text-xs font-semibold';
    switch (status) {
      case 'pending': return `${baseClass} bg-yellow-100 text-yellow-800`;
      case 'accepted': return `${baseClass} bg-blue-100 text-blue-800`;
      case 'preparing': return `${baseClass} bg-purple-100 text-purple-800`;
      case 'ready': return `${baseClass} bg-green-100 text-green-800`;
      case 'delivering': return `${baseClass} bg-indigo-100 text-indigo-800`;
      case 'completed': return `${baseClass} bg-green-100 text-green-800`;
      case 'cancelled': return `${baseClass} bg-red-100 text-red-800`;
      case 'reserved': return `${baseClass} bg-orange-100 text-orange-800`;
      case 'deleted': return `${baseClass} bg-gray-100 text-gray-800`;
      default: return `${baseClass} bg-gray-100 text-gray-800`;
    }
  };

  const getPaymentStatusBadgeClass = (status: PaymentStatus) => {
    const baseClass = 'px-2 py-1 rounded-full text-xs font-semibold';
    switch (status) {
      case 'pending': return `${baseClass} bg-yellow-100 text-yellow-800`;
      case 'paid': return `${baseClass} bg-green-100 text-green-800`;
      case 'failed': return `${baseClass} bg-red-100 text-red-800`;
      case 'cancelled': return `${baseClass} bg-gray-100 text-gray-800`;
      case 'refunded': return `${baseClass} bg-purple-100 text-purple-800`;
      case 'partially_refunded': return `${baseClass} bg-orange-100 text-orange-800`;
      default: return `${baseClass} bg-gray-100 text-gray-800`;
    }
  };

  const orderActions = getOrderActions(order);

  // Handle Mercado Pago order cancellation
  const handleCancelPayment = async () => {
    if (!order.mercadoPagoOrderId) {
      addToast('ID do pagamento não encontrado.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      await firebaseService.cancelMercadoPagoOrder(order.mercadoPagoOrderId, order.id);
      addToast('Pagamento cancelado com sucesso!', 'success');
    } catch (error: any) {
      addToast(error.message || 'Erro ao cancelar pagamento.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Mercado Pago order refund
  const handleRefund = async (amount?: number) => {
    if (!order.mercadoPagoOrderId) {
      addToast('ID do pagamento não encontrado.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      await firebaseService.refundMercadoPagoOrder(order.mercadoPagoOrderId, order.id, amount);
      const message = amount ? 
        `Estorno parcial de R$ ${amount.toFixed(2).replace('.', ',')} realizado!` :
        'Estorno total realizado com sucesso!';
      addToast(message, 'success');
      setShowRefundModal(false);
      setRefundAmount('');
    } catch (error: any) {
      addToast(error.message || 'Erro ao processar estorno.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle view payment receipt
  const handleViewReceipt = async () => {
    if (!order.mercadoPagoPaymentId) {
      addToast('ID do pagamento não encontrado.', 'error');
      return;
    }

    try {
      const result = await firebaseService.getPaymentReceipt(order.mercadoPagoPaymentId);
      window.open(result.receiptUrl, '_blank');
    } catch (error: any) {
      addToast(error.message || 'Erro ao gerar comprovante.', 'error');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-4 overflow-hidden">
      {/* Order Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Order Number */}
            {order.orderNumber && (
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
                #{order.orderNumber}
              </div>
            )}
            
            {/* Customer Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{order.customer.name}</h3>
              <p className="text-sm text-gray-600">{order.customer.phone}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Status Badges */}
            <span className={getStatusBadgeClass(order.status)}>
              {order.status === 'pending' ? 'Pendente' :
               order.status === 'accepted' ? 'Aceito' :
               order.status === 'preparing' ? 'Preparando' :
               order.status === 'ready' ? 'Pronto' :
               order.status === 'delivering' ? 'Entregando' :
               order.status === 'completed' ? 'Concluído' :
               order.status === 'cancelled' ? 'Cancelado' :
               order.status === 'reserved' ? 'Reservado' :
               order.status === 'deleted' ? 'Deletado' : order.status}
            </span>
            
            <span className={getPaymentStatusBadgeClass(order.paymentStatus)}>
              {order.paymentStatus === 'pending' ? 'Pendente' :
               order.paymentStatus === 'paid' ? 'Pago' :
               order.paymentStatus === 'failed' ? 'Falhou' :
               order.paymentStatus === 'cancelled' ? 'Cancelado' :
               order.paymentStatus === 'refunded' ? 'Estornado' :
               order.paymentStatus === 'partially_refunded' ? 'Parc. Estornado' : order.paymentStatus}
            </span>
            
            {/* Total */}
            <span className="text-lg font-bold text-green-600">
              R$ {order.total.toFixed(2).replace('.', ',')}
            </span>
            
            {/* Expand Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
            </button>
          </div>
        </div>

        {/* Payment Info */}
        {order.mercadoPagoDetails && (
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {order.mercadoPagoOrderId && (
              <div>
                <span className="font-medium text-gray-700">ID Order MP:</span>
                <br />
                <span className="text-gray-600 font-mono text-xs">
                  {order.mercadoPagoOrderId}
                </span>
              </div>
            )}
            
            {order.mercadoPagoPaymentId && (
              <div>
                <span className="font-medium text-gray-700">ID Pagamento:</span>
                <br />
                <span className="text-gray-600 font-mono text-xs">
                  {order.mercadoPagoPaymentId}
                </span>
              </div>
            )}
            
            {order.mercadoPagoDetails.transactionId && (
              <div>
                <span className="font-medium text-gray-700">ID Transação:</span>
                <br />
                <span className="text-gray-600 font-mono text-xs">
                  {order.mercadoPagoDetails.transactionId}
                </span>
              </div>
            )}
            
            {order.paidAt && (
              <div>
                <span className="font-medium text-gray-700">Pago em:</span>
                <br />
                <span className="text-gray-600 text-xs">{formatDate(order.paidAt)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Order Items */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Itens do Pedido:</h4>
            <div className="space-y-2">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                  <div>
                    <span className="font-medium">{item.quantity}x {item.name}</span>
                    <span className="text-gray-600 ml-2">({item.size})</span>
                  </div>
                  <span className="text-gray-900 font-medium">
                    R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Order Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Detalhes do Cliente:</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Nome:</strong> {order.customer.name}</p>
                <p><strong>Telefone:</strong> {order.customer.phone}</p>
                <p><strong>Tipo:</strong> 
                  {order.customer.orderType === 'delivery' ? ' Entrega' :
                   order.customer.orderType === 'pickup' ? ' Retirada' :
                   order.customer.orderType === 'local' ? ' Consumo Local' : ` ${order.customer.orderType}`}
                </p>
                {order.customer.address && <p><strong>Endereço:</strong> {order.customer.address}</p>}
                {order.customer.notes && <p><strong>Observações:</strong> {order.customer.notes}</p>}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Informações do Pedido:</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Criado em:</strong> {formatDate(order.createdAt)}</p>
                {order.updatedAt && <p><strong>Atualizado em:</strong> {formatDate(order.updatedAt)}</p>}
                {order.refundedAmount && (
                  <p><strong>Valor Estornado:</strong> R$ {order.refundedAmount.toFixed(2).replace('.', ',')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
            {/* Payment Actions */}
            {orderActions.canViewReceipt && (
              <button
                onClick={handleViewReceipt}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                <i className="fas fa-receipt mr-2"></i>
                Ver Comprovante
              </button>
            )}

            {orderActions.canCancel && (
              <button
                onClick={handleCancelPayment}
                disabled={isProcessing}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <i className="fas fa-times mr-2"></i>
                {isProcessing ? 'Cancelando...' : 'Cancelar Pagamento'}
              </button>
            )}

            {orderActions.canRefund && (
              <button
                onClick={() => handleRefund()}
                disabled={isProcessing}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                <i className="fas fa-undo mr-2"></i>
                {isProcessing ? 'Processando...' : 'Estorno Total'}
              </button>
            )}

            {orderActions.canRefundPartial && (
              <button
                onClick={() => setShowRefundModal(true)}
                disabled={isProcessing}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                <i className="fas fa-edit mr-2"></i>
                Estorno Parcial
              </button>
            )}

            {/* Status Change Actions (existing functionality) */}
            {order.status === 'pending' && (
              <>
                <button
                  onClick={() => onStatusChange(order.id, 'accepted')}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors"
                >
                  <i className="fas fa-check mr-2"></i>
                  Aceitar
                </button>
                <button
                  onClick={() => onStatusChange(order.id, 'cancelled')}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors"
                >
                  <i className="fas fa-times mr-2"></i>
                  Recusar
                </button>
              </>
            )}

            {/* Other status transitions... */}
            {order.status === 'accepted' && (
              <button
                onClick={() => onStatusChange(order.id, 'preparing')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                <i className="fas fa-utensils mr-2"></i>
                Iniciar Preparo
              </button>
            )}

            {order.status === 'preparing' && (
              <button
                onClick={() => onStatusChange(order.id, 'ready')}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors"
              >
                <i className="fas fa-bell mr-2"></i>
                Marcar como Pronto
              </button>
            )}

            {/* Delete Actions */}
            {order.status !== 'deleted' && (
              <button
                onClick={() => onDelete(order.id)}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
              >
                <i className="fas fa-trash mr-2"></i>
                Mover para Lixeira
              </button>
            )}

            {order.status === 'deleted' && (
              <button
                onClick={() => onPermanentDelete(order.id)}
                className="bg-red-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-900 transition-colors"
              >
                <i className="fas fa-trash-alt mr-2"></i>
                Apagar Permanentemente
              </button>
            )}
          </div>
        </div>
      )}

      {/* Partial Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Estorno Parcial</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor do Estorno (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={order.total}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0,00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Máximo: R$ {order.total.toFixed(2).replace('.', ',')}
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRefundModal(false);
                  setRefundAmount('');
                }}
                className="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const amount = parseFloat(refundAmount);
                  if (amount > 0 && amount <= order.total) {
                    handleRefund(amount);
                  }
                }}
                disabled={!refundAmount || parseFloat(refundAmount) <= 0 || parseFloat(refundAmount) > order.total}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                Confirmar Estorno
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderCard;