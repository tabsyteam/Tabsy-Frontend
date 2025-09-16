import { Metadata } from 'next'
import { Suspense } from 'react'
import { PaymentSuccessView } from '@/components/payment/PaymentSuccessView'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export const metadata: Metadata = {
  title: 'Payment Successful - Tabsy',
  description: 'Your payment was processed successfully',
}

export default function PaymentSuccessPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<LoadingSpinner />}>
        <PaymentSuccessView />
      </Suspense>
    </div>
  )
}