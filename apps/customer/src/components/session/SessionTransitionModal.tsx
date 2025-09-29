'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, Utensils, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface SessionTransitionModalProps {
  isOpen: boolean
  type: 'session-ending' | 'session-replaced' | 'thank-you'
  restaurantName?: string
  onClose?: () => void
  autoCloseDelay?: number
}

export function SessionTransitionModal({
  isOpen,
  type,
  restaurantName = 'our restaurant',
  onClose,
  autoCloseDelay = 3000
}: SessionTransitionModalProps) {
  const [countdown, setCountdown] = useState(Math.floor(autoCloseDelay / 1000))
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setCountdown(Math.floor(autoCloseDelay / 1000))
      return
    }

    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onClose?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    const autoCloseTimer = setTimeout(() => {
      onClose?.()
    }, autoCloseDelay)

    return () => {
      clearInterval(countdownInterval)
      clearTimeout(autoCloseTimer)
    }
  }, [isOpen, autoCloseDelay, onClose])

  if (!mounted) return null

  const content = {
    'session-ending': {
      icon: <CheckCircle2 className="w-16 h-16 text-accent" />,
      title: 'Thank You for Dining With Us!',
      message: `Your session at ${restaurantName} has been completed successfully.`,
      subMessage: 'We hope you enjoyed your meal!',
      showCountdown: true
    },
    'session-replaced': {
      icon: <Utensils className="w-16 h-16 text-primary" />,
      title: 'Session Updated',
      message: 'A new dining session has started at this table.',
      subMessage: 'Please scan the QR code to begin your order.',
      showCountdown: true
    },
    'thank-you': {
      icon: <CheckCircle2 className="w-16 h-16 text-accent" />,
      title: 'Payment Complete!',
      message: `Thank you for dining at ${restaurantName}.`,
      subMessage: 'Have a wonderful day!',
      showCountdown: false
    }
  }[type]

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative max-w-md w-full mx-4"
          >
            <div className="bg-surface rounded-2xl shadow-2xl border border-default/50 p-8">
              {/* Icon with animated background */}
              <div className="relative mb-6">
                <div className="mx-auto w-32 h-32 flex items-center justify-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', damping: 15 }}
                    className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full blur-xl"
                  />
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.3, type: 'spring', damping: 15 }}
                    className="relative"
                  >
                    {content.icon}
                  </motion.div>
                </div>
              </div>

              {/* Content */}
              <div className="text-center space-y-3">
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-2xl font-bold text-content-primary"
                >
                  {content.title}
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-content-secondary"
                >
                  {content.message}
                </motion.p>

                {content.subMessage && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="text-sm text-content-tertiary"
                  >
                    {content.subMessage}
                  </motion.p>
                )}

                {/* Countdown */}
                {content.showCountdown && countdown > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="mt-6 flex items-center justify-center space-x-2"
                  >
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm text-content-tertiary">
                      Redirecting in {countdown} second{countdown !== 1 ? 's' : ''}...
                    </span>
                  </motion.div>
                )}
              </div>

              {/* Manual close button for accessibility */}
              {onClose && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface-secondary transition-colors"
                  aria-label="Close"
                >
                  <svg
                    className="w-5 h-5 text-content-tertiary"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}