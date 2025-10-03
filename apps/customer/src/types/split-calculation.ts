/**
 * Split Calculation Type Definitions
 * Clean architecture - proper separation of concerns
 */

import { SplitBillType } from '@/constants/payment'

/**
 * Server state - what the backend has confirmed
 * This is the single source of truth
 */
export interface SplitCalculationServerState {
  splitType: SplitBillType
  participants: string[]

  // Backend-calculated amounts (read-only)
  splitAmounts: { [guestSessionId: string]: number }

  // Split configuration (optional based on type)
  percentages?: { [userId: string]: number }
  amounts?: { [userId: string]: number }
  itemAssignments?: { [itemId: string]: string }

  // Metadata
  totalAmount: number
  isValid: boolean
  updatedBy: string
  updatedAt: string

  // Lock state
  isLocked: boolean
  lockedBy?: string
  lockedAt?: string
  lockReason?: string
}

/**
 * Local UI input state
 * What the user is currently typing (strings for controlled inputs)
 */
export interface LocalInputState {
  [userId: string]: {
    percentage?: string
    amount?: string
  }
}

/**
 * UI metadata state
 * Loading, errors, validation
 */
export interface SplitCalculationUIState {
  isLoading: boolean
  error: string | null
  isSyncing: boolean
}

/**
 * Validation result
 */
export interface SplitValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * API request/response types
 */
export interface CreateSplitCalculationRequest {
  splitType: SplitBillType
  participants: string[]
  percentages?: { [userId: string]: string }
  amounts?: { [userId: string]: string }
  itemAssignments?: { [itemId: string]: string }
}

export interface UpdateSplitCalculationRequest {
  percentage?: number
  amount?: number
  itemAssignments?: { [itemId: string]: string }
}

/**
 * WebSocket event payload
 */
export interface SplitCalculationWebSocketEvent {
  type: 'split:calculation_updated'
  tableSessionId: string
  splitCalculation: SplitCalculationServerState
  updatedBy: string
  timestamp: string
}

/**
 * Service errors
 */
export class SplitCalculationError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'SplitCalculationError'
  }
}

export class RateLimitError extends SplitCalculationError {
  constructor(message: string = 'Too many requests. Please wait.') {
    super(message, 'RATE_LIMIT', 429)
    this.name = 'RateLimitError'
  }
}

export class ValidationError extends SplitCalculationError {
  constructor(
    message: string,
    public validationErrors: string[]
  ) {
    super(message, 'VALIDATION_ERROR', 400)
    this.name = 'ValidationError'
  }
}
