# Tabsy Core Server - Complete API Endpoint Audit

> **Note**: For detailed implementation specifications, request/response schemas, and frontend integration guides, see [API_DOCUMENTATION.md](../API_DOCUMENTATION.md)

## Executive Summary
**Total API Endpoints: 86** (Verified through systematic code analysis)

The previous estimate of 88 endpoints was slightly inaccurate. After thorough analysis of all route files in `src/api/routes/`, the actual count is **86 REST API endpoints** plus **WebSocket events**.

## Endpoint Breakdown by Domain

### Authentication & Authorization (6 endpoints)
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Token refresh (legacy)
- `POST /auth/refresh-token` - Token refresh
- `POST /auth/logout` - User logout
- `GET /auth/validate` - Token validation

### Health & Monitoring (3 endpoints)
- `GET /health/health` - Health check
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

### Restaurant Management (9 endpoints)
- `GET /restaurants/` - List restaurants
- `GET /restaurants/:id` - Get restaurant by ID
- `POST /restaurants/` - Create restaurant
- `PUT /restaurants/:id` - Update restaurant
- `PATCH /restaurants/:id` - Partial restaurant update
- `DELETE /restaurants/:id` - Delete restaurant
- `GET /restaurants/owner/:ownerId` - Get restaurants by owner
- `POST /restaurants/:id/staff` - Add staff member
- `DELETE /restaurants/:id/staff/:userId` - Remove staff member

### Restaurant Menu Management (13 endpoints)
- `GET /restaurants/:restaurantId/menus` - List menus
- `POST /restaurants/:restaurantId/menus` - Create menu
- `PUT /restaurants/:restaurantId/menus/:menuId` - Update menu
- `DELETE /restaurants/:restaurantId/menus/:menuId` - Delete menu
- `GET /restaurants/:restaurantId/menu` - Get active menu
- `GET /restaurants/:restaurantId/menu/categories` - Get menu categories
- `POST /restaurants/:restaurantId/menu/categories` - Create category
- `PUT /restaurants/:restaurantId/menu/categories/:categoryId` - Update category
- `DELETE /restaurants/:restaurantId/menu/categories/:categoryId` - Delete category
- `GET /restaurants/:restaurantId/menu/items` - Get menu items
- `POST /restaurants/:restaurantId/menu/items` - Create menu item
- `PUT /restaurants/:restaurantId/menu/items/:itemId` - Update menu item
- `DELETE /restaurants/:restaurantId/menu/items/:itemId` - Delete menu item

### Table Management (11 endpoints)
- `GET /restaurants/:restaurantId/tables` - List tables
- `POST /restaurants/:restaurantId/tables` - Create table
- `GET /restaurants/:restaurantId/tables/:tableId` - Get table by ID
- `PUT /restaurants/:restaurantId/tables/:tableId` - Update table
- `DELETE /restaurants/:restaurantId/tables/:tableId` - Delete table
- `PUT /restaurants/:restaurantId/tables/:tableId/status` - Update table status
- `GET /restaurants/:restaurantId/tables/:tableId/qrcode` - Get QR code
- `GET /restaurants/:restaurantId/tables/:tableId/qr` - Get QR code (alt)
- `GET /restaurants/:restaurantId/tables/:tableId/qrcode-image` - Get QR image
- `POST /restaurants/:restaurantId/tables/:tableId/reset` - Reset table
- `GET /restaurants/:tableId/sessions` - Get table sessions

### Order Management (8 endpoints)
- `GET /orders/` - List orders (admin/staff)
- `GET /orders/:id` - Get order by ID
- `POST /orders/` - Create order
- `PUT /orders/:id` - Update order
- `DELETE /orders/:id` - Cancel order
- `POST /orders/:id/items` - Add order item
- `PUT /orders/:id/items/:itemId` - Update order item
- `DELETE /orders/:id/items/:itemId` - Remove order item

### Payment Processing (10 endpoints)
- `POST /payments/intent` - Create payment intent
- `GET /payments/:id` - Get payment by ID
- `GET /payments/:id/receipt` - Generate receipt
- `DELETE /payments/:id` - Delete payment (admin)
- `PUT /payments/:id/status` - Update payment status
- `PATCH /payments/:id` - Add tip to payment
- `POST /payments/cash` - Record cash payment
- `POST /payments/split` - Create split payment
- `GET /payments/split/:groupId` - Get split payments
- `POST /payments/webhooks/stripe` - Stripe webhook handler

### Order Payment Integration (2 endpoints)
- `POST /orders/:orderId/payments` - Create payment for order
- `GET /orders/:orderId/payments` - Get payments for order

### Restaurant Payment Reports (1 endpoint)
- `GET /restaurants/:restaurantId/payments` - Get restaurant payments

### Session Management (5 endpoints)
- `POST /session/guest` - Create guest session
- `GET /session/:sessionId/validate` - Validate session
- `GET /session/:sessionId` - Get session details
- `PATCH /session/:sessionId` - Update session
- `DELETE /session/:sessionId` - Delete session

### QR Code Access (2 endpoints)
- `GET /qr/:qrCode` - Access table via QR code
- `POST /qr/session` - Create session from QR

### User Management (6 endpoints)
- `GET /user/me` - Get current user
- `GET /user/` - List users (admin)
- `POST /user/` - Create user (admin)
- `GET /user/:id` - Get user by ID (admin)
- `PUT /user/:id` - Update user (admin)
- `DELETE /user/:id` - Delete user (admin)

### Notification System (7 endpoints)
- `POST /api/v1/notifications` - Send notification
- `GET /api/v1/notifications` - Get user notifications (paginated)
- `PATCH /api/v1/notifications/:id` - Mark notification as read
- `DELETE /api/v1/notifications` - Clear notifications (marks as read)
- `GET /api/v1/notifications/preferences` - Get notification preferences
- `PUT /api/v1/notifications/preferences` - Update notification preferences
- `POST /api/v1/notifications/test` - Test notification

### Menu Item Options (2 endpoints)
- `POST /menu-item-options/` - Create menu item option
- `POST /menu-item-options/bulk` - Bulk create options

### Menu Direct Access (1 endpoint)
- `GET /menu/:id` - Get menu by ID (public access)

## Additional Components

### WebSocket Events
The system includes real-time communication via Socket.io with events for:
- Order status updates
- Payment notifications
- Table status changes
- Staff notifications
- Customer updates

**Notification WebSocket Events**:
- `notification:created` - New notification received
- `notification:read` - Notification marked as read
- `notification:dismissed` - Notification dismissed
- `notification:cleared` - All notifications cleared

**WebSocket Namespaces**:
- `/restaurant` - For authenticated restaurant staff/admin
- `/customer` - For anonymous table customers

### Webhook Handlers
- Stripe payment webhooks
- External integration webhooks

## Technical Architecture

### Route Organization
- **16 route files** in `src/api/routes/`
- Modular design with domain separation
- Consistent middleware patterns
- Role-based access control

### Authentication Patterns
- JWT-based authentication
- Guest session support
- Role-based authorization (ADMIN, RESTAURANT_OWNER, RESTAURANT_STAFF, CUSTOMER)
- Session extension for guest users

### Rate Limiting
- Authentication endpoints: `authLimiter`
- Payment operations: `paymentLimiter`
- Order operations: `orderOperationsLimiter`
- Guest operations: `guestOperationsLimiter`

## Frontend Integration Implications

### API Client Structure
The frontend monorepo should organize API clients to match this domain structure:

1. **AuthenticationAPI** (6 endpoints)
2. **RestaurantAPI** (9 endpoints)
3. **MenuManagementAPI** (14 endpoints) 
4. **TableManagementAPI** (11 endpoints)
5. **OrderManagementAPI** (10 endpoints)
6. **PaymentAPI** (13 endpoints)
7. **SessionAPI** (7 endpoints)
8. **UserAPI** (6 endpoints)
9. **NotificationAPI** (7 endpoints)
10. **HealthAPI** (3 endpoints)

### State Management Considerations
- 86 REST endpoints require sophisticated state management
- Real-time WebSocket events for live updates
- Complex authorization flows with role-based access
- Guest session handling across multiple endpoints

### Performance Optimization
- API response caching strategies
- Optimistic updates for frequently changed data
- Batch operations where possible
- WebSocket connection management

## Conclusion

The Tabsy Core Server provides a comprehensive REST API with **86 endpoints** organized across 10 major domains. This is a robust foundation for the frontend monorepo, requiring careful API client design and state management to handle the complexity efficiently.

The slight discrepancy from the original 88 estimate demonstrates the importance of systematic code auditing for accurate technical planning.
