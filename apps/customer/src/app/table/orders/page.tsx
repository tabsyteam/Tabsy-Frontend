import { Metadata } from 'next'
import { Suspense } from 'react'
import { OrderTrackingWrapper } from '@/components/table/OrderTrackingWrapper'
import { TabsyLoader } from '@/components/ui/TabsyLoader'

export const metadata: Metadata = {
  title: 'Track Orders - Tabsy',
  description: 'Track your table orders in real-time',
}

export default function OrderTrackingPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <TabsyLoader message="Loading Orders" size="lg" />
        </div>
      }>
        <OrderTrackingWrapper />
      </Suspense>
    </div>
  )
}