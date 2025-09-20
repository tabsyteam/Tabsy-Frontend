'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { OrderStatus, type Order } from '@tabsy/shared-types'

export type FilterStatus = 'all' | 'active' | OrderStatus

interface OrderFilterPillsProps {
  orders: Order[]
  selectedFilters: FilterStatus[]
  onFiltersChange: (filters: FilterStatus[]) => void
  className?: string
}

interface FilterOption {
  id: FilterStatus
  label: string
  color: string
  bgColor: string
  borderColor: string
  activeColor: string
  activeBgColor: string
  activeBorderColor: string
}

const FILTER_OPTIONS: FilterOption[] = [
  {
    id: 'all',
    label: 'All',
    color: 'text-content-primary',
    bgColor: 'bg-surface',
    borderColor: 'border-default',
    activeColor: 'text-primary-foreground',
    activeBgColor: 'bg-primary',
    activeBorderColor: 'border-primary'
  },
  {
    id: 'active',
    label: 'Active',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    activeColor: 'text-white',
    activeBgColor: 'bg-orange-600',
    activeBorderColor: 'border-orange-600'
  },
  {
    id: OrderStatus.RECEIVED,
    label: 'Received',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    activeColor: 'text-white',
    activeBgColor: 'bg-blue-600',
    activeBorderColor: 'border-blue-600'
  },
  {
    id: OrderStatus.PREPARING,
    label: 'Preparing',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    activeColor: 'text-white',
    activeBgColor: 'bg-amber-600',
    activeBorderColor: 'border-amber-600'
  },
  {
    id: OrderStatus.READY,
    label: 'Ready',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    activeColor: 'text-white',
    activeBgColor: 'bg-purple-600',
    activeBorderColor: 'border-purple-600'
  },
  {
    id: OrderStatus.DELIVERED,
    label: 'Delivered',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    activeColor: 'text-white',
    activeBgColor: 'bg-green-600',
    activeBorderColor: 'border-green-600'
  },
  {
    id: OrderStatus.COMPLETED,
    label: 'Completed',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    activeColor: 'text-white',
    activeBgColor: 'bg-gray-600',
    activeBorderColor: 'border-gray-600'
  }
]

export function OrderFilterPills({
  orders,
  selectedFilters,
  onFiltersChange,
  className = ''
}: OrderFilterPillsProps) {
  const getOrderCount = (filterId: FilterStatus): number => {
    if (filterId === 'all') {
      return orders.length
    }

    if (filterId === 'active') {
      return orders.filter(order =>
        ![OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(order.status)
      ).length
    }

    return orders.filter(order => order.status === filterId).length
  }

  const handleFilterToggle = (filterId: FilterStatus) => {
    if (filterId === 'all') {
      // If clicking "All", clear all other filters and select only "all"
      onFiltersChange(['all'])
      return
    }

    let newFilters = [...selectedFilters]

    // Remove "all" if it was selected and we're selecting a specific filter
    if (newFilters.includes('all')) {
      newFilters = newFilters.filter(f => f !== 'all')
    }

    if (newFilters.includes(filterId)) {
      // Remove the filter if it's already selected
      newFilters = newFilters.filter(f => f !== filterId)

      // If no filters left, default to "all"
      if (newFilters.length === 0) {
        newFilters = ['all']
      }
    } else {
      // Add the filter
      newFilters.push(filterId)
    }

    onFiltersChange(newFilters)
  }

  return (
    <div className={`${className}`}>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
        {FILTER_OPTIONS.map((option) => {
          const count = getOrderCount(option.id)
          const isSelected = selectedFilters.includes(option.id)
          const isVisible = count > 0 || option.id === 'all' || isSelected

          // Don't show filters with 0 count unless they're selected or it's "all"
          if (!isVisible) return null

          return (
            <AnimatePresence key={option.id}>
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleFilterToggle(option.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm font-medium
                  transition-all duration-200 whitespace-nowrap min-w-0 flex-shrink-0
                  ${isSelected
                    ? `${option.activeColor} ${option.activeBgColor} ${option.activeBorderColor} shadow-sm`
                    : `${option.color} ${option.bgColor} ${option.borderColor} hover:border-opacity-60`
                  }
                `}
              >
                <span className="truncate">{option.label}</span>
                {count > 0 && (
                  <motion.span
                    key={count}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className={`
                      inline-flex items-center justify-center min-w-[18px] h-[18px] px-1
                      rounded-full text-xs font-semibold leading-none
                      ${isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-black/10 text-black/70'
                      }
                    `}
                  >
                    {count}
                  </motion.span>
                )}
              </motion.button>
            </AnimatePresence>
          )
        })}
      </div>
    </div>
  )
}

// Helper function to filter orders based on selected filters
export function filterOrdersByStatus(orders: Order[], selectedFilters: FilterStatus[]): Order[] {
  if (selectedFilters.includes('all') || selectedFilters.length === 0) {
    return orders
  }

  return orders.filter(order => {
    // Check if order matches any selected filter
    return selectedFilters.some(filter => {
      if (filter === 'active') {
        return ![OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(order.status)
      }
      return order.status === filter
    })
  })
}