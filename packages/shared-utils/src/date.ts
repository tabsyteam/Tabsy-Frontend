import { format, parseISO, isValid, differenceInMinutes, differenceInHours, differenceInDays, formatDistanceToNow, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

/**
 * Date and time utilities
 */
export const dateUtils = {
  /**
   * Format date according to pattern
   */
  format: (date: Date | string, pattern: string = 'PPP'): string => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return isValid(dateObj) ? format(dateObj, pattern) : ''
  },

  /**
   * Parse ISO string to date
   */
  parseISO: (dateString: string): Date => {
    return parseISO(dateString)
  },

  /**
   * Check if date is valid
   */
  isValid: (date: Date | string): boolean => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return isValid(dateObj)
  },

  /**
   * Get relative time (e.g., "2 hours ago")
   */
  timeAgo: (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return isValid(dateObj) ? formatDistanceToNow(dateObj, { addSuffix: true }) : ''
  },

  /**
   * Get difference between dates in minutes
   */
  diffInMinutes: (date1: Date | string, date2: Date | string): number => {
    const d1 = typeof date1 === 'string' ? parseISO(date1) : date1
    const d2 = typeof date2 === 'string' ? parseISO(date2) : date2
    return differenceInMinutes(d1, d2)
  },

  /**
   * Get difference between dates in hours
   */
  diffInHours: (date1: Date | string, date2: Date | string): number => {
    const d1 = typeof date1 === 'string' ? parseISO(date1) : date1
    const d2 = typeof date2 === 'string' ? parseISO(date2) : date2
    return differenceInHours(d1, d2)
  },

  /**
   * Get difference between dates in days
   */
  diffInDays: (date1: Date | string, date2: Date | string): number => {
    const d1 = typeof date1 === 'string' ? parseISO(date1) : date1
    const d2 = typeof date2 === 'string' ? parseISO(date2) : date2
    return differenceInDays(d1, d2)
  },

  /**
   * Get start of day
   */
  startOfDay: (date: Date | string): Date => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return startOfDay(dateObj)
  },

  /**
   * Get end of day
   */
  endOfDay: (date: Date | string): Date => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return endOfDay(dateObj)
  },

  /**
   * Get start of week
   */
  startOfWeek: (date: Date | string): Date => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return startOfWeek(dateObj)
  },

  /**
   * Get end of week
   */
  endOfWeek: (date: Date | string): Date => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return endOfWeek(dateObj)
  },

  /**
   * Get start of month
   */
  startOfMonth: (date: Date | string): Date => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return startOfMonth(dateObj)
  },

  /**
   * Get end of month
   */
  endOfMonth: (date: Date | string): Date => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return endOfMonth(dateObj)
  },

  /**
   * Check if date is today
   */
  isToday: (date: Date | string): boolean => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    const today = new Date()
    return (
      dateObj.getDate() === today.getDate() &&
      dateObj.getMonth() === today.getMonth() &&
      dateObj.getFullYear() === today.getFullYear()
    )
  },

  /**
   * Add minutes to date
   */
  addMinutes: (date: Date | string, minutes: number): Date => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return new Date(dateObj.getTime() + minutes * 60000)
  },

  /**
   * Format time in 12-hour format
   */
  formatTime: (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return format(dateObj, 'h:mm a')
  },

  /**
   * Format time in 24-hour format
   */
  formatTime24: (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return format(dateObj, 'HH:mm')
  },
}

export default dateUtils

// Convenience exports
export const formatDate = dateUtils.format
export const formatDateTime = (date: Date | string): string => dateUtils.format(date, 'PPpp')
export const formatDateShort = (date: Date | string): string => dateUtils.format(date, 'PP')
export const formatTimeOnly = dateUtils.formatTime
export const formatTime24 = dateUtils.formatTime24
export const parseISODate = dateUtils.parseISO
export const isValidDate = dateUtils.isValid
export const getTimeAgo = dateUtils.timeAgo
export const diffInMinutes = dateUtils.diffInMinutes
export const diffInHours = dateUtils.diffInHours
export const diffInDays = dateUtils.diffInDays
