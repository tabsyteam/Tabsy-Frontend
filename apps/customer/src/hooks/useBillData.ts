/**
 * Optimized bill data hook using React Query
 * Prevents duplicate API calls through proper caching
 */

import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/components/providers/api-provider'
import { queryKeys, queryConfigs } from './useQueryConfig'
import { unifiedSessionStorage } from '@/lib/unifiedSessionStorage'
import type { TableSessionBill } from '@tabsy/shared-types'

interface UseBillDataOptions {
  tableSessionId?: string | null
  enabled?: boolean
}

interface BillData {
  hasBill: boolean
  billAmount: number
  remainingBalance: number
  isPaid: boolean
  bill: TableSessionBill | null
}

export function useBillData({ tableSessionId, enabled = true }: UseBillDataOptions) {
  const { api } = useApi()

  // If no tableSessionId provided, try to get from storage
  const effectiveTableSessionId = tableSessionId || unifiedSessionStorage.getSession()?.tableSessionId

  return useQuery({
    queryKey: effectiveTableSessionId ? queryKeys.bill(effectiveTableSessionId) : ['bill', 'null'],

    queryFn: async (): Promise<BillData> => {
      // ✅ FIXED: Throw error instead of returning empty data
      // This allows React Query to handle error state properly
      if (!effectiveTableSessionId) {
        throw new Error('No table session ID available')
      }

      console.log('[useBillData] Fetching bill for session:', effectiveTableSessionId)

      const response = await api.tableSession.getBill(effectiveTableSessionId)

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch bill')
      }

      const bill = response.data
      const remainingBalance = bill.summary?.remainingBalance || 0
      const totalAmount = bill.summary?.grandTotal || 0
      const isPaid = remainingBalance <= 0

      // Check if any order is COMPLETED (excluding CANCELLED orders)
      let hasCompletedOrder = false
      if (bill.billByRound) {
        for (const roundKey in bill.billByRound) {
          const round = bill.billByRound[roundKey]
          if (round.orders && Array.isArray(round.orders)) {
            // Filter out CANCELLED orders before checking status
            hasCompletedOrder = round.orders
              .filter((order: any) => order.status !== 'CANCELLED')
              .some((order: any) => order.status === 'COMPLETED')
            if (hasCompletedOrder) break
          }
        }
      }

      const shouldShowBadge = totalAmount > 0 && hasCompletedOrder

      console.log('[useBillData] Bill loaded:', {
        totalAmount,
        remainingBalance,
        isPaid,
        hasCompletedOrder,
        shouldShowBadge,
        billByRound: bill.billByRound,
        orderStatuses: Object.values(bill.billByRound || {}).flatMap((round: any) =>
          round.orders?.map((o: any) => ({ orderId: o.orderId, status: o.status })) || []
        )
      })

      return {
        hasBill: shouldShowBadge,
        billAmount: totalAmount,
        remainingBalance,
        isPaid,
        bill
      }
    },

    // Only fetch if enabled and we have a session ID
    enabled: enabled && !!effectiveTableSessionId,

    // Real-time config - allow frequent updates for bill data
    ...queryConfigs.realtime,

    // Override: Refetch on window focus for bill (want fresh data)
    refetchOnWindowFocus: true,

    // Refetch every 30 seconds when active
    refetchInterval: 30000,
  })
}

/**
 * Legacy compatibility wrapper - returns same interface as old useBillStatus
 */
export function useBillStatus() {
  const session = unifiedSessionStorage.getSession()
  const { data, isLoading, error, refetch } = useBillData({
    tableSessionId: session?.tableSessionId,
    enabled: !!session?.tableSessionId // ✅ FIXED: Only fetch if session exists
  })

  return {
    hasBill: data?.hasBill ?? false,
    billAmount: data?.billAmount ?? 0,
    remainingBalance: data?.remainingBalance ?? 0,
    isPaid: data?.isPaid ?? true,
    isLoading,
    error: error?.message ?? null,
    bill: data?.bill ?? null,
    refreshBillStatus: refetch
  }
}
