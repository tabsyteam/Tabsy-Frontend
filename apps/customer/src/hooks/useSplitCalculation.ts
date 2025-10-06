/**
 * useSplitCalculation Hook
 * Clean architecture - proper separation of UI state from server state
 *
 * Responsibilities:
 * - Manage server state (single source of truth)
 * - Manage local UI input state
 * - Handle WebSocket updates (read-only, no API calls)
 * - Debounce user input
 * - Provide validation
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { TabsyAPI } from '@tabsy/api-client'
import { useWebSocketEvent } from '@tabsy/ui-components'
import { SplitBillType } from '@/constants/payment'
import { SplitCalculationService } from '@/services/SplitCalculationService'
import {
  SplitCalculationServerState,
  LocalInputState,
  SplitCalculationUIState,
  SplitValidationResult,
  SplitCalculationWebSocketEvent,
  RateLimitError
} from '@/types/split-calculation'
import { createLogger } from '@/lib/logger'

const log = createLogger('useSplitCalculation')
import type { TableSessionUser } from '@tabsy/shared-types'
import { useRestaurantOptional } from '@/contexts/RestaurantContext'
import { formatPrice as formatPriceUtil, type CurrencyCode } from '@tabsy/shared-utils/formatting/currency'

interface UseSplitCalculationProps {
  sessionId: string
  currentUserId: string
  users: TableSessionUser[]
  api: TabsyAPI
  totalBillAmount: number
}

interface UseSplitCalculationReturn {
  // Server state (read-only for components)
  serverState: SplitCalculationServerState | null

  // UI state
  localInputs: LocalInputState
  uiState: SplitCalculationUIState

  // Actions (the ONLY way to trigger changes)
  changeSplitType: (type: SplitBillType) => Promise<void>
  updateUserPercentage: (userId: string, value: string) => void
  updateUserAmount: (userId: string, value: string) => void
  updateItemAssignment: (itemId: string, userId: string) => Promise<void>

  // Computed values
  userSplitAmount: number
  validation: SplitValidationResult
}

/**
 * Debounce utility
 */
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

export function useSplitCalculation({
  sessionId,
  currentUserId,
  users,
  api,
  totalBillAmount
}: UseSplitCalculationProps): UseSplitCalculationReturn {
  // ===== CURRENCY =====
  const restaurantContext = useRestaurantOptional()
  const currency = (restaurantContext?.currency as CurrencyCode) || 'USD'

  // Use shared utility for consistent formatting
  const formatPrice = (price: number) => formatPriceUtil(price, currency)

  // ===== STATE =====

  // Server state - single source of truth
  const [serverState, setServerState] = useState<SplitCalculationServerState | null>(null)

  // Local UI input state - what user is typing
  const [localInputs, setLocalInputs] = useState<LocalInputState>({})

  // UI metadata state
  const [uiState, setUiState] = useState<SplitCalculationUIState>({
    isLoading: false,
    error: null,
    isSyncing: false
  })

  // ===== SERVICE =====

  // Create service instance (stable across re-renders)
  const service = useMemo(
    () => new SplitCalculationService(api, sessionId, currentUserId),
    [api, sessionId, currentUserId]
  )

  // ===== INITIALIZATION =====

  // Stabilize users dependency - only changes when user IDs change
  const userIds = useMemo(() => users.map(u => u.guestSessionId), [users])
  const userIdsKey = useMemo(() => userIds.join(','), [userIds])

  // Track retry attempts to prevent infinite loops
  const retryAttemptsRef = useRef(0)
  const MAX_RETRY_ATTEMPTS = 3

  // Load initial data once on mount
  useEffect(() => {
    let cancelled = false

    async function loadInitial() {
      if (!sessionId) return

      setUiState(prev => ({ ...prev, isLoading: true, error: null }))

      try {
        log.debug('[useSplitCalculation] Loading initial split calculation')

        // Try to load existing
        const existing = await service.loadSplitCalculation()

        if (cancelled) return

        if (existing) {
          log.debug('[useSplitCalculation] Found existing split calculation:', existing)
          setServerState(existing)
          setLocalInputs(convertServerStateToLocalInputs(existing))
          // Reset retry count on success
          retryAttemptsRef.current = 0
        } else {
          log.debug('[useSplitCalculation] No existing split, creating default EQUAL split')
          // Create default EQUAL split
          const created = await service.changeSplitType(SplitBillType.EQUAL, userIds)

          if (cancelled) return

          setServerState(created)
          setLocalInputs({})
          // Reset retry count on success
          retryAttemptsRef.current = 0
        }
      } catch (error) {
        if (cancelled) return

        const err = error instanceof Error ? error : new Error(String(error))
        log.error('Error loading initial split:', err)

        // Increment retry count
        retryAttemptsRef.current++

        if (retryAttemptsRef.current > MAX_RETRY_ATTEMPTS) {
          log.error(`Max retry attempts (${MAX_RETRY_ATTEMPTS}) exceeded. Stopping retries.`)
          setUiState(prev => ({
            ...prev,
            isLoading: false,
            error: `Failed to load split calculation after ${MAX_RETRY_ATTEMPTS} attempts. Please refresh the page.`
          }))
          return // Stop further execution
        }

        log.warn(`Retry attempt ${retryAttemptsRef.current}/${MAX_RETRY_ATTEMPTS}`)
        setUiState(prev => ({ ...prev, error: err.message }))
      } finally {
        if (!cancelled) {
          setUiState(prev => ({ ...prev, isLoading: false }))
        }
      }
    }

    loadInitial()

    return () => {
      cancelled = true
    }
  }, [sessionId, service, userIdsKey])

  // ===== WEBSOCKET =====

  // WebSocket handler - ONLY updates state, NEVER calls API
  const handleWebSocketUpdate = useCallback((data: any) => {
    log.debug('[useSplitCalculation] WebSocket update received:', data)

    // Ignore own updates to prevent echo
    if (data.updatedBy === currentUserId) {
      log.debug('[useSplitCalculation] Ignoring own update')
      return
    }

    // Update server state from WebSocket
    if (data.splitCalculation) {
      log.debug('[useSplitCalculation] Updating server state from WebSocket')
      setServerState(data.splitCalculation)

      // Update local inputs for other users (not current user)
      setLocalInputs(prev => {
        const updated = { ...prev }

        // Update other users' inputs from server state
        if (data.splitCalculation.percentages) {
          Object.entries(data.splitCalculation.percentages).forEach(([userId, pct]: [string, any]) => {
            if (userId !== currentUserId) {
              updated[userId] = { ...updated[userId], percentage: pct.toString() }
            }
          })
        }

        if (data.splitCalculation.amounts) {
          Object.entries(data.splitCalculation.amounts).forEach(([userId, amt]: [string, any]) => {
            if (userId !== currentUserId) {
              updated[userId] = { ...updated[userId], amount: amt.toString() }
            }
          })
        }

        return updated
      })
    }
  }, [currentUserId])

  // Subscribe to WebSocket events (using existing infrastructure)
  useWebSocketEvent(
    'split:calculation_updated',
    handleWebSocketUpdate,
    [handleWebSocketUpdate],
    'useSplitCalculation'
  )

  // ===== DEBOUNCED API CALLS =====

  // Debounced update for percentage
  const debouncedUpdatePercentage = useRef(
    debounce(async (userId: string, value: number, svc: SplitCalculationService) => {
      try {
        log.debug('[useSplitCalculation] Debounced percentage update:', userId, value)
        const result = await svc.updateUserPercentage(userId, value)
        setServerState(result)
      } catch (error: any) {
        log.error('[useSplitCalculation] Error updating percentage:', error)

        if (error instanceof RateLimitError) {
          setUiState(prev => ({
            ...prev,
            error: 'Too many requests. Please slow down.'
          }))
        } else {
          setUiState(prev => ({ ...prev, error: error.message }))
        }
      }
    }, 500)  // 500ms debounce
  ).current

  // Debounced update for amount
  const debouncedUpdateAmount = useRef(
    debounce(async (userId: string, value: number, svc: SplitCalculationService) => {
      try {
        log.debug('[useSplitCalculation] Debounced amount update:', userId, value)
        const result = await svc.updateUserAmount(userId, value)
        setServerState(result)
      } catch (error: any) {
        log.error('[useSplitCalculation] Error updating amount:', error)

        if (error instanceof RateLimitError) {
          setUiState(prev => ({
            ...prev,
            error: 'Too many requests. Please slow down.'
          }))
        } else {
          setUiState(prev => ({ ...prev, error: error.message }))
        }
      }
    }, 500)  // 500ms debounce
  ).current

  // ===== ACTIONS =====

  // Change split type
  const changeSplitType = useCallback(async (type: SplitBillType) => {
    setUiState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      log.debug('[useSplitCalculation] Changing split type to:', type)

      const userIds = users.map(u => u.guestSessionId)
      const result = await service.changeSplitType(type, userIds)

      setServerState(result)
      setLocalInputs({})  // Clear all local inputs on type change

      log.debug('[useSplitCalculation] Split type changed successfully')
    } catch (error: any) {
      log.error('[useSplitCalculation] Error changing split type:', error)

      if (error instanceof RateLimitError) {
        setUiState(prev => ({
          ...prev,
          error: 'Too many requests. Please wait a moment.'
        }))
      } else {
        setUiState(prev => ({ ...prev, error: error.message }))
      }
    } finally {
      setUiState(prev => ({ ...prev, isLoading: false }))
    }
  }, [service, users])

  // Update user percentage (immediate UI update + debounced API call)
  const updateUserPercentage = useCallback((userId: string, value: string) => {
    // Update UI immediately
    setLocalInputs(prev => ({
      ...prev,
      [userId]: { ...prev[userId], percentage: value }
    }))

    // Debounced API call
    const numValue = parseFloat(value)
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      debouncedUpdatePercentage(userId, numValue, service)
    }
  }, [service, debouncedUpdatePercentage])

  // Update user amount (immediate UI update + debounced API call)
  const updateUserAmount = useCallback((userId: string, value: string) => {
    // Update UI immediately
    setLocalInputs(prev => ({
      ...prev,
      [userId]: { ...prev[userId], amount: value }
    }))

    // Debounced API call
    const numValue = parseFloat(value)
    if (!isNaN(numValue) && numValue >= 0) {
      debouncedUpdateAmount(userId, numValue, service)
    }
  }, [service, debouncedUpdateAmount])

  // Update item assignment (immediate API call, no debounce)
  const updateItemAssignment = useCallback(async (itemId: string, userId: string) => {
    setUiState(prev => ({ ...prev, isSyncing: true, error: null }))

    try {
      log.debug('[useSplitCalculation] Updating item assignment:', itemId, userId)
      const result = await service.updateItemAssignment(itemId, userId)
      setServerState(result)
    } catch (error: any) {
      log.error('[useSplitCalculation] Error updating item assignment:', error)
      setUiState(prev => ({ ...prev, error: error.message }))
    } finally {
      setUiState(prev => ({ ...prev, isSyncing: false }))
    }
  }, [service])

  // ===== COMPUTED VALUES =====

  // User's split amount (from server state)
  const userSplitAmount = useMemo(() => {
    return serverState?.splitAmounts?.[currentUserId] || 0
  }, [serverState, currentUserId])

  // Validation
  const validation = useMemo((): SplitValidationResult => {
    if (!serverState) {
      return { isValid: false, errors: ['No split calculation'], warnings: [] }
    }

    const errors: string[] = []
    const warnings: string[] = []

    if (serverState.splitType === SplitBillType.BY_PERCENTAGE) {
      const totalPct = Object.values(serverState.percentages || {}).reduce((sum, pct) => sum + pct, 0)

      if (totalPct > 100.01) {
        errors.push(`Total percentage is ${totalPct.toFixed(1)}% - exceeds 100%`)
      } else if (totalPct < 99.99) {
        const remaining = 100 - totalPct
        warnings.push(`${remaining.toFixed(1)}% remaining - incomplete split`)
      }
    }

    if (serverState.splitType === SplitBillType.BY_AMOUNT) {
      const totalAmt = Object.values(serverState.amounts || {}).reduce((sum, amt) => sum + amt, 0)

      if (totalAmt > totalBillAmount + 0.01) {
        errors.push(`Total amount ${formatPrice(totalAmt)} exceeds bill ${formatPrice(totalBillAmount)}`)
      } else if (totalAmt < totalBillAmount - 0.01) {
        const remaining = totalBillAmount - totalAmt
        warnings.push(`${formatPrice(remaining)} remaining - incomplete split`)
      }
    }

    return {
      isValid: errors.length === 0 && serverState.isValid,
      errors,
      warnings
    }
  }, [serverState, totalBillAmount])

  // ===== RETURN =====

  return {
    serverState,
    localInputs,
    uiState,
    changeSplitType,
    updateUserPercentage,
    updateUserAmount,
    updateItemAssignment,
    userSplitAmount,
    validation
  }
}

/**
 * Helper: Convert server state to local input state
 */
function convertServerStateToLocalInputs(
  serverState: SplitCalculationServerState
): LocalInputState {
  const inputs: LocalInputState = {}

  if (serverState.percentages) {
    Object.entries(serverState.percentages).forEach(([userId, pct]) => {
      inputs[userId] = { ...inputs[userId], percentage: pct.toString() }
    })
  }

  if (serverState.amounts) {
    Object.entries(serverState.amounts).forEach(([userId, amt]) => {
      inputs[userId] = { ...inputs[userId], amount: amt.toString() }
    })
  }

  return inputs
}
