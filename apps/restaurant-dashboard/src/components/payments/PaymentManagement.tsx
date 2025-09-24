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
  Filter
} from 'lucide-react'
import { tabsyClient } from '@tabsy/api-client'
import { PaymentOverview } from './PaymentOverview'
import { ActivePayments, ActivePaymentsRef } from './ActivePayments'
import { PaymentHistory } from './PaymentHistory'
import { PaymentAnalytics } from './PaymentAnalytics'

interface PaymentManagementProps {
  restaurantId: string
}

type PaymentTab = 'overview' | 'active' | 'history' | 'analytics'

export function PaymentManagement({ restaurantId }: PaymentManagementProps) {
  const [activeTab, setActiveTab] = useState<PaymentTab>('overview')
  const [isExporting, setIsExporting] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const activePaymentsRef = useRef<ActivePaymentsRef | null>(null)

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
    if (activeTab === 'active' && activePaymentsRef.current) {
      activePaymentsRef.current.refetch()
    }
    // Add refresh logic for other tabs here
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
          status: filterStatus !== 'all' ? filterStatus : undefined
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
              payment.method,
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
      console.error('Error exporting payments:', error)
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
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border-default bg-surface p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-content-primary">Payment Management</h1>
            <p className="text-content-secondary mt-1">
              Monitor and manage all payment transactions
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={handleFilter}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <Filter className="w-4 h-4" />
              <span>Filter: {filterStatus === 'all' ? 'All' : filterStatus}</span>
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Exporting...' : 'Export'}</span>
            </Button>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className=" bg-surface">
        <div className="flex space-x-0">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-6 py-4 text-sm font-medium transition-all duration-200 ease-in-out focus:outline-none hover:scale-105 active:scale-95 ${
                  activeTab === tab.id
                    ? 'text-primary bg-surface hover:bg-surface-secondary'
                    : 'text-content-secondary hover:text-content-primary hover:bg-surface-secondary'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </div>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary animate-in slide-in-from-left-full duration-300" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        <div
          className={`h-full transition-opacity duration-300 ease-in-out ${
            activeTab === 'overview' ? 'opacity-100' : 'opacity-0 hidden'
          }`}
        >
          <PaymentOverview restaurantId={restaurantId} />
        </div>

        <div
          className={`h-full transition-opacity duration-300 ease-in-out ${
            activeTab === 'active' ? 'opacity-100' : 'opacity-0 hidden'
          }`}
        >
          <ActivePayments
            restaurantId={restaurantId}
            ref={activePaymentsRef}
            hideControls={true}
            filterStatus={filterStatus}
          />
        </div>

        <div
          className={`h-full transition-opacity duration-300 ease-in-out ${
            activeTab === 'history' ? 'opacity-100' : 'opacity-0 hidden'
          }`}
        >
          <PaymentHistory restaurantId={restaurantId} />
        </div>

        <div
          className={`h-full transition-opacity duration-300 ease-in-out ${
            activeTab === 'analytics' ? 'opacity-100' : 'opacity-0 hidden'
          }`}
        >
          <PaymentAnalytics restaurantId={restaurantId} />
        </div>
      </div>
    </div>
  )
}