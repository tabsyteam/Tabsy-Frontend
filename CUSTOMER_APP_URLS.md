# Customer App URL Formats

## Correct URL Formats:

### 1. Direct Restaurant/Table Access (Recommended for Testing)
```
http://localhost:3002/r/{restaurantId}/t/{tableId}
```
**Example:**
```
http://localhost:3002/r/test-restaurant-id/t/table-2
```

**How it works:**
- Goes directly to TableSessionInitializer
- Creates guest session automatically
- No QR API call needed
- Restaurant and table IDs from URL path

---

### 2. QR Code Access (Production Flow)
```
http://localhost:3002/table/{qrCode}
```
**Example:**
```
http://localhost:3002/table/QR_TABLE_2_TEST
```

**How it works:**
- Calls QR API: `/api/v1/qr/{qrCode}/access`
- Backend returns restaurant and table info
- Redirects to: `/r/{restaurantId}/t/{tableId}?qr={qrCode}`
- Then creates guest session

**DO NOT add query params** (`?r=` or `?restaurant=`) with this format!

---

### 3. Menu/Cart with Session (After QR Scan)
```
http://localhost:3002/menu?restaurant={restaurantId}&table={tableId}
http://localhost:3002/cart?restaurant={restaurantId}&table={tableId}
```

**Note:** Query param names are `restaurant` and `table` (not `r` and `t`)

---

## Common Mistakes:

### ❌ WRONG:
```
/table/QR_TABLE_2_TEST?r=test-restaurant-id&t=table-2
```
**Problem:** Using `?r=` and `?t=` (incorrect param names)

**Fix:** Use either:
- `/r/test-restaurant-id/t/table-2` (direct)
- `/table/QR_TABLE_2_TEST` (QR lookup only)

---

### ❌ WRONG:
```
/menu?r=test-restaurant-id&t=table-2
```
**Problem:** Param names should be `restaurant` and `table`

**Fix:**
```
/menu?restaurant=test-restaurant-id&table=table-2
```

---

## URL Flow Diagram:

```
1. User Scans QR
   ↓
2. /table/{qrCode}
   ↓ (API call)
3. Backend returns restaurant + table
   ↓
4. Redirect to /r/{restaurantId}/t/{tableId}
   ↓
5. TableSessionInitializer creates guest session
   ↓
6. MenuView loads with session
```

---

## Testing URLs:

### Local Development:
```bash
# Direct access (easiest for testing)
http://localhost:3002/r/test-restaurant-id/t/table-2

# QR code (requires backend API)
http://localhost:3002/table/QR_TABLE_2_TEST

# Menu with session
http://localhost:3002/menu?restaurant=test-restaurant-id&table=table-2
```

### Production:
```bash
# QR code is the primary entry point
https://app.tabsy.io/table/QR_123ABC
```

---

## Middleware Behavior:

The middleware checks for session using:
- `?restaurant=` and `?table=` query params
- OR `sessionId` cookie

If accessing protected routes without session:
- Redirects to `/` (home/QR scanner)

Conditional routes (menu, cart, etc.):
- Load but show "Scan QR" message if no session
