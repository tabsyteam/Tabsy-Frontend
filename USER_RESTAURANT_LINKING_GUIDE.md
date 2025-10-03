# User-Restaurant Linking Guide

## Database Architecture

### Relationship Structure

The Tabsy system uses a **many-to-many relationship** between Users and Restaurants through junction tables:

```
User (1) ←→ (M) RestaurantOwner (M) ←→ (1) Restaurant
User (1) ←→ (M) RestaurantStaff (M) ←→ (1) Restaurant
```

### Junction Tables

1. **RestaurantOwner**
   - Links users with `RESTAURANT_OWNER` role to restaurants
   - Fields: `userId`, `restaurantId`, `createdAt`, `updatedAt`
   - One user can own multiple restaurants (theoretically)

2. **RestaurantStaff**
   - Links users with `RESTAURANT_STAFF` role to restaurants
   - Fields: `userId`, `restaurantId`, `position`, `createdAt`, `updatedAt`
   - Includes optional `position` field (e.g., "Manager", "Waiter")

---

## How to Link Users to Restaurants (Admin Portal)

### Method 1: Link During User Creation ✅ IMPLEMENTED

**When**: Creating a new user with role `RESTAURANT_OWNER` or `RESTAURANT_STAFF`

**Steps**:
1. Go to **Users** page in admin portal
2. Click **"Add User"** button
3. Fill in user details (name, email, password)
4. Select **Role**: Choose "Restaurant Owner" or "Restaurant Staff"
5. **Restaurant dropdown appears automatically**
6. Select the restaurant from the dropdown
7. Click **"Create User"**

**What Happens**:
- Backend creates the User record
- Backend automatically creates RestaurantOwner or RestaurantStaff association
- User can now log in and access that restaurant's data

**API Call**:
```typescript
POST /api/v1/users
{
  firstName: "John",
  lastName: "Doe",
  email: "john@restaurant.com",
  password: "securepass123",
  role: "RESTAURANT_OWNER",
  restaurantId: "uuid-of-restaurant"  // ✅ This creates the link!
}
```

---

### Method 2: Add Staff to Existing Restaurant (Future)

**When**: Adding existing users as staff members to a restaurant

**API Endpoint** (Available but not yet in UI):
```typescript
POST /api/v1/restaurants/:restaurantId/staff
{
  userId: "uuid-of-user"
}
```

**To Implement in UI**:
1. Add "Manage Staff" button to Restaurant details page
2. Show list of current staff members
3. Add "Add Staff Member" button
4. Show dropdown of existing users (filtered by RESTAURANT_STAFF role)
5. Call the API endpoint

---

## User Roles and Requirements

| Role | Restaurant Required? | Access Level |
|------|---------------------|--------------|
| **ADMIN** | ❌ No | Full system access |
| **RESTAURANT_OWNER** | ✅ YES | Own restaurant(s) full access |
| **RESTAURANT_STAFF** | ✅ YES | Assigned restaurant operational access |
| **CUSTOMER** | ❌ No | Browse menus, place orders |

---

## Current Implementation Status

### ✅ Completed
- Restaurant dropdown appears when selecting RESTAURANT_OWNER or RESTAURANT_STAFF role
- Automatic validation (restaurant is required for those roles)
- Backend API call includes `restaurantId`
- Proper error handling and validation
- Uses new Radix UI Select component (styled consistently)
- Conditional rendering (dropdown only shows for restaurant roles)
- Helper text explaining the linkage
- Empty state handling (shows message if no restaurants exist)

### 🔄 Limitations
- **Cannot edit restaurant association after creation** (by design - prevents data integrity issues)
- **Cannot assign user to multiple restaurants** (current API limitation)
- **No "Manage Staff" UI in restaurant details page** (future enhancement)

---

## How to Test

### Create a Restaurant Owner:
1. First create a restaurant (if none exists)
2. Go to Users → Add User
3. Fill in details
4. Role: Select "Restaurant Owner"
5. Restaurant: Select from dropdown
6. Submit

### Create Restaurant Staff:
1. Same as above, but select "Restaurant Staff" role
2. Restaurant dropdown appears
3. Select restaurant and submit

### Verify the Link:
1. Check backend database:
   ```sql
   SELECT * FROM "RestaurantOwner" WHERE "userId" = 'user-uuid';
   SELECT * FROM "RestaurantStaff" WHERE "userId" = 'user-uuid';
   ```
2. User should be able to log in and see their restaurant's data

---

## Troubleshooting

### "Restaurant is required for this role" Error
**Cause**: Trying to create RESTAURANT_OWNER or RESTAURANT_STAFF without selecting a restaurant

**Solution**: Select a restaurant from the dropdown before submitting

### "No restaurants available" in Dropdown
**Cause**: No restaurants exist in the system yet

**Solution**:
1. Go to Restaurants page
2. Create at least one restaurant first
3. Then create users

### User Created But Can't Access Restaurant
**Cause**: Restaurant link wasn't created properly

**Solution**: Check backend logs for errors. The `restaurantId` should be included in the API request.

---

## Future Enhancements

### 1. Restaurant Staff Management Page
Location: Restaurant Details → "Staff" Tab

Features:
- List all staff members
- Add existing users as staff
- Remove staff members
- Edit staff positions
- Send invitations to new staff

### 2. Multi-Restaurant Support
- Allow users to be linked to multiple restaurants
- Add restaurant switcher in dashboard
- Requires API changes to support multiple associations

### 3. Staff Positions Management
- Add position field to UI (Manager, Waiter, Chef, etc.)
- Currently in database but not exposed in UI

### 4. Restaurant Owner Transfer
- Allow transferring ownership from one user to another
- Requires new API endpoint and UI flow

---

## API Reference

### Create User with Restaurant
```typescript
POST /api/v1/users
Authorization: Bearer {admin_token}

Request:
{
  email: string
  password: string
  firstName: string
  lastName: string
  role: "RESTAURANT_OWNER" | "RESTAURANT_STAFF"
  restaurantId: string  // UUID of restaurant
}

Response (201):
{
  success: true
  data: {
    user: {
      id: string
      email: string
      firstName: string
      lastName: string
      role: string
      // Restaurant association created automatically
    }
  }
}
```

### Add Staff to Restaurant
```typescript
POST /api/v1/restaurants/:restaurantId/staff
Authorization: Bearer {owner_or_admin_token}

Request:
{
  userId: string  // UUID of user with RESTAURANT_STAFF role
}

Response (200):
{
  success: true
  data: {
    // Staff association details
  }
}
```

### Remove Staff from Restaurant
```typescript
DELETE /api/v1/restaurants/:restaurantId/staff/:userId
Authorization: Bearer {owner_or_admin_token}

Response (200):
{
  success: true
}
```

---

## Key Takeaways

1. **Always create restaurants BEFORE creating restaurant users**
2. **Restaurant dropdown appears automatically** when you select RESTAURANT_OWNER or RESTAURANT_STAFF role
3. **Link is created automatically** during user creation (no separate step needed)
4. **Cannot change restaurant after creation** (prevents data integrity issues)
5. **Backend handles junction table** creation (RestaurantOwner or RestaurantStaff)

---

## Questions?

If users still cannot access their restaurants:
1. Check backend logs for API errors
2. Verify the `restaurantId` was included in the request
3. Check database to confirm RestaurantOwner/RestaurantStaff record exists
4. Verify user has correct role (RESTAURANT_OWNER or RESTAURANT_STAFF)
