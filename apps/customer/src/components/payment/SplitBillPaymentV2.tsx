/**
 * Split Bill Payment V2 - Clean Architecture
 *
 * This is a complete rewrite with proper separation of concerns:
 * - Service layer handles ALL API calls
 * - Custom hook manages state
 * - WebSocket updates ONLY update state (no API calls)
 * - No useEffect triggering side effects
 * - Clear data flow: User Action → Hook → Service → API → WebSocket → Hook
 *
 * Benefits:
 * - No infinite loops
 * - No duplicate API calls
 * - Easy to test
 * - Easy to maintain
 * - Predictable behavior
 */

'use client'

import { ArrowLeft } from 'lucide-react'
import { Button } from '@tabsy/ui-components'
import { TabsyAPI } from '@tabsy/api-client'
import { SplitBillType } from '@/constants/payment'
import type { TableSessionBill, TableSessionUser } from '@tabsy/shared-types'

// Custom hook
import { useSplitCalculation } from '@/hooks/useSplitCalculation'

// Presentational components
import { SplitTypeSelector } from './split/SplitTypeSelector'
import {
  EqualSplitDisplay,
  PercentageInputs,
  AmountInputs
} from './split/SplitAmountInputs'
import { SplitValidationDisplay } from './split/SplitValidationDisplay'

interface SplitBillPaymentV2Props {
  bill: TableSessionBill
  currentUser: TableSessionUser
  users: TableSessionUser[]
  api: TabsyAPI
  sessionId?: string
  onCancel?: () => void
  onProceedToPayment?: (amount: number) => void
}

export function SplitBillPaymentV2({
  bill,
  currentUser,
  users,
  api,
  sessionId,
  onCancel,
  onProceedToPayment
}: SplitBillPaymentV2Props) {
  const actualSessionId = bill.sessionId || sessionId

  if (!actualSessionId) {
    return (
      <div className="p-4 text-center text-content-secondary">
        No session ID available
      </div>
    )
  }

  // ===== HOOK =====
  // All state management and business logic in the hook
  const {
    serverState,
    localInputs,
    uiState,
    changeSplitType,
    updateUserPercentage,
    updateUserAmount,
    userSplitAmount,
    validation
  } = useSplitCalculation({
    sessionId: actualSessionId,
    currentUserId: currentUser.guestSessionId,
    users,
    api,
    totalBillAmount: bill.summary.remainingBalance
  })

  // ===== LOADING STATE =====
  if (uiState.isLoading && !serverState) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-content-secondary mt-2">Loading split calculation...</p>
        </div>
      </div>
    )
  }

  // ===== ERROR STATE =====
  if (uiState.error) {
    return (
      <div className="p-4">
        <div className="p-4 bg-status-error/10 border border-status-error/20 rounded-lg">
          <p className="text-sm text-status-error">{uiState.error}</p>
        </div>
        {onCancel && (
          <Button
            onClick={onCancel}
            variant="outline"
            className="mt-4"
          >
            Go Back
          </Button>
        )}
      </div>
    )
  }

  if (!serverState) {
    return null
  }

  // ===== MAIN RENDER =====
  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-2 hover:bg-surface-secondary rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-content-primary" />
          </button>
        )}
        <div>
          <h2 className="text-lg font-semibold text-content-primary">Split Bill</h2>
          <p className="text-sm text-content-secondary">
            Total: ${bill.summary.remainingBalance.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Split Type Selector */}
      <SplitTypeSelector
        selected={serverState.splitType}
        onChange={changeSplitType}
        disabled={uiState.isLoading || serverState.isLocked}
      />

      {/* Split Amount Inputs based on type */}
      <div>
        {serverState.splitType === SplitBillType.EQUAL && (
          <EqualSplitDisplay
            users={users}
            serverState={serverState}
            currentUserId={currentUser.guestSessionId}
          />
        )}

        {serverState.splitType === SplitBillType.BY_PERCENTAGE && (
          <PercentageInputs
            users={users}
            currentUserId={currentUser.guestSessionId}
            localInputs={localInputs}
            serverState={serverState}
            onChange={updateUserPercentage}
            disabled={uiState.isLoading || serverState.isLocked}
          />
        )}

        {serverState.splitType === SplitBillType.BY_AMOUNT && (
          <AmountInputs
            users={users}
            currentUserId={currentUser.guestSessionId}
            localInputs={localInputs}
            serverState={serverState}
            onChange={updateUserAmount}
            disabled={uiState.isLoading || serverState.isLocked}
          />
        )}

        {serverState.splitType === SplitBillType.BY_ITEMS && (
          <div className="p-4 text-center text-content-secondary">
            Item assignment coming soon
          </div>
        )}
      </div>

      {/* Validation */}
      <SplitValidationDisplay validation={validation} />

      {/* Your Amount */}
      <div className="p-4 bg-surface-secondary rounded-lg border border-default">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-content-primary">Your Amount</span>
          <span className="text-xl font-bold text-primary">
            ${userSplitAmount.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {onCancel && (
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1"
            disabled={uiState.isLoading}
          >
            Cancel
          </Button>
        )}
        <Button
          onClick={() => onProceedToPayment?.(userSplitAmount)}
          className="flex-1"
          disabled={!validation.isValid || uiState.isLoading || userSplitAmount === 0}
        >
          {uiState.isLoading ? 'Processing...' : `Pay $${userSplitAmount.toFixed(2)}`}
        </Button>
      </div>

      {/* Debug info (dev only) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="text-xs text-content-tertiary">
          <summary>Debug Info</summary>
          <pre className="mt-2 p-2 bg-surface rounded overflow-auto">
            {JSON.stringify({
              splitType: serverState.splitType,
              participants: serverState.participants.length,
              isValid: serverState.isValid,
              isLocked: serverState.isLocked,
              updatedBy: serverState.updatedBy,
              userAmount: userSplitAmount
            }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}
