import { Metadata } from 'next'
import { Suspense } from 'react'
import { OrdersView } from '@/components/order/OrdersView'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export const metadata: Metadata = {
  title: 'Orders - Tabsy',
  description: 'View your order history and track current orders',
}

export default function OrdersPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<LoadingSpinner />}>
        <OrdersView />
      </Suspense>
    </div>
  )
}