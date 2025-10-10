import { Metadata } from 'next'
import { Suspense } from 'react'
import { MenuView } from '@/components/menu/MenuView'
import { TabsyLoader } from '@/components/ui/TabsyLoader'

export const metadata: Metadata = {
  title: 'Menu - Tabsy',
  description: 'Browse menu and place your order',
}

export default function MenuPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <TabsyLoader message="Loading Menu" size="lg" />
        </div>
      }>
        <MenuView />
      </Suspense>
    </div>
  )
}