'use client'

import { useState } from 'react'
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js'
import { Button } from '@tabsy/ui-components'
import { CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { StripeCardForm } from './StripeCardForm'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface PaymentFormProps {
  amount: number
  orderId?: string
  tableSessionId?: string
  onPaymentSuccess: (paymentIntentId: string) => void
  onPaymentError: (error: string) => void
  processing: boolean
  setProcessing: (processing: boolean) => void
  disabled?: boolean
  clientSecret?: string
}

export function PaymentForm({
  amount,
  orderId,
  tableSessionId,
  onPaymentSuccess,
  onPaymentError,
  processing,
  setProcessing,
  disabled = false,
  clientSecret
}: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [cardValid, setCardValid] = useState(false)
  const [cardError, setCardError] = useState<string | null>(null)

  const handlePayment = async () => {
    // Show loading state immediately for better UX
    setProcessing(true)

    try {
      // Validation checks with proper error handling
      if (!stripe || !elements || !clientSecret) {
        onPaymentError('Payment system not initialized. Please refresh and try again.')
        return
      }

      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        onPaymentError('Card information not found. Please refresh and try again.')
        return
      }

      if (!cardValid) {
        onPaymentError('Please enter valid card information.')
        return
      }

      // All validations passed, continue with payment processing

      // Confirm the payment with Stripe
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            // Add billing details here if needed
          },
        },
      })

      if (error) {
        console.error('Payment confirmation error:', error)
        onPaymentError(error.message || 'Payment failed. Please try again.')
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('Payment succeeded:', paymentIntent.id)
        onPaymentSuccess(paymentIntent.id)
      } else {
        onPaymentError('Payment was not completed. Please try again.')
      }
    } catch (error: any) {
      console.error('Payment processing error:', error)
      onPaymentError('An unexpected error occurred. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const handleCardValidityChange = (isValid: boolean) => {
    setCardValid(isValid)
  }

  const handleCardError = (error: string | null) => {
    setCardError(error)
  }

  return (
    <div className="space-y-4">
      {/* Card Form */}
      <StripeCardForm
        onValidityChange={handleCardValidityChange}
        onError={handleCardError}
        disabled={processing || disabled}
      />

      {/* Payment Button */}
      <Button
        onClick={handlePayment}
        size="lg"
        className="w-full"
        disabled={processing || disabled || !stripe || !elements || !clientSecret || !cardValid}
      >
        {processing ? (
          <div className="flex items-center space-x-2">
            <LoadingSpinner size="sm" color="white" centered={false} />
            <span>Processing Payment...</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <CreditCard className="w-4 h-4" />
            <span>Pay ${(amount / 100).toFixed(2)}</span>
          </div>
        )}
      </Button>

      {/* Status Messages */}
      {!stripe || !elements ? (
        <div className="text-center text-sm text-content-secondary">
          Loading payment form...
        </div>
      ) : !clientSecret ? (
        <div className="text-center text-sm text-status-warning">
          Payment intent not created. Please contact support.
        </div>
      ) : cardError ? (
        <div className="text-center text-sm text-status-error">
          {cardError}
        </div>
      ) : cardValid ? (
        <div className="text-center text-sm text-status-success">
          Ready to process payment
        </div>
      ) : null}
    </div>
  )
}