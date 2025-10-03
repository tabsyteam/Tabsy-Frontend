# Hydration Error Fix - SessionExpiryNotification

## Problem

React hydration error occurring in `SessionExpiryNotification` component:

```
Hydration failed because the server rendered HTML didn't match the client.
```

### Error Location

**Component:** `src/components/session/SessionExpiryNotification.tsx`
**Line:** 84

```tsx
<div className={"fixed top-20 left-4 right-4 z-[100] mx-auto max-w-md "}>
```

### Root Cause

**Line 13 (Before Fix):**
```typescript
const [expiryInfo, setExpiryInfo] = useState(SessionManager.getSessionExpiryInfo())
```

The `SessionManager.getSessionExpiryInfo()` function:
- Calculates time-based values using `Date.now()` or session timestamps
- Returns different values when called on server vs. client
- Causes server-rendered HTML to differ from client-rendered HTML

**Why this causes hydration mismatch:**

1. **Server-Side Rendering (SSR):**
   - Component renders during build/server with `Date.now()` = Time A
   - HTML generated with expiry calculation based on Time A

2. **Client-Side Hydration:**
   - Browser loads pre-rendered HTML
   - React hydrates component with `Date.now()` = Time B (different!)
   - Expiry calculation now different, HTML doesn't match

3. **React Error:**
   - React detects mismatch between server and client HTML
   - Throws hydration error
   - Forces full client-side re-render (performance penalty)

## Solution

### Fix Applied

**File:** `src/components/session/SessionExpiryNotification.tsx`

#### 1. Initialize State to Null (Lines 13-17)

**Before:**
```typescript
const [expiryInfo, setExpiryInfo] = useState(SessionManager.getSessionExpiryInfo())
const [isDismissed, setIsDismissed] = useState(false)
```

**After:**
```typescript
// FIXED: Initialize to null to prevent hydration mismatch
// Session info will be set client-side only in useEffect
const [expiryInfo, setExpiryInfo] = useState<ReturnType<typeof SessionManager.getSessionExpiryInfo> | null>(null)
const [isDismissed, setIsDismissed] = useState(false)
const [isMounted, setIsMounted] = useState(false)
```

#### 2. Set Value Client-Side Only (Lines 19-40)

**Before:**
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    const info = SessionManager.getSessionExpiryInfo()
    setExpiryInfo(info)

    if (info.isExpired) {
      SessionManager.handleSessionExpiry()
    }
  }, 30000)

  return () => clearInterval(interval)
}, [])
```

**After:**
```typescript
// FIXED: Set initial value and interval only on client after hydration
useEffect(() => {
  // Set mounted flag to prevent hydration mismatch
  setIsMounted(true)

  // Get initial expiry info on client side only
  const info = SessionManager.getSessionExpiryInfo()
  setExpiryInfo(info)

  // Set up interval for updates
  const interval = setInterval(() => {
    const info = SessionManager.getSessionExpiryInfo()
    setExpiryInfo(info)

    if (info.isExpired) {
      SessionManager.handleSessionExpiry()
    }
  }, 30000)

  return () => clearInterval(interval)
}, [])
```

#### 3. Don't Render Until Hydrated (Lines 42-45)

**Before:**
```typescript
if (expiryInfo.isExpired || !expiryInfo.isExpiringSoon || isDismissed) {
  return null
}
```

**After:**
```typescript
// FIXED: Don't render anything until client-side hydration complete
if (!isMounted || !expiryInfo) {
  return null
}

if (expiryInfo.isExpired || !expiryInfo.isExpiringSoon || isDismissed) {
  return null
}
```

#### 4. Fix useSessionExpiry Hook (Lines 153-202)

**Before:**
```typescript
export function useSessionExpiry() {
  const [expiryInfo, setExpiryInfo] = useState(SessionManager.getSessionExpiryInfo())

  useEffect(() => {
    const interval = setInterval(() => {
      // ...
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  return {
    ...expiryInfo,
    extendSession: () => { /* ... */ },
    formatTimeRemaining: (minutes) => { /* ... */ }
  }
}
```

**After:**
```typescript
export function useSessionExpiry() {
  // FIXED: Initialize to null to prevent hydration mismatch
  const [expiryInfo, setExpiryInfo] = useState<ReturnType<typeof SessionManager.getSessionExpiryInfo> | null>(null)

  useEffect(() => {
    // Get initial expiry info on client side only
    const info = SessionManager.getSessionExpiryInfo()
    setExpiryInfo(info)

    const interval = setInterval(() => {
      // ...
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  return {
    // FIXED: Provide safe defaults when expiryInfo is null (during SSR/hydration)
    isExpired: expiryInfo?.isExpired ?? false,
    isExpiringSoon: expiryInfo?.isExpiringSoon ?? false,
    minutesRemaining: expiryInfo?.minutesRemaining ?? null,
    sessionEndTime: expiryInfo?.sessionEndTime ?? null,
    extendSession: () => { /* ... */ },
    formatTimeRemaining: (minutes) => { /* ... */ }
  }
}
```

## How the Fix Works

### Before (Hydration Mismatch)

```
Server (Time: 10:00:00):
  ├─ SessionManager.getSessionExpiryInfo() → { minutesRemaining: 45 }
  └─ Renders: "Your session expires in 45 minutes"

Client (Time: 10:00:03):
  ├─ SessionManager.getSessionExpiryInfo() → { minutesRemaining: 44 }
  └─ Expects: "Your session expires in 44 minutes"

❌ Mismatch! React throws hydration error
```

### After (No Mismatch)

```
Server (Time: 10:00:00):
  ├─ expiryInfo = null
  ├─ isMounted = false
  └─ Renders: null (nothing)

Client (Time: 10:00:03):
  ├─ Initial render: null (matches server)
  ├─ useEffect runs → setIsMounted(true)
  ├─ useEffect runs → setExpiryInfo({ minutesRemaining: 44 })
  └─ Re-renders: "Your session expires in 44 minutes"

✅ No mismatch! Hydration successful
```

## Pattern: Client-Only Components

This is the standard pattern for components with dynamic/time-based data:

```typescript
function ClientOnlyComponent() {
  const [data, setData] = useState(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    setData(getDynamicData()) // Only runs on client
  }, [])

  if (!isMounted) {
    return null // or loading skeleton
  }

  // Render with data
  return <div>{data}</div>
}
```

## Common Causes of Hydration Errors

1. **Time-based values:** `Date.now()`, `new Date()`, timestamps
2. **Random values:** `Math.random()`, `crypto.randomUUID()`
3. **Locale-dependent formatting:** `Date.toLocaleString()`, number formatting
4. **Browser APIs:** `window`, `localStorage`, `navigator`
5. **External data without snapshots:** API calls during SSR
6. **Invalid HTML nesting:** `<p>` inside `<p>`, `<div>` inside `<p>`
7. **Browser extensions:** Ad blockers, React DevTools

## Prevention Checklist

When writing new components, check:

- [ ] Does it use `Date.now()`, `new Date()`, or timestamps?
- [ ] Does it read from `localStorage`, `sessionStorage`, or cookies?
- [ ] Does it use `Math.random()` or generate IDs?
- [ ] Does it use `window`, `document`, or browser APIs?
- [ ] Does it depend on user locale or timezone?
- [ ] Does it fetch data that might change between server and client?

If **any** are true, use the client-only pattern with `isMounted` flag.

## Testing for Hydration Errors

### 1. Development Mode
- Hydration errors show in browser console
- React DevTools highlights mismatched elements
- Look for red error boundaries

### 2. Check for Warnings
```bash
# Run dev server and check console
pnpm run dev:customer

# Look for:
# ⚠️ Warning: Text content did not match
# ⚠️ Warning: Expected server HTML to contain...
```

### 3. Disable React StrictMode Temporarily
```typescript
// In app/layout.tsx or providers
<React.StrictMode>  {/* Comment out to isolate hydration issues */}
  <YourApp />
</React.StrictMode>
```

### 4. Check HTML Validity
- Use browser DevTools → Elements
- Look for nested `<p>` tags or invalid nesting
- Validate with W3C HTML validator

## Related Documentation

- [Next.js Hydration Error Docs](https://nextjs.org/docs/messages/react-hydration-error)
- [React Hydration Docs](https://react.dev/reference/react-dom/client/hydrateRoot)
- [Fixing Hydration Errors Guide](https://nextjs.org/docs/messages/react-hydration-error#possible-ways-to-fix-it)

## Summary

**Problem:** `SessionExpiryNotification` calculated session expiry time during SSR, causing different values on server vs. client

**Solution:**
1. Initialize state to `null`
2. Set value client-side only in `useEffect`
3. Don't render until `isMounted === true`
4. Provide safe defaults for hook return values

**Result:** No hydration errors, smooth SSR/CSR transition
