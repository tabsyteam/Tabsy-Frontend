# Tabsy Schema & API Alignment - Migration Plan

> **Created**: 2025-10-10
> **Status**: Ready for Implementation
> **Priority**: High
> **Affected Systems**: Backend (Tabsy-Core), Frontend (All 3 Apps)

---

## Executive Summary

This migration plan addresses critical mismatches between the Prisma schema and API documentation, ensuring consistent data handling across the entire Tabsy platform. The plan includes schema updates, API validator changes, and frontend adjustments.

### Impact Assessment

- **Schema Changes**: 1 enum expansion (Currency)
- **API Changes**: Multiple enum value updates
- **Database Migration**: Required (adding Currency enum values)
- **Frontend Updates**: Required (3 applications)
- **Downtime**: Zero (backward compatible changes)
- **Risk Level**: Low-Medium

---

## Phase 1: Critical Fixes (Immediate - Sprint 1)

### 1.1 Currency Enum Expansion ✅ COMPLETED

**Status**: Schema updated, migration pending

**Schema Changes**:
```prisma
// OLD
enum Currency {
  USD
  AED
  INR
}

// NEW ✅
enum Currency {
  USD
  AED
  INR
  EUR
  GBP
  CAD
  AUD
  JPY
}
```

**Migration Steps**:
1. ✅ Update `schema.prisma` (COMPLETED)
2. ⏳ Generate migration: `npx prisma migrate dev --name add_currency_values`
3. ⏳ Apply to development database
4. ⏳ Test with existing data
5. ⏳ Deploy to staging
6. ⏳ Deploy to production

**Backend Updates Required**:
- File: `src/validators/restaurant.validator.ts`
  - Update currency validation to accept new values
- File: `src/services/stripe.service.ts`
  - Ensure currency mapping for Stripe supports all 8 currencies
- File: `src/utils/currency.utils.ts`
  - Add formatting and conversion utilities for new currencies

**Frontend Updates Required**:
- **Restaurant Dashboard**: Update currency selector in restaurant settings
- **Admin Portal**: Update currency options in restaurant creation/edit forms
- **Shared Components**: Update currency dropdown component

**Testing Checklist**:
- [ ] Create restaurant with EUR currency
- [ ] Create restaurant with GBP currency
- [ ] Process payment in JPY
- [ ] Verify existing USD/AED/INR restaurants still work
- [ ] Test currency conversion in reports

---

### 1.2 PaymentMethod Enum Standardization

**Status**: API documentation updated, backend changes pending

**Current Mismatch**:
- **Schema**: CREDIT_CARD, DEBIT_CARD, MOBILE_PAYMENT, CASH
- **API Docs (OLD)**: CARD, CASH, DIGITAL_WALLET
- **API Docs (NEW)**: ✅ Updated to match schema

**Decision**: Use schema values (more granular tracking)

**Backend Updates Required**:
- File: `src/validators/payment.validator.ts`
  ```typescript
  // OLD
  paymentMethod: z.enum(['CARD', 'CASH', 'DIGITAL_WALLET'])

  // NEW
  paymentMethod: z.enum(['CREDIT_CARD', 'DEBIT_CARD', 'MOBILE_PAYMENT', 'CASH'])
  ```
- File: `src/services/payment.service.ts`
  - Update payment processing logic to handle all 4 methods
  - Map Stripe payment method types to enum values
- File: `src/services/analytics.service.ts`
  - Update payment method aggregation queries

**Frontend Updates Required**:
- **Customer App**:
  - File: `apps/customer/src/components/payment/PaymentMethodSelector.tsx`
  - Update payment method options
  - Group CREDIT_CARD and DEBIT_CARD as "Card Payment"
- **Restaurant Dashboard**:
  - File: `apps/restaurant-dashboard/src/components/payments/PaymentFilters.tsx`
  - Update filter options
  - Display separate metrics for CREDIT_CARD vs DEBIT_CARD
- **Admin Portal**:
  - File: `apps/admin-portal/src/pages/analytics/PaymentAnalytics.tsx`
  - Update payment method breakdown charts

**Migration Script** (if needed):
```sql
-- If any existing data uses old values, map them
UPDATE "Payment"
SET "paymentMethod" = 'CREDIT_CARD'
WHERE "paymentMethod" = 'CARD';

UPDATE "Payment"
SET "paymentMethod" = 'MOBILE_PAYMENT'
WHERE "paymentMethod" = 'DIGITAL_WALLET';
```

**Testing Checklist**:
- [ ] Create payment with CREDIT_CARD
- [ ] Create payment with DEBIT_CARD
- [ ] Create payment with MOBILE_PAYMENT
- [ ] Create payment with CASH
- [ ] Verify analytics correctly group payment methods
- [ ] Test payment method filtering in dashboard

---

### 1.3 Role Enum Cleanup ✅ COMPLETED

**Status**: API documentation updated

**Changes Made**:
- ✅ Removed `CUSTOMER` role from API documentation (doesn't exist in schema)
- ✅ Added `RESTAURANT_ADMIN` role to API documentation
- Schema already correct with: ADMIN, RESTAURANT_ADMIN, RESTAURANT_STAFF, RESTAURANT_OWNER

**No Further Action Required**: Documentation now matches schema

---

### 1.4 Feedback Model Alignment ✅ COMPLETED

**Status**: API documentation updated

**Issue**: API docs showed `status` field that doesn't exist in schema

**Changes Made**:
- ✅ Removed non-existent `status` field from Feedback response documentation
- ✅ Updated response to match actual schema fields

**Schema (Correct)**:
```prisma
model Feedback {
  id            String   @id @default(uuid())
  orderId       String?  @unique
  restaurantId  String
  tableId       String?
  overallRating Int
  foodRating    Int?
  serviceRating Int?
  ambianceRating Int?
  valueRating   Int?
  quickFeedback String[] @default([])
  comment       String?
  guestName     String?
  guestEmail    String?
  guestPhone    String?
  // No status field exists
}
```

**Future Consideration**: If feedback status/moderation is needed, create a separate enhancement ticket

**No Further Action Required**: Documentation now matches schema

---

## Phase 2: High Priority Improvements (Sprint 2-3)

### 2.1 MenuItem Field Naming Standardization

**Issue**: Dual naming patterns causing confusion

**Affected Fields**:
- `basePrice` vs `price`
- `status` vs `active`
- `spicyLevel` vs `spiceLevel`
- `image` vs `imageUrl`
- `dietaryTypes` vs `dietaryIndicators`

**Recommended Approach**: Standardize on schema names

**Backend Updates**:
- File: `src/validators/menu-item.validator.ts`
  ```typescript
  // Remove dual acceptance, use schema names only
  const menuItemSchema = z.object({
    price: z.number().min(0),              // Not basePrice
    active: z.boolean().optional(),        // Not status
    spicyLevel: z.number().min(0).max(4), // Not spicyLevel (note the 'i')
    image: z.string().url().optional(),    // Not imageUrl
    dietaryIndicators: z.array(z.string()) // Not dietaryTypes
  })
  ```

**Frontend Updates**:
- Update all API calls to use schema field names
- Update TypeScript interfaces to match
- Create mapping utilities if backward compatibility needed

**Testing Checklist**:
- [ ] Create menu item with all field variations
- [ ] Update menu item
- [ ] Verify frontend displays correctly
- [ ] Check mobile app compatibility

---

### 2.2 MenuItem AllergyInfo Structure Standardization

**Issue**: Two different structures in use

**Schema Structure (Boolean flags)**:
```typescript
allergyInfo: {
  containsDairy: boolean
  containsGluten: boolean
  containsEggs: boolean
  containsNuts: boolean
  containsSeafood: boolean
  other: string[]
}
```

**API Docs Structure (Arrays)**:
```typescript
allergyInfo: {
  contains: string[]
  mayContain: string[]
  safeFor: string[]
}
```

**Recommendation**: Use schema structure (more explicit, better for filtering)

**Backend Updates**:
- Keep schema structure
- Add computed fields if array format needed for UI

**Frontend Updates**:
- Update allergy filter UI to use boolean flags
- Create mapping utilities for display

---

### 2.3 MenuCategory Image Field

**Issue**: API docs reference `image`/`imageUrl` field, but schema doesn't have it

**Options**:
1. **Add to Schema** (Recommended):
   ```prisma
   model MenuCategory {
     // ... existing fields
     image String?
   }
   ```
2. **Remove from API**: Drop the feature

**If Adding to Schema**:
- Migration: `npx prisma migrate dev --name add_menu_category_image`
- Backend: Update validators and services
- Frontend: Add image upload in category management

---

## Phase 3: Feature Completions (Sprint 4-6)

### 3.1 POS Integration API (14 Endpoints)

**Status**: Schema complete, API endpoints missing

**Required Endpoints**:

#### Configuration Management (5 endpoints)
```typescript
POST   /api/v1/restaurants/:id/pos/configuration
GET    /api/v1/restaurants/:id/pos/configuration
PUT    /api/v1/restaurants/:id/pos/configuration
DELETE /api/v1/restaurants/:id/pos/configuration
PATCH  /api/v1/restaurants/:id/pos/configuration/status
```

#### Sync Operations (3 endpoints)
```typescript
POST   /api/v1/restaurants/:id/pos/sync
GET    /api/v1/restaurants/:id/pos/sync/status
POST   /api/v1/restaurants/:id/pos/sync/manual
```

#### Mapping Management (4 endpoints)
```typescript
GET    /api/v1/restaurants/:id/pos/mappings
POST   /api/v1/restaurants/:id/pos/mappings
PUT    /api/v1/restaurants/:id/pos/mappings/:mappingId
DELETE /api/v1/restaurants/:id/pos/mappings/:mappingId
```

#### Sync Logs (2 endpoints)
```typescript
GET    /api/v1/restaurants/:id/pos/sync-logs
GET    /api/v1/restaurants/:id/pos/sync-logs/:logId
```

**Implementation Priority**: Medium (only needed if POS integration is active feature)

---

### 3.2 Audit & Logging Endpoints

**Missing Query Endpoints**:
```typescript
GET /api/v1/payments/:id/audit-log     // View payment audit trail
GET /api/v1/webhooks/events            // List webhook events
GET /api/v1/webhooks/events/:id        // Get webhook event details
```

**Implementation**: Low priority, mainly for debugging

---

### 3.3 Restaurant Staff Management Enhancement

**Current**: Basic add/remove functionality exists
**Missing**: List and detail views

**Add Endpoints**:
```typescript
GET /api/v1/restaurants/:id/staff      // List all staff
GET /api/v1/restaurants/:id/owners     // List all owners
```

**Schema Support**: Already exists with `position` field in RestaurantStaff

---

### 3.4 Feedback Photo Management

**Schema**: FeedbackPhoto model exists
**API**: No upload/delete endpoints

**Add Endpoints**:
```typescript
POST   /api/v1/feedback/:id/photos
DELETE /api/v1/feedback/:id/photos/:photoId
```

**Implementation**:
- File upload handling
- Image optimization
- Storage integration (S3/Cloudinary)

---

## Phase 4: Technical Debt (Backlog)

### 4.1 NotificationType Enum Conversion

**Current**: `type: String` in schema
**Recommended**: Convert to enum

**Schema Update**:
```prisma
enum NotificationType {
  ORDER_STATUS
  PAYMENT_STATUS
  ASSISTANCE_REQUIRED
  SYSTEM
  MARKETING
}

model Notification {
  type NotificationType // Instead of String
}
```

**Impact**: Low priority, current implementation works

---

### 4.2 SplitCalculation Field Cleanup

**Issue**: Redundant fields `updatedBy` and `lastUpdatedBy`

**Recommendation**: Remove one, keep single audit field

---

### 4.3 Standardize Timestamp Fields

**Review**: Ensure all models have consistent `createdAt` and `updatedAt`

---

## Implementation Timeline

### Week 1: Critical Fixes
- ✅ Day 1: Currency enum update (DONE)
- ✅ Day 1: API documentation updates (DONE)
- Day 2: Generate and test database migration
- Day 3: Update backend validators (PaymentMethod, Currency)
- Day 4-5: Frontend updates (all 3 apps)

### Week 2: High Priority
- Day 1-2: MenuItem field naming standardization
- Day 3: AllergyInfo structure fix
- Day 4: MenuCategory image field addition
- Day 5: Testing and bug fixes

### Week 3-4: Feature Completions
- POS Integration API (if prioritized)
- Audit endpoints
- Staff management enhancement
- Feedback photos

### Ongoing: Technical Debt
- Address as time permits
- Include in regular refactoring sprints

---

## Risk Mitigation

### Backward Compatibility

**Strategy**:
- Backend supports both old and new enum values during transition period
- Frontend updates deployed first
- Database migration last
- Gradual rollout with feature flags

### Rollback Plan

**If Issues Arise**:
1. Revert frontend deployments
2. Keep database schema (new values won't break old code)
3. Keep API validators flexible
4. Monitor error logs for unexpected enum values

### Testing Strategy

**Test Suites Required**:
- Unit tests for validators with new enum values
- Integration tests for payment flows with all payment methods
- E2E tests for multi-currency scenarios
- Regression tests for existing functionality

---

## Success Metrics

- ✅ Zero schema-API mismatches
- ✅ All enums properly documented
- ✅ 100% test coverage for updated endpoints
- ✅ Zero production errors from enum validation
- ✅ All 3 frontend apps updated and deployed
- ✅ Database migration successful with no downtime

---

## Team Assignments

### Backend Team
- Schema migration execution
- Validator updates
- Service layer changes
- API endpoint creation (POS integration)

### Frontend Team
- Update all 3 applications
- TypeScript interface updates
- UI component updates
- Integration testing

### DevOps Team
- Database migration coordination
- Deployment orchestration
- Monitoring and alerts
- Rollback procedures if needed

### QA Team
- Comprehensive testing of all changes
- Regression testing
- Performance testing with new enum values
- User acceptance testing

---

## Communication Plan

1. **Kick-off Meeting**: Review plan with all teams
2. **Daily Standups**: Track progress during implementation
3. **Slack Channel**: #schema-api-alignment for real-time updates
4. **Documentation**: Update internal wiki with changes
5. **Release Notes**: Detailed notes for stakeholders

---

## Post-Implementation

### Monitoring
- Error rates for enum validation failures
- Payment processing success rates
- API response times
- Frontend error tracking

### Documentation Updates
- ✅ API documentation (DONE)
- Backend API README
- Frontend integration guide
- Database schema documentation

### Knowledge Sharing
- Tech talk on learnings
- Update onboarding materials
- Document best practices for enum handling

---

## Appendix

### A. Files Modified

**Backend (Tabsy-Core)**:
- ✅ `/prisma/schema.prisma` (Currency enum)
- `/prisma/migrations/XXXXXX_add_currency_values/migration.sql`
- `/src/validators/payment.validator.ts`
- `/src/validators/restaurant.validator.ts`
- `/src/validators/menu-item.validator.ts`
- `/src/services/payment.service.ts`
- `/src/services/stripe.service.ts`
- `/src/utils/currency.utils.ts`

**Frontend (Tabsy-Frontend)**:
- ✅ `/API_DOCUMENTATION.md`
- `/apps/customer/src/components/payment/PaymentMethodSelector.tsx`
- `/apps/restaurant-dashboard/src/components/payments/PaymentFilters.tsx`
- `/apps/restaurant-dashboard/src/pages/settings/RestaurantSettings.tsx`
- `/apps/admin-portal/src/pages/restaurants/RestaurantForm.tsx`
- `/apps/admin-portal/src/pages/analytics/PaymentAnalytics.tsx`
- `/packages/shared-types/src/index.ts`

### B. Database Migration SQL

```sql
-- Add new currency enum values
-- Prisma will generate this automatically
-- Expected migration: add_currency_values

ALTER TYPE "Currency" ADD VALUE IF NOT EXISTS 'EUR';
ALTER TYPE "Currency" ADD VALUE IF NOT EXISTS 'GBP';
ALTER TYPE "Currency" ADD VALUE IF NOT EXISTS 'CAD';
ALTER TYPE "Currency" ADD VALUE IF NOT EXISTS 'AUD';
ALTER TYPE "Currency" ADD VALUE IF NOT EXISTS 'JPY';

-- No data migration needed as we're adding values, not changing existing ones
```

### C. Testing Checklist Master List

#### Currency Tests
- [ ] Create restaurant with each new currency (EUR, GBP, CAD, AUD, JPY)
- [ ] Process payment in each currency
- [ ] Verify Stripe integration works with all currencies
- [ ] Test currency display formatting
- [ ] Test currency conversion in reports

#### Payment Method Tests
- [ ] Create payment with CREDIT_CARD
- [ ] Create payment with DEBIT_CARD
- [ ] Create payment with MOBILE_PAYMENT
- [ ] Create payment with CASH
- [ ] Verify analytics correctly separate card types
- [ ] Test filtering by payment method
- [ ] Verify Stripe mapping for each method

#### Role Tests
- [ ] Verify ADMIN access
- [ ] Verify RESTAURANT_ADMIN access
- [ ] Verify RESTAURANT_OWNER access
- [ ] Verify RESTAURANT_STAFF access
- [ ] Confirm CUSTOMER role is not accepted

#### Feedback Tests
- [ ] Create feedback without status field
- [ ] Verify feedback displays correctly
- [ ] Test all rating fields (overall, food, service, ambiance, value)
- [ ] Test guest info fields

#### Regression Tests
- [ ] Existing restaurants still load
- [ ] Existing payments still visible
- [ ] Existing orders still process
- [ ] WebSocket events still work
- [ ] All 3 frontend apps fully functional

---

**Document Version**: 1.0
**Last Updated**: 2025-10-10
**Next Review**: After Phase 1 completion
**Owner**: Backend Team Lead + Frontend Team Lead
