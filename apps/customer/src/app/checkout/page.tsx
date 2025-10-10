import { Metadata } from 'next'
import { Suspense } from 'react'
import { CheckoutView } from '@/components/checkout/CheckoutView'
import { TabsyLoader } from '@/components/ui/TabsyLoader'

export const metadata: Metadata = {
  title: 'Checkout - Tabsy',
  description: 'Complete your order',
}

export default function CheckoutPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <TabsyLoader message="Loading Checkout" size="lg" />
        </div>
      }>
        <CheckoutView />
      </Suspense>
    </div>
  )
}