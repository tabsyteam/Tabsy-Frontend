/**
 * Haptic feedback utilities for mobile devices
 * Provides tactile feedback for various user interactions
 */

export type HapticFeedbackType =
  | 'light'      // Light tap for subtle feedback
  | 'medium'     // Medium tap for standard interactions
  | 'heavy'      // Heavy tap for important actions
  | 'selection'  // Selection feedback for picking items
  | 'impact'     // Impact feedback for notifications
  | 'error'      // Error feedback for mistakes
  | 'success'    // Success feedback for completions
  | 'warning'    // Warning feedback for cautions

/**
 * Check if haptic feedback is supported on the current device
 */
export function isHapticSupported(): boolean {
  if (typeof window === 'undefined') return false

  // Check for Haptic Feedback API (Android Chrome)
  if ('vibrate' in navigator) return true

  // Check for iOS haptic feedback
  if (window.DeviceMotionEvent && typeof (DeviceMotionEvent as any).requestPermission === 'function') {
    return true
  }

  return false
}

/**
 * Check if we're on iOS device
 */
function isIOS(): boolean {
  if (typeof window === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

/**
 * Trigger haptic feedback based on the feedback type
 */
export function hapticFeedback(type: HapticFeedbackType = 'light'): void {
  if (!isHapticSupported()) return

  try {
    if (isIOS()) {
      // iOS Haptic Feedback (requires user gesture)
      triggerIOSHaptic(type)
    } else {
      // Android/Web Vibration API
      triggerVibration(type)
    }
  } catch (error) {
    console.warn('Haptic feedback failed:', error)
  }
}

/**
 * Trigger iOS-style haptic feedback
 */
function triggerIOSHaptic(type: HapticFeedbackType): void {
  // iOS devices have limited haptic feedback options in web
  // We use the vibration API with patterns that feel similar to iOS haptics

  const patterns: Record<HapticFeedbackType, number[]> = {
    light: [10],
    medium: [20],
    heavy: [30],
    selection: [5],
    impact: [15],
    error: [50, 50, 50],
    success: [10, 30, 10],
    warning: [20, 20, 20]
  }

  const pattern = patterns[type] || patterns.light
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

/**
 * Trigger vibration-based haptic feedback for Android/Web
 */
function triggerVibration(type: HapticFeedbackType): void {
  const patterns: Record<HapticFeedbackType, number[]> = {
    light: [10],
    medium: [25],
    heavy: [50],
    selection: [5],
    impact: [20],
    error: [100, 50, 100],
    success: [20, 50, 20],
    warning: [30, 30, 30]
  }

  const pattern = patterns[type] || patterns.light
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

/**
 * Create a haptic feedback hook for React components
 */
export function useHapticFeedback() {
  const triggerHaptic = (type: HapticFeedbackType = 'light') => {
    hapticFeedback(type)
  }

  return {
    triggerHaptic,
    isSupported: isHapticSupported()
  }
}

/**
 * Higher-order function to add haptic feedback to click handlers
 */
export function withHapticFeedback<T extends any[]>(
  handler: (...args: T) => void,
  hapticType: HapticFeedbackType = 'light'
) {
  return (...args: T) => {
    hapticFeedback(hapticType)
    handler(...args)
  }
}

/**
 * Haptic feedback for common UI interactions
 */
export const haptics = {
  // Button interactions
  buttonPress: () => hapticFeedback('light'),
  buttonPressImportant: () => hapticFeedback('medium'),

  // Item selection
  selectItem: () => hapticFeedback('selection'),

  // Cart operations
  addToCart: () => hapticFeedback('success'),
  removeFromCart: () => hapticFeedback('light'),

  // Form interactions
  formSubmit: () => hapticFeedback('medium'),
  formError: () => hapticFeedback('error'),
  formSuccess: () => hapticFeedback('success'),

  // Navigation
  navigate: () => hapticFeedback('light'),
  modal: () => hapticFeedback('light'),

  // Notifications
  notification: () => hapticFeedback('impact'),
  warning: () => hapticFeedback('warning'),
  error: () => hapticFeedback('error'),
  success: () => hapticFeedback('success'),

  // Special interactions
  refresh: () => hapticFeedback('medium'),
  toggle: () => hapticFeedback('selection'),
  longPress: () => hapticFeedback('heavy')
}