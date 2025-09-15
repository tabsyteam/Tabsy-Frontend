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

**Request Body**:
```typescript
{
  categoryId: string        // Required - Must be valid category ID
  name: string             // Required - Item name
  description: string      // Required - Item description
  basePrice: number        // Required - Price in cents
  displayOrder: number     // Required - Display order
  status?: MenuItemStatus  // Optional - Default: AVAILABLE
  imageUrl?: string        // Optional - Image URL
  dietaryTypes?: DietaryType[]
  allergens?: AllergenType[]
  spiceLevel?: SpiceLevel
  calories?: number
  preparationTime: number  // Required - In minutes
  nutritionalInfo?: NutritionalInfo
  tags?: string[]
}
```

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

## Frontend API Client Usage

### Correct Implementation Example

```typescript
// ✅ CORRECT - Updated CreateCategoryModal
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

### Incorrect Implementation (Causes Errors)

```typescript
// ❌ INCORRECT - Will cause validation errors
const createCategory = async (data: CategoryFormData) => {
  return await tabsyClient.menu.createCategory(restaurantId, {
    menuId: '',           // ❌ Not allowed in request body
    name: data.name,
    description: data.description,
    displayOrder: data.displayOrder,
    isActive: true        // ❌ Should be 'active'
    imageUrl: data.image  // ❌ Should be 'image'
  })
}
```

---

## Summary of Key Changes Made

1. **Fixed Type Definitions**: Updated `CreateMenuCategoryRequest` and `UpdateMenuCategoryRequest` interfaces
2. **Corrected Field Names**:
   - Request: `isActive` → `active`
   - Request: `imageUrl` → `image`
   - Removed: `menuId` from request bodies
3. **Updated API Client**: Fixed CreateCategoryModal to use correct field names
4. **Maintained Compatibility**: Response interfaces still use `isActive`/`imageUrl` for frontend compatibility

These changes ensure the frontend API calls match the backend validator expectations exactly, eliminating validation errors.