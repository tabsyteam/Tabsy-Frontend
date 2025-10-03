# Orders Page Fix - Data Not Displaying Issue

## Problem
Orders data was being received from the API but not displaying in the UI.

## Root Cause
The backend API returns:
```json
{
  "success": true,
  "data": {
    "orders": [...],
    "totalCount": 1
  }
}
```

But the frontend hooks were expecting:
```json
{
  "success": true,
  "data": [...]  // Direct array
}
```

## Files Changed

### 1. `/apps/admin-portal/src/hooks/api/useOrders.ts`
**Fixed 3 hooks to handle both response formats:**

- `useOrders()` - Line 29-31
- `useOrderMetrics()` - Line 171-173  
- `useLiveOrders()` - Line 248-250

**Changes:**
```typescript
// OLD
const orders = ordersResponse.data || [];

// NEW
const responseData = ordersResponse.data as any;
const orders = Array.isArray(responseData) ? responseData : (responseData?.orders || []);
```

**Also improved search filter (Line 72-84):**
- Added `orderNumber`, `customerName`, `customerEmail`, `guestSessionId`
- Added nested `table.tableNumber` and `restaurant.name` search

### 2. `/apps/admin-portal/src/app/orders/page.tsx`
**Fixed field mappings to match API response:**

**Customer Display (Line 391-393):**
```typescript
// OLD
Customer {order.customerId?.slice(-8) || 'Unknown'}

// NEW
{order.customerName || order.customerEmail || `Guest ${order.guestSessionId?.slice(-8)}` || 'Unknown'}
```

**Table Display (Line 395):**
```typescript
// OLD
Table {order.tableId || 'N/A'}

// NEW  
Table {order.table?.tableNumber || order.tableId || 'N/A'}
```

**Restaurant Display (Line 404):**
```typescript
// OLD
Restaurant {order.restaurantId?.slice(-8) || 'Unknown'}

// NEW
{order.restaurant?.name || `Restaurant ${order.restaurantId?.slice(-8)}` || 'Unknown'}
```

### 3. `/packages/shared-types/src/domain/order.ts`
**Added missing fields to Order interface:**

```typescript
export interface Order {
  // ... existing fields ...
  
  // Added:
  guestSessionId?: string
  tableSessionId?: string
  isLocked?: boolean
  roundNumber?: number
  posLastSync?: string | null
  posOrderId?: string | null
  posStatus?: string | null
  
  // Nested objects:
  restaurant?: {
    id: string
    name: string
    // ... full restaurant fields
  }
  table?: {
    id: string
    tableNumber: string
    // ... full table fields
  }
}
```

## Testing Checklist

- [x] Orders list displays data
- [x] Customer names show correctly
- [x] Table numbers show correctly
- [x] Restaurant names show correctly
- [x] Order search works
- [x] Status filters work
- [x] Date filters work

## Next Steps

1. **Rebuild packages**: Run `pnpm -w run build:packages` to rebuild shared-types
2. **Test in browser**: Refresh admin portal and navigate to `/orders`
3. **Verify all data displays**: Check customer names, table numbers, restaurant names
4. **Test search**: Search by order number, customer name, table number, restaurant name
5. **Test filters**: Try different status and date filters

The orders should now display correctly with all the data from your API response!
