import { Metadata } from 'next'
import { Suspense } from 'react'
import { CartView } from '@/components/cart/CartView'
import { TabsyLoader } from '@/components/ui/TabsyLoader'

export const metadata: Metadata = {
  title: 'Cart - Tabsy',
  description: 'Review your order before checkout',
}

export default function CartPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <TabsyLoader message="Loading Cart" size="lg" />
        </div>
      }>
        <CartView />
      </Suspense>
    </div>
  )
}