'use client'

import { ReactNode } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

interface StripeProviderProps {
  children: ReactNode
}

export function StripeProvider({ children }: StripeProviderProps) {
  const options = {
    // Customize the appearance of Elements
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: 'var(--primary)',
        colorBackground: 'var(--surface)',
        colorText: 'var(--content-primary)',
        colorDanger: 'var(--status-error)',
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
      rules: {
        '.Input': {
          backgroundColor: 'var(--background)',
          border: '1px solid var(--border-default)',
          boxShadow: 'none',
        },
        '.Input:focus': {
          border: '1px solid var(--primary)',
          boxShadow: '0 0 0 1px var(--primary)',
        },
        '.Input--invalid': {
          border: '1px solid var(--status-error)',
        },
        '.Label': {
          color: 'var(--content-secondary)',
          fontSize: '12px',
          fontWeight: '500',
        },
      },
    },
    loader: 'auto',
  }

  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    console.warn('Stripe publishable key is not configured. Payment functionality will not work.')
    return (
      <div className="bg-status-warning/10 border border-status-warning/20 rounded-lg p-4 m-4">
        <div className="text-status-warning">
          <strong>Stripe Configuration Missing:</strong> Please add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to your environment variables.
        </div>
        {children}
      </div>
    )
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  )
}

// Hook to check if Stripe is ready
export function useStripeReady() {
  const stripe = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')
  return {
    isReady: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    stripePromise: stripe,
  }
}