import { Metadata } from 'next'
import { Suspense } from 'react'
import { PaymentHistoryView } from '@/components/payment/PaymentHistoryView'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export const metadata: Metadata = {
  title: 'Payment History - Tabsy',
  description: 'View your payment history and download receipts',
}

export default function PaymentHistoryPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<LoadingSpinner />}>
        <PaymentHistoryView />
      </Suspense>
    </div>
  )
}