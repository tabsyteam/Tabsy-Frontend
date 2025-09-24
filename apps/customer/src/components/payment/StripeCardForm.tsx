'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, CreditCard } from 'lucide-react'
import { Button } from '@tabsy/ui-components'
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import type { StripeCardElementChangeEvent } from '@stripe/stripe-js'

interface StripeCardFormProps {
  onValidityChange?: (isValid: boolean) => void
  onError?: (error: string | null) => void
  disabled?: boolean
  onCardReady?: () => void
}

export function StripeCardForm({ onValidityChange, onError, disabled = false, onCardReady }: StripeCardFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isValid, setIsValid] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showBillingAddress, setShowBillingAddress] = useState(false)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (stripe && elements && isReady) {
      onCardReady?.()
    }
  }, [stripe, elements, isReady, onCardReady])

  const handleCardChange = (event: StripeCardElementChangeEvent) => {
    const { error, complete } = event

    setIsValid(complete)
    onValidityChange?.(complete)

    if (error) {
      setError(error.message)
      onError?.(error.message)
    } else {
      setError(null)
      onError?.(null)
    }
  }

  const handleCardReady = () => {
    setIsReady(true)
  }

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: 'var(--content-primary)',
        backgroundColor: 'transparent',
        fontFamily: 'system-ui, sans-serif',
        '::placeholder': {
          color: 'var(--content-tertiary)',
        },
        iconColor: 'var(--content-secondary)',
      },
      invalid: {
        color: 'var(--status-error)',
        iconColor: 'var(--status-error)',
      },
    },
    hidePostalCode: false,
    disabled: disabled,
  }

  return (
    <div className="space-y-4">
      {/* Card Element Container */}
      <div className="border border-default rounded-lg p-4 bg-background">
        <h4 className="text-sm font-medium text-content-primary mb-3 flex items-center space-x-2">
          <CreditCard className="w-4 h-4" />
          <span>Card Details</span>
        </h4>

        {/* Stripe Card Element */}
        <div className="space-y-3">
          <div className="relative">
            <label className="block text-xs text-content-secondary mb-1">Card Information</label>
            <div className="border border-default rounded p-3 bg-surface min-h-[40px] flex items-center">
              <div className="w-full">
                <CardElement
                  options={cardElementOptions}
                  onChange={handleCardChange}
                  onReady={handleCardReady}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Security Badge */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-content-tertiary">
            <CheckCircle className="w-3 h-3 text-status-success" />
            <span>Secured by Stripe</span>
          </div>
          {isValid && (
            <div className="flex items-center space-x-1 text-xs text-status-success">
              <CheckCircle className="w-3 h-3" />
              <span>Valid card</span>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-2 flex items-center space-x-2 text-xs text-status-error">
            <AlertCircle className="w-3 h-3" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Billing Address Toggle */}
      <div className="border border-default rounded-lg p-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-content-primary cursor-pointer">
            Add billing address
          </label>
          <input
            type="checkbox"
            checked={showBillingAddress}
            onChange={(e) => setShowBillingAddress(e.target.checked)}
            className="rounded border-default"
            disabled={disabled}
          />
        </div>

        {/* Billing Address Form */}
        {showBillingAddress && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-content-secondary mb-1">First Name</label>
                <input
                  type="text"
                  className="w-full p-2 border border-default rounded text-sm"
                  disabled={disabled}
                />
              </div>
              <div>
                <label className="block text-xs text-content-secondary mb-1">Last Name</label>
                <input
                  type="text"
                  className="w-full p-2 border border-default rounded text-sm"
                  disabled={disabled}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-content-secondary mb-1">Address</label>
              <input
                type="text"
                className="w-full p-2 border border-default rounded text-sm"
                disabled={disabled}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-content-secondary mb-1">City</label>
                <input
                  type="text"
                  className="w-full p-2 border border-default rounded text-sm"
                  disabled={disabled}
                />
              </div>
              <div>
                <label className="block text-xs text-content-secondary mb-1">State</label>
                <input
                  type="text"
                  className="w-full p-2 border border-default rounded text-sm"
                  disabled={disabled}
                />
              </div>
              <div>
                <label className="block text-xs text-content-secondary mb-1">ZIP</label>
                <input
                  type="text"
                  className="w-full p-2 border border-default rounded text-sm"
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stripe Integration Status */}
      {!stripe || !elements ? (
        <div className="bg-status-warning/10 border border-status-warning/20 rounded-lg p-3">
          <div className="text-xs text-status-warning">
            <strong>Loading Stripe...</strong> Please wait while we initialize the payment form.
          </div>
        </div>
      ) : (
        <div className="bg-status-success/10 border border-status-success/20 rounded-lg p-3">
          <div className="text-xs text-status-success">
            <strong>Stripe Ready:</strong> Your payment information is securely handled by Stripe.
          </div>
        </div>
      )}
    </div>
  )
}