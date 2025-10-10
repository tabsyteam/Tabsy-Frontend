import { Metadata } from 'next'
import { Suspense } from 'react'
import { TableBillWrapper } from '@/components/table/TableBillWrapper'
import { TabsyLoader } from '@/components/ui/TabsyLoader'

export const metadata: Metadata = {
  title: 'Table Bill - Tabsy',
  description: 'View your table bill and make payments',
}

export default function TableBillPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <TabsyLoader message="Loading Bill" size="lg" />
        </div>
      }>
        <TableBillWrapper />
      </Suspense>
    </div>
  )
}