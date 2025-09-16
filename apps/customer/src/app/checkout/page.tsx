import { Metadata } from 'next'
import { Suspense } from 'react'
import { CheckoutView } from '@/components/checkout/CheckoutView'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export const metadata: Metadata = {
  title: 'Checkout - Tabsy',
  description: 'Complete your order',
}

export default function CheckoutPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<LoadingSpinner />}>
        <CheckoutView />
      </Suspense>
    </div>
  )
}