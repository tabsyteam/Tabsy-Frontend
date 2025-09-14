'use client'

import { useState } from 'react'
import { OrderStatus } from '@tabsy/shared-types'
import { CheckCircle2, Clock, AlertTriangle, Package, Utensils, CheckSquare } from 'lucide-react'

interface OrderStatusFlowProps {
  currentStatus: OrderStatus
  onStatusUpdate: (newStatus: OrderStatus) => void
  disabled?: boolean
}

interface StatusStep {
  status: OrderStatus
  label: string
  icon: React.ReactNode
  color: string
  bgColor: string
  description: string
}

export function OrderStatusFlow({ currentStatus, onStatusUpdate, disabled = false }: OrderStatusFlowProps) {
  const [hoveredStatus, setHoveredStatus] = useState<OrderStatus | null>(null)

  const statusSteps: StatusStep[] = [
    {
      status: OrderStatus.RECEIVED,
      label: 'Received',
      icon: <CheckSquare className="w-4 h-4" />,
      color: 'text-primary',
      bgColor: 'bg-primary/10 border-primary/20',
      description: 'Order received'
    },
    {
      status: OrderStatus.PREPARING,
      label: 'Preparing',
      icon: <Utensils className="w-4 h-4" />,
      color: 'text-warning',
      bgColor: 'bg-warning/10 border-warning/20',
      description: 'In kitchen'
    },
    {
      status: OrderStatus.READY,
      label: 'Ready',
      icon: <Package className="w-4 h-4" />,
      color: 'text-success',
      bgColor: 'bg-success/10 border-success/20',
      description: 'Ready to serve'
    },
    {
      status: OrderStatus.DELIVERED,
      label: 'Delivered',
      icon: <CheckCircle2 className="w-4 h-4" />,
      color: 'text-success',
      bgColor: 'bg-success/10 border-success/20',
      description: 'Order delivered'
    },
    {
      status: OrderStatus.COMPLETED,
      label: 'Completed',
      icon: <CheckCircle2 className="w-4 h-4" />,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted border-border',
      description: 'Order complete'
    }
  ]

  const getCurrentStepIndex = () => {
    return statusSteps.findIndex(step => step.status === currentStatus)
  }

  const isStepCompleted = (stepIndex: number) => {
    return stepIndex < getCurrentStepIndex()
  }

  const isStepCurrent = (stepIndex: number) => {
    return stepIndex === getCurrentStepIndex()
  }

  const isStepClickable = (stepIndex: number) => {
    const currentIndex = getCurrentStepIndex()
    return !disabled && (stepIndex === currentIndex + 1 || stepIndex <= currentIndex)
  }

  const getStepStyles = (step: StatusStep, stepIndex: number) => {
    const isCompleted = isStepCompleted(stepIndex)
    const isCurrent = isStepCurrent(stepIndex)
    const isClickable = isStepClickable(stepIndex)
    const isHovered = hoveredStatus === step.status

    if (isCompleted) {
      return {
        container: 'bg-primary text-primary-foreground border-primary shadow-sm',
        connector: 'bg-primary'
      }
    }

    if (isCurrent) {
      return {
        container: `${step.bgColor} ${step.color} border-2 shadow-md ring-1 ring-primary/20`,
        connector: 'bg-border'
      }
    }

    if (isClickable && (isHovered || !disabled)) {
      return {
        container: `${step.bgColor} ${step.color} border-2 hover:shadow-sm cursor-pointer transition-all duration-200`,
        connector: 'bg-border'
      }
    }

    return {
      container: 'bg-muted text-muted-foreground border-border',
      connector: 'bg-border'
    }
  }

  const handleStepClick = (step: StatusStep, stepIndex: number) => {
    if (isStepClickable(stepIndex) && step.status !== currentStatus) {
      onStatusUpdate(step.status)
    }
  }

  return (
    <div className="w-full p-4 bg-card rounded-lg border">
      <h3 className="text-base font-semibold text-foreground mb-3">Order Progress</h3>
      
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-6 left-6 right-6 h-0.5 bg-border rounded-full">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ 
              width: `${(getCurrentStepIndex() / (statusSteps.length - 1)) * 100}%` 
            }}
          />
        </div>

        {/* Status Steps */}
        <div className="relative flex justify-between">
          {statusSteps.map((step, index) => {
            const styles = getStepStyles(step, index)
            const isCompleted = isStepCompleted(index)
            const isCurrent = isStepCurrent(index)
            const isClickable = isStepClickable(index)

            return (
              <div key={step.status} className="flex flex-col items-center">
                {/* Step Circle */}
                <div
                  className={`relative w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 cursor-pointer ${styles.container}`}
                  onClick={() => handleStepClick(step, index)}
                  onMouseEnter={() => isClickable && setHoveredStatus(step.status)}
                  onMouseLeave={() => setHoveredStatus(null)}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    step.icon
                  )}
                  
                  {/* Pulse animation for current step */}
                  {isCurrent && (
                    <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20" />
                  )}
                </div>

                {/* Step Label */}
                <div className="mt-2 text-center">
                  <p className={`text-xs font-medium ${
                    isCompleted || isCurrent ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 max-w-16 leading-tight">
                    {step.description}
                  </p>
                </div>

                {/* Tooltip on hover */}
                {hoveredStatus === step.status && isClickable && step.status !== currentStatus && (
                  <div className="absolute -top-10 bg-popover text-popover-foreground text-xs rounded-md px-2 py-1 whitespace-nowrap z-10 shadow-md border">
                    Click to update to {step.label}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-border" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Current Status Info */}
      <div className="mt-4 p-3 bg-muted/50 rounded-md border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Current Status</p>
            <p className="text-sm font-semibold text-foreground">{currentStatus.replace('_', ' ')}</p>
          </div>
          {getCurrentStepIndex() < statusSteps.length - 1 && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Next Step</p>
              <p className="text-sm font-semibold text-primary">
                {statusSteps[getCurrentStepIndex() + 1]?.label || 'Complete'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}