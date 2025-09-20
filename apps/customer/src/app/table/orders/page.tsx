import { Metadata } from 'next'
import { Suspense } from 'react'
import { OrderTrackingWrapper } from '@/components/table/OrderTrackingWrapper'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export const metadata: Metadata = {
  title: 'Track Orders - Tabsy',
  description: 'Track your table orders in real-time',
}

export default function OrderTrackingPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<LoadingSpinner />}>
        <OrderTrackingWrapper />
      </Suspense>
    </div>
  )
}