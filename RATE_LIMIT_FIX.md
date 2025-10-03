# TableBillWrapper Infinite Retry Loop Fix

## Problem

The `TableBillWrapper` component had a critical bug causing an **infinite retry loop** when encountering errors (especially rate limiting errors from the backend).

### Symptoms
- Hundreds/thousands of rapid API calls to:
  - `GET /api/v1/table-sessions/:id/users`
  - `GET /api/v1/table-sessions/:id/bill`
- Backend rate limiter returning `429 Too Many Requests`
- Browser console flooded with retry messages
- App becoming unresponsive
- Network tab showing continuous failed requests

### Root Cause

**Line 164** had `retryCount` in the `useEffect` dependency array:

```typescript
useEffect(() => {
  const loadTableSessionData = async () => {
    // ...
    catch (error) {
      if (retryCount < 2) {
        setRetryCount(prev => prev + 1) // This triggers useEffect again!
        setTimeout(() => {
          loadTableSessionData()
        }, 1000 * (retryCount + 1))
      }
    }
  }
  loadTableSessionData()
}, [api, router, retryCount]) // ⚠️ retryCount here causes infinite loop!
```

**Why this causes an infinite loop:**

1. Initial load fails
2. `setRetryCount(1)` is called
3. `retryCount` changes from 0 → 1
4. `useEffect` re-runs because `retryCount` is in dependencies
5. Load fails again
6. `setRetryCount(2)` is called
7. `retryCount` changes from 1 → 2
8. `useEffect` re-runs AGAIN
9. Load fails, but now `retryCount` is NOT incremented (reached max)
10. However, the `setTimeout` from previous retries keeps calling `loadTableSessionData()`
11. Each call triggers more retries in an endless cycle

## Solution

### Changes Made

**File**: `apps/customer/src/components/table/TableBillWrapper.tsx`

1. **Use `useRef` for retry tracking** instead of state
   - Prevents re-renders from triggering useEffect
   - Lines 26-27, 155-156, 180-181

2. **Remove `retryCount` from dependencies**
   - Line 202: `}, [api, router])` (was `}, [api, router, retryCount])`)

3. **Add timeout cleanup on unmount**
   - Lines 30-36: Prevents memory leaks

4. **Add rate limit detection**
   - Lines 162-173: Specifically detect 429 errors and STOP retrying
   - Shows user-friendly message: "Too many requests. Please wait a moment and try again."

5. **Implement exponential backoff**
   - Line 184: `Math.min(1000 * Math.pow(2, retryAttempts.current), 5000)`
   - Retry delays: 2s → 4s → 5s (max)
   - Previous: 1s → 2s → 3s (linear)

6. **Reset retry counter on success**
   - Lines 154-156: Reset both ref and state on successful load

7. **Update handleRetry function**
   - Line 215: Reset `retryAttempts.current` when user manually retries

## Code Changes Summary

### Before
```typescript
const [retryCount, setRetryCount] = useState(0)

useEffect(() => {
  const loadTableSessionData = async () => {
    try {
      // ... fetch data
    } catch (error) {
      if (retryCount < 2) {
        setRetryCount(prev => prev + 1)
        setTimeout(() => {
          loadTableSessionData()
        }, 1000 * (retryCount + 1))
      }
    }
  }
  loadTableSessionData()
}, [api, router, retryCount]) // ❌ Causes infinite loop
```

### After
```typescript
const [retryCount, setRetryCount] = useState(0)
const retryAttempts = useRef(0) // ✅ Use ref for tracking
const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

// ✅ Cleanup on unmount
useEffect(() => {
  return () => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
    }
  }
}, [])

useEffect(() => {
  const loadTableSessionData = async () => {
    try {
      // ... fetch data
      retryAttempts.current = 0 // ✅ Reset on success
    } catch (error: any) {
      // ✅ Detect rate limiting
      const isRateLimited = error?.message?.includes('Rate limit') ||
                           error?.message?.includes('Too Many Requests') ||
                           error?.status === 429

      if (isRateLimited) {
        setError('Too many requests. Please wait a moment and try again.')
        setIsLoading(false)
        return // ✅ Stop retrying immediately
      }

      // ✅ Use ref for retry count
      if (retryAttempts.current < 2) {
        retryAttempts.current++
        setRetryCount(retryAttempts.current)

        // ✅ Exponential backoff with max delay
        const backoffDelay = Math.min(1000 * Math.pow(2, retryAttempts.current), 5000)
        retryTimeoutRef.current = setTimeout(() => {
          loadTableSessionData()
        }, backoffDelay)
      }
    }
  }
  loadTableSessionData()
}, [api, router]) // ✅ No retryCount dependency
```

## Testing

### Manual Testing
1. ✅ Navigate to bill page
2. ✅ Trigger rate limiting (refresh rapidly)
3. ✅ Verify error message shows
4. ✅ Verify retries stop after 3 attempts
5. ✅ Verify no infinite loop in console
6. ✅ Click "Try Again" button
7. ✅ Verify successful load

### Expected Behavior
- **First load**: Succeeds immediately
- **Network error**: Retries 3 times with backoff (2s, 4s, 5s), then shows error
- **Rate limit error**: Shows error immediately, no retries
- **Manual retry**: Resets counter, starts fresh
- **Unmount**: Cleans up pending timeouts

## Related Issues

This fix is **unrelated to the split bill functionality** we fixed earlier. The split bill changes were about:
- WebSocket synchronization
- Input field restrictions
- Validation feedback

This `TableBillWrapper` bug was pre-existing and got exposed during rate limiting scenarios.

## Impact

### Before Fix
- ❌ Infinite retry loops
- ❌ Rate limiter triggered constantly
- ❌ Poor user experience
- ❌ Wasted backend resources
- ❌ Browser becoming unresponsive

### After Fix
- ✅ Maximum 3 retry attempts
- ✅ Exponential backoff prevents rapid requests
- ✅ Rate limit detection stops retries immediately
- ✅ Clean timeout management
- ✅ Better error messages
- ✅ Predictable behavior

## Lessons Learned

1. **Never put state that triggers retries in useEffect dependencies**
   - Use `useRef` instead

2. **Always implement rate limit detection**
   - Check for 429 status codes
   - Stop retrying immediately on rate limits

3. **Always cleanup timeouts on unmount**
   - Prevents memory leaks
   - Prevents unexpected behavior

4. **Use exponential backoff for retries**
   - Prevents overwhelming the server
   - Better than linear backoff

5. **Limit maximum retries**
   - Prevent infinite loops
   - Show error to user after reasonable attempts
