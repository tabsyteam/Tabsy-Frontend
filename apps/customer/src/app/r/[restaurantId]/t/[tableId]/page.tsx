import { Metadata } from 'next'
import { Suspense } from 'react'
import { TableSessionInitializer } from '@/components/table/TableSessionInitializer'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface TablePageProps {
  params: Promise<{
    restaurantId: string
    tableId: string
  }>
  searchParams: { [key: string]: string | string[] | undefined }
}

export async function generateMetadata({ params }: TablePageProps): Promise<Metadata> {
  const { tableId } = await params
  return {
    title: `Table ${tableId} - Tabsy`,
    description: 'Welcome to your table! Browse our menu and start ordering.',
  }
}

export default async function TablePage({ params }: TablePageProps): Promise<JSX.Element> {
  const { restaurantId, tableId } = await params

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<LoadingSpinner />}>
        <TableSessionInitializer
          restaurantId={restaurantId}
          tableId={tableId}
        />
      </Suspense>
    </div>
  )
}