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
 * Enhanced haptic patterns for complex interactions
 */
export function hapticSequence(types: HapticFeedbackType[], delays: number[] = []): void {
  if (!isHapticSupported()) return

  types.forEach((type, index) => {
    const delay = delays[index] || 0
    setTimeout(() => hapticFeedback(type), delay)
  })
}

/**
 * Haptic feedback for common UI interactions
 */
export const haptics = {
  // Button interactions
  buttonPress: () => hapticFeedback('light'),
  buttonPressImportant: () => hapticFeedback('medium'),
  buttonPressDestructive: () => hapticFeedback('heavy'),

  // Item selection and interaction
  selectItem: () => hapticFeedback('selection'),
  deselectItem: () => hapticFeedback('light'),
  favoriteToggle: () => hapticFeedback('success'),
  unfavoriteToggle: () => hapticFeedback('light'),

  // Cart operations with enhanced feedback
  addToCart: () => hapticSequence(['medium', 'success'], [0, 100]),
  removeFromCart: () => hapticSequence(['light', 'light'], [0, 50]),
  updateQuantity: () => hapticFeedback('selection'),
  clearCart: () => hapticSequence(['warning', 'heavy'], [0, 150]),

  // Menu item interactions
  itemTap: () => hapticFeedback('light'),
  itemLongPress: () => hapticFeedback('heavy'),
  customizationSelect: () => hapticFeedback('selection'),
  spiceLevelSelect: () => hapticFeedback('medium'),

  // Form interactions
  formSubmit: () => hapticFeedback('medium'),
  formError: () => hapticFeedback('error'),
  formSuccess: () => hapticSequence(['success', 'light'], [0, 200]),
  inputFocus: () => hapticFeedback('light'),
  checkboxToggle: () => hapticFeedback('selection'),

  // Navigation
  navigate: () => hapticFeedback('light'),
  modal: () => hapticFeedback('light'),
  modalClose: () => hapticFeedback('light'),
  tabSwitch: () => hapticFeedback('selection'),
  pageSwipe: () => hapticFeedback('light'),

  // Search and filtering
  searchStart: () => hapticFeedback('light'),
  searchClear: () => hapticFeedback('light'),
  filterApply: () => hapticFeedback('medium'),
  filterClear: () => hapticFeedback('light'),
  voiceSearchStart: () => hapticSequence(['medium', 'light'], [0, 100]),
  voiceSearchEnd: () => hapticFeedback('success'),

  // Notifications and feedback
  notification: () => hapticFeedback('impact'),
  warning: () => hapticFeedback('warning'),
  error: () => hapticFeedback('error'),
  success: () => hapticFeedback('success'),
  orderPlaced: () => hapticSequence(['success', 'medium', 'light'], [0, 200, 400]),

  // Special interactions
  refresh: () => hapticFeedback('medium'),
  pullRefresh: () => hapticSequence(['light', 'medium'], [0, 300]),
  toggle: () => hapticFeedback('selection'),
  longPress: () => hapticFeedback('heavy'),
  swipeAction: () => hapticFeedback('medium'),
  loadingComplete: () => hapticFeedback('light'),

  // QR Code scanning
  qrScanStart: () => hapticFeedback('medium'),
  qrScanSuccess: () => hapticSequence(['success', 'light'], [0, 150]),
  qrScanError: () => hapticFeedback('error'),

  // Real-time updates
  orderStatusUpdate: () => hapticFeedback('impact'),
  newNotification: () => hapticSequence(['impact', 'light'], [0, 100])
}