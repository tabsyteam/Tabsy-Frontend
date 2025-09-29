'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useWebSocketEvent, useWebSocket } from '@tabsy/ui-components'
import { SessionManager } from '@/lib/session'
import { SessionTransitionModal } from './SessionTransitionModal'
import { useToast } from '@tabsy/ui-components'
import { useCart } from '@/hooks/useCart'

interface SessionReplacementHandlerProps {
  children: React.ReactNode
}

function SessionReplacementHandlerInner({ children }: SessionReplacementHandlerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const { clearCart } = useCart()
  const { client, isConnected, disconnect } = useWebSocket()

  const [modalState, setModalState] = useState<{
    isOpen: boolean
    type: 'session-ending' | 'session-replaced' | 'thank-you'
  }>({
    isOpen: false,
    type: 'session-replaced'
  })

  const [restaurantName, setRestaurantName] = useState<string>()
  const hasHandledReplacement = useRef(false)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 3

  // Get restaurant name from session
  useEffect(() => {
    const session = SessionManager.getDiningSession()
    if (session?.restaurantName) {
      setRestaurantName(session.restaurantName)
    }
  }, [])

  // Clear all session data and navigate to home
  const handleSessionCleanup = useCallback(async (reason: 'replaced' | 'ended' | 'error') => {
    console.log(`🧹 [SessionReplacementHandler] Cleaning up session due to: ${reason}`)

    // Clear all local data
    try {
      // Clear session storage
      SessionManager.handleSessionExpiry()

      // Clear guest session ID specifically
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('tabsy-guest-session-id')
        sessionStorage.removeItem('tabsy-dining-session')
        sessionStorage.removeItem('tabsy-current-order')
        sessionStorage.removeItem('tabsy-order-history')
      }

      // Clear cart
      clearCart()

      // Disconnect WebSocket
      disconnect()

      console.log('✅ [SessionReplacementHandler] Session cleanup complete')
    } catch (error) {
      console.error('❌ [SessionReplacementHandler] Error during cleanup:', error)
    }

    // Navigate to home after a short delay
    setTimeout(() => {
      if (pathname !== '/') {
        router.push('/')
      }
    }, 100)
  }, [clearCart, disconnect, router, pathname])

  // Handle pre-disconnection notification (graceful session ending)
  useWebSocketEvent('sessionReplacing', (data: any) => {
    console.log('🔔 [SessionReplacementHandler] Session replacing event received:', data)

    if (hasHandledReplacement.current) {
      console.log('⚠️ Already handled replacement, skipping...')
      return
    }

    hasHandledReplacement.current = true

    // Show thank you modal for the leaving guest
    setModalState({
      isOpen: true,
      type: 'session-ending'
    })

    // Show toast notification as well
    toast({
      title: "Session Complete",
      description: "Thank you for dining with us! Your session has ended.",
      duration: 5000,
    })
  }, [toast], 'SessionReplacementHandler')

  // Handle session replaced event (new guest arrived)
  useWebSocketEvent('sessionReplaced', (data: any) => {
    console.log('🔔 [SessionReplacementHandler] Session replaced event received:', data)

    if (hasHandledReplacement.current) {
      console.log('⚠️ Already handled replacement, skipping...')
      return
    }

    hasHandledReplacement.current = true

    // Show session replaced modal
    setModalState({
      isOpen: true,
      type: 'session-replaced'
    })
  }, [], 'SessionReplacementHandler')

  // Handle invalid session error
  useWebSocketEvent('invalidSession', (data: any) => {
    console.log('🔔 [SessionReplacementHandler] Invalid session event received:', data)

    // Show toast with helpful message
    toast({
      title: "Session Invalid",
      description: "Please scan the QR code at your table to start a new session.",
      variant: "destructive",
      duration: 5000,
    })

    handleSessionCleanup('error')
  }, [toast, handleSessionCleanup], 'SessionReplacementHandler')

  // Handle WebSocket disconnection with proper error messages
  useWebSocketEvent('disconnect', (reason: any) => {
    console.log('🔌 [SessionReplacementHandler] WebSocket disconnected:', reason)

    // Check if it's a server-initiated disconnect (session replaced)
    if (reason === 'io server disconnect' || reason?.message?.includes('Invalid session')) {
      console.log('📊 Server-initiated disconnect detected')

      // Only handle if we haven't already
      if (!hasHandledReplacement.current) {
        hasHandledReplacement.current = true

        // Check if we should attempt reconnection
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++
          console.log(`🔄 Reconnection attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`)

          // Wait a bit before showing the modal to see if reconnection succeeds
          setTimeout(() => {
            if (!isConnected) {
              // Show session replaced modal if still disconnected
              setModalState({
                isOpen: true,
                type: 'session-replaced'
              })
            }
          }, 2000)
        } else {
          // Max attempts reached, show modal
          setModalState({
            isOpen: true,
            type: 'session-replaced'
          })
        }
      }
    }
  }, [isConnected], 'SessionReplacementHandler')

  // Handle WebSocket errors gracefully
  useWebSocketEvent('error', (error: any) => {
    console.error('🚨 [SessionReplacementHandler] WebSocket error:', error)

    // Check for specific error types
    if (error?.message?.includes('Invalid session') ||
        error?.message?.includes('Session expired') ||
        error?.message?.includes('Session replaced')) {

      if (!hasHandledReplacement.current) {
        hasHandledReplacement.current = true

        toast({
          title: "Session Error",
          description: "Your session has ended. Please scan the QR code to continue.",
          variant: "destructive",
          duration: 5000,
        })

        // Show modal after a short delay
        setTimeout(() => {
          setModalState({
            isOpen: true,
            type: 'session-replaced'
          })
        }, 1000)
      }
    }
  }, [toast], 'SessionReplacementHandler')

  // Handle successful reconnection
  useWebSocketEvent('connect', () => {
    console.log('✅ [SessionReplacementHandler] WebSocket reconnected')

    // Reset reconnection attempts on successful connection
    reconnectAttempts.current = 0

    // Reset replacement flag if we successfully reconnected
    if (hasHandledReplacement.current) {
      console.log('🔄 Resetting replacement flag after successful reconnection')
      hasHandledReplacement.current = false
    }
  }, [], 'SessionReplacementHandler')

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false }))

    // Perform cleanup after modal closes
    setTimeout(() => {
      handleSessionCleanup('replaced')
    }, 300)
  }, [handleSessionCleanup])

  // Handle payment success event to show thank you modal
  useWebSocketEvent('payment:completed', (data: any) => {
    console.log('💳 [SessionReplacementHandler] Payment completed:', data)

    // Show thank you modal
    setModalState({
      isOpen: true,
      type: 'thank-you'
    })

    // Clear session after a delay
    setTimeout(() => {
      handleSessionCleanup('ended')
    }, 5000)
  }, [handleSessionCleanup], 'SessionReplacementHandler')

  return (
    <>
      {children}
      <SessionTransitionModal
        isOpen={modalState.isOpen}
        type={modalState.type}
        restaurantName={restaurantName}
        onClose={handleModalClose}
        autoCloseDelay={modalState.type === 'thank-you' ? 5000 : 3000}
      />
    </>
  )
}

// Wrapper component that handles SSR gracefully
export function SessionReplacementHandler({ children }: SessionReplacementHandlerProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // During SSR or before mount, render children without session handling
  if (!mounted) {
    return <>{children}</>
  }

  // After mount, render with full session replacement handling
  return <SessionReplacementHandlerInner>{children}</SessionReplacementHandlerInner>
}