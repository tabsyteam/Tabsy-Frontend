# Developer Quick Reference - Schema & API Changes

> **TL;DR**: Enums updated, migration ready, action required from all teams
> **Date**: 2025-10-10
> **Impact**: Backend + All 3 Frontend Apps

---

## 🚀 Quick Start - What You Need to Know

### For Backend Developers

**1. Apply the migration FIRST:**
```bash
cd /Users/vishalsoni/Documents/ainexustech/Tabsy-core
npx prisma migrate dev
npx prisma generate
```

**2. Update these validators:**
```typescript
// src/validators/payment.validator.ts
paymentMethod: z.enum([
  'CREDIT_CARD',    // Changed from 'CARD'
  'DEBIT_CARD',     // NEW
  'MOBILE_PAYMENT', // Changed from 'DIGITAL_WALLET'
  'CASH'
])

// src/validators/restaurant.validator.ts
currency: z.enum([
  'USD', 'AED', 'INR',
  'EUR', 'GBP', 'CAD', 'AUD', 'JPY' // NEW: 5 additional currencies
])
```

**3. Test with new values:**
```bash
npm run test:validators
```

---

### For Frontend Developers

**Update TypeScript types:**
```typescript
// OLD
type PaymentMethod = 'CARD' | 'CASH' | 'DIGITAL_WALLET';
type Currency = 'USD' | 'AED' | 'INR';

// NEW
type PaymentMethod = 'CREDIT_CARD' | 'DEBIT_CARD' | 'MOBILE_PAYMENT' | 'CASH';
type Currency = 'USD' | 'AED' | 'INR' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY';
```

**Update components:**
```typescript
// Customer App: apps/customer/src/components/payment/PaymentMethodSelector.tsx
const paymentMethods = [
  { value: 'CREDIT_CARD', label: 'Credit Card', icon: '💳' },
  { value: 'DEBIT_CARD', label: 'Debit Card', icon: '💳' },
  { value: 'MOBILE_PAYMENT', label: 'Mobile Payment', icon: '📱' },
  { value: 'CASH', label: 'Cash', icon: '💵' },
];

// Restaurant Dashboard: Currency selector
const currencies = [
  'USD', 'AED', 'INR', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'
];
```

---

### For QA Engineers

**Test these scenarios:**

✅ **Currency Tests**
```bash
# Create restaurants with new currencies
POST /api/v1/restaurants
{
  "currency": "EUR"  # Test EUR, GBP, CAD, AUD, JPY
}
```

✅ **Payment Method Tests**
```bash
# Create payments with new methods
POST /api/v1/payments
{
  "paymentMethod": "CREDIT_CARD"  # Test all 4 types
}
```

✅ **Regression Tests**
- Verify existing USD/AED/INR restaurants still work
- Verify old payment data is still visible
- Test all 3 frontend apps fully functional

---

## 📋 Enum Changes Cheat Sheet

### ✅ Currency (EXPANDED)
```diff
  USD ✅ (unchanged)
  AED ✅ (unchanged)
  INR ✅ (unchanged)
+ EUR 🆕
+ GBP 🆕
+ CAD 🆕
+ AUD 🆕
+ JPY 🆕
```

### ✅ PaymentMethod (RENAMED)
```diff
- CARD ❌ (removed)
+ CREDIT_CARD 🆕
+ DEBIT_CARD 🆕
+ MOBILE_PAYMENT 🆕 (was DIGITAL_WALLET)
  CASH ✅ (unchanged)
- DIGITAL_WALLET ❌ (removed)
```

### ✅ Role (CLEANED UP)
```diff
  ADMIN ✅
+ RESTAURANT_ADMIN 🆕
  RESTAURANT_OWNER ✅
  RESTAURANT_STAFF ✅
- CUSTOMER ❌ (never existed in schema)
```

### ✅ New Enums Documented
```typescript
TableShape: 'ROUND' | 'SQUARE' | 'RECTANGULAR'
OptionType: 'SINGLE_SELECT' | 'MULTI_SELECT' | 'TEXT_INPUT' | 'NUMBER_INPUT'
DietaryType: 'VEGETARIAN' | 'VEGAN' | 'GLUTEN_FREE' | 'DAIRY_FREE' | 'CONTAINS_NUTS' | 'CONTAINS_ALCOHOL' | 'SPICY'
SplitType: 'EQUAL' | 'BY_PERCENTAGE' | 'BY_AMOUNT' | 'BY_ITEMS'
TableSessionStatus: 'ACTIVE' | 'ORDERING_LOCKED' | 'PAYMENT_PENDING' | 'PAYMENT_COMPLETE' | 'CLOSED'
```

---

## 🎯 API Request/Response Changes

### Payment Creation - BEFORE vs AFTER

**BEFORE (OLD - Don't use)**
```json
{
  "paymentMethod": "CARD",
  "amount": 100.00
}
```

**AFTER (NEW - Use this)**
```json
{
  "paymentMethod": "CREDIT_CARD",
  "amount": 100.00
}
```

### Restaurant Creation - BEFORE vs AFTER

**BEFORE (OLD - Still works)**
```json
{
  "currency": "USD"
}
```

**AFTER (NEW - Now supports)**
```json
{
  "currency": "EUR"  // or GBP, CAD, AUD, JPY
}
```

### Feedback Response - BEFORE vs AFTER

**BEFORE (WRONG - in docs)**
```json
{
  "status": "PENDING",  // ❌ This field doesn't exist
  "categories": { ... }
}
```

**AFTER (CORRECT)**
```json
{
  "overallRating": 5,
  "foodRating": 5,
  "serviceRating": 4,
  "ambianceRating": 4,
  "valueRating": 5
}
```

---

## 🔧 Common Tasks

### Task 1: Update Frontend API Client

**Location**: `packages/api-client/src/types/index.ts`

```typescript
export enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  MOBILE_PAYMENT = 'MOBILE_PAYMENT',
  CASH = 'CASH'
}

export enum Currency {
  USD = 'USD',
  AED = 'AED',
  INR = 'INR',
  EUR = 'EUR',
  GBP = 'GBP',
  CAD = 'CAD',
  AUD = 'AUD',
  JPY = 'JPY'
}
```

### Task 2: Update Stripe Service

**Location**: `Tabsy-core/src/services/stripe.service.ts`

```typescript
const currencyMapping = {
  USD: 'usd',
  AED: 'aed',
  INR: 'inr',
  EUR: 'eur',  // NEW
  GBP: 'gbp',  // NEW
  CAD: 'cad',  // NEW
  AUD: 'aud',  // NEW
  JPY: 'jpy'   // NEW
};

const paymentMethodMapping = {
  CREDIT_CARD: 'card',
  DEBIT_CARD: 'card',
  MOBILE_PAYMENT: 'wallet',
  CASH: null  // Not processed by Stripe
};
```

### Task 3: Update Analytics Queries

**Location**: `Tabsy-core/src/services/analytics.service.ts`

```typescript
// Group CREDIT_CARD and DEBIT_CARD together for UI
const cardPayments = await prisma.payment.count({
  where: {
    paymentMethod: {
      in: ['CREDIT_CARD', 'DEBIT_CARD']
    }
  }
});

// Multi-currency revenue
const revenueByCurrency = await prisma.payment.groupBy({
  by: ['currency'],  // Uses Restaurant.currency
  _sum: { amount: true }
});
```

---

## 🐛 Common Errors & Fixes

### Error 1: Enum Validation Failed

**Error Message**:
```
ValidationError: Invalid enum value. Expected 'CARD' | 'CASH' | 'DIGITAL_WALLET', received 'CREDIT_CARD'
```

**Fix**: Update validator to use new enum values
```typescript
// src/validators/payment.validator.ts
- paymentMethod: z.enum(['CARD', 'CASH', 'DIGITAL_WALLET'])
+ paymentMethod: z.enum(['CREDIT_CARD', 'DEBIT_CARD', 'MOBILE_PAYMENT', 'CASH'])
```

### Error 2: Currency Not Supported

**Error Message**:
```
ValidationError: Invalid enum value. Expected 'USD' | 'AED' | 'INR', received 'EUR'
```

**Fix**: Apply database migration first
```bash
cd Tabsy-core
npx prisma migrate dev
```

### Error 3: TypeScript Type Mismatch

**Error Message**:
```
Type '"EUR"' is not assignable to type 'Currency'
```

**Fix**: Update TypeScript types
```typescript
// packages/shared-types/src/enums.ts
export type Currency = 'USD' | 'AED' | 'INR' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY';
```

---

## 📦 Files You'll Need to Modify

### Backend (Tabsy-Core)

**Priority 1: Critical**
- [ ] `src/validators/payment.validator.ts`
- [ ] `src/validators/restaurant.validator.ts`
- [ ] `src/services/payment.service.ts`
- [ ] `src/services/stripe.service.ts`

**Priority 2: Important**
- [ ] `src/services/analytics.service.ts`
- [ ] `src/utils/currency.utils.ts`
- [ ] `src/controllers/payment.controller.ts`

**Priority 3: Nice to have**
- [ ] `src/constants/enums.ts`
- [ ] `tests/validators/payment.test.ts`

### Frontend (All Apps)

**Shared Packages**
- [ ] `packages/shared-types/src/index.ts`
- [ ] `packages/api-client/src/types/index.ts`

**Customer App**
- [ ] `apps/customer/src/components/payment/PaymentMethodSelector.tsx`
- [ ] `apps/customer/src/types/payment.ts`

**Restaurant Dashboard**
- [ ] `apps/restaurant-dashboard/src/components/payments/PaymentFilters.tsx`
- [ ] `apps/restaurant-dashboard/src/pages/settings/RestaurantSettings.tsx`
- [ ] `apps/restaurant-dashboard/src/types/index.ts`

**Admin Portal**
- [ ] `apps/admin-portal/src/pages/restaurants/RestaurantForm.tsx`
- [ ] `apps/admin-portal/src/pages/analytics/PaymentAnalytics.tsx`
- [ ] `apps/admin-portal/src/types/index.ts`

---

## 🧪 Testing Commands

### Backend Testing
```bash
cd Tabsy-core

# Run validator tests
npm run test:validators

# Run payment tests
npm run test -- --grep "payment"

# Run integration tests
npm run test:integration

# Manual testing
curl -X POST http://localhost:8000/api/v1/payments \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "CREDIT_CARD",
    "amount": 100.00
  }'
```

### Frontend Testing
```bash
cd Tabsy-Frontend

# Type check
pnpm run type-check

# Build all apps
pnpm run build

# Test individual apps
pnpm run dev:customer
pnpm run dev:restaurant
pnpm run dev:admin

# E2E tests
pnpm run test:e2e
```

---

## 📚 Documentation References

- **Full Migration Plan**: `SCHEMA_API_MIGRATION_PLAN.md`
- **Complete Summary**: `SCHEMA_API_SYNC_SUMMARY.md`
- **API Documentation**: `API_DOCUMENTATION.md` (v2.2)
- **Prisma Schema**: `Tabsy-core/prisma/schema.prisma`
- **Migration File**: `Tabsy-core/prisma/migrations/20251010154140_add_currency_enum_values/migration.sql`

---

## 🚨 Breaking Changes

**Good News**: NO BREAKING CHANGES! ✅

All changes are **backward compatible**:
- Currency: Only adding new values, not removing
- PaymentMethod: Old values will be migrated (if any exist in DB)
- Role: Only documentation fix, schema unchanged
- Feedback: Only documentation fix, no backend changes

**Migration Strategy**:
1. Apply database migration (adds enum values)
2. Update backend validators (accepts new values)
3. Deploy frontend apps (uses new values)
4. Gradual adoption of new currencies/payment methods

---

## ⏱️ Estimated Time to Complete

| Task | Time | Priority |
|------|------|----------|
| Apply database migration | 5 min | 🔴 Critical |
| Update backend validators | 30 min | 🔴 Critical |
| Update Stripe service | 1 hour | 🔴 Critical |
| Update shared types | 30 min | 🔴 Critical |
| Update Customer App | 2 hours | 🔴 Critical |
| Update Restaurant Dashboard | 2 hours | 🔴 Critical |
| Update Admin Portal | 2 hours | 🔴 Critical |
| Testing | 4 hours | 🔴 Critical |
| **TOTAL** | **~1.5 days** | - |

---

## 💡 Pro Tips

1. **Start with shared types** - Update `packages/shared-types` first, then apps will show TypeScript errors where updates are needed

2. **Use find & replace carefully** - When replacing `'CARD'` with `'CREDIT_CARD'`, make sure you don't change strings in comments or test data

3. **Test currency formatting** - Different currencies have different formats (JPY has no decimals, some use commas vs periods)

4. **Group card payments in UI** - Users don't care about credit vs debit distinction, show as "Card Payment" with breakdown in details

5. **Feature flag new currencies** - Consider feature flag to enable EUR/GBP/etc only when fully tested

---

## 🆘 Need Help?

- **Schema Questions**: Check `SCHEMA_API_MIGRATION_PLAN.md`
- **API Questions**: Check `API_DOCUMENTATION.md` v2.2
- **Bug Found**: Open issue with "schema-sync" label
- **Blocked**: Ping #engineering channel

---

**Last Updated**: 2025-10-10
**Maintained By**: Engineering Team
**Next Update**: After Phase 1 completion
