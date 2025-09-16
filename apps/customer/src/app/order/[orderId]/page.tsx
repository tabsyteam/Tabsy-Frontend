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
  return {
    title: `Order ${params.orderId} - Tabsy`,
    description: 'Track your order in real-time',
  }
}

export default function OrderPage({ params, searchParams }: OrderPageProps): JSX.Element {
  const { orderId } = params
  const restaurantId = searchParams.restaurant as string
  const tableId = searchParams.table as string

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