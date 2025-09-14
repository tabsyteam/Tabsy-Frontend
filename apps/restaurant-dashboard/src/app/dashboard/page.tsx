'use client'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Suspense } from 'react'
import { DashboardClient } from '../dashboard-page'

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <header className="bg-card border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="h-8 w-48 bg-bg-primary/10 rounded animate-pulse" />
              <div className="flex space-x-4">
                <div className="h-8 w-20 bg-bg-primary/10 rounded animate-pulse" />
                <div className="h-8 w-20 bg-bg-primary/10 rounded animate-pulse" />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="h-8 w-24 bg-bg-primary/10 rounded animate-pulse" />
              <div className="h-8 w-20 bg-bg-primary/10 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card rounded-lg shadow p-6">
              <div className="h-12 w-12 bg-bg-primary/10 rounded animate-pulse mb-4" />
              <div className="h-4 w-24 bg-bg-primary/10 rounded animate-pulse mb-2" />
              <div className="h-8 w-16 bg-bg-primary/10 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default function DashboardPage(): JSX.Element {
  return (
    <ProtectedRoute>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardClient />
      </Suspense>
    </ProtectedRoute>
  )
}