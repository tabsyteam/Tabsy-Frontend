'use client'

import { useState, useEffect } from 'react'
import { Button } from '@tabsy/ui-components'
import {
  X,
  CreditCard,
  Calendar,
  User,
  MapPin,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
  Receipt,
  BanknoteArrowDownIcon as Refund
} from 'lucide-react'
import { tabsyClient } from '@tabsy/api-client'
import { format } from 'date-fns'
import type { Payment, PaymentStatus, PaymentMethod } from '@tabsy/shared-types'

interface PaymentDetailsModalProps {
  paymentId: string
  isOpen: boolean
  onClose: () => void
  onRefund?: (paymentId: string, amount?: number) => void
}

export function PaymentDetailsModal({
  paymentId,
  isOpen,
  onClose,
  onRefund
}: PaymentDetailsModalProps) {
  const [payment, setPayment] = useState<Payment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefunding, setIsRefunding] = useState(false)

  useEffect(() => {
    if (isOpen && paymentId) {
      loadPaymentDetails()
    }
  }, [isOpen, paymentId])

  const loadPaymentDetails = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await tabsyClient.payment.getById(paymentId)

      if (response.success && response.data) {
        setPayment(response.data)
      } else {
        throw new Error(response.error?.message || 'Failed to load payment details')
      }
    } catch (error: any) {
      console.error('Error loading payment details:', error)
      setError(error.message || 'Failed to load payment details')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefund = async () => {
    if (!payment || !onRefund) return

    try {
      setIsRefunding(true)
      await onRefund(payment.id)
      await loadPaymentDetails() // Reload to show updated status
    } catch (error) {
      console.error('Error processing refund:', error)
    } finally {
      setIsRefunding(false)
    }
  }

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-5 h-5 text-status-warning" />
      case 'PROCESSING':
        return <RefreshCw className="w-5 h-5 text-status-info animate-spin" />
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-status-success" />
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-status-error" />
      case 'CANCELLED':
        return <X className="w-5 h-5 text-content-tertiary" />
      case 'REFUNDED':
      case 'PARTIALLY_REFUNDED':
        return <Refund className="w-5 h-5 text-status-warning" />
      default:
        return <AlertCircle className="w-5 h-5 text-content-tertiary" />
    }
  }

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'PENDING':
        return 'bg-status-warning/10 text-status-warning border-status-warning/20'
      case 'PROCESSING':
        return 'bg-status-info/10 text-status-info border-status-info/20'
      case 'COMPLETED':
        return 'bg-status-success/10 text-status-success border-status-success/20'
      case 'FAILED':
        return 'bg-status-error/10 text-status-error border-status-error/20'
      case 'CANCELLED':
        return 'bg-surface-secondary text-content-secondary border-border-secondary'
      case 'REFUNDED':
      case 'PARTIALLY_REFUNDED':
        return 'bg-status-warning/10 text-status-warning border-status-warning/20'
      default:
        return 'bg-surface-secondary text-content-secondary'
    }
  }

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case PaymentMethod.CREDIT_CARD:
      case PaymentMethod.DEBIT_CARD:
        return <CreditCard className="w-4 h-4" />
      case PaymentMethod.MOBILE_PAYMENT:
        return <DollarSign className="w-4 h-4" />
      case PaymentMethod.CASH:
        return <DollarSign className="w-4 h-4" />
      default:
        return <CreditCard className="w-4 h-4" />
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-default">
          <h2 className="text-xl font-semibold text-content-primary">
            Payment Details
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-content-secondary" />
              <span className="ml-2 text-content-secondary">Loading payment details...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-status-error mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-content-primary mb-2">
                Error Loading Payment
              </h3>
              <p className="text-content-secondary mb-4">{error}</p>
              <Button onClick={loadPaymentDetails} variant="outline">
                Try Again
              </Button>
            </div>
          ) : payment ? (
            <div className="space-y-6">
              {/* Status and Amount */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(payment.status)}
                  <div>
                    <h3 className="text-lg font-semibold text-content-primary">
                      ${Number(payment.amount || 0).toFixed(2)}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(payment.status)}`}>
                      {payment.status}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-content-secondary">Payment ID</p>
                  <p className="font-mono text-xs text-content-tertiary">{payment.id.slice(-8)}</p>
                </div>
              </div>

              {/* Payment Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-content-secondary mb-2">Payment Method</h4>
                    <div className="flex items-center space-x-2">
                      {getPaymentMethodIcon(payment.method)}
                      <span className="text-content-primary">{payment.method}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-content-secondary mb-2">Order ID</h4>
                    <div className="flex items-center space-x-2">
                      <Receipt className="w-4 h-4 text-content-tertiary" />
                      <span className="font-mono text-sm text-content-primary">
                        {payment.orderId.slice(-8)}
                      </span>
                    </div>
                  </div>

                  {payment.transactionId && (
                    <div>
                      <h4 className="text-sm font-medium text-content-secondary mb-2">Transaction ID</h4>
                      <p className="font-mono text-xs text-content-tertiary">{payment.transactionId}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-content-secondary mb-2">Created</h4>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-content-tertiary" />
                      <span className="text-sm text-content-primary">
                        {format(new Date(payment.createdAt), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    <p className="text-xs text-content-secondary ml-6">
                      {format(new Date(payment.createdAt), 'h:mm a')}
                    </p>
                  </div>

                  {payment.completedAt && (
                    <div>
                      <h4 className="text-sm font-medium text-content-secondary mb-2">Completed</h4>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-status-success" />
                        <span className="text-sm text-content-primary">
                          {format(new Date(payment.completedAt), 'MMM dd, yyyy h:mm a')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Refund Information */}
              {payment.refunded && (
                <div className="bg-status-warning/5 border border-status-warning/20 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-status-warning mb-2">Refund Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Refund Amount:</span>
                      <span className="font-medium">${Number(payment.refundAmount || 0).toFixed(2)}</span>
                    </div>
                    {payment.refundReason && (
                      <div className="flex justify-between text-sm">
                        <span>Reason:</span>
                        <span>{payment.refundReason}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Failure Information */}
              {payment.status === 'FAILED' && payment.failureReason && (
                <div className="bg-status-error/5 border border-status-error/20 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-status-error mb-2">Failure Reason</h4>
                  <p className="text-sm text-content-secondary">{payment.failureReason}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-border-default">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>

                {payment.status === 'COMPLETED' && !payment.refunded && onRefund && (
                  <Button
                    variant="outline"
                    onClick={handleRefund}
                    disabled={isRefunding}
                    className="flex items-center space-x-2 text-status-warning border-status-warning hover:bg-status-warning/10"
                  >
                    <Refund className="w-4 h-4" />
                    <span>{isRefunding ? 'Processing...' : 'Issue Refund'}</span>
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}