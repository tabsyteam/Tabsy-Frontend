/**
 * Storage Cleanup Utility
 *
 * Provides tools to analyze and clean up storage bloat
 * Can be used immediately while migration is pending
 *
 * Usage in Browser Console:
 * ```
 * import { storageCleanup } from '@/lib/storageCleanup'
 * storageCleanup.analyze()
 * storageCleanup.cleanupLegacyKeys()
 * ```
 *
 * @author Senior Software Architect
 */

interface StorageAnalysis {
  totalKeys: number
  tabsyKeys: number
  legacyKeys: string[]
  duplicateData: Array<{
    type: string
    keys: string[]
    valuesSame: boolean
  }>
  recommendations: string[]
  totalSize: number
}

class StorageCleanup {
  /**
   * Analyze current storage state
   */
  analyze(): StorageAnalysis {
    const analysis: StorageAnalysis = {
      totalKeys: sessionStorage.length,
      tabsyKeys: 0,
      legacyKeys: [],
      duplicateData: [],
      recommendations: [],
      totalSize: 0
    }

    const keys: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key) keys.push(key)
    }

    // Categorize keys
    const tabsyKeys = keys.filter(k => k.startsWith('tabsy-') || k.startsWith('guestSession-'))
    analysis.tabsyKeys = tabsyKeys.length

    // Find legacy keys
    const legacyPatterns = [
      'guestSession-',
      'tabsy-global-session-state-',
      'tabsy-table-session-lock-'
    ]

    analysis.legacyKeys = tabsyKeys.filter(key =>
      legacyPatterns.some(pattern => key.includes(pattern))
    )

    // Check for duplicate session IDs
    const guestSessionKeys = keys.filter(k => k.includes('guestSession-'))
    const mainSessionId = sessionStorage.getItem('tabsy-guest-session-id')
    const diningSession = sessionStorage.getItem('tabsy-dining-session')

    if (guestSessionKeys.length > 0 || mainSessionId || diningSession) {
      const sessionIds: string[] = []

      guestSessionKeys.forEach(key => {
        const val = sessionStorage.getItem(key)
        if (val) sessionIds.push(val)
      })

      if (mainSessionId) sessionIds.push(mainSessionId)

      if (diningSession) {
        try {
          const parsed = JSON.parse(diningSession)
          if (parsed.sessionId) sessionIds.push(parsed.sessionId)
        } catch {}
      }

      const uniqueSessionIds = [...new Set(sessionIds)]

      if (sessionIds.length > uniqueSessionIds.length) {
        analysis.duplicateData.push({
          type: 'sessionId',
          keys: [...guestSessionKeys, 'tabsy-guest-session-id', 'tabsy-dining-session'],
          valuesSame: uniqueSessionIds.length === 1
        })

        analysis.recommendations.push(
          `Found ${sessionIds.length} copies of session ID across ${sessionIds.length - uniqueSessionIds.length + 1} keys. Consider migrating to unified storage.`
        )
      }
    }

    // Calculate total size
    keys.forEach(key => {
      const value = sessionStorage.getItem(key)
      if (value) {
        analysis.totalSize += key.length + value.length
      }
    })

    // Generate recommendations
    if (analysis.legacyKeys.length > 0) {
      analysis.recommendations.push(
        `Found ${analysis.legacyKeys.length} legacy keys that can be safely removed after migration.`
      )
    }

    if (analysis.tabsyKeys > 5) {
      analysis.recommendations.push(
        `High number of storage keys (${analysis.tabsyKeys}). Unified storage can reduce this to 3-4 keys.`
      )
    }

    const strictModeKey = keys.find(k => k.includes('strict-mode-guard'))
    if (strictModeKey && process.env.NODE_ENV === 'production') {
      analysis.recommendations.push(
        `Debug key "${strictModeKey}" found in production. This should only exist in development.`
      )
    }

    return analysis
  }

  /**
   * Clean up legacy keys (safe to call)
   */
  cleanupLegacyKeys(options: { dryRun?: boolean; tableId?: string } = {}): {
    removed: string[]
    wouldRemove: string[]
  } {
    const result = {
      removed: [] as string[],
      wouldRemove: [] as string[]
    }

    const keysToCheck = [
      'tabsy-global-session-state-',
      'tabsy-table-session-lock-',
      'tabsy-strict-mode-guard', // Remove in production
    ]

    // Optionally add table-specific keys
    if (options.tableId) {
      keysToCheck.push(`guestSession-${options.tableId}`)
      keysToCheck.push(`tabsy-global-session-state-${options.tableId}`)
    }

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (!key) continue

      const shouldRemove = keysToCheck.some(pattern => key.includes(pattern))

      if (shouldRemove) {
        if (options.dryRun) {
          result.wouldRemove.push(key)
        } else {
          sessionStorage.removeItem(key)
          result.removed.push(key)
        }
      }
    }

    // Remove strict mode guard in production
    if (process.env.NODE_ENV === 'production') {
      const strictKey = 'tabsy-strict-mode-guard'
      if (sessionStorage.getItem(strictKey)) {
        if (options.dryRun) {
          result.wouldRemove.push(strictKey)
        } else {
          sessionStorage.removeItem(strictKey)
          result.removed.push(strictKey)
        }
      }
    }

    return result
  }

  /**
   * Print analysis to console (for debugging)
   */
  printAnalysis(): void {
    const analysis = this.analyze()

    console.group('📊 Storage Analysis')
    console.log(`Total Keys: ${analysis.totalKeys}`)
    console.log(`Tabsy Keys: ${analysis.tabsyKeys}`)
    console.log(`Legacy Keys: ${analysis.legacyKeys.length}`, analysis.legacyKeys)
    console.log(`Total Size: ${(analysis.totalSize / 1024).toFixed(2)} KB`)

    if (analysis.duplicateData.length > 0) {
      console.group('⚠️ Duplicate Data Found')
      analysis.duplicateData.forEach(dup => {
        console.log(`Type: ${dup.type}`)
        console.log(`Keys: ${dup.keys.join(', ')}`)
        console.log(`Values same: ${dup.valuesSame}`)
      })
      console.groupEnd()
    }

    if (analysis.recommendations.length > 0) {
      console.group('💡 Recommendations')
      analysis.recommendations.forEach(rec => console.log(`- ${rec}`))
      console.groupEnd()
    }

    console.groupEnd()
  }

  /**
   * Export storage data (for debugging)
   */
  exportStorage(): Record<string, string> {
    const data: Record<string, string> = {}

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key) {
        const value = sessionStorage.getItem(key)
        if (value) data[key] = value
      }
    }

    return data
  }

  /**
   * List all Tabsy keys
   */
  listTabsyKeys(): Array<{ key: string; size: number; type: string }> {
    const keys: Array<{ key: string; size: number; type: string }> = []

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (!key || !key.startsWith('tabsy-') && !key.startsWith('guestSession-')) continue

      const value = sessionStorage.getItem(key)
      const size = value ? value.length : 0

      let type = 'other'
      if (key.includes('session')) type = 'session'
      else if (key.includes('cart')) type = 'cart'
      else if (key.includes('menu')) type = 'menu'
      else if (key.includes('strict-mode') || key.includes('lock')) type = 'debug'

      keys.push({ key, size, type })
    }

    return keys.sort((a, b) => b.size - a.size)
  }
}

// Export singleton instance
export const storageCleanup = new StorageCleanup()

// Expose to window for easy console access
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).storageCleanup = storageCleanup
  console.log('💡 Storage cleanup utility available: window.storageCleanup')
  console.log('   Usage: storageCleanup.printAnalysis()')
}