# Complete Cache Cleanup Guide

**Issue**: Changes not reflecting, old code still running
**Solution**: Clear all caches (build, browser, storage)

---

## Step 1: Clear Build Caches ✅ DONE

```bash
# Already executed for you:
rm -rf .next
rm -rf node_modules/.cache
rm -f tsconfig.tsbuildinfo
```

---

## Step 2: Kill Dev Server

**Important**: Stop the current dev server:
```bash
# Press Ctrl+C in terminal where dev server is running
# Or find and kill the process:
lsof -ti:3002 | xargs kill -9
```

---

## Step 3: Clear Browser Cache & Storage

### Option A: Hard Refresh (Quick)
- **Chrome/Edge**: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- **Firefox**: `Cmd+Shift+R` (Mac) or `Ctrl+F5` (Windows)
- **Safari**: `Cmd+Option+R`

### Option B: Clear Everything (Recommended)

**Chrome DevTools**:
1. Open DevTools (`F12` or `Cmd+Option+I`)
2. Go to **Application** tab
3. **Clear storage**:
   - ✅ Local storage
   - ✅ Session storage
   - ✅ Cache storage
   - ✅ Cookies
4. Click **"Clear site data"**

**Or use Incognito/Private Window** for clean test

---

## Step 4: Verify sessionStorage is Empty

1. Open DevTools → Application → Session Storage
2. Check `localhost:3002`
3. Should see **NO** entries initially
4. If you see old entries, manually delete them

---

## Step 5: Restart Dev Server

```bash
# From customer app directory:
PORT=3002 pnpm run dev

# Wait for:
# ✓ Ready in Xms
```

---

## Step 6: Test the Fix

### Test A: Fresh QR Scan
```bash
1. Navigate to: http://localhost:3002/table/QR_TABLE_2_TEST?r=test-restaurant-id&t=table-2
2. Should create session and redirect
3. Check sessionStorage - should see 'tabsy-qr-access'
```

### Test B: Refresh (The actual fix)
```bash
1. After Test A succeeds
2. Press F5 or Cmd+R to refresh
3. Should NOT show "Unable to Connect"
4. Should show table view immediately
5. Check console - should see: "Uses cached QR data"
```

### Test C: Verify Cache Persistence
```bash
1. After Test B succeeds
2. Open DevTools → Application → Session Storage
3. Should still see 'tabsy-qr-access' (NOT deleted)
4. Should see 'tabsy-session' (unified session)
```

---

## Expected sessionStorage Contents

After successful QR scan, you should see:

```json
{
  "tabsy-qr-access": "{\"qrCode\":\"QR_TABLE_2_TEST\",\"restaurant\":{...},\"table\":{...}}",
  "tabsy-session": "{\"guestSessionId\":\"...\",\"tableSessionId\":\"...\",\"restaurantId\":\"...\",\"tableId\":\"...\",\"metadata\":{\"restaurantName\":\"...\",\"tableName\":\"...\"}}",
  "tabsy-table-info": "{\"restaurant\":{...},\"table\":{...}}"
}
```

**Key**: `tabsy-qr-access` should **persist** after refresh (was being deleted before)

---

## If Still Not Working

### Debug Step 1: Check File Changes Applied

```bash
grep -A2 "Don't remove cached data" src/components/table/TableSessionInitializer.tsx
```

**Expected output**:
```typescript
// Don't remove cached data - keep it for page refreshes
// It will be cleared when user ends session or scans different QR
```

If you see `sessionStorage.removeItem('tabsy-qr-access')` instead, the changes didn't apply.

### Debug Step 2: Check Build Version

```bash
# In browser console:
console.log('Build time:', new Date())
```

Then refresh. If timestamp doesn't change, old bundle is cached.

### Debug Step 3: Check sessionStorage in Real-Time

```bash
# Add this in browser console and watch while refreshing:
window.addEventListener('storage', (e) => {
  console.log('Storage changed:', e.key, e.newValue)
})

# Also manually check:
console.log('QR Cache:', sessionStorage.getItem('tabsy-qr-access'))
```

### Debug Step 4: Verify Dev Server Restarted

```bash
# Check terminal for:
✓ Compiled successfully in Xms
```

If you see old timestamp or no recompile, server didn't restart.

---

## Nuclear Option: Complete Reset

If nothing works, do this:

```bash
# 1. Kill all Node processes
pkill -9 node

# 2. Clear everything
rm -rf .next node_modules/.cache *.tsbuildinfo

# 3. Clear browser completely
# Use Incognito window

# 4. Restart from scratch
PORT=3002 pnpm run dev
```

---

## Common Mistakes

❌ **Not restarting dev server** - Changes won't apply
❌ **Not hard refreshing browser** - Old JS bundle cached
❌ **Testing in same tab** - Use new incognito tab
❌ **Not checking sessionStorage** - Can't verify cache persistence

✅ **Do this**: Kill server → Clear caches → Restart → Incognito tab → Test

---

## Success Criteria

After following all steps, you should be able to:

1. ✅ Scan QR code → Create session
2. ✅ Refresh page → Still works (no error)
3. ✅ Navigate away and back → Still works
4. ✅ See `tabsy-qr-access` persist in sessionStorage
5. ✅ End session → Cache cleared

---

## Files That Were Modified

These files contain the fix:

1. `src/components/table/TableSessionInitializer.tsx`
   - Lines 92, 146: Removed `sessionStorage.removeItem('tabsy-qr-access')`

2. `src/components/table/TableSessionView.tsx`
   - Line 162: Added `sessionStorage.removeItem('tabsy-qr-access')` to cleanup

3. `src/utils/strictModeGuard.ts`
   - Smart caching logic

---

Let me know if it works after following these steps!
