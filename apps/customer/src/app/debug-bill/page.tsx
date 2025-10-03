'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useBillStatus } from '@/hooks/useBillData' // ✅ Updated to use React Query version
import { dualReadSession } from '@/lib/unifiedSessionStorage'

export default function DebugBillPage() {
  const router = useRouter()
  const billStatus = useBillStatus()
  const session = dualReadSession()

  // Security: Only allow access in development environment
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[DebugBillPage] Access denied in production')
      router.push('/')
    }
  }, [router])

  // Don't render anything in production (double safety)
  if (process.env.NODE_ENV === 'production') {
    return null
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Bill Status Debug (Development Only)</h1>

      <div className="space-y-6">
        {/* Session Info */}
        <div className="bg-surface border rounded-lg p-4">
          <h2 className="font-semibold mb-2">Session Info</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>

        {/* Bill Status */}
        <div className="bg-surface border rounded-lg p-4">
          <h2 className="font-semibold mb-2">Bill Status</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Has Bill:</strong> {billStatus.hasBill ? 'Yes' : 'No'}</p>
            <p><strong>Bill Amount:</strong> ${billStatus.billAmount.toFixed(2)}</p>
            <p><strong>Remaining Balance:</strong> ${billStatus.remainingBalance.toFixed(2)}</p>
            <p><strong>Is Paid:</strong> {billStatus.isPaid ? 'Yes' : 'No'}</p>
            <p><strong>Is Loading:</strong> {billStatus.isLoading ? 'Yes' : 'No'}</p>
            <p><strong>Error:</strong> {billStatus.error || 'None'}</p>
          </div>
        </div>

        {/* Full Bill Data */}
        <div className="bg-surface border rounded-lg p-4">
          <h2 className="font-semibold mb-2">Full Bill Data</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(billStatus.bill, null, 2)}
          </pre>
        </div>

        {/* Should Show Button */}
        <div className="bg-surface border rounded-lg p-4">
          <h2 className="font-semibold mb-2">Display Conditions</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Has Session:</strong> {session ? 'Yes' : 'No'}</p>
            <p><strong>Has TableSessionId:</strong> {session?.tableSessionId || 'No'}</p>
            <p><strong>Should Show Button:</strong> {
              session && billStatus.hasBill && !billStatus.isPaid && billStatus.remainingBalance > 0 && !billStatus.isLoading
                ? 'YES ✅'
                : 'NO ❌'
            }</p>
            <p><strong>Reason:</strong></p>
            <ul className="list-disc list-inside ml-4 text-xs">
              {!session && <li>No session found</li>}
              {session && !session.tableSessionId && <li>No tableSessionId in session</li>}
              {!billStatus.hasBill && <li>No bill (hasBill = false)</li>}
              {billStatus.isPaid && <li>Bill is already paid</li>}
              {billStatus.remainingBalance <= 0 && <li>No remaining balance</li>}
              {billStatus.isLoading && <li>Still loading...</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}