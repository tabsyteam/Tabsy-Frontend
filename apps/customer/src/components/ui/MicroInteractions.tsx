'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { motion, useAnimation, AnimatePresence } from 'framer-motion'
import { haptics } from '@/lib/haptics'

// Enhanced Button with micro-interactions
interface InteractiveButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart' | 'onAnimationEnd' | 'onDragStart' | 'onDrag' | 'onDragEnd'> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  hapticType?: 'light' | 'medium' | 'heavy'
  showRipple?: boolean
  loading?: boolean
}

export function InteractiveButton({
  children,
  variant = 'primary',
  size = 'md',
  hapticType = 'light',
  showRipple = true,
  loading = false,
  className = '',
  onClick,
  disabled,
  ...props
}: InteractiveButtonProps) {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([])
  const controls = useAnimation()

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return

    // Haptic feedback
    haptics.buttonPress()

    // Ripple effect
    if (showRipple) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const id = Date.now()

      setRipples(prev => [...prev, { id, x, y }])

      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(ripple => ripple.id !== id))
      }, 600)
    }

    // Button press animation
    controls.start({
      scale: [1, 0.95, 1],
      transition: { duration: 0.15 }
    })

    onClick?.(e)
  }, [disabled, loading, showRipple, onClick, controls])

  const baseClasses = 'relative overflow-hidden rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2'

  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary-hover focus:ring-primary/50',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-hover focus:ring-secondary/50',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive-hover focus:ring-destructive/50',
    ghost: 'bg-transparent text-primary hover:bg-primary/10 focus:ring-primary/50',
    outline: 'bg-transparent border border-primary text-primary hover:bg-primary hover:text-primary-foreground focus:ring-primary/50'
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  }

  return (
    <motion.button
      animate={controls}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className} ${
        disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
      onClick={handleClick}
      disabled={disabled || loading}
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      {...props}
    >
      {loading ? (
        <div className="flex items-center justify-center">
          <motion.div
            className="w-5 h-5 border-2 border-current border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>
      ) : children}

      {/* Ripple effects */}
      <AnimatePresence>
        {ripples.map(({ id, x, y }) => (
          <motion.span
            key={id}
            className="absolute bg-white/30 rounded-full pointer-events-none"
            style={{
              left: x - 20,
              top: y - 20,
              width: 40,
              height: 40,
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 3, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        ))}
      </AnimatePresence>
    </motion.button>
  )
}

// Enhanced Card with hover interactions
interface InteractiveCardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  hoverable?: boolean
  pressable?: boolean
}

export function InteractiveCard({
  children,
  className = '',
  onClick,
  hoverable = true,
  pressable = true
}: InteractiveCardProps) {
  const handleClick = useCallback(() => {
    if (onClick) {
      haptics.itemTap()
      onClick()
    }
  }, [onClick])

  return (
    <motion.div
      className={`bg-surface border border-default rounded-lg ${className} ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={handleClick}
      whileHover={hoverable ? {
        scale: 1.02,
        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
        transition: { duration: 0.2 }
      } : undefined}
      whileTap={pressable && onClick ? {
        scale: 0.98,
        transition: { duration: 0.1 }
      } : undefined}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  )
}

// Floating Action Button with micro-interactions
interface FloatingActionButtonProps {
  icon: React.ReactNode
  onClick: () => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
}

export function FloatingActionButton({
  icon,
  onClick,
  className = '',
  size = 'md',
  pulse = false
}: FloatingActionButtonProps) {
  const handleClick = useCallback(() => {
    haptics.buttonPressImportant()
    onClick()
  }, [onClick])

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-14 h-14',
    lg: 'w-16 h-16'
  }

  return (
    <motion.button
      className={`${sizeClasses[size]} bg-accent text-accent-foreground rounded-full shadow-lg flex items-center justify-center ${className}`}
      onClick={handleClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      initial={{ scale: 0 }}
      animate={pulse ? {
        scale: [1, 1.1, 1],
        transition: { duration: 2, repeat: Infinity }
      } : { scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {icon}
    </motion.button>
  )
}

// Enhanced Toggle Switch
interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
  size = 'md',
  disabled = false
}: ToggleSwitchProps) {
  const handleChange = useCallback(() => {
    if (disabled) return
    haptics.toggle()
    onChange(!checked)
  }, [checked, onChange, disabled])

  const sizeClasses = {
    sm: { track: 'w-8 h-4', thumb: 'w-3 h-3' },
    md: { track: 'w-10 h-5', thumb: 'w-4 h-4' },
    lg: { track: 'w-12 h-6', thumb: 'w-5 h-5' }
  }

  const sizes = sizeClasses[size]

  return (
    <div className="flex items-center space-x-2">
      <motion.button
        className={`${sizes.track} relative rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50 ${
          checked ? 'bg-primary' : 'bg-gray-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={handleChange}
        disabled={disabled}
        whileTap={disabled ? {} : { scale: 0.95 }}
      >
        <motion.div
          className={`${sizes.thumb} bg-white rounded-full shadow-md`}
          animate={{
            x: checked ? (size === 'sm' ? 16 : size === 'md' ? 20 : 24) : 2,
          }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </motion.button>
      {label && (
        <span className={`text-content-primary ${disabled ? 'opacity-50' : ''}`}>
          {label}
        </span>
      )}
    </div>
  )
}

// Animated Counter
interface AnimatedCounterProps {
  value: number
  className?: string
  duration?: number
}

export function AnimatedCounter({ value, className = '', duration = 0.5 }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const [previousValue, setPreviousValue] = useState(value)

  useEffect(() => {
    // If this is the first render or value hasn't changed, set immediately
    if (previousValue === value) {
      setDisplayValue(value)
      return
    }

    const startValue = previousValue
    const endValue = value
    const difference = endValue - startValue

    // If difference is small, animate quickly or skip animation
    if (Math.abs(difference) <= 1) {
      const increment = difference / (duration * 30) // 30 FPS for small changes
      let current = startValue

      const timer = setInterval(() => {
        current += increment
        if ((difference > 0 && current >= endValue) || (difference < 0 && current <= endValue)) {
          setDisplayValue(endValue)
          clearInterval(timer)
        } else {
          setDisplayValue(Math.round(current))
        }
      }, 1000 / 30)

      setPreviousValue(value)
      return () => clearInterval(timer)
    } else {
      // For larger changes, set immediately
      setDisplayValue(value)
      setPreviousValue(value)
      return
    }
  }, [value, duration, previousValue])

  return (
    <motion.span
      className={className}
      key={`${value}-${previousValue}`}
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.1, 1] }}
      transition={{ duration: 0.2, times: [0, 0.5, 1] }}
    >
      {displayValue}
    </motion.span>
  )
}

// Progress Ring
interface ProgressRingProps {
  progress: number // 0-100
  size?: number
  strokeWidth?: number
  className?: string
  children?: React.ReactNode
}

export function ProgressRing({
  progress,
  size = 60,
  strokeWidth = 4,
  className = '',
  children
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDasharray = `${circumference} ${circumference}`
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className={`relative inline-flex ${className}`} style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-200"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          className="text-primary"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          strokeLinecap="round"
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  )
}

// Shake Animation for errors
export function useShakeAnimation() {
  const controls = useAnimation()

  const shake = useCallback(() => {
    haptics.error()
    controls.start({
      x: [0, -10, 10, -10, 10, 0],
      transition: { duration: 0.5 }
    })
  }, [controls])

  return { controls, shake }
}

// Success Animation
export function SuccessAnimation({
  isVisible,
  onComplete
}: {
  isVisible: boolean
  onComplete?: () => void
}) {
  useEffect(() => {
    if (isVisible) {
      haptics.success()
    }
  }, [isVisible])

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center bg-black/20 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-full p-4 shadow-lg"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <motion.div
              className="w-12 h-12 text-green-500"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <motion.path
                  d="M20 6L9 17l-5-5"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                />
              </svg>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}