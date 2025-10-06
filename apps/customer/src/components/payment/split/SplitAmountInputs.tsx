/**
 * Split Amount Input Components
 * Pure presentational components for displaying split amounts
 */

import type { TableSessionUser } from '@tabsy/shared-types'
import type { LocalInputState, SplitCalculationServerState } from '@/types/split-calculation'

// Equal Split Display
interface EqualSplitDisplayProps {
  users: TableSessionUser[]
  serverState: SplitCalculationServerState
  currentUserId: string
  formatPrice?: (price: number) => string
}

export function EqualSplitDisplay({
  users,
  serverState,
  currentUserId,
  formatPrice = (price) => `$${price.toFixed(2)}`
}: EqualSplitDisplayProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-content-primary">Split Distribution</h3>
      <div className="space-y-2">
        {users.map((user) => {
          const amount = serverState.splitAmounts[user.guestSessionId] || 0
          const isCurrentUser = user.guestSessionId === currentUserId

          return (
            <div
              key={user.guestSessionId}
              className={`
                p-3 rounded-lg border
                ${isCurrentUser ? 'border-primary bg-primary/5' : 'border-default bg-surface'}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-content-primary">
                    {user.userName}
                  </span>
                  {isCurrentUser && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-primary text-white rounded-full">
                      You
                    </span>
                  )}
                </div>
                <div className="text-sm font-semibold text-content-primary">
                  {formatPrice(amount)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Percentage Inputs
interface PercentageInputsProps {
  users: TableSessionUser[]
  currentUserId: string
  localInputs: LocalInputState
  serverState: SplitCalculationServerState
  onChange: (userId: string, value: string) => void
  disabled?: boolean
  formatPrice?: (price: number) => string
}

export function PercentageInputs({
  users,
  currentUserId,
  localInputs,
  serverState,
  onChange,
  disabled = false,
  formatPrice = (price) => `$${price.toFixed(2)}`
}: PercentageInputsProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-content-primary">Set Percentages</h3>
      <div className="space-y-2">
        {users.map((user) => {
          const isCurrentUser = user.guestSessionId === currentUserId
          const canEdit = isCurrentUser && !disabled
          const inputValue = localInputs[user.guestSessionId]?.percentage || ''
          const amount = serverState.splitAmounts[user.guestSessionId] || 0

          return (
            <div
              key={user.guestSessionId}
              className={`
                p-3 rounded-lg border
                ${isCurrentUser ? 'border-primary bg-primary/5' : 'border-default bg-surface'}
              `}
            >
              <div className="flex items-center gap-3">
                {/* User info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-content-primary">
                      {user.userName}
                    </span>
                    {isCurrentUser && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-primary text-white rounded-full">
                        You
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-content-tertiary mt-0.5">
                    {formatPrice(amount)}
                  </div>
                </div>

                {/* Percentage input */}
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={inputValue}
                    onChange={(e) => onChange(user.guestSessionId, e.target.value)}
                    disabled={!canEdit}
                    placeholder="0"
                    className={`
                      w-20 px-3 py-2 text-sm text-right rounded-lg border
                      ${canEdit
                        ? 'bg-surface border-default focus:border-primary focus:ring-1 focus:ring-primary'
                        : 'bg-surface-secondary border-default cursor-not-allowed opacity-60'
                      }
                    `}
                    title={!canEdit ? 'You can only edit your own percentage' : ''}
                  />
                  <span className="text-sm text-content-secondary">%</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Amount Inputs
interface AmountInputsProps {
  users: TableSessionUser[]
  currentUserId: string
  localInputs: LocalInputState
  serverState: SplitCalculationServerState
  onChange: (userId: string, value: string) => void
  disabled?: boolean
  formatPrice?: (price: number) => string
  currencySymbol?: string
}

export function AmountInputs({
  users,
  currentUserId,
  localInputs,
  serverState,
  onChange,
  disabled = false,
  formatPrice = (price) => `$${price.toFixed(2)}`,
  currencySymbol = '$'
}: AmountInputsProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-content-primary">Set Amounts</h3>
      <div className="space-y-2">
        {users.map((user) => {
          const isCurrentUser = user.guestSessionId === currentUserId
          const canEdit = isCurrentUser && !disabled
          const inputValue = localInputs[user.guestSessionId]?.amount || ''
          const amount = serverState.splitAmounts[user.guestSessionId] || 0

          return (
            <div
              key={user.guestSessionId}
              className={`
                p-3 rounded-lg border
                ${isCurrentUser ? 'border-primary bg-primary/5' : 'border-default bg-surface'}
              `}
            >
              <div className="flex items-center gap-3">
                {/* User info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-content-primary">
                      {user.userName}
                    </span>
                    {isCurrentUser && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-primary text-white rounded-full">
                        You
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-content-tertiary mt-0.5">
                    Calculated: {formatPrice(amount)}
                  </div>
                </div>

                {/* Amount input */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-content-secondary">{currencySymbol}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={inputValue}
                    onChange={(e) => onChange(user.guestSessionId, e.target.value)}
                    disabled={!canEdit}
                    placeholder="0.00"
                    className={`
                      w-24 px-3 py-2 text-sm text-right rounded-lg border
                      ${canEdit
                        ? 'bg-surface border-default focus:border-primary focus:ring-1 focus:ring-primary'
                        : 'bg-surface-secondary border-default cursor-not-allowed opacity-60'
                      }
                    `}
                    title={!canEdit ? 'You can only edit your own amount' : ''}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
