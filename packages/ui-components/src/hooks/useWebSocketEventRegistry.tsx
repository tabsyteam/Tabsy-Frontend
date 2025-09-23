'use client'

import { useRef, useCallback, useEffect } from 'react'
import { TabsyWebSocketClient, WebSocketEventMap, WebSocketEventListener } from '@tabsy/api-client'

interface EventRegistration<K extends keyof WebSocketEventMap> {
  id: string
  component: string
  handler: WebSocketEventListener<K>
  lastEventId?: string
}

interface EventRegistry {
  [eventName: string]: EventRegistration<any>[]
}

// Global registry to track all event registrations across the app
const globalEventRegistry: EventRegistry = {}

/**
 * Hook for managing WebSocket event registrations with deduplication
 * Prevents the same event from being processed multiple times by different components
 */
export function useWebSocketEventRegistry<K extends keyof WebSocketEventMap>(
  client: TabsyWebSocketClient | null,
  event: K,
  handler: WebSocketEventListener<K>,
  component: string,
  deps: React.DependencyList = []
): {
  registrationId: string
  isRegistered: boolean
} {
  const registrationRef = useRef<string | undefined>(undefined)
  const cleanupRef = useRef<(() => void) | null>(null)

  // Generate unique registration ID
  const registrationId = registrationRef.current || `${component}-${event}-${Date.now()}-${Math.random()}`
  if (!registrationRef.current) {
    registrationRef.current = registrationId
  }

  // Central event dispatcher that handles deduplication
  const centralDispatcher = useCallback((data: WebSocketEventMap[K]) => {
    const eventKey = event as string
    const registrations = globalEventRegistry[eventKey] || []

    // Extract event ID if available for deduplication
    const eventId = (data as any)?.eventId || (data as any)?.timestamp || Date.now()

    console.log(`🎯 WebSocket Event Registry: Dispatching '${eventKey}' to ${registrations.length} handlers`, {
      eventId,
      registrations: registrations.map(r => ({ id: r.id, component: r.component }))
    })

    // Process each registration
    registrations.forEach((registration) => {
      // Skip if this handler already processed this exact event
      if (registration.lastEventId === eventId) {
        console.log(`⚠️ Skipping duplicate event ${eventKey} for ${registration.component} (eventId: ${eventId})`)
        return
      }

      // Update last processed event ID
      registration.lastEventId = eventId

      try {
        // Call the component's handler
        registration.handler(data)
        console.log(`✅ Processed ${eventKey} for ${registration.component}`)
      } catch (error) {
        console.error(`❌ Error processing ${eventKey} for ${registration.component}:`, error)
      }
    })
  }, [event])

  // Register this component's handler
  useEffect(() => {
    if (!client || !event || !handler) return

    const eventKey = event as string

    // Initialize registry for this event if needed
    if (!globalEventRegistry[eventKey]) {
      globalEventRegistry[eventKey] = []
    }

    // Check if this component is already registered
    const existingIndex = globalEventRegistry[eventKey].findIndex(r => r.id === registrationId)

    if (existingIndex >= 0) {
      // Update existing registration
      globalEventRegistry[eventKey][existingIndex].handler = handler
      console.log(`🔄 Updated WebSocket handler for ${component}:${eventKey}`)
    } else {
      // Add new registration
      const registration: EventRegistration<K> = {
        id: registrationId,
        component,
        handler
      }

      globalEventRegistry[eventKey].push(registration)
      console.log(`📝 Registered WebSocket handler for ${component}:${eventKey}`)

      // Set up the actual WebSocket listener only if this is the first registration
      if (globalEventRegistry[eventKey].length === 1) {
        client.on(event, centralDispatcher)
        console.log(`🔌 Added WebSocket listener for ${eventKey}`)

        cleanupRef.current = () => {
          client.off(event, centralDispatcher)
          console.log(`🔌 Removed WebSocket listener for ${eventKey}`)
        }
      }
    }

    // Cleanup function
    return () => {
      const currentRegistrations = globalEventRegistry[eventKey] || []
      const registrationIndex = currentRegistrations.findIndex(r => r.id === registrationId)

      if (registrationIndex >= 0) {
        globalEventRegistry[eventKey].splice(registrationIndex, 1)
        console.log(`🗑️ Unregistered WebSocket handler for ${component}:${eventKey}`)

        // Remove the actual WebSocket listener if no more registrations
        if (globalEventRegistry[eventKey].length === 0) {
          if (cleanupRef.current) {
            cleanupRef.current()
            cleanupRef.current = null
          }
          delete globalEventRegistry[eventKey]
        }
      }
    }
  }, [client, event, handler, component, registrationId, centralDispatcher, ...(Array.isArray(deps) ? deps : [])])

  return {
    registrationId,
    isRegistered: !!(globalEventRegistry[event as string]?.some(r => r.id === registrationId))
  }
}

/**
 * Debug hook to inspect current event registrations
 */
export function useWebSocketRegistryDebug(): EventRegistry {
  return globalEventRegistry
}

/**
 * Hook to get registration stats for debugging
 */
export function useWebSocketRegistryStats() {
  const getStats = useCallback(() => {
    const stats: { [eventName: string]: { count: number, components: string[] } } = {}

    Object.keys(globalEventRegistry).forEach(eventName => {
      const registrations = globalEventRegistry[eventName]
      stats[eventName] = {
        count: registrations.length,
        components: registrations.map(r => r.component)
      }
    })

    return stats
  }, [])

  return { getStats }
}