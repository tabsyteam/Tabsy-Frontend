# Restaurant Dashboard WebSocket Refactoring Guide

**Status**: IN PROGRESS
**Started**: 2025-10-04
**Architect**: Senior Software Engineering Review
**Strategy**: Incremental phased migration with verification gates

---

## Executive Summary

**Problem**:
- 52 duplicate WebSocket event listeners across 8+ components
- Each payment event triggers 18-25 query invalidations (should be 1-2)
- Memory leaks in notification timeout handling
- Cross-concern coupling (Orders managing Payment cache)

**Solution**:
- Centralized WebSocket sync hooks (`useWebSocketSync.ts`)
- Domain-specific error boundaries
- Debounced query invalidations
- Single source of truth per event type

**Expected Impact**:
- 87% reduction in network requests for WebSocket events
- ~30% reduction in component re-renders
- Eliminated memory leaks
- Better code maintainability

---

## Architecture Changes

### ✅ COMPLETED

1. **Created `/src/hooks/useWebSocketSync.ts`**
   - `usePaymentWebSocketSync(restaurantId)` - Consolidates 25 payment listeners
   - `useOrderWebSocketSync(restaurantId)` - Consolidates 9 order listeners
   - `useTableWebSocketSync(restaurantId)` - Consolidates table listeners
   - `useAssistanceWebSocketSync(restaurantId)` - Consolidates assistance listeners

2. **Created `/src/components/ErrorBoundary.tsx`**
   - Domain-specific boundaries (Payment, Order, Table, Menu, Dashboard)
   - Graceful error handling with reset capability
   - Development vs production error display

3. **Updated `/src/lib/constants.ts`**
   - Added missing magic number constants
   - Centralized query limits

4. **Updated `/src/components/payments/PaymentManagement.tsx`**
   - ✅ Integrated `usePaymentWebSocketSync` hook
   - ✅ Wrapped with `PaymentErrorBoundary`
   - ✅ Replaced console.error with logger

---

## Migration Phases

### Phase 1: Payment Components (HIGH PRIORITY)

**Files to Refactor**:

#### 1.1 PaymentNotifications.tsx (CRITICAL - Memory Leak)
- **Current**: 5 WebSocket listeners + memory leak in timeout cleanup
- **Remove**:
  - Lines ~167: `useWebSocketEvent('payment:created', ...)`
  - Lines ~137: `useWebSocketEvent('payment:completed', ...)`
  - Lines ~152: `useWebSocketEvent('payment:failed', ...)`
  - Lines ~185: `useWebSocketEvent('payment:refunded', ...)`
  - Lines ~200: `useWebSocketEvent('payment:cancelled', ...)`
  - All corresponding handler functions
- **Fix**:
  - Timeout cleanup in useEffect cleanup function
  - Ensure timeouts are cleared before new ones added
  - Remove timeout refs on unmount properly
- **Add**:
  - Import logger
  - Replace console.log with logger.payment()
  - Add MAX_NOTIFICATIONS from constants

#### 1.2 PaymentOverview.tsx
- **Current**: 3 WebSocket listeners
- **Remove**:
  - Lines ~155: `useWebSocketEvent('payment:created', ...)`
  - Lines ~90: `useWebSocketEvent('payment:completed', ...)`
  - Lines ~114: `useWebSocketEvent('payment:failed', ...)`
  - Handler functions: handlePaymentCreated, handlePaymentCompleted, handlePaymentFailed
- **Add**:
  - useMemo for paymentMethodBreakdown calculation
  - Replace console.log (lines 64-75) with logger
  - Optimize staleTime based on WebSocket connection

#### 1.3 PaymentAnalytics.tsx
- **Current**: 4 WebSocket listeners
- **Remove**:
  - Lines ~139: `useWebSocketEvent('payment:created', ...)`
  - Lines ~137: `useWebSocketEvent('payment:completed', ...)`
  - Lines ~138: `useWebSocketEvent('payment:failed', ...)`
  - Lines ~140: `useWebSocketEvent('payment:refunded', ...)`
  - All handler functions
- **Add**:
  - Replace console.log with logger
  - Add memoization for chart data calculations

#### 1.4 PendingCashPayments.tsx
- **Current**: 3 WebSocket listeners
- **Remove**:
  - Lines ~149: `useWebSocketEvent('payment:created', ...)`
  - `useWebSocketEvent('payment:completed', ...)`
  - `useWebSocketEvent('payment:cancelled', ...)`
  - 2x `useWebSocketEvent('payment:status_updated', ...)` (anonymous listeners!)
- **Add**:
  - Replace hardcoded limit: 1000 with PAYMENT_QUERY_LIMIT
  - Replace console.log with logger

#### 1.5 ActivePayments.tsx
- **Current**: 5 WebSocket listeners + excessive logging
- **Remove**:
  - Lines 247-252: All useWebSocketEvent calls
  - Lines 81-244: All handler functions (handlePaymentCreated, etc.)
  - Lines 82-104, 108-129, 163-204, 207-228, 229-243: Excessive console.log
- **Keep**:
  - Query logic (lines 54-78)
  - Export functionality
  - UI rendering logic
- **Add**:
  - useCallback for getPaymentMethodIcon
  - Minimal logger calls for errors only

---

### Phase 2: Order Components

#### 2.1 OrdersManagement.tsx (CRITICAL - Cross-concern violation)
- **Remove**:
  - Lines 332-415: ALL payment event handlers (handlePaymentCreated, handlePaymentCompleted, etc.)
  - Payment-related useWebSocketEvent calls
  - Payment query invalidations
- **Keep**:
  - Order event handlers (but verify no duplication with dashboard)
- **Reason**: Orders component should NOT manage payment cache - violates separation of concerns

#### 2.2 Header.tsx
- **Remove**:
  - Duplicate `order:created` listener (line 169)
  - Duplicate `order:status_updated` listener (line 187)
  - Duplicate `assistance:requested` listener (line 202)
- **Keep**:
  - Notification badge counts
  - Sound alerts (but ensure no double-play)

#### 2.3 dashboard-page.tsx
- **Add**:
  - `useOrderWebSocketSync(restaurantId)`
  - `useAssistanceWebSocketSync(restaurantId)`
- **Remove**:
  - Commented-out order event handlers
  - Duplicate assistance:requested listener (line 218)

---

### Phase 3: Global Optimizations

#### 3.1 Replace console.log with logger
**Automated Script** (safe to run):
```bash
# Find all console.log in restaurant-dashboard
find apps/restaurant-dashboard/src -name "*.tsx" -o -name "*.ts" | \
  xargs grep -l "console\.\(log\|error\|warn\|info\)"
```

**Manual replacements needed**:
- `console.log('🎯...')` → `logger.payment/order/websocket(...)`
- `console.error(...)` → `logger.error(...)`
- `console.warn(...)` → `logger.warn(...)`
- Development-only logs can be kept but use logger.debug()

#### 3.2 Add React Query Optimizations

**Pattern to apply**:
```typescript
// BEFORE
const { data } = useQuery({
  queryKey: ['payments', restaurantId],
  staleTime: 0,  // ❌ Forces refetch every mount
})

// AFTER
const { isConnected } = useWebSocket()
const { data } = useQuery({
  queryKey: ['payments', restaurantId],
  staleTime: isConnected ? QUERY_STALE_TIME.MEDIUM : QUERY_STALE_TIME.SHORT,
  refetchInterval: isConnected ? false : QUERY_REFETCH_INTERVAL.FAST,
})
```

**Files to optimize**:
- PaymentOverview.tsx (line 61)
- PaymentAnalytics.tsx
- ActivePayments.tsx (line 78)
- OrdersManagement.tsx
- All dashboard queries

---

## Verification Strategy

### After Each Component Refactor:

1. **Type Check**:
   ```bash
   pnpm -w run type-check
   ```

2. **Build Test**:
   ```bash
   pnpm turbo build --filter=@tabsy/restaurant-dashboard
   ```

3. **Manual Test**:
   - Start dev server: `PORT=3002 pnpm -w run dev:restaurant`
   - Test payment flows
   - Monitor Network tab (should see reduced requests)
   - Check browser console for errors

4. **WebSocket Test**:
   - Create test payment
   - Verify only ONE query invalidation (not 5-6)
   - Check that UI updates correctly
   - No duplicate notifications/sounds

### After All Phases:

Run comprehensive review:
```bash
# Use restaurant-app-reviewer agent to verify all changes
```

---

## Rollback Plan

**If issues found**:

1. **Incremental rollback** - Each component can be reverted independently
2. **Old listeners still work** - The centralized hooks are additive, not replacing core functionality
3. **Git commits** - Each phase should be a separate commit for easy reversion

**Critical files to backup**:
- ActivePayments.tsx (most complex)
- OrdersManagement.tsx (cross-concern issues)
- PaymentNotifications.tsx (memory leak fix)

---

## Success Metrics

### Before Refactoring:
- ❌ 52 WebSocket event listeners registered
- ❌ 18-25 query invalidations per payment event
- ❌ 3 memory leaks (timeout cleanup issues)
- ❌ Cross-concern coupling (5 instances)

### After Refactoring:
- ✅ ~15 WebSocket event listeners (70% reduction)
- ✅ 1-2 query invalidations per event (87% reduction)
- ✅ 0 memory leaks
- ✅ Proper separation of concerns

### Performance Impact:
- **Network requests**: ~70% reduction during high-traffic periods
- **Component re-renders**: ~30% reduction
- **Memory usage**: Stable (no timeout leaks)
- **Developer experience**: Easier debugging with centralized logging

---

## Notes & Decisions

### Why Not Use a Script for Everything?

1. **WebSocket listener removal is context-dependent**:
   - Some components have custom logic in handlers
   - Handler functions are interleaved with other code
   - Need to verify each removal doesn't break local state management

2. **Safe for scripts**:
   - console.log → logger (simple string replacement)
   - Magic number extraction (search & replace)
   - Import additions (can be automated)

3. **Manual review needed**:
   - WebSocket handler logic (might have side effects)
   - Query invalidation patterns (some are intentional)
   - Memory leak fixes (require understanding control flow)

### Architecture Principles Applied

1. **Single Responsibility**: Each hook manages one domain
2. **Don't Repeat Yourself**: Centralized event handling
3. **Separation of Concerns**: Payment events only in payment domain
4. **Fail Fast**: Error boundaries isolate failures
5. **Observable**: Centralized logging for debugging

---

## Timeline Estimate

- **Phase 1** (Payment components): 2-3 hours
- **Phase 2** (Order components): 1-2 hours
- **Phase 3** (Optimizations): 1 hour
- **Testing & Verification**: 1 hour
- **Total**: 5-7 hours of focused refactoring

---

## Contact & Questions

If you encounter issues during migration:

1. Check this guide for patterns
2. Review the centralized hooks in `useWebSocketSync.ts`
3. Test incrementally - don't refactor all components at once
4. Use the restaurant-app-reviewer agent for code review

**Remember**: Incremental > Big Bang. One component at a time.
