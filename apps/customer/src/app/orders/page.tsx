import { Metadata } from 'next'
import { Suspense } from 'react'
import { OrdersView } from '@/components/order/OrdersView'
import { TabsyLoader } from '@/components/ui/TabsyLoader'

export const metadata: Metadata = {
  title: 'Orders - Tabsy',
  description: 'View your order history and track current orders',
}

export default function OrdersPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <TabsyLoader message="Loading Orders" size="lg" />
        </div>
      }>
        <OrdersView />
      </Suspense>
    </div>
  )
}