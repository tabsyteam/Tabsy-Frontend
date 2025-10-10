import { Metadata } from 'next'
import { Suspense } from 'react'
import { PaymentHistoryView } from '@/components/payment/PaymentHistoryView'
import { TabsyLoader } from '@/components/ui/TabsyLoader'

export const metadata: Metadata = {
  title: 'Payment History - Tabsy',
  description: 'View your payment history and download receipts',
}

export default function PaymentHistoryPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <TabsyLoader message="Loading Payment History" size="lg" />
        </div>
      }>
        <PaymentHistoryView />
      </Suspense>
    </div>
  )
}