'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  MapPin,
  Clock,
  Users,
  MessageSquare,
  Star,
  Info,
  QrCode,
  Timer,
  Receipt,
  ClipboardList,
  CreditCard,
  CheckCircle
} from 'lucide-react'
import { Button } from '@tabsy/ui-components'
import { SessionManager } from '@/lib/session'
import { toast } from 'sonner'
import { useWebSocket } from '@tabsy/ui-components'
import { useSessionUpdates } from '@tabsy/api-client'
import { useSessionDetails } from '@/hooks/useSessionDetails'
import { useBillStatus } from '@/hooks/useBillStatus'
import { STORAGE_KEYS } from '@/constants/storage'
interface TableInfo {
  restaurant: {
    id: string
    name: string
    logo?: string
  }
  table: {
    id: string
    number: string
  }
}

export function TableSessionView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null)
  const [sessionTime, setSessionTime] = useState<string>('')
  const [hasSession, setHasSession] = useState(false)
  const [lastConnectionTime, setLastConnectionTime] = useState<Date | null>(null)

  // Get bill status for payment card
  const { hasBill, remainingBalance, isPaid, billAmount } = useBillStatus()

  // Get current session for WebSocket authentication
  const session = SessionManager.getDiningSession()

  // Fetch real session details from backend
  const {
    session: sessionDetails,
    tableSession: tableSessionDetails,
    users: sessionUsers,
    orders: sessionOrders,
    error: sessionError,
    isLoading: sessionLoading,
    refreshSessionDetails
  } = useSessionDetails(session?.sessionId || null, session?.tableSessionId || null)

  // Use global WebSocket connection for real-time customer features
  const { isConnected, error: wsError, client } = useWebSocket()

  // Track connection status and show user feedback
  useEffect(() => {
    if (isConnected) {
      console.log('[TableSession] Connected to customer WebSocket')
      setLastConnectionTime(new Date())
      toast.success('Connected to real-time updates')
    } else {
      console.log('[TableSession] Disconnected from customer WebSocket')
    }
  }, [isConnected])

  // Handle WebSocket errors
  useEffect(() => {
    if (wsError) {
      console.error('[TableSession] WebSocket error:', wsError)
    }
  }, [wsError])

  // Listen for session updates (order status, session expiry, etc.)
  useSessionUpdates(
    client,
    session?.sessionId || '',
    (data) => {
      console.log('[TableSession] Session update received:', data)

      // Handle different types of session updates
      if (data.type === 'order:status-update') {
        toast.info(`Order update: ${data.status}`)
      } else if (data.type === 'session:expired') {
        toast.error('Your session has expired. Please scan the QR code again.')
        SessionManager.clearDiningSession()
        router.push('/')
      } else if (data.type === 'order:created') {
        toast.success(`Order #${data.orderId} has been placed!`)
      }
    }
  )

  useEffect(() => {
    // Check for active session
    const session = SessionManager.getDiningSession()
    setHasSession(!!session)

    if (session) {
      // Get table info from sessionStorage
      const storedTableInfo = sessionStorage.getItem(STORAGE_KEYS.TABLE_INFO)
      if (storedTableInfo) {
        try {
          setTableInfo(JSON.parse(storedTableInfo))
        } catch (error) {
          console.error('Failed to parse table info:', error)
        }
      }

      // Calculate session duration from table session start time (when table was first occupied)
      const getSessionStartTime = () => {
        // Use table session timestamp from backend if available, otherwise guest session creation time
        if (tableSessionDetails?.createdAt) {
          return new Date(tableSessionDetails.createdAt)
        }
        // Fallback to guest session creation time
        return new Date(session.createdAt)
      }

      const updateSessionTime = () => {
        const startTime = getSessionStartTime()
        const now = new Date()
        const diff = now.getTime() - startTime.getTime()
        const minutes = Math.floor(diff / 60000)
        const hours = Math.floor(minutes / 60)

        if (hours > 0) {
          setSessionTime(`${hours}h ${minutes % 60}m`)
        } else {
          setSessionTime(`${minutes}m`)
        }
      }

      updateSessionTime()
      const interval = setInterval(updateSessionTime, 60000) // Update every minute

      return () => clearInterval(interval)
    }

    // Return undefined explicitly if no session
    return undefined
  }, [tableSessionDetails])

  const handleEndSession = () => {
    SessionManager.clearDiningSession()
    sessionStorage.removeItem('tabsy-session')
    sessionStorage.removeItem(STORAGE_KEYS.TABLE_INFO)
    sessionStorage.removeItem(STORAGE_KEYS.CART)
    toast.success('Session ended successfully')
    router.push('/')
  }

  const handleFeedback = () => {
    const session = SessionManager.getDiningSession()
    if (session) {
      router.push(`/feedback?restaurant=${session.restaurantId}&table=${session.tableId}`)
    }
  }

  const handleViewBill = () => {
    const session = SessionManager.getDiningSession()
    if (session) {
      router.push(`/table/bill${SessionManager.getDiningQueryParams()}`)
    }
  }

  const handleOrderTracking = () => {
    const session = SessionManager.getDiningSession()
    if (session) {
      router.push(`/table/orders${SessionManager.getDiningQueryParams()}`)
    }
  }

  const handleRequestHelp = async () => {
    if (!session) {
      toast.error('No active session found')
      return
    }

    if (isConnected && emit) {
      // Send help request via WebSocket to restaurant staff
      emit('table:assistance-requested', {
        tableId: session.tableId,
        restaurantId: session.restaurantId,
        sessionId: session.sessionId,
        requestType: 'ASSISTANCE',
        message: 'Customer needs assistance',
        timestamp: new Date().toISOString()
      })
      toast.success('Help request sent to restaurant staff')
    } else {
      // Fallback: could use API call if WebSocket is not connected
      toast.error('Unable to send help request. Please try again.')
    }
  }

  // Show message if no session
  if (!hasSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto px-4">
          <div className="w-16 h-16 mx-auto bg-surface-secondary rounded-full flex items-center justify-center">
            <QrCode className="w-8 h-8 text-content-tertiary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-content-primary mb-2">
              No Active Session
            </h1>
            <p className="text-content-secondary">
              Please scan a QR code at your table to start a dining session.
            </p>
          </div>
          <Button
            onClick={() => router.push('/')}
            className="w-full"
          >
            Scan QR Code
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-surface shadow-sm border-b sticky top-0 z-10 backdrop-blur-sm bg-surface/95">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-content-primary">Table Session</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Pay Your Bill Card - Prominent CTA */}
        {hasBill && !isPaid && remainingBalance > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 30
            }}
            className="bg-gradient-to-br from-accent via-accent to-accent-hover rounded-2xl border-2 border-accent-hover shadow-2xl shadow-accent/30 overflow-hidden relative"
          >
            {/* Animated background effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              animate={{
                x: ['-100%', '200%']
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'linear',
                repeatDelay: 1
              }}
            />

            <div className="relative p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <motion.div
                    animate={{
                      rotate: [0, -10, 10, -10, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      repeatDelay: 2
                    }}
                    className="w-12 h-12 bg-accent-foreground/10 rounded-xl flex items-center justify-center"
                  >
                    <Receipt className="w-6 h-6 text-accent-foreground" />
                  </motion.div>
                  <div>
                    <h2 className="text-xl font-bold text-accent-foreground">
                      Ready to Pay?
                    </h2>
                    <p className="text-accent-foreground/80 text-sm">
                      Your bill is ready for payment
                    </p>
                  </div>
                </div>
                <motion.div
                  animate={{
                    scale: [1, 1.05, 1]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                  className="px-4 py-2 bg-accent-foreground/10 rounded-full"
                >
                  <p className="text-xs font-semibold text-accent-foreground/80 uppercase tracking-wide">
                    Due Now
                  </p>
                  <p className="text-2xl font-bold text-accent-foreground">
                    ${remainingBalance.toFixed(2)}
                  </p>
                </motion.div>
              </div>

              {/* Payment Info */}
              <div className="mb-4 p-3 bg-accent-foreground/5 rounded-lg border border-accent-foreground/10">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-accent-foreground/70">Total Bill:</span>
                  <span className="font-semibold text-accent-foreground">${billAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-accent-foreground/70">Remaining:</span>
                  <span className="font-bold text-accent-foreground">${remainingBalance.toFixed(2)}</span>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleViewBill}
                  className="flex-1 bg-accent-foreground text-accent hover:bg-accent-foreground/90 shadow-lg hover:shadow-xl transition-all duration-200"
                  size="lg"
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  <span className="font-bold">Pay Now</span>
                </Button>
                <Button
                  onClick={handleViewBill}
                  variant="outline"
                  className="bg-accent-foreground/10 text-accent-foreground border-accent-foreground/20 hover:bg-accent-foreground/20"
                  size="lg"
                >
                  View Bill
                </Button>
              </div>

              {/* Quick Info */}
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-accent-foreground/70">
                <CheckCircle className="w-4 h-4" />
                <span>Secure payment • Split bill option available</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Restaurant & Table Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-xl border p-6"
        >
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-content-primary">
                {tableInfo?.restaurant.name || 'Restaurant'}
              </h2>
              <p className="text-content-secondary">
                Table {tableInfo?.table.number || 'N/A'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-3">
              <Timer className="w-5 h-5 text-content-tertiary" />
              <div>
                <p className="text-sm text-content-secondary">Session Duration</p>
                <p className="font-medium text-content-primary">{sessionTime || '0m'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-content-tertiary" />
              <div>
                <p className="text-sm text-content-secondary">Active Users</p>
                <p className="font-medium text-content-primary">
                  {sessionUsers?.totalUsers || 1}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Table Session Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface rounded-xl border p-6"
        >
          <h3 className="text-lg font-semibold text-content-primary mb-4">Table Session</h3>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleViewBill}
            >
              <Receipt className="w-4 h-4 mr-3" />
              View Bill & Payment
            </Button>


            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleOrderTracking}
            >
              <ClipboardList className="w-4 h-4 mr-3" />
              Track Orders
            </Button>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-surface rounded-xl border p-6"
        >
          <h3 className="text-lg font-semibold text-content-primary mb-4">Quick Actions</h3>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleRequestHelp}
            >
              <MessageSquare className="w-4 h-4 mr-3" />
              Request Assistance
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleFeedback}
            >
              <Star className="w-4 h-4 mr-3" />
              Leave Feedback
            </Button>
          </div>
        </motion.div>

        {/* Session Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-surface rounded-xl border p-6"
        >
          <h3 className="text-lg font-semibold text-content-primary mb-4">Session Information</h3>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-content-secondary">Started:</span>
              <span className="text-content-primary">
                {(() => {
                  // Use table session creation time (when table was first occupied)
                  if (tableSessionDetails?.createdAt) {
                    return new Date(tableSessionDetails.createdAt).toLocaleTimeString()
                  }
                  // Fallback to guest session creation time
                  return new Date(session?.createdAt || Date.now()).toLocaleTimeString()
                })()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-content-secondary">Status:</span>
              <span className="text-status-success font-medium">Active</span>
            </div>
            <div className="flex justify-between">
              <span className="text-content-secondary">Real-time Updates:</span>
              <span className={`font-medium ${isConnected ? 'text-status-success' : 'text-status-error'}`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-content-secondary">Session expires:</span>
              <span className="text-content-primary">
                {tableSessionDetails?.expiresAt
                  ? new Date(tableSessionDetails.expiresAt).toLocaleString()
                  : 'N/A'
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-content-secondary">Connected at:</span>
              <span className="text-content-primary">
                {(() => {
                  // Use guest session creation time (when this specific guest joined)
                  if (sessionDetails?.createdAt) {
                    return new Date(sessionDetails.createdAt).toLocaleTimeString()
                  }
                  // Use the session creation time from SessionManager
                  return new Date(session?.createdAt || Date.now()).toLocaleTimeString()
                })()}
              </span>
            </div>
            {sessionOrders && (
              <div className="flex justify-between">
                <span className="text-content-secondary">Total Orders:</span>
                <span className="text-content-primary">
                  {Object.values(sessionOrders.ordersByRound).flat().length}
                </span>
              </div>
            )}
            {sessionOrders && sessionOrders.totalAmount && Number(sessionOrders.totalAmount) > 0 && (
              <div className="flex justify-between">
                <span className="text-content-secondary">Total Amount:</span>
                <span className="text-content-primary">
                  ${Number(sessionOrders.totalAmount).toFixed(2)}
                </span>
              </div>
            )}
            {wsError && (
              <div className="flex justify-between">
                <span className="text-content-secondary">Connection Error:</span>
                <span className="text-status-error text-sm">{wsError.message}</span>
              </div>
            )}
            {sessionError && (
              <div className="flex justify-between">
                <span className="text-content-secondary">Session Error:</span>
                <span className="text-status-error text-sm">{sessionError}</span>
              </div>
            )}
          </div>
        </motion.div>

      </div>
    </div>
  )
}