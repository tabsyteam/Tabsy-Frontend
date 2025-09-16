import { Metadata } from 'next'
import { Suspense } from 'react'
import { PaymentView } from '@/components/payment/PaymentView'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export const metadata: Metadata = {
  title: 'Payment - Tabsy',
  description: 'Complete your payment securely',
}

export default function PaymentPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<LoadingSpinner />}>
        <PaymentView />
      </Suspense>
    </div>
  )
}