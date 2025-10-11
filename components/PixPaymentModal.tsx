import React, { useState, useEffect } from 'react';
import { X, Copy, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import * as firebaseService from '../services/firebaseService';

interface PixPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderTotal: number;
  onPaymentSuccess: () => void;
  onPaymentFailure: () => void;
}

export const PixPaymentModal: React.FC<PixPaymentModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderTotal,
  onPaymentSuccess,
  onPaymentFailure
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pixData, setPixData] = useState<{
    mpOrderId: string;
    qrCodeBase64: string;
    qrCode: string;
    status: string;
  } | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'generating' | 'pending' | 'paid' | 'failed'>('generating');
  const [copied, setCopied] = useState(false);
  const [stopPolling, setStopPolling] = useState<(() => void) | null>(null);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutos em segundos
  
  // Timer para expiração do PIX
  useEffect(() => {
    if (paymentStatus === 'pending' && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && paymentStatus === 'pending') {
      setPaymentStatus('failed');
      setError('PIX expirado. Tente novamente.');
    }
  }, [timeLeft, paymentStatus]);

  // Formatar tempo restante
  const formatTimeLeft = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Inicializar pagamento PIX
  useEffect(() => {
    if (isOpen && !pixData) {
      initializePixPayment();
    }
  }, [isOpen]);

  // Cleanup polling ao fechar modal
  useEffect(() => {
    if (!isOpen && stopPolling) {
      stopPolling();
      setStopPolling(null);
    }
  }, [isOpen, stopPolling]);

  const initializePixPayment = async () => {
    setIsLoading(true);
    setError(null);
    setPaymentStatus('generating');

    try {
      // Chamar Firebase Function para criar Order no Mercado Pago
      const result = await firebaseService.createMercadoPagoOrder(orderId);
      
      setPixData(result);
      setPaymentStatus('pending');
      setTimeLeft(600); // Reset timer

      // Iniciar polling de status
      const pollStop = firebaseService.pollPaymentStatus(
        result.mpOrderId,
        (status, isPaid) => {
          console.log('Status atualizado:', status, 'Pago:', isPaid);
          
          if (isPaid) {
            setPaymentStatus('paid');
            onPaymentSuccess();
          } else if (status === 'cancelled' || status === 'expired') {
            setPaymentStatus('failed');
            setError('Pagamento cancelado ou expirado.');
          }
        },
        60, // 60 tentativas (3 minutos de polling)
        3000 // Verificar a cada 3 segundos
      );

      setStopPolling(() => pollStop);

    } catch (error: any) {
      console.error('Erro ao inicializar pagamento PIX:', error);
      setError(error.message || 'Erro ao gerar PIX. Tente novamente.');
      setPaymentStatus('failed');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (pixData?.qrCode) {
      try {
        await navigator.clipboard.writeText(pixData.qrCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Erro ao copiar PIX:', error);
      }
    }
  };

  const handleClose = () => {
    if (stopPolling) {
      stopPolling();
      setStopPolling(null);
    }
    
    // Reset states
    setPixData(null);
    setPaymentStatus('generating');
    setError(null);
    setTimeLeft(600);
    setCopied(false);
    
    onClose();
  };

  const handleTryAgain = () => {
    setPixData(null);
    setError(null);
    initializePixPayment();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            Pagamento PIX
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Status de Loading */}
          {paymentStatus === 'generating' && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
              <p className="text-lg font-medium text-gray-900">Gerando seu PIX seguro...</p>
              <p className="text-sm text-gray-600 mt-2">Isso pode levar alguns segundos</p>
            </div>
          )}

          {/* Erro */}
          {error && paymentStatus === 'failed' && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-lg font-medium text-gray-900 mb-2">Ocorreu um erro</p>
              <p className="text-sm text-red-600 mb-4">{error}</p>
              <button
                onClick={handleTryAgain}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Tentar Novamente
              </button>
            </div>
          )}

          {/* Pagamento Aprovado */}
          {paymentStatus === 'paid' && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-lg font-medium text-green-600">Pagamento Aprovado!</p>
              <p className="text-sm text-gray-600 mt-2">Seu pedido será finalizado em instantes...</p>
            </div>
          )}

          {/* PIX Gerado */}
          {pixData && paymentStatus === 'pending' && (
            <div className="space-y-6">
              {/* Timer */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-2">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">
                  Tempo restante: {formatTimeLeft(timeLeft)}
                </p>
              </div>

              {/* Valor */}
              <div className="text-center bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Valor a pagar:</p>
                <p className="text-2xl font-bold text-gray-900">
                  {orderTotal.toLocaleString('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                  })}
                </p>
              </div>

              {/* Instruções */}
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900 mb-2">
                  Escaneie o QR Code abaixo com o app do seu banco:
                </p>
              </div>

              {/* QR Code */}
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <img
                    src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                    alt="QR Code PIX"
                    className="w-48 h-48"
                  />
                </div>
              </div>

              {/* PIX Copia e Cola */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-900 text-center">
                  Ou use o PIX Copia e Cola:
                </p>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 break-all font-mono">
                    {pixData.qrCode}
                  </p>
                </div>
                <button
                  onClick={copyToClipboard}
                  className="w-full flex items-center justify-center space-x-2 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  <span>{copied ? 'Copiado para a área de transferência!' : 'Copiar código PIX'}</span>
                </button>
              </div>

              {/* Aviso */}
              <div className="text-center">
                <p className="text-xs text-gray-600">
                  Após o pagamento, a confirmação será automática nesta tela.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
