'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function TestSessionPage() {
  const router = useRouter()
  const [status, setStatus] = useState<string>('Initializing test session...')

  useEffect(() => {
    // Security: Only allow access in development environment
    if (process.env.NODE_ENV === 'production') {
      console.warn('[TestSessionPage] Access denied in production')
      router.push('/')
      return
    }

    // Support URL params for flexibility: /test-session?restaurantId=xxx&tableId=yyy
    const params = new URLSearchParams(window.location.search)
    const testRestaurantId = params.get('restaurantId') || process.env.NEXT_PUBLIC_TEST_RESTAURANT_ID || 'test-restaurant-id'
    const testTableId = params.get('tableId') || process.env.NEXT_PUBLIC_TEST_TABLE_ID || 'table-2'

    console.log('[TestSession] Redirecting to QR flow:', { testRestaurantId, testTableId })
    setStatus('Redirecting to table session...')

    // Redirect to the QR flow which will properly initialize the session
    setTimeout(() => {
      router.push(`/r/${testRestaurantId}/t/${testTableId}`)
    }, 500)
  }, [router])

  // Don't render anything in production (double safety)
  if (process.env.NODE_ENV === 'production') {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <LoadingSpinner />
        <p className="text-lg text-content-primary">{status}</p>
        <div className="text-sm text-content-secondary max-w-md">
          <p>This page creates a test session for development purposes.</p>
          <p className="mt-2">You'll be redirected to the menu shortly.</p>
          <p className="mt-4 text-xs opacity-70">Development Only - Disabled in Production</p>
        </div>
      </div>
    </div>
  )
}