'use client'

import { useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface QRCodePageProps {
  params: Promise<{
    qrCode: string
  }>
}

export default function QRCodePage({ params }: QRCodePageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { qrCode } = use(params)

  useEffect(() => {
    // Extract restaurant ID and table ID from query parameters
    const restaurantId = searchParams.get('r')
    const tableId = searchParams.get('t')

    if (restaurantId && tableId) {
      // Redirect to the actual restaurant/table route
      router.replace(`/r/${restaurantId}/t/${tableId}`)
    } else {
      // If missing parameters, redirect to home with error
      console.error('Missing restaurant ID or table ID in QR code URL')
      router.replace('/?error=invalid-qr-code')
    }
  }, [qrCode, searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-content-secondary">Processing QR code...</p>
      </div>
    </div>
  )
}