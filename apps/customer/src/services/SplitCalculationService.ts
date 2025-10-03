/**
 * Split Calculation Service
 * Single source of truth for all split calculation API calls
 *
 * Responsibilities:
 * - Make API calls to backend
 * - Handle errors and retries
 * - Prevent duplicate requests
 * - Map API responses to domain types
 */

import { TabsyAPI } from '@tabsy/api-client'
import { SplitBillType } from '@/constants/payment'
import {
  SplitCalculationServerState,
  CreateSplitCalculationRequest,
  UpdateSplitCalculationRequest,
  SplitCalculationError,
  RateLimitError,
  ValidationError
} from '@/types/split-calculation'
import { SplitCalculationResponseSchema, validateApiResponse } from '@/lib/api-schemas'

export class SplitCalculationService {
  private api: TabsyAPI
  private sessionId: string
  private currentUserId: string

  // Request deduplication
  private inFlightRequests = new Map<string, Promise<SplitCalculationServerState | null>>()

  constructor(api: TabsyAPI, sessionId: string, currentUserId: string) {
    this.api = api
    this.sessionId = sessionId
    this.currentUserId = currentUserId
  }

  /**
   * Load existing split calculation from backend
   */
  async loadSplitCalculation(): Promise<SplitCalculationServerState | null> {
    const requestKey = 'load'

    // Return existing promise if in-flight
    if (this.inFlightRequests.has(requestKey)) {
      return this.inFlightRequests.get(requestKey)!
    }

    const promise = this.executeLoad()
    this.inFlightRequests.set(requestKey, promise)

    try {
      const result = await promise
      return result
    } finally {
      this.inFlightRequests.delete(requestKey)
    }
  }

  private async executeLoad(): Promise<SplitCalculationServerState | null> {
    try {
      const response = await this.api.tableSession.getSplitCalculation?.(this.sessionId)

      if (!response || !response.success || !response.data) {
        return null
      }

      return this.mapToServerState(response.data)
    } catch (error: any) {
      // If 404, no split calculation exists yet
      if (error.statusCode === 404 || error.status === 404) {
        return null
      }
      throw this.handleError(error)
    }
  }

  /**
   * Create or update split calculation with new type
   */
  async changeSplitType(type: SplitBillType, participants: string[]): Promise<SplitCalculationServerState> {
    const requestKey = `change_type_${type}`

    // Return existing promise if in-flight
    if (this.inFlightRequests.has(requestKey)) {
      console.log('[SplitService] Request already in flight:', requestKey)
      const inFlightPromise = this.inFlightRequests.get(requestKey)!
      const result = await inFlightPromise
      if (result === null) {
        throw new Error('Split calculation not found')
      }
      return result
    }

    const promise = this.executeChangeSplitType(type, participants)
    this.inFlightRequests.set(requestKey, promise)

    try {
      const result = await promise
      return result
    } finally {
      this.inFlightRequests.delete(requestKey)
    }
  }

  private async executeChangeSplitType(
    type: SplitBillType,
    participants: string[]
  ): Promise<SplitCalculationServerState> {
    try {
      console.log('[SplitService] Changing split type to:', type)

      const request = {
        splitType: type as 'EQUAL' | 'BY_ITEMS' | 'BY_PERCENTAGE' | 'BY_AMOUNT',
        participants
      }

      const response = await this.api.tableSession.createSplitCalculation(
        this.sessionId,
        request,
        { guestSessionId: this.currentUserId }
      )

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to change split type')
      }

      console.log('[SplitService] Split type changed successfully')
      return this.mapToServerState(response.data)
    } catch (error: any) {
      throw this.handleError(error)
    }
  }

  /**
   * Update user's percentage
   */
  async updateUserPercentage(userId: string, percentage: number): Promise<SplitCalculationServerState> {
    const requestKey = `update_pct_${userId}`

    // Return existing promise if in-flight
    if (this.inFlightRequests.has(requestKey)) {
      console.log('[SplitService] Request already in flight:', requestKey)
      const inFlightPromise = this.inFlightRequests.get(requestKey)!
      const result = await inFlightPromise
      if (result === null) {
        throw new Error('Split calculation not found')
      }
      return result
    }

    const promise = this.executeUpdateUserPercentage(userId, percentage)
    this.inFlightRequests.set(requestKey, promise)

    try {
      const result = await promise
      return result
    } finally {
      this.inFlightRequests.delete(requestKey)
    }
  }

  private async executeUpdateUserPercentage(
    userId: string,
    percentage: number
  ): Promise<SplitCalculationServerState> {
    try {
      console.log('[SplitService] Updating percentage for user:', userId, percentage)

      const request: UpdateSplitCalculationRequest = { percentage }

      const response = await this.api.tableSession.updateSplitCalculation(
        this.sessionId,
        userId,
        request,
        { guestSessionId: this.currentUserId }
      )

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to update percentage')
      }

      console.log('[SplitService] Percentage updated successfully')
      return this.mapToServerState(response.data)
    } catch (error: any) {
      throw this.handleError(error)
    }
  }

  /**
   * Update user's amount
   */
  async updateUserAmount(userId: string, amount: number): Promise<SplitCalculationServerState> {
    const requestKey = `update_amt_${userId}`

    // Return existing promise if in-flight
    if (this.inFlightRequests.has(requestKey)) {
      console.log('[SplitService] Request already in flight:', requestKey)
      const inFlightPromise = this.inFlightRequests.get(requestKey)!
      const result = await inFlightPromise
      if (result === null) {
        throw new Error('Split calculation not found')
      }
      return result
    }

    const promise = this.executeUpdateUserAmount(userId, amount)
    this.inFlightRequests.set(requestKey, promise)

    try {
      const result = await promise
      return result
    } finally {
      this.inFlightRequests.delete(requestKey)
    }
  }

  private async executeUpdateUserAmount(
    userId: string,
    amount: number
  ): Promise<SplitCalculationServerState> {
    try {
      console.log('[SplitService] Updating amount for user:', userId, amount)

      const request: UpdateSplitCalculationRequest = { amount }

      const response = await this.api.tableSession.updateSplitCalculation(
        this.sessionId,
        userId,
        request,
        { guestSessionId: this.currentUserId }
      )

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to update amount')
      }

      console.log('[SplitService] Amount updated successfully')
      return this.mapToServerState(response.data)
    } catch (error: any) {
      throw this.handleError(error)
    }
  }

  /**
   * Update item assignments
   */
  async updateItemAssignment(
    itemId: string,
    userId: string
  ): Promise<SplitCalculationServerState> {
    const requestKey = `update_item_${itemId}`

    // Return existing promise if in-flight
    if (this.inFlightRequests.has(requestKey)) {
      console.log('[SplitService] Request already in flight:', requestKey)
      const inFlightPromise = this.inFlightRequests.get(requestKey)!
      const result = await inFlightPromise
      if (result === null) {
        throw new Error('Split calculation not found')
      }
      return result
    }

    const promise = this.executeUpdateItemAssignment(itemId, userId)
    this.inFlightRequests.set(requestKey, promise)

    try {
      const result = await promise
      return result
    } finally {
      this.inFlightRequests.delete(requestKey)
    }
  }

  private async executeUpdateItemAssignment(
    itemId: string,
    userId: string
  ): Promise<SplitCalculationServerState> {
    try {
      console.log('[SplitService] Updating item assignment:', itemId, userId)

      const request: UpdateSplitCalculationRequest = {
        itemAssignments: { [itemId]: userId }
      }

      const response = await this.api.tableSession.updateSplitCalculation(
        this.sessionId,
        userId,
        request,
        { guestSessionId: this.currentUserId }
      )

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to update item assignment')
      }

      console.log('[SplitService] Item assignment updated successfully')
      return this.mapToServerState(response.data)
    } catch (error: any) {
      throw this.handleError(error)
    }
  }

  /**
   * Map API response to server state with validation
   */
  private mapToServerState(data: any): SplitCalculationServerState {
    // Validate response against schema
    const validated = validateApiResponse(
      SplitCalculationResponseSchema,
      data,
      'Split Calculation'
    )

    return {
      splitType: validated.splitType as SplitBillType,
      participants: validated.participants,
      splitAmounts: validated.splitAmounts,
      percentages: validated.percentages,
      amounts: validated.amounts,
      itemAssignments: validated.itemAssignments,
      totalAmount: validated.totalAmount,
      isValid: validated.valid !== false,
      updatedBy: validated.updatedBy || validated.lastUpdatedBy || '',
      updatedAt: validated.updatedAt || new Date().toISOString(),
      isLocked: validated.isLocked || false,
      lockedBy: validated.lockedBy,
      lockedAt: validated.lockedAt,
      lockReason: validated.lockReason
    }
  }

  /**
   * Centralized error handling
   * Prioritizes HTTP status codes over error messages for reliability
   */
  private handleError(error: any): Error {
    console.error('[SplitService] Error:', error)

    // Extract status code from different possible locations
    const statusCode = error?.status || error?.statusCode || error?.response?.status

    // 1. Check HTTP status code first (most reliable)
    if (statusCode === 429) {
      return new RateLimitError()
    }

    if (statusCode === 400) {
      return new ValidationError(
        error.message || 'Validation failed',
        [error.message || 'Invalid request']
      )
    }

    if (statusCode === 404) {
      return new SplitCalculationError(
        'Split calculation not found',
        'NOT_FOUND',
        404
      )
    }

    if (statusCode === 403) {
      return new SplitCalculationError(
        'You do not have permission to perform this action',
        'FORBIDDEN',
        403
      )
    }

    if (statusCode === 401) {
      return new SplitCalculationError(
        'Session expired or invalid. Please refresh.',
        'UNAUTHORIZED',
        401
      )
    }

    if (statusCode >= 500) {
      return new SplitCalculationError(
        'Server error. Please try again later.',
        'SERVER_ERROR',
        statusCode
      )
    }

    // 2. Check error code from API response
    if (error?.code === 'RATE_LIMIT_EXCEEDED') {
      return new RateLimitError()
    }

    if (error?.code === 'VALIDATION_ERROR') {
      return new ValidationError(
        error.message || 'Validation failed',
        [error.message]
      )
    }

    // 3. String matching as last resort (least reliable)
    const errorMessage = error?.message?.toLowerCase() || ''

    if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
      return new RateLimitError()
    }

    if (errorMessage.includes('exceeds 100%') || errorMessage.includes('exceeds balance')) {
      return new ValidationError(
        error.message || 'Validation failed',
        [error.message]
      )
    }

    // Generic error
    return new SplitCalculationError(
      error.message || 'An error occurred',
      error.code,
      statusCode
    )
  }

  /**
   * Get current in-flight request count (for debugging)
   */
  getInFlightCount(): number {
    return this.inFlightRequests.size
  }

  /**
   * Clear all in-flight requests (for cleanup)
   */
  clearInFlight(): void {
    this.inFlightRequests.clear()
  }
}
