'use client'

import { useState } from 'react'
import { SessionMonitoring, SessionAnalytics } from '@/components/sessions'
// Tabs components replaced with custom implementation
import { Activity, BarChart3 } from 'lucide-react'

export default function SessionsPage() {
  const [activeTab, setActiveTab] = useState('monitoring')

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Table Sessions</h1>
        <p className="text-content-secondary">
          Monitor active table sessions and analyze session metrics across your platform
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid w-full grid-cols-2 lg:w-[400px] border rounded-lg p-1 bg-muted">
          <button
            onClick={() => setActiveTab('monitoring')}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors ${
              activeTab === 'monitoring'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Activity className="w-4 h-4" />
            Session Monitoring
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-colors ${
              activeTab === 'analytics'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </button>
        </div>

        {activeTab === 'monitoring' && (
          <div className="space-y-6">
            <SessionMonitoring />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <SessionAnalytics />
          </div>
        )}
      </div>
    </div>
  )
}