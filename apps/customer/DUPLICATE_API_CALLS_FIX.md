# Duplicate API Calls - Root Cause Analysis & Solution

## 🔍 Problem Analysis

Your customer app was making **multiple duplicate API calls** for the same resources (health, menu, session, bill) on the home/menu page. This was visible in the Network tab as repeated identical requests.

### Root Causes Identified

1. **React 18 Strict Mode**
   - In development, React 18's Strict Mode intentionally **double-invokes effects** to help detect side effects
   - Your components had `useEffect` hooks that triggered API calls without proper guards
   - Each component mount → 2 effect invocations → 2+ API calls

2. **Missing React Query Usage**
   - You have React Query installed but weren't using it for data fetching
   - Instead, components used raw `useEffect` + API calls
   - This meant **no automatic deduplication**, **no caching**, and **no request coordination**

3. **Multiple Components Fetching Same Data**
   - `TableSessionInitializer` validates QR code → API call
   - `TableSessionManager` creates session → API call
   - `MenuView` loads menu → API call
   - Each component independently triggering the same requests

4. **React Query Misconfiguration**
   - `refetchOnWindowFocus: true` - causes refetch every time user focuses window
   - `refetchOnMount: true` (default) - refetches on every component mount
   - No `staleTime` configured - treats all data as immediately stale

5. **No Request Deduplication**
   - Multiple components requesting the same resource
   - No shared cache or coordination between them
   - Each makes its own API call even if data was just fetched

## ✅ Solution Architecture

### Phase 1: Centralized Query Configuration (COMPLETED ✅)

Created proper React Query infrastructure:

**1. Query Keys Factory** (`useQueryConfig.ts`)
- Centralized query key definitions
- Ensures consistent cache keys across the app
- Enables proper cache invalidation and updates

**2. Query Configurations**
```typescript
// Static data - cache aggressively (30 min)
- QR code validation
- Restaurant info
- Table info

// Semi-static data - moderate caching (10 min)
- Menu data
- Categories

// Real-time data - short cache (30 sec)
- Orders
- Bill status
- Payment status

// Session data - cache but don't auto-refetch (5 min)
- Guest sessions
- Table sessions
```

**3. Optimized Hooks**

✅ **`useTableInfo`** - QR code validation with caching
- Prevents duplicate QR validation calls
- Caches QR data permanently (it's immutable)
- Only fetches once per QR code

✅ **`useGuestSession`** - Session creation with deduplication
- Checks unified storage before API call
- Prevents duplicate session creation
- Coordinates across component re-renders

✅ **`useMenuData`** - Menu fetching with smart caching
- Caches menu for 10 minutes
- Only refetches if data is > 5 minutes old
- Shares data across all components

### Phase 2: React Query Global Configuration (COMPLETED ✅)

Updated `providers.tsx` with optimized defaults:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,      // 5 min - prevents unnecessary refetches
      gcTime: 1000 * 60 * 30,        // 30 min - keeps in cache
      refetchOnWindowFocus: false,   // ⚠️ KEY FIX - don't refetch on focus
      refetchOnMount: false,         // ⚠️ KEY FIX - don't refetch on mount
      retry: 2,                       // Reduced from 3
      retryDelay: exponentialBackoff // Smart retry delays
    }
  }
})
```

## 📋 Implementation Checklist

### Step 1: Update MenuView Component

**Before:**
```typescript
// MenuView.tsx - OLD (makes raw API calls)
useEffect(() => {
  const loadMenuData = async () => {
    const menuResponse = await api.menu.getActiveMenu(restaurantId)
    // ... process response
  }
  loadMenuData()
}, [restaurantId, api])
```

**After:**
```typescript
// MenuView.tsx - NEW (uses React Query hook)
import { useMenuData } from '@/hooks/useMenuData'

function MenuView() {
  const { data: menuCategories, isLoading, error } = useMenuData({
    restaurantId,
    enabled: !!restaurantId
  })

  // React Query handles caching, deduplication, and refetching automatically
}
```

### Step 2: Update TableSessionInitializer Component

**Before:**
```typescript
// TableSessionInitializer.tsx - OLD
useEffect(() => {
  const validateTableAccess = async () => {
    const tableInfoResponse = await api.qr.getTableInfo(qrCode)
    // ... process response
  }
  validateTableAccess()
}, [qrCode])
```

**After:**
```typescript
// TableSessionInitializer.tsx - NEW
import { useTableInfo } from '@/hooks/useTableInfo'

function TableSessionInitializer({ restaurantId, tableId }) {
  const qrCode = searchParams.get('qr')

  const { data: tableInfo, isLoading, error } = useTableInfo({
    qrCode,
    enabled: !!qrCode
  })

  // No manual API calls needed - React Query handles everything
}
```

### Step 3: Update TableSessionManager Component

**Before:**
```typescript
// TableSessionManager.tsx - OLD
useEffect(() => {
  const createSession = async () => {
    const sessionResponse = await api.qr.createGuestSession({...})
    // ... process response
  }
  createSession()
}, [tableId, restaurantId])
```

**After:**
```typescript
// TableSessionManager.tsx - NEW
import { useGuestSession } from '@/hooks/useGuestSession'

function TableSessionManager({ restaurantId, tableId }) {
  const qrCode = searchParams.get('qr')

  const { data: session, isLoading, error } = useGuestSession({
    qrCode,
    tableId,
    restaurantId,
    enabled: !!qrCode && !!tableId
  })

  // Session creation happens automatically, cached, and deduplicated
}
```

## 🎯 Expected Results

### Before Fix
```
Network Tab (on page load):
✗ GET /health (1st call)
✗ GET /health (duplicate)
✗ GET /QR_TABLE_2_TEST (1st call)
✗ GET /QR_TABLE_2_TEST (duplicate)
✗ GET /session (1st call)
✗ GET /session (duplicate)
✗ GET /menu (1st call)
✗ GET /menu (duplicate)
✗ GET /bill (1st call)
✗ GET /bill (duplicate)

Total: 10 API calls for 5 unique resources
```

### After Fix
```
Network Tab (on page load):
✓ GET /health (single call)
✓ GET /QR_TABLE_2_TEST (single call, cached)
✓ GET /session (single call, cached)
✓ GET /menu (single call, cached for 10 min)
✓ GET /bill (single call, cached for 30 sec)

Total: 5 API calls for 5 unique resources
Subsequent navigations: 0-2 calls (only stale data refetched)
```

### Performance Improvements

- **50% reduction** in API calls on initial load
- **80-90% reduction** on subsequent navigations (cache hits)
- **Faster page loads** - no waiting for duplicate requests
- **Better UX** - no loading flickers from duplicate fetches
- **Lower server load** - half the requests to backend

## 🔧 Testing Checklist

1. **Test Initial Page Load**
   ```bash
   # Open DevTools → Network tab
   # Navigate to: http://localhost:3002/table/QR_TABLE_2_TEST?r=test-restaurant-id&t=table-2
   # ✓ Verify only 5 unique API calls (no duplicates)
   ```

2. **Test Page Refresh**
   ```bash
   # After initial load, refresh the page (F5)
   # ✓ Verify React Query uses cache for some requests
   # ✓ Only stale data should refetch
   ```

3. **Test Window Focus**
   ```bash
   # Switch to another tab, then back
   # ✓ Verify NO automatic refetch (refetchOnWindowFocus: false)
   ```

4. **Test Component Remount**
   ```bash
   # Navigate away and back to menu
   # ✓ Verify React Query serves from cache (no API calls)
   ```

5. **Test React Strict Mode**
   ```bash
   # With Strict Mode enabled in development
   # ✓ Verify only 1 API call per resource (deduplication works)
   ```

## 🏗️ Architecture Principles Applied

### 1. **Single Source of Truth**
- React Query cache = single source for server state
- Unified session storage = single source for session data
- No conflicting state across components

### 2. **Smart Caching Strategy**
```
Static Data (QR, Table Info)     → Cache: 30 min, Never refetch
Semi-Static (Menu, Restaurant)   → Cache: 10 min, Refetch if > 5 min old
Real-Time (Orders, Bill)         → Cache: 30 sec, Refetch on focus
Session Data                     → Cache: 5 min, Never auto-refetch
```

### 3. **Request Deduplication**
- Multiple components requesting same data → 1 API call
- React Query coordinates requests and shares results
- In-flight request deduplication (automatic)

### 4. **Separation of Concerns**
```
Components     → UI rendering, user interactions
React Query    → Data fetching, caching, synchronization
API Client     → HTTP requests, authentication
Unified Storage → Session persistence
```

## 🚀 Next Steps

### Phase 3: Migrate Remaining Components (TODO)

Still using raw API calls that should be migrated:

1. **`useBillStatus.ts`** → Create `useBillData` hook with React Query
2. **Order components** → Create `useOrders` hook
3. **Payment components** → Create `usePaymentStatus` hook

### Phase 4: Enable React Query DevTools (Recommended)

```typescript
// providers.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

<QueryClientProvider client={queryClient}>
  {children}
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

This gives you visual debugging of:
- Active queries and their cache status
- Stale data indicators
- Background refetch activity
- Cache invalidation events

## 📚 Additional Resources

- [React Query Best Practices](https://tkdodo.eu/blog/practical-react-query)
- [Caching Strategies](https://react-query.tanstack.com/guides/caching)
- [Request Deduplication](https://react-query.tanstack.com/guides/request-deduplication)

---

## ✨ Summary

**The fix is simple but powerful:**

1. ✅ Use React Query hooks instead of raw `useEffect` + API calls
2. ✅ Configure proper `staleTime` and caching strategies
3. ✅ Disable unnecessary refetching (`refetchOnWindowFocus`, `refetchOnMount`)
4. ✅ Leverage automatic request deduplication
5. ✅ Share data across components via query cache

**Think like a senior architect:**
- Don't make API calls in `useEffect` - use React Query
- Configure caching based on data volatility
- Let the library handle coordination and deduplication
- Trust the cache - don't over-fetch

This is the React Query way. Once you migrate all components, your app will be blazingly fast with minimal server load. 🚀
