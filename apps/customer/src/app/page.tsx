import { Metadata } from 'next'
import { Suspense } from 'react'
import { WelcomeScreen } from '@/components/welcome/WelcomeScreen'
import { QRScanner } from '@/components/qr/QRScanner'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export const metadata: Metadata = {
  title: 'Welcome to Tabsy',
  description: 'Scan QR code to start ordering',
}

export default function HomePage(): JSX.Element {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="container mx-auto px-4 py-8 safe-top safe-bottom">
        <Suspense fallback={<LoadingSpinner />}>
          <WelcomeScreen />
        </Suspense>
        
        <div className="mt-8">
          <Suspense fallback={<LoadingSpinner />}>
            <QRScanner />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
