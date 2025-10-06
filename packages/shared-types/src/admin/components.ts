/**
 * Admin Portal Component Types
 * Proper TypeScript interfaces for UI components
 */

import { ReactNode, ComponentType } from 'react'
import { OrderStatus, PaymentStatus, PaymentMethod } from '../domain'

/**
 * Icon component type (compatible with lucide-react and other icon libraries)
 */
export type IconComponent = ComponentType<{ className?: string; size?: number | string }>

/**
 * Metric Card Component Props
 */
export interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  icon: IconComponent
  trend?: 'up' | 'down' | 'neutral'
  subtitle?: string
  loading?: boolean
}

/**
 * Status Badge Component Props
 */
export interface StatusBadgeProps {
  status: OrderStatus | PaymentStatus
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Payment Method Icon Props
 */
export interface PaymentMethodIconProps {
  method: PaymentMethod
  className?: string
}

/**
 * Order Item Option Display Interface
 */
export interface OrderItemOptionDisplay {
  id?: string
  optionId?: string
  valueId?: string
  optionName: string
  name?: string // Alternative field name
  valueName?: string
  value?: string // Alternative field name
  choice?: string // Alternative field name
  price: number
}

/**
 * Activity Item Interface
 */
export interface ActivityItem {
  id: string
  type: 'order' | 'payment' | 'session' | 'system'
  title: string
  description?: string
  timestamp: string
  user?: string
  metadata?: Record<string, unknown>
}

/**
 * Chart Data Point Interface
 */
export interface ChartDataPoint {
  label: string
  value: number
  timestamp?: string
}

/**
 * Table Column Definition
 */
export interface TableColumn<T = unknown> {
  key: string
  header: string
  accessor: (item: T) => ReactNode
  sortable?: boolean
  width?: string
}

/**
 * Pagination Props
 */
export interface PaginationProps {
  currentPage: number
  totalPages: number
  itemsPerPage: number
  totalItems: number
  onPageChange: (page: number) => void
  onItemsPerPageChange?: (itemsPerPage: number) => void
}

/**
 * Filter State Interface
 */
export interface FilterState {
  search?: string
  status?: string
  dateRange?: 'all' | 'today' | 'week' | 'month' | 'custom'
  dateFrom?: Date
  dateTo?: Date
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * Modal Props Base Interface
 */
export interface BaseModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

/**
 * Dropdown Menu Item Interface
 */
export interface DropdownMenuItem {
  id: string
  label: string
  icon?: IconComponent
  onClick: () => void
  variant?: 'default' | 'danger' | 'success'
  disabled?: boolean
  divider?: boolean
}

/**
 * Tab Item Interface
 */
export interface TabItem {
  id: string
  label: string
  icon?: IconComponent
  content: ReactNode
  badge?: string | number
  disabled?: boolean
}

/**
 * Alert Props Interface
 */
export interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  dismissible?: boolean
  onDismiss?: () => void
}

/**
 * Loading State Props
 */
export interface LoadingStateProps {
  loading: boolean
  error?: Error | null
  empty?: boolean
  children: ReactNode
  loadingComponent?: ReactNode
  errorComponent?: ReactNode
  emptyComponent?: ReactNode
}

/**
 * Restaurant Info for Dropdowns
 */
export interface RestaurantOption {
  id: string
  name: string
  active?: boolean
}

/**
 * Date Range Picker Value
 */
export interface DateRangeValue {
  from: Date
  to: Date
  preset?: 'today' | 'week' | 'month' | 'custom'
}

/**
 * Export Options Interface
 */
export interface ExportOptions {
  format: 'csv' | 'pdf' | 'excel'
  fileName?: string
  includeHeaders?: boolean
  dateRange?: DateRangeValue
}

/**
 * Breadcrumb Item Interface
 */
export interface BreadcrumbItem {
  label: string
  href?: string
  current?: boolean
}
