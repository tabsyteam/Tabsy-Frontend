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
    sm: { icon: 72, ring: 88, strokeWidth: 3 },
    md: { icon: 96, ring: 120, strokeWidth: 4 },
    lg: { icon: 120, ring: 152, strokeWidth: 5 }
  }

  const currentSize = iconSizes[size]
  const radius = (currentSize.ring - currentSize.strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`flex flex-col items-center justify-center space-y-6 ${className}`}
    >
      {/* Main Loading Animation Container */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: currentSize.ring, height: currentSize.ring }}
      >
        {/* Soft Ambient Glow - Background */}
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 blur-xl"
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.4, 0.7, 0.4]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* SVG Circular Progress Ring */}
        <svg
          className="absolute inset-0 -rotate-90"
          width={currentSize.ring}
          height={currentSize.ring}
        >
          {/* Background Circle */}
          <circle
            cx={currentSize.ring / 2}
            cy={currentSize.ring / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={currentSize.strokeWidth}
            className="text-primary/10"
          />

          {/* Animated Progress Circle - Gradient Stroke */}
          <motion.circle
            cx={currentSize.ring / 2}
            cy={currentSize.ring / 2}
            r={radius}
            fill="none"
            strokeWidth={currentSize.strokeWidth}
            stroke="url(#gradient)"
            strokeLinecap="round"
            initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
            animate={{
              strokeDashoffset: [circumference, 0]
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          {/* Gradient Definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgb(59, 130, 246)" />
              <stop offset="50%" stopColor="rgb(249, 115, 22)" />
              <stop offset="100%" stopColor="rgb(6, 182, 212)" />
            </linearGradient>
          </defs>
        </svg>

        {/* Tabsy Icon - Floating & Breathing */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{
            scale: 1,
            rotate: 0,
          }}
          transition={{
            duration: 0.7,
            ease: [0.34, 1.56, 0.64, 1] // Spring-like easing
          }}
          className="relative z-10"
        >
          <motion.div
            animate={{
              y: [0, -6, 0],
              scale: [1, 1.03, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <div className="relative">
              {/* Icon Shadow */}
              <div
                className="absolute inset-0 rounded-2xl bg-black/20 blur-md"
                style={{
                  transform: 'translateY(8px) scale(0.9)'
                }}
              />

              {/* Actual Icon */}
              <Image
                src="/tabsy-icon.svg"
                alt="Tabsy"
                width={currentSize.icon}
                height={currentSize.icon}
                className="rounded-2xl shadow-xl relative z-10"
                priority
              />

              {/* Shimmer Effect Overlay */}
              <motion.div
                className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.3, 0] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5
                }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"
                  animate={{
                    x: ['-100%', '200%']
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>

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