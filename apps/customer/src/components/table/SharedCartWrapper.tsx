'use client'

import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { SharedCartView } from '@/components/table/SharedCartView'
import { useTableSessionData } from '@/hooks/useTableSessionData'

export function SharedCartWrapper() {
  const { tableSession, currentUser, users, isLoading, error, api } = useTableSessionData()
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !tableSession || !currentUser) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-lg font-semibold mb-2">Unable to Load Shared Cart</h2>
        <p className="text-content-secondary mb-4">
          {error || 'Table session data not available'}
        </p>
        <button
          onClick={() => router.push('/table')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
        >
          Back to Table
        </button>
      </div>
    )
  }

  return (
    <SharedCartView
      tableSession={tableSession}
      currentUser={currentUser}
      users={users}
      api={api}
    />
  )
}