'use client'

import { useState, useRef } from 'react'
import { Button } from '@tabsy/ui-components'
import {
  CreditCard,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Download,
  Filter,
  Banknote,
  Users
} from 'lucide-react'
import { tabsyClient } from '@tabsy/api-client'
import type { PaymentStatus } from '@tabsy/shared-types'
import { PaymentOverview } from './PaymentOverview'
import { ActivePayments, ActivePaymentsRef } from './ActivePayments'
import { PaymentHistory } from './PaymentHistory'
import { PaymentAnalytics } from './PaymentAnalytics'
import { PendingCashPayments, PendingCashPaymentsRef } from './PendingCashPayments'
import { SplitPaymentMonitoring, SplitPaymentMonitoringRef } from './SplitPaymentMonitoring'
import { usePaymentWebSocketSync } from '../../hooks/useWebSocketSync'
import { PaymentErrorBoundary } from '../ErrorBoundary'
import { logger } from '../../lib/logger'

interface PaymentManagementProps {
  restaurantId: string
}

type PaymentTab = 'overview' | 'active' | 'pending_cash' | 'split_payments' | 'history' | 'analytics'

// Ref types for components that need refresh
interface RefreshableRef {
  refetch: () => void
}

export function PaymentManagement({ restaurantId }: PaymentManagementProps) {
  const [activeTab, setActiveTab] = useState<PaymentTab>('overview')
  const [isExporting, setIsExporting] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [refreshKey, setRefreshKey] = useState(0) // Force re-render for components without refs

  // Refs for components with refresh capability
  const activePaymentsRef = useRef<ActivePaymentsRef | null>(null)
  const paymentOverviewRef = useRef<RefreshableRef | null>(null)
  const paymentHistoryRef = useRef<RefreshableRef | null>(null)
  const paymentAnalyticsRef = useRef<RefreshableRef | null>(null)
  const pendingCashRef = useRef<PendingCashPaymentsRef | null>(null)
  const splitPaymentRef = useRef<SplitPaymentMonitoringRef | null>(null)

  /**
   * SENIOR ARCHITECTURE: Centralized WebSocket Sync
   * Single point of truth for payment WebSocket events
   * All child components rely on React Query cache updates
   * This eliminates 25 duplicate event listeners
   */
  usePaymentWebSocketSync(restaurantId)

  const tabs = [
    {
      id: 'overview' as PaymentTab,
      label: 'Overview',
      icon: DollarSign,
      description: 'Payment summary and key metrics'
    },
    {
      id: 'active' as PaymentTab,
      label: 'Active Payments',
      icon: Clock,
      description: 'Monitor ongoing payments'
    },
    {
      id: 'pending_cash' as PaymentTab,
      label: 'Pending Cash',
      icon: Banknote,
      description: 'Manage pending cash payments'
    },
    {
      id: 'split_payments' as PaymentTab,
      label: 'Split Payments',
      icon: Users,
      description: 'Monitor split payment progress'
    },
    {
      id: 'history' as PaymentTab,
      label: 'Payment History',
      icon: CreditCard,
      description: 'View past transactions'
    },
    {
      id: 'analytics' as PaymentTab,
      label: 'Analytics',
      icon: TrendingUp,
      description: 'Payment insights and trends'
    }
  ]

  const handleRefresh = () => {
    // Call refresh based on active tab
    switch (activeTab) {
      case 'active':
        if (activePaymentsRef.current) {
          activePaymentsRef.current.refetch()
        }
        break
      case 'overview':
        if (paymentOverviewRef.current) {
          paymentOverviewRef.current.refetch()
        } else {
          // Force re-render for components without ref
          setRefreshKey(prev => prev + 1)
        }
        break
      case 'history':
        if (paymentHistoryRef.current) {
          paymentHistoryRef.current.refetch()
        }
        break
      case 'analytics':
        if (paymentAnalyticsRef.current) {
          paymentAnalyticsRef.current.refetch()
        } else {
          setRefreshKey(prev => prev + 1)
        }
        break
      case 'pending_cash':
        if (pendingCashRef.current) {
          pendingCashRef.current.refetch()
        }
        break
      case 'split_payments':
        if (splitPaymentRef.current) {
          splitPaymentRef.current.refetch()
        }
        break
      default:
        // Force refresh for unknown tabs
        setRefreshKey(prev => prev + 1)
    }
  }

  const handleExport = async () => {
    try {
      setIsExporting(true)
      if (activeTab === 'active' && activePaymentsRef.current) {
        activePaymentsRef.current.exportData()
      } else {
        // Generic export for other tabs
        const response = await tabsyClient.payment.getByRestaurant(restaurantId, {
          limit: 1000,
          status: filterStatus !== 'all' ? filterStatus as PaymentStatus : undefined
        })

        if (response.success && response.data) {
          // Create CSV content
          const headers = ['Payment ID', 'Amount', 'Status', 'Method', 'Order ID', 'Created At']
          const csvContent = [
            headers.join(','),
            ...response.data.map((payment: any) => [
              payment.id.slice(-8),
              `$${Number(payment.amount || 0).toFixed(2)}`,
              payment.status,
              payment.paymentMethod,
              payment.orderId?.slice(-8) || 'N/A',
              new Date(payment.createdAt).toLocaleString()
            ].join(','))
          ].join('\n')

          // Download CSV
          const blob = new Blob([csvContent], { type: 'text/csv' })
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.style.display = 'none'
          a.href = url
          a.download = `${activeTab}-payments-${new Date().toISOString().split('T')[0]}.csv`
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
        }
      }
    } catch (error) {
      logger.error('Error exporting payments', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleFilter = () => {
    // Toggle filter states or open filter modal
    const nextStatus = filterStatus === 'all' ? 'PENDING' : filterStatus === 'PENDING' ? 'COMPLETED' : 'all'
    setFilterStatus(nextStatus)
  }

  return (
    <PaymentErrorBoundary>
      <div className="h-full flex flex-col bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background border-b border-border-default">
        {/* Header */}
        <div className="bg-surface p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-content-primary">Payment Management</h1>
              <p className="text-content-secondary mt-1 text-sm sm:text-base">
                Monitor and manage all payment transactions
              </p>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 overflow-x-auto">
              <Button
                onClick={handleFilter}
                variant="outline"
                size="sm"
                className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0"
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filter: {filterStatus === 'all' ? 'All' : filterStatus}</span>
                <span className="sm:hidden">Filter</span>
              </Button>
              <Button
                onClick={handleExport}
                disabled={isExporting}
                variant="outline"
                size="sm"
                className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Export'}</span>
                <span className="sm:hidden">Export</span>
              </Button>
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Refresh</span>
                <span className="sm:hidden">Refresh</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-surface border-t border-border-default">
          <div className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex-1 px-2 md:px-4 lg:px-6 py-3 md:py-4 text-xs md:text-sm font-medium transition-all duration-200 ease-in-out focus:outline-none hover:bg-surface-secondary ${
                    activeTab === tab.id
                      ? 'text-primary bg-surface'
                      : 'text-content-secondary hover:text-content-primary'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-1 md:space-x-2">
                    <Icon className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                    <span className="truncate hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden text-[10px] leading-tight">{tab.label.split(' ')[0]}</span>
                  </div>
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary animate-in slide-in-from-left-full duration-300" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Scrollable Tab Content */}
      <div className="flex-1 overflow-y-auto bg-background">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="p-6">
            <PaymentOverview
              key={`overview-${refreshKey}`}
              restaurantId={restaurantId}
              isVisible={activeTab === 'overview'}
            />
          </div>
        )}

        {/* Active Payments Tab */}
        {activeTab === 'active' && (
          <ActivePayments
            restaurantId={restaurantId}
            ref={activePaymentsRef}
            hideControls={true}
            filterStatus={filterStatus}
          />
        )}

        {/* Pending Cash Tab */}
        {activeTab === 'pending_cash' && (
          <PendingCashPayments
            ref={pendingCashRef}
            restaurantId={restaurantId}
            isVisible={activeTab === 'pending_cash'}
          />
        )}

        {/* Split Payments Tab */}
        {activeTab === 'split_payments' && (
          <SplitPaymentMonitoring
            ref={splitPaymentRef}
            restaurantId={restaurantId}
            isVisible={activeTab === 'split_payments'}
          />
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <PaymentHistory
            restaurantId={restaurantId}
          />
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="p-6">
            <PaymentAnalytics
              key={`analytics-${refreshKey}`}
              restaurantId={restaurantId}
            />
          </div>
        )}
      </div>
    </div>
    </PaymentErrorBoundary>
  )
}