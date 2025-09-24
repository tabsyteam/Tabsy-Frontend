'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@tabsy/ui-components'
import { ArrowLeft, Settings, User } from 'lucide-react'
import { useApi } from '@/components/providers/api-provider'
import { SessionManager } from '@/lib/session'
import { PaymentHistory } from './PaymentHistory'

export function PaymentHistoryView() {
  const router = useRouter()
  const { api } = useApi()
  const [activeTab, setActiveTab] = useState<'session' | 'all'>('session')

  const session = SessionManager.getDiningSession()

  const handleBack = () => {
    // Navigate back to profile or previous page
    if (session) {
      router.push(`/table${SessionManager.getDiningQueryParams()}`)
    } else {
      router.push('/profile')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface shadow-sm border-b sticky top-0 z-10 backdrop-blur-sm bg-surface/95">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="p-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-content-primary">Payment History</h1>
                <p className="text-sm text-content-tertiary">
                  View and manage your payment history
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/profile')}
              className="flex items-center space-x-2"
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 bg-surface-secondary rounded-lg p-1">
          <button
            onClick={() => setActiveTab('session')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'session'
                ? 'bg-surface text-content-primary shadow-sm'
                : 'text-content-secondary hover:text-content-primary'
            }`}
          >
            Current Session
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-surface text-content-primary shadow-sm'
                : 'text-content-secondary hover:text-content-primary'
            }`}
          >
            All Payments
          </button>
        </div>

        {/* Payment History Content */}
        {activeTab === 'session' ? (
          <div>
            {session?.tableSessionId ? (
              <div className="space-y-4">
                <div className="bg-surface-secondary rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-content-primary">
                        Current Table Session
                      </h3>
                      <p className="text-sm text-content-secondary">
                        Payments for this dining session
                      </p>
                    </div>
                    <div className="text-sm text-content-secondary">
                      Table {session.tableId}
                    </div>
                  </div>
                </div>

                <PaymentHistory
                  tableSessionId={session.tableSessionId}
                  api={api}
                />
              </div>
            ) : (
              <div className="bg-surface rounded-xl border p-8 text-center">
                <div className="text-content-secondary">
                  <p className="mb-4">No active table session found.</p>
                  <Button
                    onClick={() => router.push('/table')}
                    variant="outline"
                  >
                    Join a Table
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-status-info/10 border border-status-info/20 rounded-lg p-4">
              <div className="text-sm text-status-info">
                <strong>Note:</strong> This feature shows all payment history across all your dining sessions.
                Currently showing payments from the current session only.
              </div>
            </div>

            <PaymentHistory
              tableSessionId={session?.tableSessionId}
              api={api}
            />
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 bg-surface rounded-xl border p-6">
          <h3 className="text-lg font-semibold text-content-primary mb-4">
            Need Help?
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-surface-secondary rounded-lg">
              <h4 className="font-medium text-content-primary mb-2">
                Payment Issues
              </h4>
              <p className="text-sm text-content-secondary mb-3">
                Having trouble with a payment? Contact our support team.
              </p>
              <Button variant="outline" size="sm">
                Contact Support
              </Button>
            </div>

            <div className="p-4 bg-surface-secondary rounded-lg">
              <h4 className="font-medium text-content-primary mb-2">
                Receipt Questions
              </h4>
              <p className="text-sm text-content-secondary mb-3">
                Need help with receipts or refunds? We're here to help.
              </p>
              <Button variant="outline" size="sm">
                Get Help
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}