'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { TabsySplash } from '@/components/splash/TabsySplash'
import { TableSessionManager } from '@/components/table/TableSessionManager'
import { useApi } from '@/components/providers/api-provider'
import { toast } from 'sonner'

interface TableSessionInitializerProps {
  restaurantId: string
  tableId: string
}

interface TableInfo {
  restaurant: {
    id: string
    name: string
    logo?: string
    theme?: string
  }
  table: {
    id: string
    number: string
    qrCode: string
  }
  isActive: boolean
}


export function TableSessionInitializer({ restaurantId, tableId }: TableSessionInitializerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { api } = useApi()

  // Track if validation has been completed to prevent React Strict Mode duplicate execution
  const hasValidated = useRef(false)

  // Get QR code from URL parameters
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const qrCode = searchParams.get('qr')

  useEffect(() => {
    const validateTableAccess = async () => {
      // Prevent duplicate execution in React Strict Mode
      if (hasValidated.current) {
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // QR code is required for table access
        if (!qrCode) {
          throw new Error('QR code is required to access this table')
        }

        // First, check if we have cached QR access data from the QR processing page
        const cachedQRData = sessionStorage.getItem('tabsy-qr-access')
        if (cachedQRData) {
          try {
            const qrAccessData = JSON.parse(cachedQRData)

            // Validate that cached data matches current URL parameters
            if (qrAccessData.qrCode === qrCode &&
                qrAccessData.restaurant?.id === restaurantId &&
                qrAccessData.table?.id === tableId) {

              setTableInfo({
                restaurant: {
                  id: qrAccessData.restaurant.id,
                  name: qrAccessData.restaurant.name,
                  logo: qrAccessData.restaurant.logo || undefined,
                  theme: undefined
                },
                table: {
                  id: qrAccessData.table.id,
                  number: qrAccessData.table.number,
                  qrCode: qrAccessData.table.qrCode || qrCode
                },
                isActive: true // Assume active if we got here from QR processing
              })

              // Mark as validated to prevent React Strict Mode duplicate execution
              hasValidated.current = true

              // Clean up cached data after successful use to prevent stale data issues
              sessionStorage.removeItem('tabsy-qr-access')

              setIsLoading(false)
              return // Skip API call since we have valid cached data
            }
          } catch (parseError) {
            // Failed to parse cached data, fall back to API validation
          }
        }

        // Fallback to API validation if no cached data or it doesn't match
        const tableInfoResponse = await api.qr.getTableInfo(qrCode)

        if (!tableInfoResponse.success || !tableInfoResponse.data) {
          throw new Error('Invalid QR code or table not found')
        }

        const tableData = tableInfoResponse.data

        // Backend returns: Table object with nested restaurant property
        if (!tableData.id || !tableData.restaurant) {
          throw new Error('Invalid table data structure from API')
        }

        const table = tableData
        const restaurant = tableData.restaurant

        // Validate that QR data matches the URL parameters
        if (restaurant.id !== restaurantId) {
          throw new Error('QR code does not match this restaurant')
        }
        if (table.id !== tableId) {
          throw new Error('QR code does not match this table')
        }

        setTableInfo({
          restaurant: {
            id: restaurant.id,
            name: restaurant.name,
            logo: restaurant.logo || undefined,
            theme: undefined
          },
          table: {
            id: table.id,
            number: table.number || table.tableNumber,
            qrCode: table.qrCode || qrCode
          },
          isActive: tableData.isActive
        })

        // Mark as validated to prevent React Strict Mode duplicate execution
        hasValidated.current = true

        // Clean up cached data after successful validation
        sessionStorage.removeItem('tabsy-qr-access')

      } catch (error: any) {
        // Mark as validated to prevent React Strict Mode duplicate execution even on error
        hasValidated.current = true

        // Clean up cached data on error to prevent stale data issues
        sessionStorage.removeItem('tabsy-qr-access')

        let errorMessage = 'Failed to connect to your table. Please try scanning the QR code again.'

        if (error?.response?.status === 404) {
          errorMessage = 'This table was not found. Please check with restaurant staff.'
        } else if (error?.response?.status === 403) {
          errorMessage = 'This table is not available for ordering at the moment.'
        } else if (error?.message?.includes('QR code')) {
          errorMessage = error.message
        }

        setError(errorMessage)

        // Show error toast with option to go back to scanner
        toast.error('Connection Failed', {
          description: errorMessage,
          action: {
            label: 'Scan QR Code',
            onClick: () => router.push('/')
          }
        })
      } finally {
        setIsLoading(false)
      }
    }

    validateTableAccess()
    // Remove 'api' from dependencies to prevent re-execution when api object changes
    // The api object is stable from ApiProvider and doesn't need to trigger re-runs
    // We already have hasValidated.current guard for additional safety
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, tableId, qrCode, router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-16 h-16 mx-auto bg-status-error-light rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-status-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>

          <div>
            <h1 className="text-xl font-semibold text-content-primary mb-2">
              Unable to Connect
            </h1>
            <p className="text-content-secondary">
              {error}
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.push('/')}
              className="w-full bg-primary hover:bg-primary-hover text-primary-foreground font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Scan QR Code
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full border border-default hover:bg-interactive-hover font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <div>
            <h2 className="text-xl font-semibold text-content-primary">
              Connecting to your table...
            </h2>
            <p className="text-content-secondary mt-2">
              Please wait while we set up your dining experience
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (tableInfo) {
    return (
      <TableSessionManager
        restaurantId={restaurantId}
        tableId={tableId}
      >
        <TabsySplash
          restaurant={tableInfo.restaurant}
          table={tableInfo.table}
        />
      </TableSessionManager>
    )
  }

  return null
}