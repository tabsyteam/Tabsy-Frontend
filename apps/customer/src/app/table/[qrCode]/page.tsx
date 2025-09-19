'use client'

import { useEffect, use, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { TabsyLoader } from '@/components/ui/TabsyLoader'

interface QRCodePageProps {
  params: Promise<{
    qrCode: string
  }>
}

export default function QRCodePage({ params }: QRCodePageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { qrCode } = use(params)
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    const processQRCode = async () => {
      // Set minimum loading duration for better UX
      const minLoadingDuration = 2500 // 2.5 seconds
      const startTime = Date.now()

      // Extract restaurant ID and table ID from query parameters
      const restaurantId = searchParams.get('r')
      const tableId = searchParams.get('t')

      // Wait for minimum duration to show the loading animation
      const elapsed = Date.now() - startTime
      const remainingTime = Math.max(0, minLoadingDuration - elapsed)

      setTimeout(() => {
        if (restaurantId && tableId) {
          // Redirect to the actual restaurant/table route
          router.replace(`/r/${restaurantId}/t/${tableId}`)
        } else {
          // If missing parameters, redirect to home with error
          console.error('Missing restaurant ID or table ID in QR code URL')
          router.replace('/?error=invalid-qr-code')
        }
        setIsProcessing(false)
      }, remainingTime)
    }

    processQRCode()
  }, [qrCode, searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <TabsyLoader
        message="Processing QR Code"
        size="lg"
        className="py-12"
      />
    </div>
  )
}