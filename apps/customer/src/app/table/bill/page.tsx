import { Metadata } from 'next'
import { Suspense } from 'react'
import { TableBillWrapper } from '@/components/table/TableBillWrapper'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export const metadata: Metadata = {
  title: 'Table Bill - Tabsy',
  description: 'View your table bill and make payments',
}

export default function TableBillPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<LoadingSpinner />}>
        <TableBillWrapper />
      </Suspense>
    </div>
  )
}