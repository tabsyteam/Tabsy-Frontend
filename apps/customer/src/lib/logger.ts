/**
 * Consistent Logging Utility
 *
 * Provides standardized logging across the application with:
 * - Consistent formatting
 * - Component-based namespacing
 * - Environment-aware logging (disabled in production by default)
 * - Color-coded output for different log levels
 * - Structured data logging
 *
 * @version 1.0.0
 */

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS'
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  enabled: boolean
  level: LogLevel
  includeTimestamp: boolean
  includeEmoji: boolean
}

/**
 * Default configuration
 */
const defaultConfig: LoggerConfig = {
  enabled: process.env.NODE_ENV === 'development',
  level: LogLevel.DEBUG,
  includeTimestamp: false,
  includeEmoji: true
}

/**
 * Current configuration
 */
let config: LoggerConfig = { ...defaultConfig }

/**
 * Log level emoji/symbols
 */
const LOG_SYMBOLS = {
  [LogLevel.DEBUG]: '🔍',
  [LogLevel.INFO]: 'ℹ️ ',
  [LogLevel.WARN]: '⚠️ ',
  [LogLevel.ERROR]: '❌',
  [LogLevel.SUCCESS]: '✅'
}

/**
 * Log level colors (for browser console)
 */
const LOG_COLORS = {
  [LogLevel.DEBUG]: '#6B7280', // Gray
  [LogLevel.INFO]: '#3B82F6',  // Blue
  [LogLevel.WARN]: '#F59E0B',  // Amber
  [LogLevel.ERROR]: '#EF4444', // Red
  [LogLevel.SUCCESS]: '#10B981' // Green
}

/**
 * Format timestamp
 */
function formatTimestamp(): string {
  const now = new Date()
  return now.toISOString().split('T')[1].split('.')[0] // HH:MM:SS
}

/**
 * Format log message
 */
function formatMessage(
  component: string,
  level: LogLevel,
  message: string,
  data?: any
): { formatted: string; style: string; data?: any } {
  const parts: string[] = []

  // Add timestamp if enabled
  if (config.includeTimestamp) {
    parts.push(`[${formatTimestamp()}]`)
  }

  // Add component name
  parts.push(`[${component}]`)

  // Add emoji if enabled
  if (config.includeEmoji) {
    parts.push(LOG_SYMBOLS[level])
  } else {
    parts.push(`[${level}]`)
  }

  // Add message
  parts.push(message)

  const formatted = parts.join(' ')
  const style = `color: ${LOG_COLORS[level]}; font-weight: ${level === LogLevel.ERROR || level === LogLevel.WARN ? 'bold' : 'normal'}`

  return { formatted, style, data }
}

/**
 * Centralized Logger
 *
 * Usage:
 * ```typescript
 * import { logger } from '@/lib/logger'
 *
 * logger.debug('MyComponent', 'User clicked button', { userId: '123' })
 * logger.info('MyComponent', 'Data loaded successfully')
 * logger.warn('MyComponent', 'Deprecated API used')
 * logger.error('MyComponent', 'Failed to fetch data', error)
 * logger.success('MyComponent', 'Payment completed')
 * ```
 */
export const logger = {
  /**
   * Debug log (detailed information for debugging)
   */
  debug(component: string, message: string, data?: any): void {
    if (!config.enabled) return

    const { formatted, style, data: logData } = formatMessage(component, LogLevel.DEBUG, message, data)

    if (logData !== undefined) {
      console.log(`%c${formatted}`, style, logData)
    } else {
      console.log(`%c${formatted}`, style)
    }
  },

  /**
   * Info log (general information)
   */
  info(component: string, message: string, data?: any): void {
    if (!config.enabled) return

    const { formatted, style, data: logData } = formatMessage(component, LogLevel.INFO, message, data)

    if (logData !== undefined) {
      console.log(`%c${formatted}`, style, logData)
    } else {
      console.log(`%c${formatted}`, style)
    }
  },

  /**
   * Warning log (potential issues)
   */
  warn(component: string, message: string, data?: any): void {
    if (!config.enabled) return

    const { formatted, style, data: logData } = formatMessage(component, LogLevel.WARN, message, data)

    if (logData !== undefined) {
      console.warn(`%c${formatted}`, style, logData)
    } else {
      console.warn(`%c${formatted}`, style)
    }
  },

  /**
   * Error log (errors and exceptions)
   */
  error(component: string, message: string, error?: any): void {
    // Always log errors, even in production
    const { formatted, style, data: errorData } = formatMessage(component, LogLevel.ERROR, message, error)

    if (errorData !== undefined) {
      console.error(`%c${formatted}`, style, errorData)
    } else {
      console.error(`%c${formatted}`, style)
    }
  },

  /**
   * Success log (successful operations)
   */
  success(component: string, message: string, data?: any): void {
    if (!config.enabled) return

    const { formatted, style, data: logData } = formatMessage(component, LogLevel.SUCCESS, message, data)

    if (logData !== undefined) {
      console.log(`%c${formatted}`, style, logData)
    } else {
      console.log(`%c${formatted}`, style)
    }
  },

  /**
   * Group start (for grouping related logs)
   */
  group(component: string, title: string): void {
    if (!config.enabled) return
    console.group(`[${component}] ${title}`)
  },

  /**
   * Group end
   */
  groupEnd(): void {
    if (!config.enabled) return
    console.groupEnd()
  },

  /**
   * Table log (for displaying tabular data)
   */
  table(component: string, title: string, data: any): void {
    if (!config.enabled) return
    console.log(`[${component}] ${title}:`)
    console.table(data)
  },

  /**
   * Time measurement start
   */
  time(component: string, label: string): void {
    if (!config.enabled) return
    console.time(`[${component}] ${label}`)
  },

  /**
   * Time measurement end
   */
  timeEnd(component: string, label: string): void {
    if (!config.enabled) return
    console.timeEnd(`[${component}] ${label}`)
  },

  /**
   * Configuration methods
   */
  config: {
    /**
     * Enable/disable logging
     */
    setEnabled(enabled: boolean): void {
      config.enabled = enabled
    },

    /**
     * Set log level
     */
    setLevel(level: LogLevel): void {
      config.level = level
    },

    /**
     * Enable/disable timestamp
     */
    setTimestamp(enabled: boolean): void {
      config.includeTimestamp = enabled
    },

    /**
     * Enable/disable emoji
     */
    setEmoji(enabled: boolean): void {
      config.includeEmoji = enabled
    },

    /**
     * Reset to default configuration
     */
    reset(): void {
      config = { ...defaultConfig }
    },

    /**
     * Get current configuration
     */
    get(): LoggerConfig {
      return { ...config }
    }
  }
}

/**
 * Create a scoped logger for a specific component
 *
 * Usage:
 * ```typescript
 * import { createLogger } from '@/lib/logger'
 *
 * const log = createLogger('MyComponent')
 *
 * log.info('Data loaded', { count: 10 })
 * log.error('Failed to save', error)
 * ```
 */
export function createLogger(component: string) {
  return {
    debug: (message: string, data?: any) => logger.debug(component, message, data),
    info: (message: string, data?: any) => logger.info(component, message, data),
    warn: (message: string, data?: any) => logger.warn(component, message, data),
    error: (message: string, error?: any) => logger.error(component, message, error),
    success: (message: string, data?: any) => logger.success(component, message, data),
    group: (title: string) => logger.group(component, title),
    groupEnd: () => logger.groupEnd(),
    table: (title: string, data: any) => logger.table(component, title, data),
    time: (label: string) => logger.time(component, label),
    timeEnd: (label: string) => logger.timeEnd(component, label)
  }
}

// Export types
export type { LoggerConfig }
