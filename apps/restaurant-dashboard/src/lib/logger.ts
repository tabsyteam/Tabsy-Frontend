/**
 * Logger utility for environment-aware logging
 * Only logs to console in development, production logs should go to monitoring service
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enableConsole: boolean;
  enableRemote: boolean;
  minLevel: LogLevel;
}

const config: LoggerConfig = {
  enableConsole: process.env.NODE_ENV === 'development',
  enableRemote: process.env.NODE_ENV === 'production',
  minLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
};

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[config.minLevel];
}

/**
 * Send logs to remote monitoring service (implement as needed)
 */
function sendToRemote(level: LogLevel, message: string, data?: unknown): void {
  if (!config.enableRemote) return;

  // TODO: Implement remote logging service integration
  // Examples: Sentry, LogRocket, DataDog, CloudWatch, etc.
  // For now, this is a placeholder
}

export const logger = {
  /**
   * Debug level logging - development only
   * Use for detailed debugging information
   */
  debug: (message: string, data?: unknown): void => {
    if (!shouldLog('debug')) return;

    if (config.enableConsole) {
      console.log(`[DEBUG] ${message}`, data !== undefined ? data : '');
    }
  },

  /**
   * Info level logging
   * Use for general informational messages
   */
  info: (message: string, data?: unknown): void => {
    if (!shouldLog('info')) return;

    if (config.enableConsole) {
      console.info(`[INFO] ${message}`, data !== undefined ? data : '');
    }
    sendToRemote('info', message, data);
  },

  /**
   * Warning level logging
   * Use for potentially harmful situations
   */
  warn: (message: string, data?: unknown): void => {
    if (!shouldLog('warn')) return;

    if (config.enableConsole) {
      console.warn(`[WARN] ${message}`, data !== undefined ? data : '');
    }
    sendToRemote('warn', message, data);
  },

  /**
   * Error level logging
   * Use for error events that might still allow the application to continue
   */
  error: (message: string, error?: Error | unknown): void => {
    if (!shouldLog('error')) return;

    if (config.enableConsole) {
      console.error(`[ERROR] ${message}`, error);
    }
    sendToRemote('error', message, error);
  },

  /**
   * Log restaurant-specific events (development only)
   */
  restaurant: (event: string, data?: unknown): void => {
    if (config.enableConsole) {
      console.log(`🏪 [RESTAURANT] ${event}`, data !== undefined ? data : '');
    }
  },

  /**
   * Log order-specific events (development only)
   */
  order: (event: string, data?: unknown): void => {
    if (config.enableConsole) {
      console.log(`📦 [ORDER] ${event}`, data !== undefined ? data : '');
    }
  },

  /**
   * Log payment-specific events (development only)
   */
  payment: (event: string, data?: unknown): void => {
    if (config.enableConsole) {
      console.log(`💰 [PAYMENT] ${event}`, data !== undefined ? data : '');
    }
  },

  /**
   * Log assistance alert events (development only)
   */
  assistance: (event: string, data?: unknown): void => {
    if (config.enableConsole) {
      console.log(`🚨 [ASSISTANCE] ${event}`, data !== undefined ? data : '');
    }
  },

  /**
   * Log WebSocket events (development only)
   */
  websocket: (event: string, data?: unknown): void => {
    if (config.enableConsole) {
      console.log(`🔌 [WEBSOCKET] ${event}`, data !== undefined ? data : '');
    }
  },
};

/**
 * Sanitize sensitive data before logging
 * Redacts common sensitive fields
 */
export function sanitizeForLogging(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['token', 'password', 'secret', 'apiKey', 'authorization', 'auth'];
  const sanitized = { ...data };

  for (const key in sanitized) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}