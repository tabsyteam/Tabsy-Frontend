/**
 * Split Type Selector Component
 * Pure presentational component for selecting split type
 */

import { SplitBillType } from '@/constants/payment'
import { Users, Percent, Banknote, Hash } from 'lucide-react'

interface SplitTypeSelectorProps {
  selected: SplitBillType
  onChange: (type: SplitBillType) => void
  disabled?: boolean
}

export function SplitTypeSelector({
  selected,
  onChange,
  disabled = false
}: SplitTypeSelectorProps) {
  const options = [
    {
      type: SplitBillType.EQUAL,
      label: 'Split Equally',
      icon: Users,
      description: 'Everyone pays the same amount'
    },
    {
      type: SplitBillType.BY_PERCENTAGE,
      label: 'By Percentage',
      icon: Percent,
      description: 'Set percentage for each person'
    },
    {
      type: SplitBillType.BY_AMOUNT,
      label: 'By Amount',
      icon: Banknote,
      description: 'Set dollar amount for each person'
    },
    {
      type: SplitBillType.BY_ITEMS,
      label: 'By Items',
      icon: Hash,
      description: 'Assign items to each person'
    }
  ]

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-content-primary">Split Method</h3>
      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => {
          const Icon = option.icon
          const isSelected = selected === option.type

          return (
            <button
              key={option.type}
              onClick={() => !disabled && onChange(option.type)}
              disabled={disabled}
              className={`
                p-4 rounded-lg border-2 text-left transition-all
                ${isSelected
                  ? 'border-primary bg-primary/10'
                  : 'border-default bg-surface hover:border-primary/50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 mt-0.5 ${isSelected ? 'text-primary' : 'text-content-secondary'}`} />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-content-primary'}`}>
                    {option.label}
                  </div>
                  <div className="text-xs text-content-tertiary mt-0.5">
                    {option.description}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
