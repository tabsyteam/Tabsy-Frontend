/**
 * Optimized table info hook using React Query
 * Prevents duplicate QR code validation calls
 */

import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/components/providers/api-provider'
import { queryKeys, queryConfigs } from './useQueryConfig'
import type { Restaurant, Table } from '@tabsy/shared-types'

interface TableInfoData {
  restaurant: Restaurant
  table: Table
  isActive: boolean
}

interface UseTableInfoOptions {
  qrCode: string | null
  enabled?: boolean
}

export function useTableInfo({ qrCode, enabled = true }: UseTableInfoOptions) {
  const { api } = useApi()

  return useQuery({
    queryKey: qrCode ? queryKeys.tableInfo(qrCode) : ['tableInfo', 'null'],

    queryFn: async (): Promise<TableInfoData> => {
      if (!qrCode) {
        throw new Error('QR code is required')
      }

      console.log('[useTableInfo] Validating QR code:', qrCode)

      const response = await api.qr.getTableInfo(qrCode)

      if (!response.success || !response.data) {
        throw new Error('Invalid QR code or table not found')
      }

      const tableData = response.data

      if (!tableData.id || !tableData.restaurant) {
        throw new Error('Invalid table data structure from API')
      }

      console.log('[useTableInfo] QR code validated successfully:', {
        restaurantId: tableData.restaurant.id,
        tableId: tableData.id
      })

      return {
        restaurant: tableData.restaurant,
        table: tableData,
        isActive: tableData.isActive ?? true
      }
    },

    // Only fetch if we have qrCode and enabled
    enabled: enabled && !!qrCode,

    // Use static config - QR data doesn't change
    ...queryConfigs.static,

    // Never refetch QR data - it's immutable
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  })
}
