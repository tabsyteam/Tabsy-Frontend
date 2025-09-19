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
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  }

  const logoVariants = {
    initial: {
      scale: 0.8,
      opacity: 0,
      rotate: -10
    },
    animate: {
      scale: 1,
      opacity: 1,
      rotate: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    },
    pulse: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  }

  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        duration: 0.5,
        staggerChildren: 0.2
      }
    }
  }

  const messageVariants = {
    initial: { opacity: 0, y: 10 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  }

  const dotVariants = {
    initial: { opacity: 0.3 },
    animate: {
      opacity: [0.3, 1, 0.3],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className={`flex flex-col items-center justify-center space-y-6 ${className}`}
    >
      {/* Logo Container */}
      <motion.div
        variants={logoVariants}
        animate={["animate", "pulse"]}
        className={`${sizeClasses[size]} relative flex items-center justify-center`}
      >
        {/* Background Circle with subtle animation */}
        <motion.div
          className="absolute inset-0 bg-primary/5 rounded-full"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Tabsy Logo */}
        <Image
          src="/tabsy_logo.svg"
          alt="Tabsy"
          width={size === 'sm' ? 64 : size === 'md' ? 96 : 128}
          height={size === 'sm' ? 18 : size === 'md' ? 26 : 35}
          className="relative z-10"
          priority
        />
      </motion.div>

      {/* Loading Message */}
      {showMessage && (
        <motion.div
          variants={messageVariants}
          className="text-center space-y-2"
        >
          <div className="flex items-center space-x-1">
            <span className="text-content-primary font-medium text-lg">
              {message}
            </span>
            <div className="flex space-x-1">
              {[0, 1, 2].map((index) => (
                <motion.span
                  key={index}
                  variants={dotVariants}
                  animate="animate"
                  style={{
                    animationDelay: `${index * 0.2}s`
                  }}
                  className="text-primary text-lg font-bold"
                >
                  •
                </motion.span>
              ))}
            </div>
          </div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="text-content-secondary text-sm"
          >
            Please wait while we prepare your experience
          </motion.p>
        </motion.div>
      )}

      {/* Progress Bar */}
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: "100%" }}
        transition={{ duration: 3, ease: "easeInOut" }}
        className="h-1 bg-primary/20 rounded-full overflow-hidden max-w-xs w-full"
      >
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
          animate={{
            x: ["-100%", "100%"],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </motion.div>
    </motion.div>
  )
}

export default TabsyLoader