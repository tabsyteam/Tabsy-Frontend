/**
 * Browser storage utilities
 */
export const storageUtils = {
  /**
   * Local storage utilities
   */
  local: {
    get: <T>(key: string): T | null => {
      if (typeof window === 'undefined') return null
      
      try {
        const item = localStorage.getItem(key)
        return item ? JSON.parse(item) : null
      } catch (error) {
        console.error(`Error reading from localStorage:`, error)
        return null
      }
    },

    set: <T>(key: string, value: T): boolean => {
      if (typeof window === 'undefined') return false
      
      try {
        localStorage.setItem(key, JSON.stringify(value))
        return true
      } catch (error) {
        console.error(`Error writing to localStorage:`, error)
        return false
      }
    },

    remove: (key: string): boolean => {
      if (typeof window === 'undefined') return false
      
      try {
        localStorage.removeItem(key)
        return true
      } catch (error) {
        console.error(`Error removing from localStorage:`, error)
        return false
      }
    },

    clear: (): boolean => {
      if (typeof window === 'undefined') return false
      
      try {
        localStorage.clear()
        return true
      } catch (error) {
        console.error(`Error clearing localStorage:`, error)
        return false
      }
    },

    exists: (key: string): boolean => {
      if (typeof window === 'undefined') return false
      return localStorage.getItem(key) !== null
    },
  },

  /**
   * Session storage utilities
   */
  session: {
    get: <T>(key: string): T | null => {
      if (typeof window === 'undefined') return null
      
      try {
        const item = sessionStorage.getItem(key)
        return item ? JSON.parse(item) : null
      } catch (error) {
        console.error(`Error reading from sessionStorage:`, error)
        return null
      }
    },

    set: <T>(key: string, value: T): boolean => {
      if (typeof window === 'undefined') return false
      
      try {
        sessionStorage.setItem(key, JSON.stringify(value))
        return true
      } catch (error) {
        console.error(`Error writing to sessionStorage:`, error)
        return false
      }
    },

    remove: (key: string): boolean => {
      if (typeof window === 'undefined') return false
      
      try {
        sessionStorage.removeItem(key)
        return true
      } catch (error) {
        console.error(`Error removing from sessionStorage:`, error)
        return false
      }
    },

    clear: (): boolean => {
      if (typeof window === 'undefined') return false
      
      try {
        sessionStorage.clear()
        return true
      } catch (error) {
        console.error(`Error clearing sessionStorage:`, error)
        return false
      }
    },

    exists: (key: string): boolean => {
      if (typeof window === 'undefined') return false
      return sessionStorage.getItem(key) !== null
    },
  },

  /**
   * Cookie utilities
   */
  cookie: {
    get: (name: string): string | null => {
      if (typeof document === 'undefined') return null
      
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) {
        return parts.pop()?.split(';').shift() || null
      }
      return null
    },

    set: (
      name: string,
      value: string,
      options: {
        expires?: Date
        maxAge?: number
        path?: string
        domain?: string
        secure?: boolean
        sameSite?: 'Strict' | 'Lax' | 'None'
      } = {}
    ): boolean => {
      if (typeof document === 'undefined') return false
      
      try {
        let cookieString = `${name}=${encodeURIComponent(value)}`
        
        if (options.expires) {
          cookieString += `; expires=${options.expires.toUTCString()}`
        }
        
        if (options.maxAge !== undefined) {
          cookieString += `; max-age=${options.maxAge}`
        }
        
        if (options.path) {
          cookieString += `; path=${options.path}`
        }
        
        if (options.domain) {
          cookieString += `; domain=${options.domain}`
        }
        
        if (options.secure) {
          cookieString += `; secure`
        }
        
        if (options.sameSite) {
          cookieString += `; samesite=${options.sameSite}`
        }
        
        document.cookie = cookieString
        return true
      } catch (error) {
        console.error(`Error setting cookie:`, error)
        return false
      }
    },

    remove: (name: string, path?: string, domain?: string): boolean => {
      return storageUtils.cookie.set(name, '', {
        expires: new Date(0),
        path,
        domain,
      })
    },

    exists: (name: string): boolean => {
      return storageUtils.cookie.get(name) !== null
    },
  },

  /**
   * Get available storage space
   */
  getStorageQuota: async (): Promise<{ usage: number; quota: number } | null> => {
    if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.estimate) {
      return null
    }
    
    try {
      const estimate = await navigator.storage.estimate()
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      }
    } catch (error) {
      console.error(`Error getting storage quota:`, error)
      return null
    }
  },

  /**
   * Check if storage is available
   */
  isStorageAvailable: (type: 'localStorage' | 'sessionStorage'): boolean => {
    if (typeof window === 'undefined') return false
    
    try {
      const storage = window[type]
      const testKey = '__storage_test__'
      storage.setItem(testKey, 'test')
      storage.removeItem(testKey)
      return true
    } catch (error) {
      return false
    }
  },
}

export default storageUtils
