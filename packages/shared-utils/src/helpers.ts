/**
 * General helper utilities
 */
export const helpers = {
  /**
   * Generate a unique ID
   */
  generateId: (): string => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  },

  /**
   * Deep clone an object
   */
  deepClone: <T>(obj: T): T => {
    if (obj === null || typeof obj !== 'object') return obj
    if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T
    if (obj instanceof Array) return obj.map(item => helpers.deepClone(item)) as unknown as T
    
    const cloned: any = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = helpers.deepClone(obj[key])
      }
    }
    return cloned
  },

  /**
   * Check if value is empty
   */
  isEmpty: (value: any): boolean => {
    if (value === null || value === undefined) return true
    if (typeof value === 'string') return value.trim().length === 0
    if (Array.isArray(value)) return value.length === 0
    if (typeof value === 'object') return Object.keys(value).length === 0
    return false
  },

  /**
   * Debounce function calls
   */
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: ReturnType<typeof setTimeout>
    return (...args: Parameters<T>) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }
  },

  /**
   * Throttle function calls
   */
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args)
        inThrottle = true
        setTimeout(() => (inThrottle = false), limit)
      }
    }
  },

  /**
   * Sleep for specified milliseconds
   */
  sleep: (ms: number): Promise<void> => {
    return new Promise<void>(resolve => setTimeout(resolve, ms))
  },

  /**
   * Get nested object property safely
   */
  get: (obj: any, path: string, defaultValue?: any): any => {
    const keys = path.split('.')
    let result = obj

    for (const key of keys) {
      if (result === null || result === undefined || !(key in result)) {
        return defaultValue
      }
      result = result[key]
    }

    return result
  },

  /**
   * Set nested object property safely
   */
  set: (obj: any, path: string, value: any): void => {
    const keys = path.split('.')
    const lastKey = keys.pop()
    let current = obj

    for (const key of keys) {
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {}
      }
      current = current[key]
    }

    if (lastKey) {
      current[lastKey] = value
    }
  },

  /**
   * Pick specific properties from object
   */
  pick: <T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
    const result = {} as Pick<T, K>
    keys.forEach(key => {
      if (obj && typeof obj === 'object' && key in obj) {
        result[key] = obj[key]
      }
    })
    return result
  },

  /**
   * Omit specific properties from object
   */
  omit: <T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
    const result = { ...obj }
    keys.forEach(key => {
      delete result[key]
    })
    return result
  },

  /**
   * Group array items by key
   */
  groupBy: <T>(array: T[], key: keyof T | ((item: T) => string)): Record<string, T[]> => {
    return array.reduce((groups, item) => {
      const groupKey = typeof key === 'function' ? key(item) : String(item[key])
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(item)
      return groups
    }, {} as Record<string, T[]>)
  },

  /**
   * Sort array by multiple criteria
   */
  sortBy: <T>(
    array: T[],
    criteria: Array<keyof T | ((item: T) => any)>,
    directions: Array<'asc' | 'desc'> = []
  ): T[] => {
    return array.slice().sort((a, b) => {
      for (let i = 0; i < criteria.length; i++) {
        const criterion = criteria[i]
        const direction = directions[i] || 'asc'
        
        const aVal = typeof criterion === 'function' ? criterion(a) : criterion ? a[criterion] : undefined
        const bVal = typeof criterion === 'function' ? criterion(b) : criterion ? b[criterion] : undefined
        
        if (aVal < bVal) return direction === 'asc' ? -1 : 1
        if (aVal > bVal) return direction === 'asc' ? 1 : -1
      }
      return 0
    })
  },

  /**
   * Create range of numbers
   */
  range: (start: number, end?: number, step: number = 1): number[] => {
    if (end === undefined) {
      end = start
      start = 0
    }
    
    const result: number[] = []
    for (let i = start; i < end; i += step) {
      result.push(i)
    }
    return result
  },

  /**
   * Chunk array into smaller arrays
   */
  chunk: <T>(array: T[], size: number): T[][] => {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  },

  /**
   * Remove duplicates from array
   */
  unique: <T>(array: T[], key?: keyof T | ((item: T) => any)): T[] => {
    if (!key) {
      // Simple unique for primitives
      return array.filter((item, index) => array.indexOf(item) === index)
    }

    const seen: any[] = []
    const seenKeys: any[] = []
    return array.filter(item => {
      const identifier = typeof key === 'function' ? key(item) : item[key]
      const index = seenKeys.indexOf(identifier)
      if (index !== -1) {
        return false
      }
      seenKeys.push(identifier)
      seen.push(item)
      return true
    })
  },

  /**
   * Calculate percentage
   */
  percentage: (value: number, total: number): number => {
    if (total === 0) return 0
    return (value / total) * 100
  },

  /**
   * Clamp number between min and max
   */
  clamp: (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max)
  },

  /**
   * Round number to specified decimal places
   */
  round: (value: number, decimals: number = 2): number => {
    const factor = Math.pow(10, decimals)
    return Math.round(value * factor) / factor
  },
}

export default helpers
