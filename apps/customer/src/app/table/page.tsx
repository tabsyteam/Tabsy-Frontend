import { Metadata } from 'next'
import { Suspense } from 'react'
import { TableSessionView } from '@/components/table/TableSessionView'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export const metadata: Metadata = {
  title: 'Table Info - Tabsy',
  description: 'View your table session information',
}

export default function TablePage(): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<LoadingSpinner />}>
        <TableSessionView />
      </Suspense>
    </div>
  )
}