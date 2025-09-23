# Tabsy Frontend API Documentation

This document provides comprehensive API documentation for the Tabsy Frontend applications, ensuring frontend implementations match backend specifications exactly.

> **Related**: For a complete list of all 86 API endpoints, see [API_ENDPOINT_AUDIT.md](./reference-docs/API_ENDPOINT_AUDIT.md)

## Overview

The Tabsy API follows REST conventions with the following base structure:
- **Base URL**: `/api/v1`
- **Authentication**: JWT Bearer tokens for protected routes
- **Content-Type**: `application/json`
- **Rate Limiting**: Applied per endpoint based on operation type

## Menu Management API

### Base Routes
All menu management endpoints are prefixed with `/api/v1/restaurants/:restaurantId`

### Authentication
- **Required Roles**: `RESTAURANT_OWNER` or `ADMIN`
- **Header**: `Authorization: Bearer <jwt_token>`

---

## Menu Categories

### 1. Get Menu Categories

```http
GET /api/v1/restaurants/:restaurantId/menu/categories
```

**Authentication**: Required (Restaurant Owner/Admin) or Guest access

**Response**:
```typescript
{
  success: boolean
  data: MenuCategory[]
  message?: string
}

interface MenuCategory {
  id: string
  menuId: string
  name: string
  description: string
  displayOrder: number
  isActive: boolean     // Note: Response uses isActive for frontend compatibility
  imageUrl?: string     // Note: Response uses imageUrl for frontend compatibility
  items: MenuItem[]
  createdAt: string
  updatedAt: string
}
```

---

### 2. Create Menu Category

```http
POST /api/v1/restaurants/:restaurantId/menu/categories
```

**Authentication**: Required (Restaurant Owner/Admin)

**Important Notes**:
- The `restaurantId` is taken from the URL parameter
- Backend automatically creates a "Default Menu" if no menus exist for the restaurant
- Backend automatically assigns the category to the appropriate menu

**Request Body**:
```typescript
{
  name: string           // Required - Category name (2-50 characters)
  description?: string   // Optional - Category description (max 200 characters)
  displayOrder?: number  // Optional - Display order (integer >= 0, default: 0)
  active?: boolean       // Optional - Active status (default: true)
  image?: string         // Optional - Image URL (must be valid URI)
}
```

**Validation Rules**:
- `name`: Required, trimmed, 2-50 characters
- `description`: Optional, allows empty string
- `image`: Must be valid URI if provided
- `displayOrder`: Must be integer >= 0
- `active`: Boolean, defaults to true

**Fields NOT Allowed** (will cause 400 error):
- ❌ `menuId` - Handled automatically by backend via route parameter
- ❌ `isActive` - Use `active` instead

**Response**:
```typescript
{
  success: boolean
  data: MenuCategory    // Created category with generated ID
  message?: string
}
```

**Example Request**:
```typescript
// ✅ Correct request
const response = await fetch('/api/v1/restaurants/rest123/menu/categories', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Appetizers',
    description: 'Delicious starters to begin your meal',
    displayOrder: 1,
    active: true
  })
})
```

---

### 3. Update Menu Category

```http
PUT /api/v1/restaurants/:restaurantId/menu/categories/:categoryId
```

**Authentication**: Required (Restaurant Owner/Admin)

**Request Body**:
```typescript
{
  name?: string
  description?: string
  displayOrder?: number
  active?: boolean      // Use 'active', not 'isActive'
  image?: string        // Use 'image', not 'imageUrl'
}
```

---

### 4. Delete Menu Category

```http
DELETE /api/v1/restaurants/:restaurantId/menu/categories/:categoryId
```

**Authentication**: Required (Restaurant Owner/Admin)

**Response**:
```typescript
{
  success: boolean
  message: string
}
```

---

## Menu Items

### 1. Get Menu Items

```http
GET /api/v1/restaurants/:restaurantId/menu/items
```

**Query Parameters**:
- `available?: boolean` - Filter by availability
- `categoryId?: string` - Filter by category
- `search?: string` - Search in name/description
- `dietary?: string[]` - Filter by dietary types
- `priceMin?: number` - Minimum price filter
- `priceMax?: number` - Maximum price filter

---

### 2. Create Menu Item

```http
POST /api/v1/restaurants/:restaurantId/menu/items
```

**Authentication**: Required (Restaurant Owner/Admin)

**Frontend-Optimized Request Body** (Recommended):
```typescript
{
  categoryId: string            // Required - Must be valid category ID
  name: string                 // Required - Item name
  description?: string         // Optional - Item description
  basePrice: number            // Required - Price (frontend semantic name)
  displayOrder?: number        // Optional - Display order (default: 0)
  status?: MenuItemStatus      // Optional - AVAILABLE/UNAVAILABLE (default: AVAILABLE)
  image?: string               // Optional - Image URL
  dietaryTypes?: DietaryType[] // Optional - Array of dietary type enums
  allergyInfo?: AllergyInfo    // Optional - Structured allergy information
  spicyLevel?: SpiceLevel      // Optional - Spice level enum (0-4)
  calories?: number            // Optional - Calorie count
  preparationTime?: number     // Optional - Time in minutes
  nutritionalInfo?: NutritionalInfo // Optional - Detailed nutrition data
  tags?: string[]              // Optional - Searchable tags
}
```

**Backend Compatibility**: The API accepts both frontend semantic field names and backend database field names:
- `basePrice` OR `price`
- `status` OR `active`
- `spicyLevel` OR `spiceLevel`
- `dietaryTypes` OR `dietaryIndicators`

The backend service layer automatically transforms frontend field names to the appropriate database format.

**Architecture Pattern**:
```
Frontend (Semantic) → API Validator (Flexible) → Service (Transform) → Database (Optimized)
   basePrice       →   accepts both     →    price     →      price
   status          →   accepts both     →    active    →      active
```

This approach provides:
- **Frontend**: Business-friendly, semantic field names
- **Backend**: Maximum compatibility and automatic transformation
- **Database**: Optimized storage format
- **Developer Experience**: Intuitive API contracts

---

## Error Handling

### Common Error Responses

**400 Bad Request - Validation Error**:
```typescript
{
  success: false
  error: {
    code: 'VALIDATION_ERROR'
    message: string
    details?: any
  }
}
```

**401 Unauthorized**:
```typescript
{
  success: false
  error: {
    code: 'UNAUTHORIZED'
    message: 'Authentication required'
  }
}
```

**403 Forbidden**:
```typescript
{
  success: false
  error: {
    code: 'FORBIDDEN'
    message: 'Insufficient permissions'
  }
}
```

**404 Not Found**:
```typescript
{
  success: false
  error: {
    code: 'NOT_FOUND'
    message: string
  }
}
```

---

## Frontend Type Definitions

### Updated Interfaces (Fixed to match backend)

```typescript
// ✅ CORRECTED - Request interfaces for API calls
export interface CreateMenuCategoryRequest {
  name: string
  description?: string
  displayOrder?: number
  active?: boolean      // Changed from isActive
  image?: string        // Changed from imageUrl
  // Note: menuId removed - handled by backend via route parameter
}

export interface UpdateMenuCategoryRequest {
  name?: string
  description?: string
  displayOrder?: number
  active?: boolean      // Changed from isActive
  image?: string        // Changed from imageUrl
}

// ✅ Response interface (keeps frontend-compatible field names)
export interface MenuCategory {
  id: string
  menuId: string
  name: string
  description: string
  displayOrder: number
  isActive: boolean     // Kept as isActive for frontend compatibility
  imageUrl?: string     // Kept as imageUrl for frontend compatibility
  items: MenuItem[]
  createdAt: string
  updatedAt: string
}
```

---

## Common Issues and Solutions

### 1. "menuId is not allowed" Error
**Problem**: Sending `menuId` in request body for category creation
**Solution**: Remove `menuId` from request body - it's handled automatically by backend

### 2. "isActive is not allowed" Error
**Problem**: Using `isActive` in request body
**Solution**: Use `active` instead of `isActive` in requests

### 3. Image URL Field Mismatch
**Problem**: Using `imageUrl` in requests vs `image` expected by backend
**Solution**: Use `image` in requests, `imageUrl` in responses

### 4. Category Creation When No Menu Exists
**Problem**: Restaurant has no menus yet
**Solution**: Backend automatically creates "Default Menu" - no frontend action needed

---

## Table Management API

### Base Routes
All table management endpoints are prefixed with `/api/v1/restaurants/:restaurantId/tables`

### Authentication
- **Required Roles**: `RESTAURANT_OWNER`, `RESTAURANT_STAFF`, or `ADMIN`
- **Header**: `Authorization: Bearer <jwt_token>`

---

### Get Table Sessions

```http
GET /api/v1/restaurants/:restaurantId/tables/:tableId/sessions
```

**Authentication**: Required (Restaurant Owner/Staff/Admin)

**Description**: Retrieves session status information for a specific table, including active guest sessions and cleanup recommendations.

**URL Parameters**:
- `restaurantId` (string, required) - The restaurant identifier
- `tableId` (string, required) - The table identifier

**Response**:
```typescript
{
  success: boolean
  data: {
    tableId: string
    restaurantId: string
    sessionStatus: {
      needsAttention: boolean
      activeSessions: number
      oldSessions: number
      recommendations: string[]
    }
    activeSessions: Array<{
      sessionId: string
      createdAt: string
      expiresAt: string
      ageMinutes: number
      isOld: boolean
    }>
    totalActiveSessions: number
  }
  message: string
}
```

**Use Cases**:
- Restaurant staff checking table cleanup status
- Identifying tables with old/stale guest sessions
- Monitoring active customer sessions per table

**Example Frontend Usage**:
```typescript
// Get session status for a table
const sessionStatus = await tabsyClient.table.getSessions(restaurantId, tableId)

if (sessionStatus.data.sessionStatus.needsAttention) {
  // Show cleanup recommendations to staff
  console.log('Recommendations:', sessionStatus.data.sessionStatus.recommendations)
}
```

**Backend Route Issue**:
> **Note**: Currently there's a mismatch in the backend route definition. The route should be `/:restaurantId/tables/:tableId/sessions` but is currently defined as `/:tableId/sessions` in `restaurantTable.ts:113`. This needs to be fixed in the backend to match the controller expectations.

---

## Frontend API Client Usage

### Correct Implementation Example

```typescript
// ✅ CORRECT - Frontend uses semantic field names
const createMenuItem = async (data: MenuItemFormData) => {
  const requestBody = {
    name: data.name.trim(),
    description: data.description.trim(),
    basePrice: data.basePrice,              // Frontend semantic name
    categoryId: data.categoryId,
    displayOrder: data.displayOrder,
    status: data.active ? 'AVAILABLE' : 'UNAVAILABLE', // Frontend enum
    dietaryTypes: data.dietaryTypes,        // Frontend typed array
    allergyInfo: data.allergyInfo,
    spicyLevel: data.spicyLevel,            // Frontend enum
    preparationTime: data.preparationTime,
    nutritionalInfo: data.nutritionalInfo,
    tags: data.tags
  }

  return await tabsyClient.menu.createItem(restaurantId, requestBody)
}

// ✅ CORRECT - Category creation
const createCategory = async (data: CategoryFormData) => {
  const requestBody = {
    name: data.name.trim(),
    displayOrder: data.displayOrder,
    active: true
  }

  if (data.description.trim()) {
    requestBody.description = data.description.trim()
  }

  return await tabsyClient.menu.createCategory(restaurantId, requestBody)
}
```

### Legacy Implementation (Not Recommended)

```typescript
// ⚠️ LEGACY - Backend field names (still works but not semantic)
const createMenuItem = async (data: MenuItemFormData) => {
  return await tabsyClient.menu.createItem(restaurantId, {
    name: data.name,
    price: data.basePrice,              // Backend field name
    active: data.active,                // Backend boolean
    dietaryIndicators: data.dietaryTypes, // Backend field name
    spicyLevel: data.spicyLevel,        // Backend field name
    // Missing: preparationTime, nutritionalInfo, tags (harder to work with)
  })
}

// ❌ OLD INCORRECT - Before validator update
const createMenuItem = async (data: MenuItemFormData) => {
  return await tabsyClient.menu.createItem(restaurantId, {
    basePrice: data.basePrice,    // ❌ Old validator rejected this
    status: 'AVAILABLE',          // ❌ Old validator rejected this
    preparationTime: 15,          // ❌ Old validator rejected this
    // Would cause: "basePrice is not allowed, status is not allowed, preparationTime is not allowed"
  })
}
```

---

## Notification Management API

### Base Routes
All notification endpoints are prefixed with `/api/v1/notifications`

### Authentication
- **Required**: JWT Bearer token for protected routes
- **Header**: `Authorization: Bearer <jwt_token>`

---

### 1. Get User Notifications

```http
GET /api/v1/notifications
```

**Authentication**: Required

**Query Parameters**:
- `page?: number` - Page number (default: 1)
- `limit?: number` - Items per page (default: 20)
- `unreadOnly?: boolean` - Filter to unread notifications only (default: false)

**Response**:
```typescript
{
  success: boolean
  data: Notification[]
  meta: {
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}

interface Notification {
  id: string
  recipientId?: string
  type: 'ORDER_STATUS' | 'PAYMENT_STATUS' | 'ASSISTANCE_REQUIRED' | 'SYSTEM' | 'MARKETING'
  content: string
  metadata: {
    restaurantId?: string
    tableId?: string
    orderId?: string
    paymentId?: string
    priority?: 'high' | 'medium' | 'low'
    expiresAt?: string
    actionUrl?: string
    [key: string]: any
  }
  isRead: boolean
  createdAt: string
  updatedAt: string
}
```

---

### 2. Create Notification

```http
POST /api/v1/notifications
```

**Authentication**: Required (`ADMIN`, `RESTAURANT_OWNER`, `RESTAURANT_STAFF`)

**Request Body**:
```typescript
{
  recipientId?: string                 // Optional - allows system/broadcast notifications
  type: NotificationType              // Required - notification type enum
  content: string                     // Required - message content (max 500 characters)
  metadata?: {
    restaurantId?: string
    tableId?: string
    orderId?: string
    paymentId?: string
    priority?: 'high' | 'medium' | 'low'
    expiresAt?: string              // ISO date string
    actionUrl?: string
    [key: string]: any
  }
  isSystem?: boolean                  // Optional - default: false
}
```

**Response**:
```typescript
{
  success: boolean
  data: Notification    // Created notification with generated ID
  message?: string
}
```

---

### 3. Mark Notification as Read

```http
PATCH /api/v1/notifications/:id
```

**Authentication**: Required

**Request**: No body required (automatically sets `isRead: true`)

**Response**:
```typescript
{
  success: boolean
  data: Notification    // Updated notification
  message?: string
}
```

---

### 4. Clear All Notifications

```http
DELETE /api/v1/notifications
```

**Authentication**: Required

**Note**: This marks all notifications as read rather than deleting them

**Response**:
```typescript
{
  success: boolean
  data: { cleared: number }    // Number of notifications cleared
  message?: string
}
```

---

### 5. Get Notification Preferences

```http
GET /api/v1/notifications/preferences
```

**Authentication**: Required

**Response**:
```typescript
{
  success: boolean
  data: NotificationPreferences
}

interface NotificationPreferences {
  email: boolean
  sms: boolean
  push: boolean
  orderUpdates: boolean
  paymentUpdates: boolean
  promotions: boolean
}
```

---

### 6. Update Notification Preferences

```http
PUT /api/v1/notifications/preferences
```

**Authentication**: Required

**Request Body**:
```typescript
Partial<NotificationPreferences>
```

**Response**:
```typescript
{
  success: boolean
  data: NotificationPreferences    // Updated preferences
  message?: string
}
```

---

### 7. Test Notification

```http
POST /api/v1/notifications/test
```

**Authentication**: Required

**Request Body**:
```typescript
{
  type: 'EMAIL' | 'PUSH' | 'SMS'
  recipient: string
  template: string
  data?: Record<string, any>
}
```

**Response**:
```typescript
{
  success: boolean
  data: void
  message?: string
}
```

---

### Real-time Features

The notification system includes WebSocket support for real-time updates:

**WebSocket Namespaces**:
- `/restaurant` - For authenticated restaurant staff/admin
- `/customer` - For anonymous table customers

**Events**:
- `notification:created` - New notification received
- `notification:read` - Notification marked as read
- `notification:dismissed` - Notification dismissed
- `notification:cleared` - All notifications cleared

---

### Frontend Implementation Notes

1. **Paginated Responses**: All notification list endpoints return paginated data with metadata
2. **Filtering**: Backend only supports `page`, `limit`, and `unreadOnly` query parameters
3. **Type Safety**: Use the `NotificationType` enum for consistent type values
4. **Error Handling**: Handle network errors gracefully with fallback data
5. **Real-time Updates**: Consider implementing WebSocket listeners for live updates

**Frontend Hook Usage**:
```typescript
// Get notifications with pagination support
const { data: notificationsData } = notificationHooks.useUserNotifications({
  limit: 10,
  unreadOnly: false
})

// Access notifications and pagination info
const notifications = notificationsData?.notifications || []
const pagination = notificationsData?.pagination
const total = notificationsData?.total || 0
```

---

---

## Authentication & Authorization API

### Base Routes
All authentication endpoints are prefixed with `/api/v1/auth`

---

### 1. User Registration

```http
POST /api/v1/auth/register
```

**Authentication**: Not required

**Request Body**:
```typescript
{
  email: string              // Required - User email
  password: string           // Required - User password (min 8 characters)
  firstName: string          // Required - User first name
  lastName: string           // Required - User last name
  role?: UserRole           // Optional - Default: CUSTOMER
  phone?: string            // Optional - User phone number
}
```

**Response**:
```typescript
{
  success: boolean
  data: {
    user: User
    tokens: {
      accessToken: string
      refreshToken: string
      expiresIn: number
    }
  }
  message?: string
}
```

---

### 2. User Login

```http
POST /api/v1/auth/login
```

**Authentication**: Not required

**Request Body**:
```typescript
{
  email: string              // Required - User email
  password: string           // Required - User password
}
```

**Response**:
```typescript
{
  success: boolean
  data: {
    user: User
    tokens: {
      accessToken: string
      refreshToken: string
      expiresIn: number
    }
  }
  message?: string
}
```

---

### 3. Refresh Token

```http
POST /api/v1/auth/refresh-token
```

**Authentication**: Refresh token required

**Request Body**:
```typescript
{
  refreshToken: string       // Required - Valid refresh token
}
```

**Response**:
```typescript
{
  success: boolean
  data: {
    accessToken: string
    refreshToken: string
    expiresIn: number
  }
  message?: string
}
```

---

### 4. User Logout

```http
POST /api/v1/auth/logout
```

**Authentication**: Required (Bearer token)

**Response**:
```typescript
{
  success: boolean
  message: string
}
```

---

### 5. Token Validation

```http
GET /api/v1/auth/validate
```

**Authentication**: Required (Bearer token)

**Response**:
```typescript
{
  success: boolean
  data: {
    valid: boolean
    user: User
    expiresAt: string
  }
  message?: string
}
```

---

## Session Management API

### Base Routes
All session endpoints are prefixed with `/api/v1/sessions`

---

### 1. Create Guest Session

```http
POST /api/v1/sessions/guest
```

**Authentication**: Not required

**Request Body**:
```typescript
{
  qrCode: string            // Required - QR code from table
  tableId: string           // Required - Table identifier
  restaurantId: string      // Required - Restaurant identifier
  customerInfo?: {
    name?: string
    phone?: string
    email?: string
  }
}
```

**Response**:
```typescript
{
  success: boolean
  data: {
    sessionId: string
    tableId: string
    restaurantId: string
    expiresAt: string
  }
  message?: string
}
```

---

### 2. Validate Session

```http
GET /api/v1/sessions/:sessionId/validate
```

**Authentication**: Not required

**Response**:
```typescript
{
  success: boolean
  data: {
    valid: boolean
    sessionId: string
    tableId: string
    restaurantId: string
    expiresAt: string
  }
  message?: string
}
```

---

### 3. Get Session Details

```http
GET /api/v1/sessions/:sessionId
```

**Authentication**: Session required

**Response**:
```typescript
{
  success: boolean
  data: {
    sessionId: string
    tableId: string
    restaurantId: string
    expiresAt: string
    createdAt: string
  }
  message?: string
}
```

---

### 4. Extend Session

```http
PATCH /api/v1/sessions/:sessionId
```

**Authentication**: Session required

**Request Body**:
```typescript
{
  action: 'extend'          // Required - Only 'extend' is supported
}
```

**Response**:
```typescript
{
  success: boolean
  data: {
    sessionId: string
    expiresAt: string
  }
  message?: string
}
```

---

### 5. End Session

```http
DELETE /api/v1/sessions/:sessionId
```

**Authentication**: Session required

**Response**:
```typescript
{
  success: boolean
  data: null
  message: string
}
```

---

## QR Code Access API

### Base Routes
All QR code endpoints are prefixed with `/api/v1/qr`

---

### 1. Get Table Information by QR Code

```http
GET /api/v1/qr/:qrCode
```

**Authentication**: Not required (Public endpoint)

**Response**:
```typescript
{
  success: boolean
  data: {
    table: Table
    restaurant: Restaurant
    isActive: boolean
  }
  message?: string
}

interface Table {
  id: string
  number: string
  restaurantId: string
  qrCode: string
  status: TableStatus
  seats: number
  shape: TableShape
}

interface Restaurant {
  id: string
  name: string
  description: string
  logoUrl?: string
  theme?: string
}
```

---

### 2. Create Guest Session from QR Code

```http
POST /api/v1/qr/session
```

**Authentication**: Not required

**Request Body**:
```typescript
{
  qrCode: string            // Required - QR code from table
  tableId: string           // Required - Table identifier
  restaurantId: string      // Required - Restaurant identifier
}
```

**Response**:
```typescript
{
  success: boolean
  data: {
    sessionId: string
    tableId: string
    restaurantId: string
    expiresAt: string
  }
  message?: string
}
```

---

## User Management API

### Base Routes
All user endpoints are prefixed with `/api/v1/users`

### Authentication
- **Required Roles**: `ADMIN` for most endpoints
- **Header**: `Authorization: Bearer <jwt_token>`

---

### 1. Get Current User

```http
GET /api/v1/users/me
```

**Authentication**: Required (Any authenticated user)

**Response**:
```typescript
{
  success: boolean
  data: User
  message?: string
}
```

---

### 2. List Users (Admin Only)

```http
GET /api/v1/users
```

**Authentication**: Required (Admin only)

**Query Parameters**:
- `page?: number` - Page number (default: 1)
- `limit?: number` - Items per page (default: 20)
- `role?: UserRole` - Filter by user role
- `search?: string` - Search by name or email

**Response**:
```typescript
{
  success: boolean
  data: User[]
  meta: {
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}
```

---

### 3. Create User (Admin Only)

```http
POST /api/v1/users
```

**Authentication**: Required (Admin only)

**Request Body**:
```typescript
{
  email: string
  password: string
  firstName: string
  lastName: string
  role: UserRole
  phone?: string
  restaurantId?: string     // Required for restaurant staff/owners
}
```

---

### 4. Get User by ID (Admin Only)

```http
GET /api/v1/users/:id
```

**Authentication**: Required (Admin only)

---

### 5. Update User (Admin Only)

```http
PUT /api/v1/users/:id
```

**Authentication**: Required (Admin only)

---

### 6. Delete User (Admin Only)

```http
DELETE /api/v1/users/:id
```

**Authentication**: Required (Admin only)

---

## Order Management API

### Base Routes
All order endpoints are prefixed with `/api/v1/orders`

---

### 1. List Orders

```http
GET /api/v1/orders
```

**Authentication**: Required (Admin, Restaurant Owner, Restaurant Staff)

**Query Parameters**:
- `restaurantId?: string` - Filter by restaurant
- `status?: OrderStatus` - Filter by order status
- `dateFrom?: string` - Start date filter (ISO string)
- `dateTo?: string` - End date filter (ISO string)
- `page?: number` - Page number (default: 1)
- `limit?: number` - Items per page (default: 20)

---

### 2. Get Order by ID

```http
GET /api/v1/orders/:id
```

**Authentication**: Required (User or Guest session)

---

### 3. Create Order

```http
POST /api/v1/orders
```

**Authentication**: Required (User or Guest session)

**Request Body**:
```typescript
{
  restaurantId: string
  tableId: string
  items: Array<{
    menuItemId: string
    quantity: number
    options?: Array<{
      optionId: string
      valueId: string
    }>
    specialInstructions?: string
  }>
  specialInstructions?: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
}
```

---

### 4. Update Order

```http
PUT /api/v1/orders/:id
```

**Authentication**: Required (Restaurant staff or order owner)

---

### 5. Cancel Order

```http
DELETE /api/v1/orders/:id
```

**Authentication**: Required (Restaurant staff or order owner)

---

### 6. Add Order Item

```http
POST /api/v1/orders/:id/items
```

**Authentication**: Required (Restaurant staff or order owner)

---

### 7. Update Order Item

```http
PUT /api/v1/orders/:id/items/:itemId
```

**Authentication**: Required (Restaurant staff or order owner)

---

### 8. Remove Order Item

```http
DELETE /api/v1/orders/:id/items/:itemId
```

**Authentication**: Required (Restaurant staff or order owner)

---

## Payment Processing API

### Base Routes
All payment endpoints are prefixed with `/api/v1/payments`

---

### 1. Create Payment Intent

```http
POST /api/v1/payments/intent
```

**Authentication**: Required (User or Guest session)

**Request Body**:
```typescript
{
  orderId: string
  amount: number            // Amount in cents
  currency?: string         // Default: 'usd'
  paymentMethodId?: string  // Stripe payment method ID
}
```

---

### 2. Get Payment by ID

```http
GET /api/v1/payments/:id
```

**Authentication**: Required (User or Guest session)

---

### 3. Update Payment Status

```http
PUT /api/v1/payments/:id/status
```

**Authentication**: Required (Admin or Stripe webhook)

---

### 4. Add Tip to Payment

```http
PATCH /api/v1/payments/:id
```

**Authentication**: Required (Payment owner)

**Request Body**:
```typescript
{
  tipAmount: number         // Tip amount in cents
}
```

---

### 5. Record Cash Payment

```http
POST /api/v1/payments/cash
```

**Authentication**: Required (Restaurant staff)

---

### 6. Create Split Payment

```http
POST /api/v1/payments/split
```

**Authentication**: Required (User or Guest session)

---

### 7. Get Split Payments

```http
GET /api/v1/payments/split/:groupId
```

**Authentication**: Required (User or Guest session)

---

### 8. Generate Receipt

```http
GET /api/v1/payments/:id/receipt
```

**Authentication**: Required (Payment owner)

---

### 9. Delete Payment (Admin Only)

```http
DELETE /api/v1/payments/:id
```

**Authentication**: Required (Admin only)

---

### 10. Stripe Webhook Handler

```http
POST /api/v1/payments/webhooks/stripe
```

**Authentication**: Stripe webhook signature verification

---

## Health & Monitoring API

### Base Routes
Health endpoints are mounted at root level (not under `/api/v1`)

---

### 1. Health Check

```http
GET /health
```

**Authentication**: Not required

**Response**:
```typescript
{
  success: boolean
  data: {
    status: 'healthy' | 'unhealthy' | 'degraded'
    timestamp: string
    version: string
    uptime: number
    database: {
      connected: boolean
      latency: number
    }
    redis: {
      connected: boolean
      latency: number
    }
    services: {
      stripe: boolean
      notifications: boolean
      websocket: boolean
    }
  }
}
```

---

### 2. Readiness Probe

```http
GET /ready
```

**Authentication**: Not required

**Response**:
```typescript
{
  success: boolean
  data: {
    ready: boolean
  }
}
```

---

### 3. Liveness Probe

```http
GET /live
```

**Authentication**: Not required

**Response**:
```typescript
{
  success: boolean
  data: {
    alive: boolean
  }
}
```

---

## Feedback Management API

### Base Routes
All feedback management endpoints are prefixed with `/api/v1`

### Authentication
- **Guest Access**: Allowed for creating feedback
- **Restaurant Owner/Admin**: Required for viewing restaurant feedback
- **Admin**: Required for moderation features
- **Header**: `Authorization: Bearer <jwt_token>` (when authenticated)

---

### 1. Create Feedback

```http
POST /api/v1/feedback
```

**Authentication**: Optional (Guest session or authenticated user)

**Important Notes**:
- Guest sessions can submit anonymous feedback using sessionId
- Authenticated users have feedback linked to their account
- Photos must be uploaded separately using the photo upload endpoint
- Feedback can be linked to a specific order or just restaurant/table

**Request Body**:
```typescript
{
  orderId?: string          // Optional - Link to specific order
  restaurantId: string      // Required - Restaurant being reviewed
  tableId?: string          // Optional - Table context
  overallRating: number     // Required - 1-5 star rating
  categories: {             // Optional - Category-specific ratings
    food?: number           // 1-5 star rating for food quality
    service?: number        // 1-5 star rating for service
    speed?: number          // 1-5 star rating for speed
    value?: number          // 1-5 star rating for value for money
  }
  quickFeedback?: string[]  // Optional - Array of predefined feedback tags
  comment?: string          // Optional - Written feedback (max 1000 characters)
  photos?: {                // Optional - Photo metadata (files uploaded separately)
    id: string
    filename: string
    size: number
    type: string
  }[]
  guestInfo?: {             // Optional - Guest contact details for follow-up
    name?: string
    email?: string
    phone?: string
  }
}
```

**Validation Rules**:
- `restaurantId`: Required, must be valid restaurant ID
- `overallRating`: Required, integer 1-5
- `categories.*`: Optional, integer 1-5 if provided
- `comment`: Max 1000 characters, sanitized for HTML/scripts
- `photos`: Max 5 photos, each max 5MB

**Response**:
```typescript
{
  success: boolean
  data: {
    id: string
    orderId?: string
    restaurantId: string
    tableId?: string
    userId?: string          // If authenticated user
    sessionId?: string       // If guest session
    overallRating: number
    categories: {
      food?: number
      service?: number
      speed?: number
      value?: number
    }
    quickFeedback?: string[]
    comment?: string
    photos?: FeedbackPhoto[]
    guestInfo?: {
      name?: string
      email?: string
      phone?: string
    }
    status: 'PENDING' | 'APPROVED' | 'FLAGGED' | 'HIDDEN'
    createdAt: string
    updatedAt: string
  }
  message?: string
}
```

---

### 2. Get Feedback by ID

```http
GET /api/v1/feedback/:feedbackId
```

**Authentication**: Optional (Public feedback, private details require ownership or restaurant access)

**Response**:
```typescript
{
  success: boolean
  data: Feedback    // Full feedback details
  message?: string
}
```

---

### 3. Get Restaurant Feedback

```http
GET /api/v1/restaurants/:restaurantId/feedback
```

**Authentication**: Required (Restaurant Owner/Admin)

**Query Parameters**:
```typescript
{
  page?: number             // Page number (default: 1)
  limit?: number            // Items per page (default: 20, max: 100)
  rating?: number           // Filter by rating (1-5)
  startDate?: string        // Filter by date range (ISO string)
  endDate?: string          // Filter by date range (ISO string)
  status?: 'PENDING' | 'APPROVED' | 'FLAGGED' | 'HIDDEN'
  hasComment?: boolean      // Filter feedback with/without comments
  hasPhotos?: boolean       // Filter feedback with/without photos
  tableId?: string          // Filter by specific table
  orderId?: string          // Filter by specific order
}
```

**Response**:
```typescript
{
  success: boolean
  data: {
    feedback: Feedback[]
    pagination: {
      total: number
      page: number
      limit: number
      totalPages: number
    }
    stats: {
      averageRating: number
      totalCount: number
      ratingDistribution: {
        1: number
        2: number
        3: number
        4: number
        5: number
      }
    }
  }
  message?: string
}
```

---

### 4. Get Feedback Statistics

```http
GET /api/v1/restaurants/:restaurantId/feedback/stats
```

**Authentication**: Required (Restaurant Owner/Admin)

**Query Parameters**:
```typescript
{
  startDate?: string        // Date range for stats (ISO string)
  endDate?: string          // Date range for stats (ISO string)
  groupBy?: 'day' | 'week' | 'month'  // Group statistics by period
}
```

**Response**:
```typescript
{
  success: boolean
  data: {
    overview: {
      totalFeedback: number
      averageRating: number
    }
    ratings: {
      overall: {
        average: number
        distribution: { 1: number, 2: number, 3: number, 4: number, 5: number }
      }
      categories: {
        food: { average: number, count: number }
        service: { average: number, count: number }
        speed: { average: number, count: number }
        value: { average: number, count: number }
      }
    }
    trends: {
      period: string
      averageRating: number
      feedbackCount: number
    }[]
    quickFeedback: {
      positive: { tag: string, count: number }[]
      negative: { tag: string, count: number }[]
      neutral: { tag: string, count: number }[]
    }
    photos: {
      totalPhotos: number
      recentPhotos: FeedbackPhoto[]  // Last 10 photos
    }
  }
  message?: string
}
```

---

### 5. Upload Feedback Photos

```http
POST /api/v1/feedback/photos
```

**Authentication**: Optional (Guest session or authenticated user)

**Important Notes**:
- Supports multipart/form-data for file uploads
- Photos are uploaded before feedback submission
- Returns photo IDs that can be referenced in feedback creation
- Implements virus scanning and content moderation

**Request**: Multipart form data
```typescript
{
  files: File[]             // Array of image files
  feedbackId?: string       // Optional - Link to existing feedback
}
```

**Validation Rules**:
- Max 5 files per request
- Each file max 5MB
- Supported formats: JPEG, PNG, WebP
- Images are resized/optimized on upload

**Response**:
```typescript
{
  success: boolean
  data: {
    id: string
    filename: string
    originalName: string
    size: number
    type: string
    url: string             // Public URL for viewing
    thumbnailUrl: string    // Optimized thumbnail URL
    uploadedAt: string
  }[]
  message?: string
}
```

---

### 6. Delete Feedback Photo

```http
DELETE /api/v1/feedback/photos/:photoId
```

**Authentication**: Required (Photo owner, restaurant owner, or admin)

**Response**:
```typescript
{
  success: boolean
  message: string
}
```

---


### 7. Flag Feedback

```http
POST /api/v1/feedback/:feedbackId/flag
```

**Authentication**: Required (Restaurant owner, admin, or authenticated user)

**Request Body**:
```typescript
{
  reason: 'INAPPROPRIATE' | 'SPAM' | 'FAKE' | 'OFFENSIVE' | 'OTHER'
  details?: string          // Additional context for the flag
}
```

**Response**:
```typescript
{
  success: boolean
  message: string
}
```

---

### Frontend Type Definitions

```typescript
interface CreateFeedbackRequest {
  orderId?: string
  restaurantId: string
  tableId?: string
  overallRating: number
  categories?: {
    food?: number
    service?: number
    speed?: number
    value?: number
  }
  quickFeedback?: string[]
  comment?: string
  photos?: {
    id: string
    filename: string
    size: number
    type: string
  }[]
  guestInfo?: {
    name?: string
    email?: string
    phone?: string
  }
}

interface Feedback {
  id: string
  orderId?: string
  restaurantId: string
  tableId?: string
  userId?: string
  sessionId?: string
  overallRating: number
  categories?: {
    food?: number
    service?: number
    speed?: number
    value?: number
  }
  quickFeedback?: string[]
  comment?: string
  photos?: FeedbackPhoto[]
  guestInfo?: {
    name?: string
    email?: string
    phone?: string
  }
  status: 'PENDING' | 'APPROVED' | 'FLAGGED' | 'HIDDEN'
  flagged?: {
    reason: string
    details?: string
    flaggedAt: string
    flaggedBy: string
  }
  createdAt: string
  updatedAt: string
}

interface FeedbackPhoto {
  id: string
  filename: string
  originalName: string
  size: number
  type: string
  url: string
  thumbnailUrl: string
  uploadedAt: string
}

interface FeedbackStats {
  overview: {
    totalFeedback: number
    averageRating: number
    responseRate: number
  }
  ratings: {
    overall: {
      average: number
      distribution: Record<number, number>
    }
    categories: {
      food: { average: number, count: number }
      service: { average: number, count: number }
      speed: { average: number, count: number }
      value: { average: number, count: number }
    }
  }
  trends: {
    period: string
    averageRating: number
    feedbackCount: number
  }[]
  quickFeedback: {
    positive: { tag: string, count: number }[]
    negative: { tag: string, count: number }[]
    neutral: { tag: string, count: number }[]
  }
  photos: {
    totalPhotos: number
    recentPhotos: FeedbackPhoto[]
  }
}
```

---

### Common Issues and Solutions

#### 1. Photo Upload Failures
- **Issue**: Large files or unsupported formats
- **Solution**: Implement client-side validation and image compression
- **Frontend**: Show progress indicators and file size warnings

#### 2. Guest Session Management
- **Issue**: Lost session during feedback submission
- **Solution**: Persist session ID in sessionStorage and implement retry logic
- **Frontend**: Auto-restore session and graceful error handling

#### 3. Feedback Validation
- **Issue**: Missing required fields or invalid data
- **Solution**: Comprehensive client and server-side validation
- **Frontend**: Real-time validation with clear error messages

#### 4. Content Moderation
- **Issue**: Inappropriate feedback content
- **Solution**: Automated content filtering and manual review queue
- **Backend**: Implement profanity filters and image content analysis

---

## Summary of API Coverage

The Tabsy Frontend now has complete API client coverage for all **86 backend endpoints** across:

✅ **Authentication & Authorization** (6 endpoints)
✅ **Session Management** (5 endpoints)
✅ **QR Code Access** (2 endpoints)
✅ **User Management** (6 endpoints)
✅ **Restaurant Management** (9 endpoints)
✅ **Menu Management** (13 endpoints)
✅ **Table Management** (11 endpoints)
✅ **Order Management** (8 endpoints)
✅ **Payment Processing** (10 endpoints)
✅ **Notification System** (7 endpoints)
✅ **Menu Item Options** (2 endpoints)
✅ **Health & Monitoring** (3 endpoints)

### Key Improvements Made

1. **Eliminated All Mock Data**: Removed hardcoded test data and mock fallbacks
2. **Fixed API Inconsistencies**: Updated request/response types to match backend exactly
3. **Added Missing Endpoints**: Implemented all 86 backend endpoints in frontend
4. **Improved Error Handling**: Standardized error responses across all endpoints
5. **Enhanced Type Safety**: Added comprehensive TypeScript interfaces
6. **Updated Documentation**: Complete API reference covering all endpoints

The frontend API client now provides 100% coverage of the backend API with no mock data remaining.