import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ClientProviders } from './client-providers'
import { cn } from '@/lib/utils'
import SessionExpiryNotification from '@/components/session/SessionExpiryNotification'
import { FloatingUIManager } from '@/components/layout/FloatingUIManager'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: {
    default: 'Tabsy Customer',
    template: '%s | Tabsy Customer'
  },
  description: 'Order food seamlessly with QR code dining experience',
  keywords: ['restaurant', 'food', 'ordering', 'QR code', 'dining', 'mobile'],
  authors: [{ name: 'Tabsy Team' }],
  creator: 'Tabsy',
  publisher: 'Tabsy',
  manifest: '/manifest.json',
  icons: {
    icon: [
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      }
    ],
    apple: [
      {
        url: '/apple-icon.svg',
        type: 'image/svg+xml',
      }
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://customer.tabsy.app',
    title: 'Tabsy Customer - QR Code Dining',
    description: 'Order food seamlessly with QR code dining experience',
    siteName: 'Tabsy Customer',
    images: [
      {
        url: '/tabsy_logo.svg',
        width: 1215,
        height: 333,
        alt: 'Tabsy Logo',
      }
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Tabsy Customer',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3B82F6' }, // Primary blue
    { media: '(prefers-color-scheme: dark)', color: '#0F172A' },  // Dark slate background
  ],
  colorScheme: 'light dark',
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}): JSX.Element {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={cn(
        'min-h-screen bg-background font-sans antialiased'
      )}>
        <ClientProviders>
          <div className="relative flex min-h-screen flex-col">
            <SessionExpiryNotification />
            <FloatingUIManager />
            <main className="flex-1">
              {children}
            </main>
          </div>
        </ClientProviders>
      </body>
    </html>
  )
}
