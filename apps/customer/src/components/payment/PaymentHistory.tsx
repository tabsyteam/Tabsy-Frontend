'use client'

import { createLogger } from '@/lib/logger'

const log = createLogger('PaymentHistory')

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import {
  ReceiptText,
  Download,
  CreditCard,
  Smartphone,
  Banknote,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw,
  Eye
} from 'lucide-react'
import { Button } from '@tabsy/ui-components'
import { toast } from 'sonner'
import { TabsyAPI } from '@tabsy/api-client'
import { SessionManager } from '@/lib/session'
import { PaymentMethod, PaymentStatus } from '@tabsy/shared-types'
import type { Payment } from '@tabsy/shared-types'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useRestaurantOptional } from '@/contexts/RestaurantContext'
import { formatPrice as formatPriceUtil, type CurrencyCode } from '@tabsy/shared-utils/formatting/currency'

interface PaymentHistoryProps {
  tableSessionId?: string
  orderId?: string
  api: TabsyAPI
}

export function PaymentHistory({ tableSessionId, orderId, api }: PaymentHistoryProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const restaurantContext = useRestaurantOptional()
  const currency = (restaurantContext?.currency as CurrencyCode) || 'USD'

  // Use shared utility for consistent formatting
  const formatPrice = (price: number) => formatPriceUtil(price, currency)

  useEffect(() => {
    loadPaymentHistory()
  }, [tableSessionId, orderId])

  const loadPaymentHistory = async () => {
    try {
      setIsLoading(true)
      setError(null)

      let response
      if (orderId) {
        // Load payments for a specific order
        response = await api.payment.getByOrder(orderId)
      } else if (tableSessionId) {
        // Load payments for table session
        // Note: This might need a new API endpoint for table session payments
        const session = SessionManager.getDiningSession()
        if (session?.restaurantId) {
          response = await api.payment.getByRestaurant(session.restaurantId)
          // Filter by table session if needed
        }
      }

      if (response?.success && response.data) {
        setPayments(Array.isArray(response.data) ? response.data : [response.data])
      } else {
        setPayments([])
      }
    } catch (err: any) {
      log.error('[PaymentHistory] Error loading payments:', err)
      setError('Failed to load payment history')
    } finally {
      setIsLoading(false)
    }
  }

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case PaymentMethod.CREDIT_CARD:
      case PaymentMethod.DEBIT_CARD:
        return <CreditCard className="w-4 h-4" />
      case PaymentMethod.MOBILE_PAYMENT:
        return <Smartphone className="w-4 h-4" />
      case PaymentMethod.CASH:
        return <Banknote className="w-4 h-4" />
      default:
        return <CreditCard className="w-4 h-4" />
    }
  }

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    switch (method) {
      case PaymentMethod.CREDIT_CARD:
        return 'Credit Card'
      case PaymentMethod.DEBIT_CARD:
        return 'Debit Card'
      case PaymentMethod.MOBILE_PAYMENT:
        return 'Mobile Payment'
      case PaymentMethod.CASH:
        return 'Cash'
      default:
        return 'Unknown'
    }
  }

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-status-success" />
      case 'PENDING':
      case 'PROCESSING':
        return <Clock className="w-4 h-4 text-status-warning" />
      case 'FAILED':
      case 'CANCELLED':
        return <XCircle className="w-4 h-4 text-status-error" />
      case 'REFUNDED':
      case 'PARTIALLY_REFUNDED':
        return <RefreshCw className="w-4 h-4 text-status-info" />
      default:
        return <AlertCircle className="w-4 h-4 text-content-tertiary" />
    }
  }

  const getStatusLabel = (status: PaymentStatus) => {
    switch (status) {
      case 'COMPLETED':
        return 'Completed'
      case 'PENDING':
        return 'Pending'
      case 'PROCESSING':
        return 'Processing'
      case 'FAILED':
        return 'Failed'
      case 'CANCELLED':
        return 'Cancelled'
      case 'REFUNDED':
        return 'Refunded'
      case 'PARTIALLY_REFUNDED':
        return 'Partially Refunded'
      default:
        return status
    }
  }

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-status-success'
      case 'PENDING':
      case 'PROCESSING':
        return 'text-status-warning'
      case 'FAILED':
      case 'CANCELLED':
        return 'text-status-error'
      case 'REFUNDED':
      case 'PARTIALLY_REFUNDED':
        return 'text-status-info'
      default:
        return 'text-content-secondary'
    }
  }

  const handleViewReceipt = async (paymentId: string) => {
    try {
      const response = await api.payment.getReceipt(paymentId)
      if (response.success && response.data) {
        // Open receipt in new window or show modal
        if (response.data.receiptUrl) {
          window.open(response.data.receiptUrl, '_blank')
        } else {
          toast.info('Receipt is being generated...')
        }
      } else {
        toast.error('Receipt not available')
      }
    } catch (error) {
      log.error('Error viewing receipt:', error)
      toast.error('Failed to load receipt')
    }
  }

  const handleDownloadReceipt = async (paymentId: string) => {
    try {
      const response = await api.payment.getReceipt(paymentId)
      if (response.success && response.data?.receiptUrl) {
        // Create download link
        const link = document.createElement('a')
        link.href = response.data.receiptUrl
        link.download = `receipt-${paymentId}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success('Receipt downloaded')
      } else {
        toast.error('Receipt not available for download')
      }
    } catch (error) {
      log.error('Error downloading receipt:', error)
      toast.error('Failed to download receipt')
    }
  }

  if (isLoading) {
    return (
      <div className="bg-surface rounded-xl border p-6">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="md" centered={false} />
          <span className="ml-3 text-content-secondary">Loading payment history...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-surface rounded-xl border p-6">
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-status-error mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-content-primary mb-2">
            Error Loading Payments
          </h3>
          <p className="text-content-secondary mb-4">{error}</p>
          <Button onClick={loadPaymentHistory} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (payments.length === 0) {
    return (
      <div className="bg-surface rounded-xl border p-6">
        <div className="text-center py-8">
          <ReceiptText className="w-12 h-12 text-content-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-content-primary mb-2">
            No Payment History
          </h3>
          <p className="text-content-secondary">
            {tableSessionId
              ? 'No payments have been made for this table session yet.'
              : 'No payment history available.'
            }
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface rounded-xl border">
      <div className="p-6 border-b border-border-secondary">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-content-primary flex items-center space-x-2">
            <ReceiptText className="w-5 h-5" />
            <span>Payment History</span>
          </h3>
          <Button
            onClick={loadPaymentHistory}
            variant="ghost"
            size="sm"
            className="flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      <div className="divide-y divide-border-secondary">
        {payments.map((payment) => (
          <div key={payment.id} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {getPaymentMethodIcon(payment.paymentMethod)}
                <div>
                  <div className="font-medium text-content-primary">
                    {formatPrice(payment.totalAmount)}
                  </div>
                  <div className="text-sm text-content-secondary">
                    {getPaymentMethodLabel(payment.paymentMethod)}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {getStatusIcon(payment.status)}
                <span className={`text-sm font-medium ${getStatusColor(payment.status)}`}>
                  {getStatusLabel(payment.status)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-xs text-content-secondary">Date & Time</div>
                <div className="text-sm text-content-primary">
                  {format(new Date(payment.createdAt), 'MMM dd, yyyy • h:mm a')}
                </div>
              </div>

              {payment.transactionId && (
                <div>
                  <div className="text-xs text-content-secondary">Transaction ID</div>
                  <div className="text-sm text-content-primary font-mono">
                    {payment.transactionId.slice(-8).toUpperCase()}
                  </div>
                </div>
              )}
            </div>

            {payment.tipAmount > 0 && (
              <div className="flex justify-between text-sm mb-4">
                <span className="text-content-secondary">Tip included:</span>
                <span className="text-content-primary">{formatPrice(payment.tipAmount)}</span>
              </div>
            )}

            {payment.status === 'COMPLETED' && (
              <div className="flex space-x-2">
                <Button
                  onClick={() => handleViewReceipt(payment.id)}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Eye className="w-3 h-3" />
                  <span>View Receipt</span>
                </Button>

                <Button
                  onClick={() => handleDownloadReceipt(payment.id)}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Download className="w-3 h-3" />
                  <span>Download</span>
                </Button>
              </div>
            )}

            {payment.status === 'FAILED' && payment.failureReason && (
              <div className="mt-4 p-3 bg-status-error/10 border border-status-error/20 rounded-lg">
                <div className="text-sm text-status-error">
                  <strong>Failure reason:</strong> {payment.failureReason}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}