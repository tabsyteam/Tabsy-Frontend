import { Metadata } from 'next'
import { Suspense } from 'react'
import { SharedCartWrapper } from '@/components/table/SharedCartWrapper'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export const metadata: Metadata = {
  title: 'Shared Cart - Tabsy',
  description: 'Collaborate on your table order',
}

export default function SharedCartPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<LoadingSpinner />}>
        <SharedCartWrapper />
      </Suspense>
    </div>
  )
}