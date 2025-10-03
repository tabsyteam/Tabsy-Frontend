/**
 * Split Validation Display Component
 * Shows validation errors and warnings
 */

import { AlertCircle, Info, CheckCircle } from 'lucide-react'
import type { SplitValidationResult } from '@/types/split-calculation'

interface SplitValidationDisplayProps {
  validation: SplitValidationResult
}

export function SplitValidationDisplay({ validation }: SplitValidationDisplayProps) {
  // Don't show anything if valid and no warnings
  if (validation.isValid && validation.warnings.length === 0) {
    return (
      <div className="p-3 bg-status-success/10 border border-status-success/20 rounded-lg">
        <div className="flex items-center gap-2 text-status-success">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Perfect split - Ready to proceed</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Errors */}
      {validation.errors.map((error, index) => (
        <div
          key={`error-${index}`}
          className="p-3 bg-status-error/10 border border-status-error/20 rounded-lg"
        >
          <div className="flex items-start gap-2 text-status-error">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium">Invalid Split</div>
              <div className="text-xs text-status-error/80 mt-0.5">{error}</div>
            </div>
          </div>
        </div>
      ))}

      {/* Warnings */}
      {validation.warnings.map((warning, index) => (
        <div
          key={`warning-${index}`}
          className="p-3 bg-status-info/10 border border-status-info/20 rounded-lg"
        >
          <div className="flex items-start gap-2 text-status-info">
            <Info className="w-4 h-4 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium">Incomplete Split</div>
              <div className="text-xs text-status-info/80 mt-0.5">{warning}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
