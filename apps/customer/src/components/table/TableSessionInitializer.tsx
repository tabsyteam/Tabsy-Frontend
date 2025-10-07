'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { TabsySplash } from '@/components/splash/TabsySplash'
import { TableSessionManager } from '@/components/table/TableSessionManager'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Restaurant, Table } from '@tabsy/shared-types'

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
  const router = useRouter()
  const searchParams = useSearchParams()
  const qrCode = searchParams.get('qr')
  const queryClient = useQueryClient()

  // ✅ OPTIMIZED: Use cached data from QR page instead of re-fetching
  // The /table/[qrCode] page already fetched and cached this data
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load data from React Query cache (populated by QR page)
  useEffect(() => {
    try {
      // Get cached restaurant and table data (set by /table/[qrCode] page)
      const cachedRestaurant = queryClient.getQueryData<Restaurant>(['restaurant', restaurantId])
      const cachedTable = queryClient.getQueryData<Table>(['table', tableId])

      if (cachedRestaurant && cachedTable) {
        // Validate that cached data matches URL parameters
        if (cachedRestaurant.id !== restaurantId) {
          setError('Restaurant data mismatch. Please scan the QR code again.')
          setIsLoading(false)
          return
        }
        if (cachedTable.id !== tableId) {
          setError('Table data mismatch. Please scan the QR code again.')
          setIsLoading(false)
          return
        }

        // Use cached data - no API call needed!
        setTableInfo({
          restaurant: {
            id: cachedRestaurant.id,
            name: cachedRestaurant.name,
            logo: cachedRestaurant.logo || undefined,
            theme: undefined
          },
          table: {
            id: cachedTable.id,
            number: cachedTable.tableNumber,
            qrCode: cachedTable.qrCode || qrCode || ''
          },
          isActive: cachedTable.isActive ?? true
        })
        setIsLoading(false)
      } else {
        // Cache miss - this shouldn't happen in normal flow
        // User might have refreshed the page or navigated directly
        const errorMsg = 'Session data not found. Please scan the QR code again.'
        setError(errorMsg)
        setIsLoading(false)

        toast.error('Session Required', {
          description: errorMsg,
          action: {
            label: 'Scan QR Code',
            onClick: () => router.push('/')
          }
        })
      }
    } catch (err) {
      setError('Failed to load session data. Please try again.')
      setIsLoading(false)
    }
  }, [restaurantId, tableId, qrCode, queryClient, router])

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