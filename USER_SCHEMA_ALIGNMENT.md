# User Schema Alignment - Frontend to Backend

## Current State (Aligned with Backend API)

### Backend Prisma Schema (What EXISTS in database):
```prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  password      String   // Hashed
  firstName     String
  lastName      String
  phone         String?
  role          Role     @default(CUSTOMER)
  active        Boolean  @default(true)  // ⚠️ Simple boolean
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relationships
  restaurantOwner  RestaurantOwner?
  restaurantStaff  RestaurantStaff?
}
```

### Frontend User Interface (MATCHES backend response):
```typescript
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  role: UserRole
  active?: boolean          // Matches backend
  createdAt: string
  updatedAt: string
  restaurantId?: string     // From junction table
}

// Helper function to compute UI status from active field
export function getUserStatus(user: User): UserStatus {
  return user.active !== false ? UserStatus.ACTIVE : UserStatus.INACTIVE
}
```

---

## Field Mapping

| Frontend Field | Backend Field | Type | Notes |
|---------------|---------------|------|-------|
| `id` | `id` | string | ✅ Direct match |
| `email` | `email` | string | ✅ Direct match |
| `firstName` | `firstName` | string | ✅ Direct match |
| `lastName` | `lastName` | string | ✅ Direct match |
| `phone` | `phone` | string? | ✅ Direct match |
| `role` | `role` | enum | ✅ Direct match |
| `active` | `active` | boolean | ✅ Direct match |
| `createdAt` | `createdAt` | string | ✅ Direct match (ISO string) |
| `updatedAt` | `updatedAt` | string | ✅ Direct match (ISO string) |
| `restaurantId` | Via junction | string? | ✅ Populated from RestaurantOwner/Staff |
| ~~`status`~~ | N/A | ❌ | **Computed in frontend** |
| ~~`lastLoginAt`~~ | N/A | ❌ | **Not in backend** |
| ~~`profileImageUrl`~~ | N/A | ❌ | **Not in backend** |

---

## Status Field - Current Workaround

Since backend only has `active: boolean`, we compute status in the frontend:

```typescript
function getUserStatus(user: User): UserStatus {
  // active: true  → ACTIVE
  // active: false → INACTIVE
  return user.active !== false ? UserStatus.ACTIVE : UserStatus.INACTIVE
}
```

**Limitation**: Cannot distinguish between:
- User pending email verification
- User temporarily deactivated by admin
- User suspended for policy violations

---

## Recommended Backend Improvements

### 1. Replace `active: Boolean` with `status: Enum`

```prisma
enum UserStatus {
  PENDING      // Email not verified yet
  ACTIVE       // Fully active user
  INACTIVE     // Temporarily deactivated
  SUSPENDED    // Suspended for violations
}

model User {
  // ... other fields
  status        UserStatus @default(PENDING)  // Instead of active: Boolean
  emailVerified Boolean    @default(false)    // Separate verification flag
  // ... other fields
}
```

**Benefits:**
- More granular user state management
- Better audit trail (why is user inactive?)
- Industry standard pattern
- Supports email verification flow
- Enables temporary vs permanent deactivation

### 2. Add `lastLoginAt` field

```prisma
model User {
  // ... other fields
  lastLoginAt   DateTime?  // Track user activity
}
```

**Benefits:**
- Security auditing
- Identify inactive accounts
- Better user analytics

### 3. Add `profileImageUrl` field (Optional)

```prisma
model User {
  // ... other fields
  profileImageUrl String?  // User profile picture
}
```

---

## Migration Strategy

If backend implements proper status enum:

1. **Update shared-types**:
   ```typescript
   export interface User {
     // ... other fields
     status: UserStatus  // Replace active: boolean
     emailVerified?: boolean
     lastLoginAt?: string
   }
   ```

2. **Remove helper function**:
   ```typescript
   // Delete getUserStatus() - no longer needed
   ```

3. **Update UI components**:
   - Use `user.status` directly instead of `getUserStatus(user)`
   - Remove status computation logic

4. **Add email verification UI**:
   - Show pending state
   - Add "Resend verification email" action

---

## Current API Endpoints

### Create User
```typescript
POST /api/v1/users
{
  email: string
  password: string
  firstName: string
  lastName: string
  role: UserRole
  phone?: string
  restaurantId?: string  // Required for RESTAURANT_OWNER/STAFF
}
```

### Update User
```typescript
PUT /api/v1/users/:id
{
  email?: string
  firstName?: string
  lastName?: string
  phone?: string
  role?: UserRole
  active?: boolean  // Toggle user activation
}
```

### List Users (Admin)
```typescript
GET /api/v1/users?page=1&limit=20&role=ADMIN&search=john
```

---

## Testing Checklist

- [x] User listing displays correct status (computed from active field)
- [x] Status badge shows ACTIVE (green) or INACTIVE (gray)
- [x] Create user includes all required fields
- [x] Update user with active toggle works
- [x] Restaurant users linked via restaurantId
- [x] Filter by role works
- [x] Search by name/email works
- [ ] Backend migration to status enum (future)

---

## Key Takeaways

1. **Frontend is aligned with current backend** - Uses `active: boolean`
2. **Status is computed in frontend** - Via `getUserStatus()` helper
3. **Backend should be updated** - Replace boolean with proper status enum
4. **All CRUD operations work** - Create, Read, Update, Delete users
5. **Restaurant linking works** - Via `restaurantId` in create/update

