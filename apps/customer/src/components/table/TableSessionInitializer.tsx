'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { TabsySplash } from '@/components/splash/TabsySplash'
import { TableSessionManager } from '@/components/table/TableSessionManager'
import { useApi } from '@/components/providers/api-provider'
import { toast } from 'sonner'
import { useTableInfo } from '@/hooks/useTableInfo'

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

  // ✅ NEW: Use React Query hook for QR validation (prevents duplicate API calls)
  const {
    data: tableInfoData,
    isLoading,
    error: fetchError
  } = useTableInfo({
    qrCode,
    enabled: !!qrCode
  })

  // Convert to legacy format for compatibility
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Update state when React Query data changes
  useEffect(() => {
    if (fetchError) {
      const errorMessage = fetchError.message || 'Failed to connect to your table. Please try scanning the QR code again.'
      setError(errorMessage)

      toast.error('Connection Failed', {
        description: errorMessage,
        action: {
          label: 'Scan QR Code',
          onClick: () => router.push('/')
        }
      })
    } else if (tableInfoData) {
      // Validate that QR data matches the URL parameters
      if (tableInfoData.restaurant.id !== restaurantId) {
        setError('QR code does not match this restaurant')
        return
      }
      if (tableInfoData.table.id !== tableId) {
        setError('QR code does not match this table')
        return
      }

      setTableInfo({
        restaurant: {
          id: tableInfoData.restaurant.id,
          name: tableInfoData.restaurant.name,
          logo: tableInfoData.restaurant.logo || undefined,
          theme: undefined
        },
        table: {
          id: tableInfoData.table.id,
          tableNumber: tableInfoData.table.tableNumber,
          qrCode: (tableInfoData.table as any).qrCode || qrCode || ''
        },
        isActive: tableInfoData.isActive
      })
    }
  }, [fetchError, tableInfoData, restaurantId, tableId, qrCode, router])

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