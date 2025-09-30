'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CreditCard, Wallet } from 'lucide-react'
import { SessionManager } from '@/lib/session'
import { useBillStatus } from '@/hooks/useBillStatus'

interface FloatingPayButtonProps {
  className?: string
}

/**
 * Floating action button for quick access to bill payment
 * Shows on Menu and Orders pages only (not on Table page to avoid redundancy)
 * Positioned above bottom navigation for easy thumb access
 */
export function FloatingPayButton({ className = '' }: FloatingPayButtonProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { hasBill, remainingBalance, isPaid, isLoading } = useBillStatus()

  // CRITICAL: Session must be retrieved client-side only (after hydration)
  const [session, setSession] = useState<ReturnType<typeof SessionManager.getDiningSession>>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    // Mark as client-side rendered
    setIsClient(true)
    const clientSession = SessionManager.getDiningSession()
    setSession(clientSession)
  }, [])

  // Only show button if:
  // 1. Component is client-side rendered (prevents hydration mismatch)
  // 2. User has an active dining session (with tableSessionId)
  // 3. There's a bill with outstanding balance
  // 4. Bill is not fully paid yet
  // 5. NOT on Table page (to avoid redundancy with "Ready to Pay?" card)
  const hasValidSession = session && session.tableSessionId
  const isOnTablePage = pathname?.includes('/table')
  const shouldShow = isClient && hasValidSession && hasBill && !isPaid && remainingBalance > 0 && !isLoading && !isOnTablePage

  console.log('[FloatingPayButton] Display logic:', {
    isClient,
    hasValidSession,
    hasBill,
    isPaid,
    remainingBalance,
    isLoading,
    isOnTablePage,
    shouldShow,
    pathname,
    sessionData: {
      hasSession: !!session,
      tableSessionId: session?.tableSessionId,
      restaurantId: session?.restaurantId,
      tableId: session?.tableId
    }
  })

  const handlePayBill = () => {
    const queryParams = SessionManager.getDiningQueryParams()
    router.push(`/payment${queryParams}`)
  }

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30
          }}
          className={`fixed bottom-24 right-4 z-40 ${className}`}
        >
          <motion.button
            onClick={handlePayBill}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            className="relative flex items-center gap-3 px-6 py-4 bg-accent text-accent-foreground rounded-full shadow-2xl shadow-accent/40 hover:shadow-3xl hover:shadow-accent/50 transition-all duration-300 group"
            aria-label={`Pay bill: $${remainingBalance.toFixed(2)}`}
          >
            {/* Pulsing ring animation */}
            <motion.div
              className="absolute inset-0 rounded-full bg-accent opacity-75"
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.75, 0.5, 0.75]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />

            {/* Content */}
            <div className="relative flex items-center gap-3">
              {/* Icon with animation */}
              <motion.div
                animate={{
                  rotate: [0, -10, 10, -10, 0]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  repeatDelay: 2
                }}
              >
                <Wallet className="w-6 h-6" strokeWidth={2.5} />
              </motion.div>

              {/* Text */}
              <div className="flex flex-col items-start">
                <span className="text-xs font-semibold uppercase tracking-wide opacity-90">
                  Pay Bill
                </span>
                <span className="text-lg font-bold leading-tight">
                  ${remainingBalance.toFixed(2)}
                </span>
              </div>

              {/* Arrow indicator */}
              <motion.div
                animate={{
                  x: [0, 4, 0]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              >
                <CreditCard className="w-5 h-5 opacity-90" strokeWidth={2} />
              </motion.div>
            </div>
          </motion.button>

          {/* Subtle glow effect */}
          <div className="absolute inset-0 -z-10 blur-2xl bg-accent opacity-30 rounded-full" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}