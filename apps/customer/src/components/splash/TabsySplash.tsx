'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Utensils, Wifi, CheckCircle } from 'lucide-react'

interface TabsySplashProps {
  restaurant: {
    id: string
    name: string
    logo?: string
    theme?: string
  }
  table: {
    id: string
    number: string
    qrCode: string
  }
}

export function TabsySplash({ restaurant, table }: TabsySplashProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    {
      icon: Utensils,
      title: 'Welcome to Tabsy',
      subtitle: 'Your smart dining experience',
      duration: 400
    },
    {
      icon: Wifi,
      title: `Connected to ${restaurant.name}`,
      subtitle: `Table ${table.tableNumber}`,
      duration: 400
    },
    {
      icon: CheckCircle,
      title: 'Ready to Order!',
      subtitle: 'Loading your menu...',
      duration: 200
    }
  ]

  useEffect(() => {
    const timers: NodeJS.Timeout[] = []
    let totalDelay = 0

    steps.forEach((step, index) => {
      const timer = setTimeout(() => {
        setCurrentStep(index)
      }, totalDelay)

      timers.push(timer)
      totalDelay += step.duration
    })

    return () => {
      timers.forEach(clearTimeout)
    }
  }, [])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-8 max-w-md w-full">
        {/* Tabsy Logo Animation */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 15,
            duration: 0.8
          }}
          className="relative"
        >
          {/* Main logo circle */}
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center shadow-lg relative overflow-hidden">
            {/* Animated background pulse */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.1, 0.3]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-full"
            />

            {/* Logo icon */}
            <motion.div
              animate={{
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Utensils className="w-12 h-12 text-primary-foreground relative z-10" />
            </motion.div>
          </div>

          {/* Orbiting dots */}
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 bg-accent rounded-full"
              style={{
                top: '50%',
                left: '50%',
                transformOrigin: '0 0',
              }}
              animate={{
                rotate: [0, 360],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.5,
                ease: "linear"
              }}
              initial={{
                x: 50,
                y: -6,
              }}
            />
          ))}
        </motion.div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            {/* Step Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-16 h-16 mx-auto bg-surface rounded-full flex items-center justify-center border border-default"
            >
              {steps[currentStep] && React.createElement(steps[currentStep].icon, {
                className: "w-8 h-8 text-primary"
              })}
            </motion.div>

            {/* Step Text */}
            <div className="space-y-2">
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-content-primary"
              >
                {steps[currentStep]?.title}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-content-secondary"
              >
                {steps[currentStep]?.subtitle}
              </motion.p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Progress Indicator */}
        <div className="flex justify-center space-x-2">
          {steps.map((_, index) => (
            <motion.div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                index <= currentStep ? 'bg-primary' : 'bg-border-default'
              }`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1 }}
            />
          ))}
        </div>

        {/* Loading Animation */}
        {currentStep === steps.length - 1 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="flex justify-center"
          >
            <div className="flex space-x-1">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-primary rounded-full"
                  animate={{
                    y: [0, -10, 0],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Restaurant Info Card */}
        {currentStep >= 1 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-surface border border-default rounded-xl p-4 shadow-sm"
          >
            <div className="flex items-center space-x-3">
              {restaurant.logo ? (
                <img
                  src={restaurant.logo}
                  alt={restaurant.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Utensils className="w-5 h-5 text-primary" />
                </div>
              )}

              <div className="flex-1 text-left">
                <h3 className="font-semibold text-content-primary text-sm">
                  {restaurant.name}
                </h3>
                <p className="text-content-secondary text-xs">
                  Table {table.tableNumber} • Connected
                </p>
              </div>

              <div className="w-2 h-2 bg-status-success rounded-full animate-pulse" />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}