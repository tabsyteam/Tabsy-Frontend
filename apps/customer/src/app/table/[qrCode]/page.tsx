'use client'

import { useEffect, use, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { TabsyLoader } from '@/components/ui/TabsyLoader'
import { useApi } from '@/components/providers/api-provider'
import { toast } from 'sonner'

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
  const { api } = useApi()

  // Track if QR code has been processed to prevent React Strict Mode duplicate execution
  const hasProcessed = useRef(false)
  const mountCount = useRef(0)

  // Track component lifecycle
  useEffect(() => {
    mountCount.current += 1
    console.log(`[QR Page] 🎬 Component mounted/re-rendered (mount #${mountCount.current})`, {
      qrCode,
      hasProcessedFlag: hasProcessed.current
    })

    return () => {
      console.log(`[QR Page] 🔚 Component will unmount (was mount #${mountCount.current})`)
    }
  }, [qrCode])

  useEffect(() => {
    const processQRCode = async () => {
      // Prevent duplicate execution in React Strict Mode or on re-renders
      // CRITICAL: Check and set flag atomically BEFORE any async operations
      if (hasProcessed.current) {
        console.log('[QR Page] ⚠️ DUPLICATE CALL BLOCKED - Already processed, skipping duplicate execution')
        return
      }

      // Mark as processed IMMEDIATELY before any other operations (even setState)
      // This prevents race condition where multiple calls pass the check before flag is set
      hasProcessed.current = true
      console.log('[QR Page] ✅ PROCESSING QR CODE - First and only execution', { qrCode, timestamp: new Date().toISOString() })

      try {
        setIsProcessing(true)

        // Get table info via QR access API (public endpoint)
        console.log('[QR Page] 📡 Fetching table info for QR:', qrCode)
        const tableInfoResponse = await api.qr.getTableInfo(qrCode)

        if (!tableInfoResponse.success || !tableInfoResponse.data) {
          throw new Error(tableInfoResponse.error || 'Invalid QR code')
        }

        // Backend returns table with nested restaurant - handle both formats
        const tableData = tableInfoResponse.data
        let table, restaurant

        if (tableData.table && tableData.restaurant) {
          // Expected format: {table, restaurant}
          table = tableData.table
          restaurant = tableData.restaurant
        } else if (tableData.restaurant) {
          // Actual backend format: table with nested restaurant
          table = tableData
          restaurant = tableData.restaurant
        } else {
          throw new Error('Invalid table data format received')
        }


        // Store QR access info for the session
        const qrAccessData = {
          qrCode,
          restaurant: {
            id: restaurant.id,
            name: restaurant.name,
            logo: restaurant.logo
          },
          table: {
            id: table.id,
            tableNumber: table.tableNumber,
            qrCode: table.qrCode
          }
        }

        sessionStorage.setItem('tabsy-qr-access', JSON.stringify(qrAccessData))

        // Get restaurant/table IDs for redirect
        const restaurantId = searchParams.get('r') || restaurant.id
        const tableId = searchParams.get('t') || table.id

        console.log('[QR Page] ✅ QR validated successfully, redirecting to table view', {
          restaurantId,
          tableId,
          qrCode
        })

        // NOTE: Session creation is handled by TableSessionManager
        // We just validate QR and redirect - this prevents duplicate session creation

        // Add a small delay to ensure all storage operations complete
        await new Promise(resolve => setTimeout(resolve, 100))

        // Redirect to the actual restaurant/table route with QR context
        router.replace(`/r/${restaurant.id}/t/${table.id}?qr=${qrCode}`)

      } catch (error: any) {
        // Reset flag on error to allow retry
        hasProcessed.current = false

        let errorMessage = 'Invalid QR code. Please try scanning again.'

        if (error?.response?.status === 404) {
          errorMessage = 'This QR code was not found. Please check with restaurant staff.'
        } else if (error?.response?.status === 403) {
          errorMessage = 'This table is not available at the moment.'
        } else if (error?.message) {
          errorMessage = `Error: ${error.message}`
        }

        toast.error('QR Code Error', {
          description: errorMessage,
          action: {
            label: 'Go Home',
            onClick: () => router.push('/')
          }
        })
        console.error('[QRCodePage] Error processing QR code:', error)
        // Redirect to home with error after showing toast
        setTimeout(() => {
          router.replace('/?error=invalid-qr-code')
        }, 2000)
      } finally {
        setIsProcessing(false)
      }
    }

    processQRCode()
    // Remove 'api' from dependencies to prevent re-execution when api object changes
    // The api object is stable from ApiProvider and doesn't need to trigger re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
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