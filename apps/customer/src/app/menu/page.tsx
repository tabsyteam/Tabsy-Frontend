import { Metadata } from 'next'
import { Suspense } from 'react'
import { MenuView } from '@/components/menu/MenuView'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export const metadata: Metadata = {
  title: 'Menu - Tabsy',
  description: 'Browse menu and place your order',
}

export default function MenuPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<LoadingSpinner />}>
        <MenuView />
      </Suspense>
    </div>
  )
}