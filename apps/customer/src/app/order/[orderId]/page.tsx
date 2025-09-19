import { Metadata } from 'next'
import { Suspense } from 'react'
import { OrderTrackingView } from '@/components/order/OrderTrackingView'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface OrderPageProps {
  params: {
    orderId: string
  }
  searchParams: { [key: string]: string | string[] | undefined }
}

export async function generateMetadata({ params }: OrderPageProps): Promise<Metadata> {
  const { orderId } = await params
  return {
    title: `Order ${orderId} - Tabsy`,
    description: 'Track your order in real-time',
  }
}

export default async function OrderPage({ params, searchParams }: OrderPageProps): Promise<JSX.Element> {
  const { orderId } = await params
  const resolvedSearchParams = await searchParams
  const restaurantId = resolvedSearchParams.restaurant as string
  const tableId = resolvedSearchParams.table as string

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<LoadingSpinner />}>
        <OrderTrackingView
          orderId={orderId}
          restaurantId={restaurantId}
          tableId={tableId}
        />
      </Suspense>
    </div>
  )
}