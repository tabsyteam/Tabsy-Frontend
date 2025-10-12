'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'

interface TabsyLoaderProps {
  message?: string
  showMessage?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function TabsyLoader({
  message = "Loading...",
  showMessage = true,
  size = 'md',
  className = ''
}: TabsyLoaderProps) {
  const iconSizes = {
    sm: { icon: 64 },
    md: { icon: 80 },
    lg: { icon: 96 }
  }

  const currentSize = iconSizes[size]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex flex-col items-center justify-center space-y-6 ${className}`}
    >
      {/* Icon Container */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
        className="relative"
      >
        {/* Subtle glow behind icon */}
        <motion.div
          className="absolute inset-0 rounded-2xl bg-primary/10 blur-2xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Icon with gentle float */}
        <motion.div
          animate={{
            y: [0, -8, 0],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative"
        >
          <Image
            src="/tabsy-icon.svg"
            alt="Tabsy"
            width={currentSize.icon}
            height={currentSize.icon}
            className="rounded-2xl shadow-xl"
            priority
          />
        </motion.div>
      </motion.div>

      {/* Progress Bar */}
      <motion.div
        initial={{ opacity: 0, width: 0 }}
        animate={{ opacity: 1, width: 240 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="w-60"
      >
        <div className="relative h-1.5 bg-surface-secondary rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-accent to-secondary rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>
      </motion.div>

      {/* Loading Text */}
      {showMessage && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center space-y-2 max-w-xs"
        >
          {/* Main Message */}
          <div className="flex items-center justify-center space-x-1.5">
            <motion.span
              className="text-content-primary font-medium text-base"
              animate={{
                opacity: [0.6, 1, 0.6]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {message}
            </motion.span>

            {/* Bouncing Dots */}
            <div className="flex space-x-0.5">
              {[0, 1, 2].map((index) => (
                <motion.div
                  key={index}
                  className="w-1 h-1 rounded-full bg-primary"
                  animate={{
                    y: [0, -6, 0],
                    scale: [1, 1.2, 1]
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: index * 0.12
                  }}
                />
              ))}
            </div>
          </div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-content-secondary text-sm"
          >
            This won't take long
          </motion.p>
        </motion.div>
      )}
    </motion.div>
  )
}

export default TabsyLoader