import { Metadata } from 'next'
import { Suspense } from 'react'
import { SearchView } from '@/components/search/SearchView'
import { TabsyLoader } from '@/components/ui/TabsyLoader'

export const metadata: Metadata = {
  title: 'Search - Tabsy',
  description: 'Search for delicious food items',
}

export default function SearchPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <TabsyLoader message="Loading Search" size="lg" />
        </div>
      }>
        <SearchView />
      </Suspense>
    </div>
  )
}