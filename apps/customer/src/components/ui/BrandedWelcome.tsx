'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'

interface BrandedWelcomeProps {
  restaurantName?: string
  message?: string
}

export function BrandedWelcome({
  restaurantName,
  message = "Processing QR Code"
}: BrandedWelcomeProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Ambient background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-20 left-20 w-80 h-80 bg-accent/5 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
      </div>

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center space-y-10 px-6 max-w-md"
      >
        {/* Logo with elegant animation */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            duration: 0.8,
            ease: [0.34, 1.56, 0.64, 1],
            delay: 0.2
          }}
          className="relative"
        >
          {/* Soft glow */}
          <motion.div
            className="absolute inset-0 rounded-3xl bg-primary/20 blur-3xl"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.4, 0.6, 0.4]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          {/* Logo */}
          <motion.div
            animate={{
              y: [0, -12, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="relative"
          >
            <Image
              src="/tabsy-icon.svg"
              alt="Tabsy"
              width={120}
              height={120}
              className="rounded-3xl shadow-2xl"
              priority
            />
          </motion.div>
        </motion.div>

        {/* Brand text */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-center space-y-3"
        >
          <h1 className="text-5xl font-bold text-content-primary tracking-tight">
            Tabsy
          </h1>
          <p className="text-content-secondary text-base">
            Smart dining at your table
          </p>
        </motion.div>

        {/* Restaurant name if available */}
        {restaurantName && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="flex items-center space-x-3 px-6 py-3 bg-surface-secondary/50 backdrop-blur-sm rounded-2xl border border-border-default/50"
          >
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-content-primary font-medium text-sm">
              Connecting to {restaurantName}
            </span>
          </motion.div>
        )}

        {/* Elegant progress indicator */}
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: 280 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="w-70 mt-4"
        >
          <div className="relative h-1 bg-surface-secondary rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-accent to-secondary rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>
        </motion.div>

        {/* Status message below progress */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="text-center -mt-2"
        >
          <p className="text-content-tertiary text-xs">
            {message}
          </p>
        </motion.div>
      </motion.div>

      {/* Subtle tagline - fixed at bottom */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="fixed bottom-8 left-0 right-0 text-center z-20"
      >
        <p className="text-content-tertiary text-xs">
          Powered by Tabsy • QR Dining Platform
        </p>
      </motion.div>
    </div>
  )
}

export default BrandedWelcome
