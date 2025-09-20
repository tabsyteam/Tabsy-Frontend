// Global guard against React Strict Mode duplicate effects
// This operates at window level, completely immune to React lifecycle

interface StrictModeGuardState {
  [key: string]: {
    executed: boolean
    timestamp: number
    result?: any
  }
}

class StrictModeGuard {
  private readonly STORAGE_KEY = 'tabsy-strict-mode-guard'
  private readonly EXPIRY_TIME = 60000 // 60 seconds

  // Get guard state from window storage
  private getGuardState(): StrictModeGuardState {
    try {
      const data = sessionStorage.getItem(this.STORAGE_KEY)
      if (!data) return {}

      const state: StrictModeGuardState = JSON.parse(data)
      const now = Date.now()

      // Clean up expired entries
      Object.keys(state).forEach(key => {
        if (now - state[key].timestamp > this.EXPIRY_TIME) {
          delete state[key]
        }
      })

      this.saveGuardState(state)
      return state
    } catch (error) {
      console.error('[StrictModeGuard] Error reading guard state:', error)
      return {}
    }
  }

  // Save guard state to window storage
  private saveGuardState(state: StrictModeGuardState): void {
    try {
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(state))
    } catch (error) {
      console.error('[StrictModeGuard] Error saving guard state:', error)
    }
  }

  // Check if an operation has already been executed
  hasExecuted(operationKey: string): boolean {
    const state = this.getGuardState()
    return state[operationKey]?.executed === true
  }

  // Get the result of a previously executed operation
  getResult<T>(operationKey: string): T | undefined {
    const state = this.getGuardState()
    return state[operationKey]?.result
  }

  // Mark an operation as executed and store its result
  markExecuted<T>(operationKey: string, result?: T): void {
    const state = this.getGuardState()
    state[operationKey] = {
      executed: true,
      timestamp: Date.now(),
      result
    }
    this.saveGuardState(state)
    console.log('[StrictModeGuard] Marked operation as executed:', operationKey)
  }

  // Execute an operation only once, even across React Strict Mode remounts
  async executeOnce<T>(
    operationKey: string,
    operation: () => Promise<T>
  ): Promise<T | undefined> {
    // Check if already executed
    if (this.hasExecuted(operationKey)) {
      const result = this.getResult<T>(operationKey)
      console.log('[StrictModeGuard] Operation already executed, returning cached result:', operationKey)
      return result
    }

    try {
      console.log('[StrictModeGuard] Executing operation for the first time:', operationKey)
      const result = await operation()
      this.markExecuted(operationKey, result)
      return result
    } catch (error) {
      console.error('[StrictModeGuard] Operation failed:', operationKey, error)
      // Don't mark as executed on failure, allow retry
      throw error
    }
  }

  // Clear a specific operation
  clearOperation(operationKey: string): void {
    const state = this.getGuardState()
    delete state[operationKey]
    this.saveGuardState(state)
    console.log('[StrictModeGuard] Cleared operation:', operationKey)
  }

  // Clear all operations (useful for testing)
  clearAll(): void {
    sessionStorage.removeItem(this.STORAGE_KEY)
    console.log('[StrictModeGuard] Cleared all operations')
  }
}

// Single global instance
export const strictModeGuard = new StrictModeGuard()