import { Metadata } from 'next'
import { Suspense } from 'react'
import { TableSessionView } from '@/components/table/TableSessionView'
import { TabsyLoader } from '@/components/ui/TabsyLoader'

export const metadata: Metadata = {
  title: 'Table Info - Tabsy',
  description: 'View your table session information',
}

export default function TablePage(): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <TabsyLoader message="Loading Table Info" size="lg" />
        </div>
      }>
        <TableSessionView />
      </Suspense>
    </div>
  )
}