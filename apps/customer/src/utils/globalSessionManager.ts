// Global session manager to prevent React Strict Mode duplicates
// This operates at window level, completely independent of React lifecycle

interface GlobalSessionState {
  sessionId: string
  tableId: string
  restaurantId: string
  timestamp: number
  isCreating: boolean
}

class GlobalSessionManager {
  private readonly STORAGE_KEY = 'tabsy-global-session-state'
  private readonly CREATION_TIMEOUT = 30000 // 30 seconds

  // Get current session state from window-level storage
  private getSessionState(tableId: string): GlobalSessionState | null {
    try {
      const data = sessionStorage.getItem(`${this.STORAGE_KEY}-${tableId}`)
      if (!data) return null

      const state: GlobalSessionState = JSON.parse(data)

      // Check if creation lock has expired
      if (state.isCreating && Date.now() - state.timestamp > this.CREATION_TIMEOUT) {
        console.log('[GlobalSessionManager] Creation lock expired, clearing state')
        this.clearSessionState(tableId)
        return null
      }

      return state
    } catch (error) {
      console.error('[GlobalSessionManager] Error reading session state:', error)
      return null
    }
  }

  // Set session state at window level
  private setSessionState(tableId: string, state: GlobalSessionState): void {
    try {
      sessionStorage.setItem(`${this.STORAGE_KEY}-${tableId}`, JSON.stringify(state))
      console.log('[GlobalSessionManager] Session state saved:', state)
    } catch (error) {
      console.error('[GlobalSessionManager] Error saving session state:', error)
    }
  }

  // Clear session state
  private clearSessionState(tableId: string): void {
    try {
      sessionStorage.removeItem(`${this.STORAGE_KEY}-${tableId}`)
      console.log('[GlobalSessionManager] Session state cleared for table:', tableId)
    } catch (error) {
      console.error('[GlobalSessionManager] Error clearing session state:', error)
    }
  }

  // Check if session already exists for this table
  hasSession(tableId: string): boolean {
    const state = this.getSessionState(tableId)
    return state !== null && !state.isCreating && state.sessionId
  }

  // Get existing session ID
  getSessionId(tableId: string): string | null {
    const state = this.getSessionState(tableId)
    return state && !state.isCreating ? state.sessionId : null
  }

  // Check if session creation is in progress
  isCreationInProgress(tableId: string): boolean {
    const state = this.getSessionState(tableId)
    return state !== null && state.isCreating
  }

  // Start session creation (atomic lock)
  startSessionCreation(tableId: string, restaurantId: string): boolean {
    // Check if session already exists or creation is in progress
    const existingState = this.getSessionState(tableId)
    if (existingState) {
      console.log('[GlobalSessionManager] Session already exists or creation in progress:', existingState)
      return false
    }

    // Atomically set creation lock
    const creationState: GlobalSessionState = {
      sessionId: '',
      tableId,
      restaurantId,
      timestamp: Date.now(),
      isCreating: true
    }

    this.setSessionState(tableId, creationState)
    console.log('[GlobalSessionManager] Session creation started for table:', tableId)
    return true
  }

  // Complete session creation
  completeSessionCreation(tableId: string, sessionId: string): void {
    const state = this.getSessionState(tableId)
    if (!state || !state.isCreating) {
      console.warn('[GlobalSessionManager] Attempted to complete session creation without active creation state')
      return
    }

    const completedState: GlobalSessionState = {
      ...state,
      sessionId,
      isCreating: false,
      timestamp: Date.now()
    }

    this.setSessionState(tableId, completedState)
    console.log('[GlobalSessionManager] Session creation completed:', sessionId)
  }

  // Cancel session creation (on error)
  cancelSessionCreation(tableId: string): void {
    console.log('[GlobalSessionManager] Canceling session creation for table:', tableId)
    this.clearSessionState(tableId)
  }

  // Wait for ongoing session creation to complete
  async waitForSessionCreation(tableId: string, maxWaitTime: number = 10000): Promise<string | null> {
    const startTime = Date.now()

    while (Date.now() - startTime < maxWaitTime) {
      const state = this.getSessionState(tableId)

      if (!state) {
        // Creation was canceled or failed
        return null
      }

      if (!state.isCreating && state.sessionId) {
        // Creation completed successfully
        console.log('[GlobalSessionManager] Session creation completed, returning session:', state.sessionId)
        return state.sessionId
      }

      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.warn('[GlobalSessionManager] Timeout waiting for session creation')
    return null
  }
}

// Single global instance
export const globalSessionManager = new GlobalSessionManager()