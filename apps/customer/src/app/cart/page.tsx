import { Metadata } from 'next'
import { Suspense } from 'react'
import { CartView } from '@/components/cart/CartView'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export const metadata: Metadata = {
  title: 'Cart - Tabsy',
  description: 'Review your order before checkout',
}

export default function CartPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<LoadingSpinner />}>
        <CartView />
      </Suspense>
    </div>
  )
}