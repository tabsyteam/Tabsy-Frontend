'use client'

import { useEffect, use, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { TabsyLoader } from '@/components/ui/TabsyLoader'
import { useApi } from '@/components/providers/api-provider'
import { queryKeys, queryConfigs } from '@/hooks/useQueryConfig'
import { toast } from 'sonner'
import { STORAGE_KEYS } from '@/constants/storage'

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
  const queryClient = useQueryClient()

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


        // ARCHITECTURE: React Query is source of truth, not sessionStorage
        // 1. Populate React Query cache with fetched data (primary state)
        queryClient.setQueryData(['restaurant', restaurant.id], restaurant)
        queryClient.setQueryData(['table', table.id], table)

        // 2. Store ONLY IDs in sessionStorage (for page refresh recovery)
        sessionStorage.setItem(STORAGE_KEYS.RESTAURANT_ID, restaurant.id)
        sessionStorage.setItem(STORAGE_KEYS.TABLE_ID, table.id)

        // CRITICAL: Store restaurant currency for fallback during loading
        // This prevents showing "$" (USD) flash before actual data loads
        const qrAccessData = {
          qrCode,
          restaurant: {
            id: restaurant.id,
            name: restaurant.name,
            logo: restaurant.logo,
            currency: restaurant.currency  // CRITICAL: Include currency for fallback
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

        // PERFORMANCE OPTIMIZATION: Prefetch menu data immediately
        // This makes the next page load feel instant!
        console.log('[QR Page] 🚀 Prefetching menu data for instant load...')
        try {
          await queryClient.prefetchQuery({
            queryKey: queryKeys.menu(restaurantId),
            queryFn: async () => {
              const response = await api.restaurants.getMenu(restaurantId)
              if (!response.success) throw new Error(response.error)
              return response.data
            },
            ...queryConfigs.semiStatic // Menu is semi-static, cache for 10 minutes
          })
          console.log('[QR Page] ✅ Menu prefetched successfully')
        } catch (prefetchError) {
          // Non-critical - if prefetch fails, the page will just fetch normally
          console.warn('[QR Page] ⚠️  Menu prefetch failed (non-critical):', prefetchError)
        }

        // NOTE: Session creation is handled by TableSessionManager
        // We just validate QR and redirect - this prevents duplicate session creation

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