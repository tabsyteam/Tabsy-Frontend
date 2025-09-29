# Multiple Session Creation Bug - Root Cause & Fix

## Date: 2025-09-30

## Problem Statement

When navigating to the QR code entry URL `http://localhost:3002/table/QR_TABLE_2_TEST?r=test-restaurant-id&t=table-2`, multiple guest sessions and table sessions were being created.

## Root Cause Analysis

### Backend Behavior (CORRECT - By Design)
**File**: `/Users/vishalsoni/Documents/ainexustech/Tabsy-core/src/api/routes/qrAccess.ts`

The backend endpoint `POST /qr/session` (line 384) is **intentionally non-idempotent**:
- **ALWAYS creates a NEW guest session** on every call (lines 288-312, 324-344)
- This is by design for security and privacy reasons
- Each QR scan should create a fresh session to prevent order history leakage
- The backend has sophisticated logic to handle PAYMENT_COMPLETE sessions (lines 196-262)

**Backend Logic Summary:**
```typescript
// Line 40-382: createGuestSessionHandler
// ALWAYS creates new guestSessionId
guestSessionId = randomBytes(32).toString('hex');

// Creates new guest session every time
guestSession = await tx.guestSession.create({
  data: {
    id: guestSessionId,
    // ... other fields
  }
});
```

This is **CORRECT BEHAVIOR** - the backend should create a new session for each request.

### Frontend Bug (THE ACTUAL PROBLEM)
**File**: `apps/customer/src/app/table/[qrCode]/page.tsx`

The frontend was calling the backend endpoint **multiple times** due to:

1. **React 18 Strict Mode Double Execution**
   - In development, React Strict Mode runs effects twice
   - The `useEffect` at line 25 was executing twice
   - No guard to prevent duplicate execution

2. **useEffect Dependency Issue**
   - Had `api` in dependency array (line 143)
   - `api` object reference could change
   - Caused useEffect to re-run unnecessarily

3. **No Execution Guard**
   - No `useRef` guard to track if QR processing completed
   - Multiple concurrent calls to `createGuestSession` API
   - Backend correctly created a new session for each call

### Why This Became a Problem

```
Flow Before Fix:
1. User scans QR code
2. Frontend page loads
3. useEffect runs (1st time)
   - Calls backend: Creates guestSession_1 + tableSession_1
4. React Strict Mode: useEffect runs again (2nd time)
   - Calls backend: Creates guestSession_2 + tableSession_2
5. (Sometimes) api object changes, useEffect re-runs
   - Calls backend: Creates guestSession_3 + tableSession_3

Result: 2-3 guest sessions and potentially 2-3 table sessions created
```

## Solution Implemented

### Frontend Fix ✅
**File**: `apps/customer/src/app/table/[qrCode]/page.tsx`

**Changes:**
1. Added `useRef` guard to prevent duplicate execution
2. Removed `api` from useEffect dependencies
3. Added early return for duplicate calls

```typescript
// Added line 22-23
const hasProcessed = useRef(false)

useEffect(() => {
  const processQRCode = async () => {
    // Prevent duplicate execution - line 27-31
    if (hasProcessed.current) {
      console.log('[QR Page] Already processed, skipping duplicate execution')
      return
    }

    try {
      setIsProcessing(true)

      // Mark as processed immediately - line 37
      hasProcessed.current = true

      // ... existing QR processing logic ...

    } catch (error) {
      // Reset flag on error to allow retry - line 126-127
      hasProcessed.current = false
      // ... error handling ...
    }
  }

  processQRCode()
  // Removed 'api' from dependencies - line 157-160
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [qrCode, searchParams, router])
```

### Same Fix Applied To
**File**: `apps/customer/src/components/table/TableSessionInitializer.tsx`
- Removed `api` from useEffect dependencies (line 181-185)
- Already had `hasValidated` ref guard (line 40, 49, 89, 143, 150)

## Why We Don't Need Backend Changes

### Backend is Already Correct ✅
The backend behavior is **intentional and secure**:
- Each QR scan should create a fresh session (privacy/security)
- Backend handles session cleanup automatically
- Backend has sophisticated PAYMENT_COMPLETE logic
- Backend prevents session leakage between customers

### Frontend Guard is the Right Solution ✅
- Prevents duplicate API calls from React re-renders
- Maintains backend's intentional non-idempotent design
- Follows React best practices for effect execution
- No performance overhead

## Testing Verification

### Test Scenario 1: Fresh QR Scan
**Expected Behavior:**
1. User scans QR code
2. Frontend makes **ONE** API call to `/qr/session`
3. Backend creates:
   - **ONE** guest session
   - **ONE** table session (if none exists)
4. User redirected to `/r/{restaurantId}/t/{tableId}`

**Verify:**
```bash
# Check console logs
[QR Page] Processing QR code...
[QR Page] Creating QR session with device context...
# Should NOT see "Already processed, skipping duplicate execution"

# Check backend logs
[QRAccess] CREATING NEW guest session for ACTIVE table session
# Should see ONE creation, not 2-3
```

### Test Scenario 2: React Strict Mode (Development)
**Expected Behavior:**
1. React Strict Mode triggers useEffect twice
2. First call: Processes QR code
3. Second call: Skipped due to `hasProcessed.current` guard
4. Result: Still **ONE** guest session created

**Verify:**
```bash
# Check console logs
[QR Page] Processing QR code...
[QR Page] Already processed, skipping duplicate execution  # ✅ Guard working
```

### Test Scenario 3: Error and Retry
**Expected Behavior:**
1. First attempt fails (e.g., network error)
2. `hasProcessed` flag is reset
3. User can retry
4. Second attempt succeeds

**Verify:**
```bash
# First attempt
[QR Page] Processing QR code...
[QRCodePage] Error processing QR code: Network Error
# hasProcessed.current reset to false

# User clicks "Try Again"
[QR Page] Processing QR code...  # ✅ Retry works
```

## Impact Assessment

### Before Fix
- **Problem**: 2-3 sessions created per QR scan
- **Impact**:
  - Database pollution
  - Confusion in session management
  - Potential memory leaks in WebSocket connections
  - Incorrect analytics/metrics

### After Fix
- **Result**: Exactly 1 session created per QR scan
- **Benefits**:
  - Clean session management
  - Correct analytics
  - No duplicate WebSocket connections
  - Better database hygiene

## Additional Safeguards Already in Place

### 1. TableSessionInitializer (Line 40, 49)
```typescript
const hasValidated = useRef(false)

// Prevent duplicate execution in React Strict Mode
if (hasValidated.current) {
  return
}
```

### 2. Backend Session Cleanup
- Automatic expiry after 3 hours (tableSessionManager)
- PAYMENT_COMPLETE grace period (2 hours)
- WebSocket disconnection on session replacement

### 3. Backend Duplicate Detection (By Design)
The backend **intentionally** allows multiple sessions because:
- Different devices need different sessions
- Same device, different time = new customer
- Privacy protection requires session isolation

## Files Changed

### Frontend Changes ✅
1. **apps/customer/src/app/table/[qrCode]/page.tsx**
   - Added `useRef` guard (line 22-23)
   - Added early return check (line 27-31)
   - Mark as processed immediately (line 37)
   - Reset on error (line 126-127)
   - Removed `api` from dependencies (line 157-160)

2. **apps/customer/src/components/table/TableSessionInitializer.tsx**
   - Removed `api` from dependencies (line 181-185)
   - Already had `hasValidated` ref guard

### Backend Changes
**None required** - Backend behavior is correct by design

## Why This Fix is Complete

✅ **Prevents React Strict Mode double execution**
✅ **Prevents unnecessary re-renders from api object changes**
✅ **Allows retry on error**
✅ **Maintains backend's security design**
✅ **No breaking changes**
✅ **Follows React best practices**

## Monitoring Recommendations

Post-deployment, monitor:
1. **Guest Session Creation Rate**
   - Should match QR scan rate (1:1 ratio)
   - No more 2-3x multiplier

2. **Console Logs in Development**
   - Look for "Already processed, skipping" messages
   - Confirms guard is working

3. **Database Session Count**
   - Should grow linearly with actual QR scans
   - No duplicate sessions for same user flow

4. **WebSocket Connection Count**
   - Should match active guest sessions
   - No orphaned connections

## Rollback Plan

If issues arise:
```bash
git revert <commit-hash>
```

The fix is minimal and safe - only adds guards, doesn't change logic.

## Key Takeaways

1. **Backend Non-Idempotency is Intentional** - For security/privacy
2. **Frontend Must Guard Against Duplicate Calls** - React lifecycle
3. **useRef is the Right Pattern** - For preventing duplicate effects
4. **api Object in Dependencies** - Generally not needed, can cause re-renders
5. **React Strict Mode** - Always test with it in development

## Related Issues

- Split payment method flickering fix (separate issue)
- WebSocket event handling improvements (separate issue)

## References

- React Strict Mode: https://react.dev/reference/react/StrictMode
- useEffect dependencies: https://react.dev/reference/react/useEffect#dependencies
- useRef for tracking: https://react.dev/reference/react/useRef

---

**Status**: ✅ **FIXED** - Frontend guards prevent duplicate API calls
**Backend**: No changes needed - working as designed
**Testing**: Manual verification required