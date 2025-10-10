import { Metadata } from 'next'
import { Suspense } from 'react'
import { PaymentView } from '@/components/payment/PaymentView'
import { TabsyLoader } from '@/components/ui/TabsyLoader'

export const metadata: Metadata = {
  title: 'Payment - Tabsy',
  description: 'Complete your payment securely',
}

export default function PaymentPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <TabsyLoader message="Loading Payment" size="lg" />
        </div>
      }>
        <PaymentView />
      </Suspense>
    </div>
  )
}