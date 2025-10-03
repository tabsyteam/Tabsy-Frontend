# Split Bill Payment - Professional Architecture Design

## Executive Summary

The current split bill implementation has fundamental architectural flaws causing infinite API loops, complex state management, and poor maintainability. This document provides a complete redesign based on software architecture best practices.

---

## Current Architecture Problems

### Problem 1: Violation of Single Responsibility Principle

**Current State Variables (17 total):**
```typescript
- splitOption: SplitPaymentOption
- customAmounts: { [userId: string]: string }
- customPercentages: { [userId: string]: string }
- itemAssignments: { [itemId: string]: string }
- backendSplitAmounts: { [guestSessionId: string]: number }
- splitCalculationLoading: boolean
- splitCalculationError: string | null
- recentLocalSplitChange: { type, updateId, timestamp }
- lastUpdateMetadata: { updateId, timestamp, updatedBy }
- splitLockStatus: { isLocked, lockedBy, lockReason, lockedAt }
- initialSplitLoaded: boolean
- loadingInitialSplit: boolean
- syncingWithOtherUsers: boolean
- debouncingUpdates: { [key: string]: boolean }
+ 5 refs (inFlightRequestsRef, isCreatingSplitRef, splitTypeChangedByWebSocketRef, etc.)
```

**Issues:**
- Too many state variables (17+) managing the same concept
- Multiple sources of truth
- Difficult to maintain consistency
- Hard to debug state transitions

### Problem 2: useEffect Triggering Side Effects

**Current Pattern:**
```typescript
useEffect(() => {
  if (actualSessionId && splitOption.participants.length > 0) {
    setTimeout(() => {
      createSplitCalculation()  // API CALL FROM useEffect!
    }, 1000)
  }
}, [actualSessionId, splitOption.type])  // Fires on state change
```

**Why This is Wrong:**
- useEffect should sync with external systems, not trigger business logic
- Creates circular dependencies: State → useEffect → API → WebSocket → State → useEffect...
- Violates React's mental model of effects as synchronization, not side effects

### Problem 3: WebSocket Handler Doing Too Much

**Current Responsibilities:**
1. Receiving updates
2. Deduplication logic
3. Timestamp comparison
4. Optimistic update reconciliation
5. State updates
6. Setting flags to prevent loops
7. Clearing input values
8. Showing toasts

**Result:** 200+ lines of complex WebSocket handling logic

### Problem 4: No Clear API Boundary

**Current Flow:**
```
User Action → Multiple setState calls → useEffect fires → API call → WebSocket
                                    ↓
                            Also direct API call
```

**Issues:**
- API called from multiple places (useEffect, handleSplitOptionChange, debouncedUpdate)
- Race conditions
- Duplicate requests
- Hard to track request lifecycle

### Problem 5: Mixing UI State with Server State

```typescript
// UI input state
const [customPercentages, setCustomPercentages] = useState({})

// Server state
const [backendSplitAmounts, setBackendSplitAmounts] = useState({})

// Hybrid state?
const [splitOption, setSplitOption] = useState({
  type: SplitBillType.EQUAL,
  participants: [],
  amounts: customAmounts,  // UI state
  percentages: customPercentages,  // UI state
  itemAssignments: itemAssignments  // UI state
})
```

**Problem:** No clear separation between:
- What user is currently typing (UI state)
- What has been sent to server (pending state)
- What server has confirmed (server state)

---

## Proper Architecture Design

### Principle 1: Separate UI State from Server State

**Server State (Source of Truth):**
```typescript
interface SplitCalculationState {
  splitType: SplitBillType
  participants: string[]
  splitAmounts: { [userId: string]: number }  // Backend calculated
  percentages?: { [userId: string]: number }
  amounts?: { [userId: string]: number }
  itemAssignments?: { [itemId: string]: string }
  updatedBy: string
  updatedAt: string
  isLocked: boolean
}

const [serverState, setServerState] = useState<SplitCalculationState | null>(null)
```

**UI State (Local Input):**
```typescript
interface LocalInputState {
  [userId: string]: {
    percentage?: string  // What user is typing (string for controlled input)
    amount?: string
  }
}

const [localInputs, setLocalInputs] = useState<LocalInputState>({})
```

**UI Metadata:**
```typescript
const [uiState, setUiState] = useState({
  isLoading: false,
  error: null,
  selectedSplitType: SplitBillType.EQUAL
})
```

### Principle 2: Single Source of API Calls

**API Service Layer:**
```typescript
class SplitCalculationService {
  private api: TabsyAPI
  private sessionId: string

  // Only these methods call the API
  async loadSplitCalculation(): Promise<SplitCalculationState>
  async changeSplitType(type: SplitBillType): Promise<SplitCalculationState>
  async updateUserAmount(userId: string, value: number): Promise<SplitCalculationState>
  async updateUserPercentage(userId: string, value: number): Promise<SplitCalculationState>
}
```

**Benefits:**
- Single responsibility
- Easy to test
- Easy to add caching/retries
- Clear API boundary

### Principle 3: Event-Driven Architecture

**User Actions (Commands):**
```typescript
type SplitBillAction =
  | { type: 'CHANGE_SPLIT_TYPE', splitType: SplitBillType }
  | { type: 'UPDATE_USER_PERCENTAGE', userId: string, value: string }
  | { type: 'UPDATE_USER_AMOUNT', userId: string, value: string }
  | { type: 'UPDATE_ITEM_ASSIGNMENT', itemId: string, userId: string }

const handleAction = async (action: SplitBillAction) => {
  setUiState(prev => ({ ...prev, isLoading: true }))

  try {
    const result = await splitService.handleAction(action)
    setServerState(result)
  } catch (error) {
    setUiState(prev => ({ ...prev, error: error.message }))
  } finally {
    setUiState(prev => ({ ...prev, isLoading: false }))
  }
}
```

**WebSocket Events (Read-only):**
```typescript
const handleWebSocketUpdate = (update: SplitCalculationState) => {
  // ONLY update state, NEVER call API
  setServerState(update)
}
```

### Principle 4: No Side Effects in useEffect

**Current (Wrong):**
```typescript
useEffect(() => {
  createSplitCalculation()  // ❌ API call
}, [splitOption.type])
```

**Correct:**
```typescript
// Load initial data once
useEffect(() => {
  loadInitialData()
}, [])  // Empty deps - runs once

// Setup WebSocket listener once
useEffect(() => {
  const unsubscribe = webSocket.on('split:update', handleWebSocketUpdate)
  return unsubscribe
}, [])  // Empty deps - runs once

// NO useEffect that triggers API calls based on state changes!
```

### Principle 5: Debouncing at Input Level

**Current (Wrong):**
```typescript
const [customPercentages, setCustomPercentages] = useState({})

const handlePercentageChange = (userId: string, value: string) => {
  setCustomPercentages(prev => ({ ...prev, [userId]: value }))
  debouncedUpdateSplitCalculation(userId, parseFloat(value))  // Separate debounce
}
```

**Correct:**
```typescript
const debouncedApiCall = useMemo(
  () => debounce((userId: string, value: number) => {
    splitService.updateUserPercentage(userId, value)
  }, 500),
  []
)

const handlePercentageChange = (userId: string, value: string) => {
  // Update UI immediately
  setLocalInputs(prev => ({
    ...prev,
    [userId]: { ...prev[userId], percentage: value }
  }))

  // Debounced API call
  if (value && !isNaN(parseFloat(value))) {
    debouncedApiCall(userId, parseFloat(value))
  }
}
```

---

## Proposed Architecture

### Component Structure

```
SplitBillPayment (Container)
├── useSplitCalculation (Custom Hook)
│   ├── Server State Management
│   ├── API Calls
│   └── WebSocket Handling
├── SplitTypeSelector (Presentational)
├── SplitAmountInputs (Presentational)
│   ├── EqualSplitDisplay
│   ├── PercentageInputs
│   ├── AmountInputs
│   └── ItemAssignments
└── PaymentSection (Presentational)
```

### Custom Hook: useSplitCalculation

```typescript
interface UseSplitCalculationReturn {
  // Server state (read-only for components)
  serverState: SplitCalculationState | null

  // UI state
  localInputs: LocalInputState
  isLoading: boolean
  error: string | null

  // Actions (the only way to trigger changes)
  changeSplitType: (type: SplitBillType) => Promise<void>
  updateUserPercentage: (userId: string, value: string) => void
  updateUserAmount: (userId: string, value: string) => void
  updateItemAssignment: (itemId: string, userId: string) => Promise<void>

  // Computed values
  userSplitAmount: number
  isValid: boolean
  validationErrors: string[]
}

function useSplitCalculation(
  sessionId: string,
  currentUserId: string,
  api: TabsyAPI
): UseSplitCalculationReturn {
  // Implementation here
}
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                         USER ACTIONS                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Component Event Handlers                    │
│  - onChange handlers                                         │
│  - onClick handlers                                          │
│  - Only update local UI state                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Debounced API Calls                       │
│  - Input changes: 500ms debounce                            │
│  - Split type change: Immediate                             │
│  - Single source of truth for API calls                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend API                             │
│  - Validates input                                           │
│  - Calculates split amounts                                  │
│  - Stores in database                                        │
│  - Broadcasts via WebSocket                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   WebSocket Broadcast                        │
│  - All users receive update                                  │
│  - Update server state ONLY                                  │
│  - NO API calls from WebSocket handler                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      UI Re-renders                           │
│  - Display updated split amounts                             │
│  - Show validation messages                                  │
│  - Update progress indicators                                │
└─────────────────────────────────────────────────────────────┘
```

### State Lifecycle

```typescript
// 1. INITIALIZATION (Component Mount)
useEffect(() => {
  async function init() {
    setUiState({ isLoading: true })
    const existing = await splitService.loadSplitCalculation()
    if (existing) {
      setServerState(existing)
      setLocalInputs(convertToLocalInputs(existing))
    } else {
      // Create default EQUAL split
      const created = await splitService.changeSplitType(SplitBillType.EQUAL)
      setServerState(created)
    }
    setUiState({ isLoading: false })
  }
  init()
}, [])  // Runs once

// 2. USER INPUT (Immediate UI update)
const handleInput = (userId: string, field: 'percentage' | 'amount', value: string) => {
  setLocalInputs(prev => ({
    ...prev,
    [userId]: { ...prev[userId], [field]: value }
  }))

  // Debounced API call
  debouncedUpdate(userId, field, parseFloat(value))
}

// 3. API RESPONSE (Update server state)
const handleApiResponse = (response: SplitCalculationState) => {
  setServerState(response)
  // Optionally update local inputs to match server (for validation corrections)
}

// 4. WEBSOCKET UPDATE (Update server state)
const handleWebSocketUpdate = (update: SplitCalculationState) => {
  setServerState(update)
  // Don't update localInputs for current user's fields
  // Update localInputs for other users' fields
}
```

---

## Implementation Plan

### Phase 1: Create Service Layer (2 hours)
1. Create `SplitCalculationService` class
2. Move all API calls to service
3. Add proper error handling
4. Add request deduplication in service

### Phase 2: Create Custom Hook (3 hours)
1. Create `useSplitCalculation` hook
2. Implement state management
3. Implement action handlers
4. Add WebSocket integration
5. Add computed values (validation, amounts)

### Phase 3: Refactor Component (4 hours)
1. Replace existing state with hook
2. Remove all useEffect API calls
3. Simplify WebSocket handler
4. Remove all refs and flags
5. Update UI to use hook values

### Phase 4: Extract Presentational Components (2 hours)
1. Create `SplitTypeSelector`
2. Create `PercentageInputs`
3. Create `AmountInputs`
4. Create `EqualSplitDisplay`

### Phase 5: Testing (3 hours)
1. Unit tests for service
2. Unit tests for hook
3. Integration tests
4. Multi-user flow testing

**Total Estimate: 14 hours**

---

## Benefits of New Architecture

### 1. Maintainability
- Clear separation of concerns
- Single responsibility for each module
- Easy to locate bugs
- Easy to add features

### 2. Testability
- Service layer easily testable
- Hook easily testable with React Testing Library
- Presentational components easily testable
- Can mock WebSocket for tests

### 3. Performance
- No infinite loops
- No duplicate API calls
- Proper debouncing
- Optimized re-renders

### 4. Developer Experience
- Clear data flow
- Easy to understand
- Self-documenting code
- Type-safe

### 5. User Experience
- Fast UI updates (optimistic)
- Real-time sync
- Clear error messages
- No unexpected behavior

---

## Migration Strategy

### Option A: Big Bang Rewrite (Recommended)
- Create new `SplitBillPaymentV2.tsx`
- Implement clean architecture
- Test thoroughly
- Swap in production
- Delete old component

**Pros:** Clean slate, no technical debt
**Cons:** More upfront work

### Option B: Incremental Refactor
- Extract service layer first
- Add custom hook alongside existing state
- Gradually migrate state to hook
- Remove old state variables one by one

**Pros:** Lower risk
**Cons:** Messy intermediate state, takes longer

**Recommendation:** Option A (Big Bang) - The current code has too many interdependencies

---

## Code Examples

### Service Layer

```typescript
// src/services/SplitCalculationService.ts
export class SplitCalculationService {
  private api: TabsyAPI
  private sessionId: string
  private currentUserId: string
  private inFlightRequests = new Set<string>()

  constructor(api: TabsyAPI, sessionId: string, currentUserId: string) {
    this.api = api
    this.sessionId = sessionId
    this.currentUserId = currentUserId
  }

  async loadSplitCalculation(): Promise<SplitCalculationState | null> {
    const response = await this.api.tableSession.getSplitCalculation(this.sessionId)
    return response.success ? this.mapToState(response.data) : null
  }

  async changeSplitType(type: SplitBillType): Promise<SplitCalculationState> {
    const requestKey = `change_type_${type}`
    if (this.inFlightRequests.has(requestKey)) {
      throw new Error('Request already in flight')
    }

    this.inFlightRequests.add(requestKey)
    try {
      const response = await this.api.tableSession.createSplitCalculation(
        this.sessionId,
        { splitType: type, participants: [] },
        { guestSessionId: this.currentUserId }
      )

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to change split type')
      }

      return this.mapToState(response.data)
    } finally {
      this.inFlightRequests.delete(requestKey)
    }
  }

  async updateUserPercentage(userId: string, percentage: number): Promise<SplitCalculationState> {
    const requestKey = `update_pct_${userId}`
    if (this.inFlightRequests.has(requestKey)) {
      throw new Error('Request already in flight')
    }

    this.inFlightRequests.add(requestKey)
    try {
      const response = await this.api.tableSession.updateSplitCalculation(
        this.sessionId,
        userId,
        { percentage },
        { guestSessionId: this.currentUserId }
      )

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update percentage')
      }

      return this.mapToState(response.data)
    } finally {
      this.inFlightRequests.delete(requestKey)
    }
  }

  private mapToState(data: any): SplitCalculationState {
    return {
      splitType: data.splitType,
      participants: data.participants,
      splitAmounts: data.splitAmounts,
      percentages: data.percentages,
      amounts: data.amounts,
      itemAssignments: data.itemAssignments,
      updatedBy: data.updatedBy,
      updatedAt: data.updatedAt,
      isLocked: data.isLocked
    }
  }
}
```

### Custom Hook

```typescript
// src/hooks/useSplitCalculation.ts
export function useSplitCalculation(
  sessionId: string,
  currentUserId: string,
  api: TabsyAPI,
  users: TableSessionUser[]
) {
  const [serverState, setServerState] = useState<SplitCalculationState | null>(null)
  const [localInputs, setLocalInputs] = useState<LocalInputState>({})
  const [uiState, setUiState] = useState({ isLoading: false, error: null })

  const service = useMemo(
    () => new SplitCalculationService(api, sessionId, currentUserId),
    [api, sessionId, currentUserId]
  )

  // Load initial data once
  useEffect(() => {
    async function loadInitial() {
      setUiState(prev => ({ ...prev, isLoading: true }))
      try {
        const existing = await service.loadSplitCalculation()
        if (existing) {
          setServerState(existing)
          setLocalInputs(convertToLocalInputs(existing))
        } else {
          // Create default
          const created = await service.changeSplitType(SplitBillType.EQUAL)
          setServerState(created)
        }
      } catch (error: any) {
        setUiState(prev => ({ ...prev, error: error.message }))
      } finally {
        setUiState(prev => ({ ...prev, isLoading: false }))
      }
    }
    loadInitial()
  }, [service])

  // Debounced update function
  const debouncedUpdate = useMemo(
    () => debounce(async (userId: string, field: 'percentage' | 'amount', value: number) => {
      try {
        const result = field === 'percentage'
          ? await service.updateUserPercentage(userId, value)
          : await service.updateUserAmount(userId, value)
        setServerState(result)
      } catch (error: any) {
        setUiState(prev => ({ ...prev, error: error.message }))
      }
    }, 500),
    [service]
  )

  const changeSplitType = useCallback(async (type: SplitBillType) => {
    setUiState(prev => ({ ...prev, isLoading: true, error: null }))
    try {
      const result = await service.changeSplitType(type)
      setServerState(result)
      setLocalInputs({})  // Clear local inputs
    } catch (error: any) {
      setUiState(prev => ({ ...prev, error: error.message }))
    } finally {
      setUiState(prev => ({ ...prev, isLoading: false }))
    }
  }, [service])

  const updateUserPercentage = useCallback((userId: string, value: string) => {
    // Update UI immediately
    setLocalInputs(prev => ({
      ...prev,
      [userId]: { ...prev[userId], percentage: value }
    }))

    // Debounced API call
    const numValue = parseFloat(value)
    if (!isNaN(numValue)) {
      debouncedUpdate(userId, 'percentage', numValue)
    }
  }, [debouncedUpdate])

  // WebSocket handler
  useEffect(() => {
    const handleWebSocketUpdate = (update: SplitCalculationState) => {
      // Only update if not from current user to prevent echo
      if (update.updatedBy !== currentUserId) {
        setServerState(update)
      }
    }

    // Subscribe to WebSocket events
    const unsubscribe = webSocket.on('split:calculation_updated', handleWebSocketUpdate)
    return unsubscribe
  }, [currentUserId])

  // Computed values
  const userSplitAmount = serverState?.splitAmounts?.[currentUserId] || 0
  const isValid = validateSplit(serverState, users)

  return {
    serverState,
    localInputs,
    isLoading: uiState.isLoading,
    error: uiState.error,
    changeSplitType,
    updateUserPercentage,
    updateUserAmount,
    updateItemAssignment,
    userSplitAmount,
    isValid,
    validationErrors: []
  }
}
```

### Component Usage

```typescript
export function SplitBillPayment(props: SplitBillPaymentProps) {
  const {
    serverState,
    localInputs,
    isLoading,
    error,
    changeSplitType,
    updateUserPercentage,
    updateUserAmount,
    userSplitAmount,
    isValid
  } = useSplitCalculation(
    props.sessionId,
    props.currentUser.guestSessionId,
    props.api,
    props.users
  )

  return (
    <div>
      <SplitTypeSelector
        selectedType={serverState?.splitType || SplitBillType.EQUAL}
        onChange={changeSplitType}
        disabled={isLoading}
      />

      {serverState?.splitType === SplitBillType.BY_PERCENTAGE && (
        <PercentageInputs
          users={props.users}
          currentUserId={props.currentUser.guestSessionId}
          values={localInputs}
          serverValues={serverState.percentages}
          onChange={updateUserPercentage}
          disabled={isLoading}
        />
      )}

      <PaymentSummary
        amount={userSplitAmount}
        isValid={isValid}
        error={error}
      />
    </div>
  )
}
```

---

## WebSocket Event Management (Critical)

### Problem: Duplicate Event Listeners

**Current Issues:**
1. Multiple components might subscribe to same event
2. useEffect cleanup not properly removing listeners
3. Event listeners registered multiple times on re-renders
4. Memory leaks from unremoved listeners

### Proper WebSocket Architecture

#### Singleton WebSocket Manager

```typescript
// src/services/WebSocketManager.ts
type EventHandler = (data: any) => void

class WebSocketManager {
  private static instance: WebSocketManager
  private listeners: Map<string, Set<EventHandler>> = new Map()
  private socket: WebSocket | null = null

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager()
    }
    return WebSocketManager.instance
  }

  connect(url: string) {
    if (this.socket) return
    this.socket = new WebSocket(url)
    this.socket.onmessage = this.handleMessage.bind(this)
  }

  private handleMessage(event: MessageEvent) {
    const { type, data } = JSON.parse(event.data)
    const handlers = this.listeners.get(type)
    if (handlers) {
      handlers.forEach(handler => handler(data))
    }
  }

  // Subscribe to event - returns unsubscribe function
  on(event: string, handler: EventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }

    const handlers = this.listeners.get(event)!
    handlers.add(handler)

    console.log(`[WebSocket] Subscribed to '${event}' (${handlers.size} listeners)`)

    // Return cleanup function
    return () => {
      handlers.delete(handler)
      console.log(`[WebSocket] Unsubscribed from '${event}' (${handlers.size} listeners)`)

      // Remove empty Set
      if (handlers.size === 0) {
        this.listeners.delete(event)
      }
    }
  }

  // One-time event listener
  once(event: string, handler: EventHandler) {
    const wrappedHandler = (data: any) => {
      handler(data)
      unsubscribe()
    }
    const unsubscribe = this.on(event, wrappedHandler)
  }

  // Get listener count (for debugging)
  getListenerCount(event: string): number {
    return this.listeners.get(event)?.size || 0
  }
}

export const webSocketManager = WebSocketManager.getInstance()
```

#### Hook Usage with Proper Cleanup

```typescript
// In useSplitCalculation hook
useEffect(() => {
  const handleSplitUpdate = (data: any) => {
    console.log('[Split] WebSocket update received:', data)

    // Prevent echo from own updates
    if (data.updatedBy === currentUserId) {
      console.log('[Split] Ignoring own update')
      return
    }

    // Update server state
    setServerState(data.splitCalculation)
  }

  // Subscribe
  const unsubscribe = webSocketManager.on(
    'split:calculation_updated',
    handleSplitUpdate
  )

  // Cleanup on unmount
  return () => {
    console.log('[Split] Cleaning up WebSocket listener')
    unsubscribe()
  }
}, [currentUserId])  // Re-subscribe if currentUserId changes
```

#### Preventing Duplicate Subscriptions

**Rule 1: One Subscription Per Hook Instance**
```typescript
// ✅ GOOD: Single subscription in useEffect
useEffect(() => {
  const unsubscribe = webSocketManager.on('event', handler)
  return unsubscribe
}, [])  // Empty deps - subscribe once

// ❌ BAD: Subscription outside useEffect
webSocketManager.on('event', handler)  // Never cleaned up!

// ❌ BAD: Subscription with changing deps
useEffect(() => {
  const unsubscribe = webSocketManager.on('event', handler)
  return unsubscribe
}, [someState])  // Re-subscribes on every state change!
```

**Rule 2: Stable Handler Functions**
```typescript
// ✅ GOOD: useCallback with stable deps
const handleUpdate = useCallback((data: any) => {
  setServerState(data)
}, [])  // Stable function

useEffect(() => {
  const unsubscribe = webSocketManager.on('event', handleUpdate)
  return unsubscribe
}, [handleUpdate])  // Won't re-subscribe

// ❌ BAD: Inline function
useEffect(() => {
  const unsubscribe = webSocketManager.on('event', (data) => {
    setServerState(data)  // New function on every render!
  })
  return unsubscribe
}, [serverState])  // Re-subscribes constantly!
```

**Rule 3: Component-Level Subscription**
```typescript
// ✅ GOOD: Subscribe in top-level component only
function SplitBillPayment() {
  const split = useSplitCalculation(...)  // Hook handles WebSocket
  return <UI />
}

// ❌ BAD: Multiple components subscribing
function SplitBillPayment() {
  useEffect(() => {
    webSocketManager.on('event', handler1)
  }, [])

  return (
    <>
      <ComponentA />  {/* Also subscribes! */}
      <ComponentB />  {/* Also subscribes! */}
    </>
  )
}
```

#### Debugging WebSocket Issues

```typescript
// Add to WebSocketManager for debugging
class WebSocketManager {
  // ... existing code

  debugListeners() {
    console.log('=== WebSocket Listeners ===')
    this.listeners.forEach((handlers, event) => {
      console.log(`${event}: ${handlers.size} listeners`)
    })
    console.log('===========================')
  }

  // Call from browser console
  // (window as any).__wsDebug = () => webSocketManager.debugListeners()
}
```

#### Event Namespacing

```typescript
// Prevent event name conflicts
const SPLIT_EVENTS = {
  CALCULATION_UPDATED: 'split:calculation_updated',
  CALCULATION_LOCKED: 'split:calculation_locked',
  CALCULATION_UNLOCKED: 'split:calculation_unlocked',
  USER_AMOUNT_UPDATED: 'split:user_amount_updated'
} as const

// Usage
webSocketManager.on(SPLIT_EVENTS.CALCULATION_UPDATED, handler)
```

#### Testing WebSocket Integration

```typescript
describe('useSplitCalculation WebSocket', () => {
  it('should subscribe to split events on mount', () => {
    const { result } = renderHook(() => useSplitCalculation(...))

    expect(webSocketManager.getListenerCount('split:calculation_updated')).toBe(1)
  })

  it('should unsubscribe on unmount', () => {
    const { unmount } = renderHook(() => useSplitCalculation(...))

    unmount()

    expect(webSocketManager.getListenerCount('split:calculation_updated')).toBe(0)
  })

  it('should not create duplicate subscriptions on re-render', () => {
    const { rerender } = renderHook(() => useSplitCalculation(...))

    rerender()
    rerender()
    rerender()

    expect(webSocketManager.getListenerCount('split:calculation_updated')).toBe(1)
  })

  it('should ignore own updates', () => {
    const { result } = renderHook(() => useSplitCalculation(...))

    const initialState = result.current.serverState

    // Simulate WebSocket update from self
    act(() => {
      webSocketManager.emit('split:calculation_updated', {
        updatedBy: currentUserId,
        splitCalculation: { /* data */ }
      })
    })

    expect(result.current.serverState).toBe(initialState)  // Unchanged
  })
})
```

### WebSocket Best Practices Summary

1. **Single Subscription Point**: Only subscribe in one place (custom hook)
2. **Proper Cleanup**: Always return cleanup function from useEffect
3. **Stable Handlers**: Use useCallback for handler functions
4. **Event Deduplication**: Filter out own updates at handler level
5. **Debugging Tools**: Add listener counting for debugging
6. **Namespacing**: Use constants for event names
7. **Testing**: Test subscription/unsubscription lifecycle

### Implementation Checklist

- [ ] Create WebSocketManager singleton
- [ ] Implement proper on/off methods
- [ ] Add listener count tracking
- [ ] Update useSplitCalculation to use manager
- [ ] Add useCallback for all handlers
- [ ] Test subscription lifecycle
- [ ] Verify no duplicate listeners
- [ ] Add debug tools
- [ ] Document event contracts

## Conclusion

The current architecture has fundamental flaws that cannot be fixed with patches. A clean redesign following software architecture principles will:

1. **Eliminate infinite loops** by removing useEffect side effects
2. **Improve maintainability** through clear separation of concerns
3. **Enhance testability** with isolated, pure functions
4. **Better performance** with optimized state management
5. **Better UX** with predictable, fast updates

**Recommendation:** Implement the proposed architecture as a new component, test thoroughly, and replace the existing implementation.
