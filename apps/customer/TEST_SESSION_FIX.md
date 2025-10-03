# Session Initialization Fix

## Problem
"Failed to initialize table session" error on first page load when accessing:
`http://localhost:3002/table/QR_TABLE_2_TEST?r=test-restaurant-id&t=table-2`

Works fine after page refresh.

## Root Cause
The `strictModeGuard.executeOnce()` was caching **all results** including failed/undefined API responses. When React Strict Mode caused duplicate calls in development:

1. First call: API returns `undefined` or fails → Guard caches it
2. Second call: Guard returns cached `undefined` → Session fails to initialize
3. On refresh: Cache expires (60s) → Fresh API call succeeds

## Fix Applied

### 1. Updated `strictModeGuard.ts`
Now only caches **successful API responses**:

```typescript
// Only cache successful results (not undefined/null/false)
if (result && typeof result === 'object' && 'success' in result) {
  const apiResult = result as any
  if (apiResult.success && apiResult.data) {
    this.markExecuted(operationKey, result)
    console.log('[StrictModeGuard] ✅ Cached successful API result')
  } else {
    console.log('[StrictModeGuard] ⚠️ Not caching failed API result')
  }
}
```

### 2. Simplified TableSessionManager.tsx
Removed complex retry logic since guard won't cache failures:

```typescript
// strictModeGuard now only caches successful responses
// So if we get here, either it succeeded or it wasn't cached
if (sessionResponse && sessionResponse.success && sessionResponse.data) {
  // Process session...
}
```

### 3. Fixed Undefined Variables
Removed references to:
- `globalSessionCreationLock`
- `clearSessionCreationLock()`

These were undefined and causing runtime errors.

## Testing Steps

1. **Clear browser cache/sessionStorage**
2. **Navigate to**: `http://localhost:3002/table/QR_TABLE_2_TEST?r=test-restaurant-id&t=table-2`
3. **Expected**: Session initializes successfully on first load
4. **Verify**: No "Failed to initialize table session" error

## Browser Console Logs to Check

✅ Good flow:
```
[StrictModeGuard] Executing operation for the first time: createSession-...
[TableSessionManager] Creating QR session with device context
[StrictModeGuard] ✅ Cached successful API result: createSession-...
[DualWrite] ✅ Successfully wrote to unified + legacy storage
```

❌ Bad flow (should not happen anymore):
```
[StrictModeGuard] ⚠️ Not caching failed API result
[TableSessionManager] Error auto-creating/joining session
Failed to initialize table session
```

## Files Modified

1. `/src/utils/strictModeGuard.ts` - Smart caching logic
2. `/src/components/table/TableSessionManager.tsx` - Simplified retry logic, removed undefined variables
