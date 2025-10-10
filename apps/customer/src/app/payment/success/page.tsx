import { Metadata } from 'next'
import { Suspense } from 'react'
import { PaymentSuccessView } from '@/components/payment/PaymentSuccessView'
import { TabsyLoader } from '@/components/ui/TabsyLoader'

export const metadata: Metadata = {
  title: 'Payment Successful - Tabsy',
  description: 'Your payment was processed successfully',
}

export default function PaymentSuccessPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <TabsyLoader message="Loading Payment Confirmation" size="lg" />
        </div>
      }>
        <PaymentSuccessView />
      </Suspense>
    </div>
  )
}