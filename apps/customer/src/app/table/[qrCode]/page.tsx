'use client'

import { useEffect, use, useState } from 'react'
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

  useEffect(() => {
    const processQRCode = async () => {
      try {
        setIsProcessing(true)


        // Get table info via QR access API (public endpoint)
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
            number: table.tableNumber || table.number,
            qrCode: table.qrCode
          }
        }

        sessionStorage.setItem('tabsy-qr-access', JSON.stringify(qrAccessData))

        // Create guest session for this QR access
        const restaurantId = searchParams.get('r') || restaurant.id
        const tableId = searchParams.get('t') || table.id

        try {
          const sessionResponse = await api.qr.createGuestSession({
            qrCode,
            tableId,
            restaurantId
          })

          if (sessionResponse.success && sessionResponse.data) {
            // Store guest session in API client
            api.setGuestSession(sessionResponse.data.sessionId)

            // Store tableSessionId for TableSessionManager to access
            if (sessionResponse.data.tableSessionId) {
              sessionStorage.setItem('tabsy-table-session-id', sessionResponse.data.tableSessionId)
            }

            // Store session in sessionStorage for persistence
            sessionStorage.setItem(`guestSession-${tableId}`, sessionResponse.data.sessionId)
          }
        } catch (sessionError) {
          // Session creation failed, continue with redirect anyway
        }

        // Add a small delay to ensure all storage operations complete
        await new Promise(resolve => setTimeout(resolve, 100))

        // Redirect to the actual restaurant/table route with QR context
        router.replace(`/r/${restaurant.id}/t/${table.id}?qr=${qrCode}`)

      } catch (error: any) {

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

        // Redirect to home with error after showing toast
        setTimeout(() => {
          router.replace('/?error=invalid-qr-code')
        }, 2000)
      } finally {
        setIsProcessing(false)
      }
    }

    processQRCode()
  }, [qrCode, searchParams, router, api])

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