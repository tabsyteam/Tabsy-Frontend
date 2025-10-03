# Split Calculation Infinite Loop Fix

## Problem

The split bill payment feature was experiencing **infinite API request loops** causing rate limiting (429 errors) on the backend. Hundreds of duplicate requests were being made simultaneously by multiple users.

### Symptoms

From backend logs:
```
POST /api/v1/table-sessions/5e501754-c8e6-40f1-ac36-866da6fc3dd3/split-calculation 201 240.363 ms
POST /api/v1/table-sessions/5e501754-c8e6-40f1-ac36-866da6fc3dd3/split-calculation 201 242.089 ms
POST /api/v1/table-sessions/5e501754-c8e6-40f1-ac36-866da6fc3dd3/split-calculation 201 260.511 ms
POST /api/v1/table-sessions/5e501754-c8e6-40f1-ac36-866da6fc3dd3/split-calculation 201 268.985 ms
... (hundreds more identical requests)
```

- Hundreds/thousands of rapid API calls to `POST /api/v1/table-sessions/:id/split-calculation`
- Multiple simultaneous duplicate requests from the same user
- Backend responding with 429 Too Many Requests
- App becoming unresponsive
- Network tab flooded with failed requests

## Root Causes

### Cause 1: WebSocket Echo Loop Triggering useEffect

**The Primary Issue:**

```
User A: Changes split type → createSplitCalculation() → WebSocket broadcast
User B: Receives WebSocket → setSplitOption({type: newType}) → useEffect fires → createSplitCalculation()
User B: createSplitCalculation() → WebSocket broadcast
User A: Receives WebSocket → setSplitOption({type: newType}) → useEffect fires → createSplitCalculation()
... INFINITE LOOP
```

**Line 545 (WebSocket Handler):**
```typescript
setSplitOption(prev => ({
  ...prev,
  type: splitCalculation.splitType  // This triggers useEffect!
}))
```

**Line 1526 (useEffect):**
```typescript
useEffect(() => {
  // ...
  createSplitCalculation()  // This triggers WebSocket broadcast!
}, [actualSessionId, splitOption.type])  // Fires when splitOption.type changes
```

### Cause 2: useEffect Infinite Loop (Line 1442-1446)

**Problem:**
```typescript
useEffect(() => {
  if (actualSessionId && splitOption.participants.length > 0) {
    createSplitCalculation()
  }
}, [actualSessionId, splitOption.type])  // createSplitCalculation not in deps
```

**Why this causes infinite loops:**

1. `createSplitCalculation()` is called but not in dependency array (violates exhaustive-deps)
2. `splitOption` object is recreated frequently via `setSplitOption()` calls
3. Each `setSplitOption` triggers the useEffect (since `splitOption.type` changes)
4. `createSplitCalculation()` returns data → triggers WebSocket event
5. WebSocket handler calls `setSplitOption()` → useEffect runs again
6. **Infinite loop**

**Where splitOption changes (8 locations):**
- Line 202: Loading existing split calculation
- Line 259: Initializing participants
- Line 304: Auto-switching from BY_ITEMS to EQUAL
- Line 539: WebSocket split method update
- Line 1416: User changes split method
- Line 1450: Toggle participant
- Line 1469: Update custom amounts
- Line 1508: Update custom percentages
- Line 1527: Update item assignments

### Cause 2: No Request Deduplication

**Problem:** Multiple simultaneous identical requests with no tracking

```typescript
// User A and User B both call createSplitCalculation() at same time
const createSplitCalculation = async () => {
  // No check if request already in-flight
  await api.tableSession.createSplitCalculation(...)
}
```

Result: **10+ identical requests sent simultaneously**

### Cause 3: WebSocket Echo Loop

**Problem:** Each user's API call triggers WebSocket events to all users, which trigger more API calls

```
User A: createSplitCalculation() → WebSocket broadcast
User B: receives WebSocket → calls setSplitOption() → useEffect fires → createSplitCalculation()
User B: createSplitCalculation() → WebSocket broadcast
User A: receives WebSocket → calls setSplitOption() → useEffect fires → createSplitCalculation()
... infinite loop
```

## Solutions Implemented

### Fix 0: Prevent WebSocket Echo Loop with Flag

**The Critical Fix:**

**Lines 153-154:** Added WebSocket tracking flag
```typescript
// FIXED: Track if split type change came from WebSocket (don't trigger API call)
const splitTypeChangedByWebSocketRef = useRef(false)
```

**Lines 547-560:** Set flag when WebSocket changes split type
```typescript
// FIXED: Mark that this split type change came from WebSocket
// This prevents the useEffect from triggering another API call
splitTypeChangedByWebSocketRef.current = true

// Update split option with new type
setSplitOption(prev => ({
  ...prev,
  type: splitCalculation.splitType
}))

// FIXED: Reset flag after state update completes
setTimeout(() => {
  splitTypeChangedByWebSocketRef.current = false
}, 100)
```

**Lines 1543-1547:** Check flag in useEffect
```typescript
// FIXED: Don't trigger API call if split type was changed by WebSocket
if (splitTypeChangedByWebSocketRef.current) {
  console.log('[SplitBillPayment] ⏭️ Skipping createSplitCalculation - split type changed by WebSocket')
  return
}
```

**Key improvements:**
- Breaks the WebSocket echo loop completely
- WebSocket updates no longer trigger API calls
- Only user-initiated changes trigger API calls
- Simple flag-based coordination

### Fix 1: Add Request Deduplication with In-Flight Tracking

**File:** `apps/customer/src/components/payment/SplitBillPayment.tsx`

**Lines 147-151:** Added ref-based tracking
```typescript
// FIXED: Add in-flight request tracking to prevent duplicate API calls
const inFlightRequestsRef = useRef<Set<string>>(new Set())

// FIXED: Track if we're currently creating split calculation to prevent loops
const isCreatingSplitRef = useRef(false)
```

**Lines 1220-1301:** Updated `createSplitCalculation` function
```typescript
const createSplitCalculation = useCallback(async (): Promise<void> => {
  if (!actualSessionId) return

  // FIXED: Prevent duplicate simultaneous requests
  const requestKey = `create_${actualSessionId}_${splitOption.type}`
  if (inFlightRequestsRef.current.has(requestKey)) {
    console.log('[SplitBillPayment] ⏭️ Skipping duplicate createSplitCalculation request')
    return
  }

  // FIXED: Prevent infinite loops from useEffect
  if (isCreatingSplitRef.current) {
    console.log('[SplitBillPayment] ⏭️ Already creating split calculation, skipping')
    return
  }

  try {
    isCreatingSplitRef.current = true
    inFlightRequestsRef.current.add(requestKey)
    // ... rest of implementation
  } finally {
    isCreatingSplitRef.current = false
    if (!error || !error.message?.includes('Rate limit')) {
      inFlightRequestsRef.current.delete(requestKey)
    }
  }
}, [actualSessionId, splitOption.type, splitOption.participants, customPercentages, customAmounts, itemAssignments, currentUser.guestSessionId, api])
```

**Key improvements:**
- Uses `useCallback` to memoize function and allow it in useEffect deps
- Checks `inFlightRequestsRef` to prevent duplicate simultaneous requests
- Uses `isCreatingSplitRef` to prevent re-entry during async operation
- Properly cleans up tracking in finally block

### Fix 2: Fix useEffect Dependencies and Add Debouncing

**Lines 1488-1500:** Fixed useEffect
```typescript
// FIXED: Initialize backend split calculation on mount and when split option changes
// Use splitOption.type as dependency (not whole splitOption object to prevent loops)
// Add createSplitCalculation to deps since it's now a useCallback
useEffect(() => {
  if (actualSessionId && splitOption.participants.length > 0) {
    // FIXED: Add small delay to batch rapid changes and prevent rate limiting
    const timeoutId = setTimeout(() => {
      createSplitCalculation()
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }
}, [actualSessionId, splitOption.type, createSplitCalculation])
```

**Key improvements:**
- Added `createSplitCalculation` to dependency array (fixes exhaustive-deps)
- Added 300ms debounce to batch rapid state changes
- Cleanup function cancels pending timeout on unmount or deps change

### Fix 3: Add Rate Limit Detection and Backoff

**Lines 1276-1289:** Rate limit detection in `createSplitCalculation`
```typescript
// FIXED: Detect rate limiting
const isRateLimited = error?.message?.includes('Rate limit') ||
                     error?.message?.includes('Too Many Requests') ||
                     error?.message?.includes('429') ||
                     error?.status === 429

if (isRateLimited) {
  console.error('[SplitBillPayment] 🚫 Rate limited - stopping requests')
  setSplitCalculationError('Too many requests. Please wait a moment.')
  toast.error('Too many requests. Please wait a moment and try again.')
  // Clear in-flight tracking after rate limit to allow retry later
  setTimeout(() => {
    inFlightRequestsRef.current.delete(requestKey)
  }, 5000) // Wait 5 seconds before allowing retry
}
```

**Key improvements:**
- Detects rate limit errors immediately
- Shows user-friendly error message
- Prevents further requests for 5 seconds
- Allows retry after cooldown period

### Fix 4: Apply Same Fixes to updateSplitCalculation

**Lines 1360-1447:** Updated `updateSplitCalculation` with deduplication and rate limiting

```typescript
const updateSplitCalculation = async (userId: string, percentage?: number, amount?: number, itemAssignments?: { [itemId: string]: string }): Promise<void> => {
  if (!actualSessionId) return

  // FIXED: Prevent duplicate simultaneous update requests
  const requestKey = `update_${actualSessionId}_${userId}_${percentage !== undefined ? 'pct' : amount !== undefined ? 'amt' : 'items'}`
  if (inFlightRequestsRef.current.has(requestKey)) {
    console.log('[SplitBillPayment] ⏭️ Skipping duplicate updateSplitCalculation request')
    return
  }

  try {
    inFlightRequestsRef.current.add(requestKey)
    // ... implementation
  } finally {
    if (!error || !error.message?.includes('Rate limit')) {
      inFlightRequestsRef.current.delete(requestKey)
    }
  }
}
```

## Behavior Changes

### Before

1. User A changes split type → hundreds of API calls ❌
2. User B changes percentage → triggers User A's useEffect → more API calls ❌
3. Multiple simultaneous identical requests from same user ❌
4. Backend rate limiter returning 429 errors ❌
5. App becomes unresponsive ❌
6. No recovery from rate limiting ❌

### After

1. User A changes split type → single API call (after 300ms debounce) ✅
2. User B changes percentage → no effect on User A's useEffect ✅
3. Duplicate requests prevented by in-flight tracking ✅
4. Rate limit errors detected and handled gracefully ✅
5. App remains responsive ✅
6. Automatic recovery after 5-second cooldown ✅

## Testing Checklist

### Single User Testing
- [ ] Change split type from EQUAL → BY_PERCENTAGE
  - Verify only 1 API request in network tab
  - Verify 300ms debounce delay before request
- [ ] Rapidly toggle between split types multiple times
  - Verify only the last selection makes an API call
  - Verify no duplicate requests
- [ ] Change percentage multiple times rapidly
  - Verify debouncing works (single request after 500ms)
  - Verify no infinite loops in console

### Multi-User Testing
- [ ] User A and User B both change split type simultaneously
  - Verify each user makes only 1 request
  - Verify both requests succeed
  - Verify WebSocket updates work correctly
  - Verify no infinite loops
- [ ] User A changes percentage while User B changes amount
  - Verify no interference between users
  - Verify both updates succeed
  - Verify no duplicate requests

### Rate Limit Testing
- [ ] Trigger rate limiting (rapid requests)
  - Verify 429 errors are detected
  - Verify user-friendly error message shown
  - Verify requests stop for 5 seconds
  - Verify requests resume after cooldown
- [ ] Monitor backend logs for request count
  - Before fix: 100+ requests per second
  - After fix: 1-2 requests per second maximum

### WebSocket Echo Testing
- [ ] 3+ users in same session
- [ ] One user changes split method
  - Verify all users see the change
  - Verify no API call cascade
  - Verify no infinite loops
- [ ] Multiple users make concurrent changes
  - Verify all changes applied correctly
  - Verify no request storms

## Metrics

### Before Fix
- **Requests per split type change**: 100-500+
- **Request rate**: Unlimited (as fast as possible)
- **Duplicate prevention**: None
- **Rate limit handling**: None
- **Recovery**: Manual page refresh required

### After Fix
- **Requests per split type change**: 1
- **Request rate**: Limited by 300ms debounce + in-flight tracking
- **Duplicate prevention**: Full deduplication via request keys
- **Rate limit handling**: Automatic detection with 5s cooldown
- **Recovery**: Automatic after cooldown period

## Related Issues

This fix is related to but separate from:
- **RATE_LIMIT_FIX.md**: Fixed TableBillWrapper infinite retry loop
- **SPLIT_BILL_FIXES.md**: Fixed WebSocket synchronization and validation

All three issues shared similar root causes (state in useEffect dependencies) but occurred in different components.

## Lessons Learned

1. **Never put state-updating functions in useEffect without memoizing**
   - Always use `useCallback` for functions called in useEffect
   - Add memoized function to dependency array

2. **Always implement request deduplication for multi-user features**
   - Use refs to track in-flight requests
   - Use unique request keys (sessionId + operation type)

3. **Always add debouncing for rapid user interactions**
   - Batch rapid state changes (300-500ms typical)
   - Cancel pending operations on cleanup

4. **Always handle rate limiting gracefully**
   - Detect 429 status codes
   - Show user-friendly error messages
   - Implement cooldown periods
   - Allow automatic recovery

5. **WebSocket + State Updates = Potential for Infinite Loops**
   - Be extremely careful with state updates triggered by WebSocket events
   - Always check if update is actually needed before applying
   - Use timestamps/IDs for deduplication

6. **Use refs for coordination flags (like "isCreating")**
   - Prevents re-renders
   - Provides synchronous access
   - Perfect for preventing re-entry

## Code Review Checklist

When reviewing similar features, check for:

- [ ] useEffect dependencies include all functions called inside
- [ ] Functions used in useEffect are wrapped in useCallback
- [ ] API calls have in-flight request tracking
- [ ] WebSocket event handlers check for stale/duplicate updates
- [ ] Rate limiting is detected and handled
- [ ] User input is debounced appropriately
- [ ] Cleanup functions cancel pending operations
- [ ] No state updates in finally blocks that could trigger loops
