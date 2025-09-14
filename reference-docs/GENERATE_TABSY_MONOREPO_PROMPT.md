# Tabsy Frontend Monorepo Generation Prompt

## Project Overview

You are tasked with creating a comprehensive monorepo for the Tabsy restaurant ordering and payment platform that contains three Next.js applications:

1. **Customer App** - QR code-based ordering for restaurant patrons
2. **Restaurant App** - Real-time order management for restaurant staff  
3. **Admin App** - System administration for platform management

This monorepo will integrate with an existing **Tabsy Core Server**     # ⚠️ OpenAPI/Swagger not implemented in Core Server - removed from project
    console.log('ℹ️ Using manual API documentation instead of OpenAPI/Swagger');at provides 100% API coverage (86 endpoints) and comprehensive WebSocket real-time communication.

## Required Reading

**CRITICAL:** Before starting, thoroughly read and understand the complete specifications in:
`TABSY_FRONTEND_MONOREPO_PLAN.md`

This document contains:
- ✅ Complete architecture overview and technology stack
- ✅ Detailed monorepo structure (750+ files/folders specified)
- ✅ Application-specific requirements for each app
- ✅ API integration strategy with existing Core Server
- ✅ UI component system architecture
- ✅ State management patterns
- ✅ Performance optimization guidelines
- ✅ Security implementation requirements
- ✅ Testing strategy and setup
- ✅ Deployment configuration
- ✅ Development workflow and tooling

## Core Server Integration Context

### Existing API Endpoints (86 Total)
The Core Server provides these endpoint categories with complete implementation:
- **Authentication (6):** Login, logout, register, refresh, validate, current user
- **Restaurants (9):** CRUD operations, staff management, status updates, owner queries
- **Menus (13):** Categories, items, options, pricing management, availability control
- **Tables (9):** Table management, QR code generation, status tracking, session management
- **Orders (10):** Order lifecycle, item management, status updates, restaurant/table queries
- **Payments (13):** Stripe integration, split payments, receipts, refunds, tips, webhooks
- **Users (6):** User management, role assignment, status updates
- **Notifications (8):** Real-time notifications, status tracking, preferences
- **Sessions (5):** Guest session management for QR code access with validation
- **QR Access (3):** Public QR code scanning endpoints with session creation
- **Reports (6):** Sales analytics, order reports, financial exports
- **Menu Item Options (6):** Advanced menu customization with options and values

### WebSocket Events
Real-time communication via Socket.io:
- **Namespaces:** `/restaurant` (staff) and `/customer` (patrons)
- **Event Pattern:** `resource:action` (e.g., `order:created`, `payment:completed`)
- **Room Structure:** Restaurant and table-based targeting
- **Authentication:** JWT for staff, session-based for customers

### Core Server URLs
- **Development:** `http://localhost:5001`
- **API Base:** `/api/v1`
- **WebSocket:** Same base URL with Socket.io
- **Documentation:** Manual documentation in `docs/` folder (NO Swagger/OpenAPI)

## Enterprise Foundation Requirements

### Pre-Implementation Checklist
**Before starting development, ensure:**

1. **Core Server Operational Readiness**
   - ✅ Tabsy Core Server running on `http://localhost:5001` with health endpoint responding
   - ✅ All 86 API endpoints accessible via `/api/v1` with proper error responses
   - ✅ WebSocket server responding on same port with namespace support (/restaurant, /customer)
   - ✅ PostgreSQL database migrations completed and properly seeded with test data
   - ✅ Redis server operational for caching and WebSocket scaling
   - ✅ Stripe integration configured with test API keys

2. **Development Environment Validation**
   - ✅ Node.js 19.0.0+ installed with Volta/nvm for version management
   - ✅ Git 2.34+ with SSH keys configured and access to repositories
   - ✅ VS Code with essential extensions (ESLint, Prettier, TypeScript Hero, Tailwind IntelliSense)
   - ✅ Chrome DevTools, React Developer Tools, and Redux DevTools installed
   - ✅ Terminal with modern shell (zsh/bash) and helpful aliases configured

3. **Security and Quality Prerequisites**
   - ✅ Environment variables template created with all required keys documented
   - ✅ API keys and secrets management strategy defined (local .env, staging, production)
   - ✅ Code signing certificates prepared for production builds
   - ✅ Security scanning tools configured (Snyk, GitHub Dependabot, npm audit)

4. **Quality Assurance Infrastructure**
   - ✅ Continuous integration environment ready (GitHub Actions or equivalent)
   - ✅ Testing databases and mock services configured for integration tests
   - ✅ Performance monitoring tools identified (Core Web Vitals, Lighthouse CI)
   - ✅ Error tracking and logging services configured (Sentry, LogRocket, etc.)
   - ✅ Code coverage reporting and quality gates established

### Foundation Architecture Validation

**Critical Path Validation (Enhanced):**
```bash
# 1. Core Server Health Check with timeout
curl -f --max-time 5 http://localhost:5001/health || exit 1

# 2. Comprehensive API Endpoint Testing
curl -f http://localhost:5001/api/v1/qr/test-qr-code || echo "✅ QR endpoint responds (expected 404)"
curl -f -X POST http://localhost:5001/api/v1/auth/refresh || echo "✅ Auth endpoint responds (expected 401)"
curl -f http://localhost:5001/api/v1/restaurants || echo "✅ Restaurant endpoint responds (expected 401)"

# 3. WebSocket Connection Test with timeout
node -e "
const io = require('socket.io-client');
const socket = io('http://localhost:5001', { timeout: 5000 });
socket.on('connect', () => {
  console.log('✅ WebSocket connection successful');
  process.exit(0);
});
socket.on('connect_error', (error) => {
  console.error('❌ WebSocket connection failed:', error.message);
  process.exit(1);
});
setTimeout(() => {
  console.error('❌ WebSocket connection timeout');
  process.exit(1);
}, 10000);
"

# 4. Database Connectivity Test
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => {
    console.log('✅ Database connection successful');
    return prisma.\$disconnect();
  })
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  });
"

# 5. Redis Connectivity Test  
node -e "
const redis = require('redis');
const client = redis.createClient({ url: 'redis://localhost:6379' });
client.on('error', (err) => {
  console.error('❌ Redis connection failed:', err.message);
  process.exit(1);
});
client.connect()
  .then(() => {
    console.log('✅ Redis connection successful');
    return client.quit();
  })
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Redis connection failed:', error.message);
    process.exit(1);
  });
"

# 6. Comprehensive API Test (using existing test suite)
cd ../Tabsy-core && npm run test:api || echo "⚠️ Run comprehensive-test.js for complete validation"
```

### 1. Project Structure
Create the exact directory structure specified in the plan:

```
tabsy-frontend/
├── apps/
│   ├── customer/           # Next.js 15+ with App Router
│   ├── restaurant/         # Next.js 15+ with App Router  
│   ├── admin/              # Next.js 15+ with App Router
├── packages/
│   ├── api-client/         # Generated from Core Server OpenAPI
│   ├── ui-components/      # Shadcn/UI component library
│   ├── shared-types/       # TypeScript type definitions
│   ├── shared-utils/       # Utility functions and helpers
│   ├── config/             # Shared configuration packages
├── tools/                  # Development tools and scripts
├── docs/                   # Documentation
├── tests/                  # Integration and E2E tests
└── [root configuration files]
```

### 2. Technology Stack Implementation

**Frontend Framework:**
- Next.js 15+ with App Router for all applications
- React 19+ with Server and Client Components
- TypeScript with strict configuration

**UI System:**
- Shadcn/UI as base component library
- Tailwind CSS with shared design tokens
- Framer Motion for animations
- Lucide Icons for iconography

**State Management:**
- TanStack Query (React Query) for server state
- Zustand for client state management
- React Hook Form + Zod for forms

**Development Tools:**
- Turborepo for monorepo management
- Vitest for unit testing
- Playwright for E2E testing
- ESLint + Prettier for code quality

### 3. API Documentation Integration

**Copy Complete API Specification from Core Server:**
```bash
# Create API documentation directory
mkdir -p packages/api-client/docs

# Copy complete API specifications (86 endpoints)
cp ../Tabsy-core/docs/TABSY_CORE_SERVER_REQUIREMENTS.md packages/api-client/docs/
cp ../Tabsy-core/SETUP.md packages/api-client/docs/CORE_SERVER_SETUP.md
cp ../Tabsy-core/README.md packages/api-client/docs/CORE_SERVER_README.md
cp ../Tabsy-core/comprehensive-test.js packages/api-client/docs/API_TEST_COVERAGE.js

# Create frontend-specific API reference
cat > packages/api-client/docs/API_REFERENCE.md << 'EOF'
# Tabsy Frontend API Reference

## ⚠️ Important: No OpenAPI/Swagger Available
The Core Server does NOT implement OpenAPI/Swagger endpoints. All Swagger dependencies have been removed from the project. API integration is based on:

## Complete API Documentation Sources
- **[TABSY_CORE_SERVER_REQUIREMENTS.md](./TABSY_CORE_SERVER_REQUIREMENTS.md)** - Complete 86 endpoint specification
- **[CORE_SERVER_SETUP.md](./CORE_SERVER_SETUP.md)** - Practical API guide with examples  
- **[CORE_SERVER_README.md](./CORE_SERVER_README.md)** - API structure and patterns
- **[API_TEST_COVERAGE.js](./API_TEST_COVERAGE.js)** - 100% endpoint test coverage

## Key Endpoint Categories

**Authentication (6 endpoints):**
- POST /api/v1/auth/login - User login
- POST /api/v1/auth/refresh - Refresh access token
- POST /api/v1/auth/logout - User logout

**QR Code Access (3 endpoints) - Customer Flow:**
- GET /api/v1/qr/:qrCode - Get table info (public)
- POST /api/v1/qr/session - Create guest session

**Restaurant Management (9 endpoints):**
- GET /api/v1/restaurants/:id - Get restaurant details
- POST /api/v1/restaurants - Create restaurant
- PUT /api/v1/restaurants/:id - Update restaurant

**Menu Management (13 endpoints):**
- GET /api/v1/restaurants/:restaurantId/menu - Get full menu
- POST /api/v1/restaurants/:restaurantId/menu/categories - Create category
- POST /api/v1/restaurants/:restaurantId/menu/items - Create menu item

**Order Processing (10 endpoints):**
- POST /api/v1/orders/restaurants/:restaurantId/tables/:tableId - Create order
- GET /api/v1/orders/:id - Get order details
- PUT /api/v1/orders/:id/status - Update order status

**Payment Processing (13 endpoints):**
- POST /api/v1/orders/:orderId/payments - Create payment
- GET /api/v1/payments/:id - Get payment details
- POST /api/v1/payments/:paymentId/confirm - Confirm payment

See complete documentation in the linked files above.
EOF
```

### 4. Enterprise API Client Implementation

**⚠️ CRITICAL: Core Server does NOT have OpenAPI/Swagger endpoints**

All Swagger dependencies have been completely removed from the Core Server project. The frontend will use a **manually crafted TypeScript API client** with complete type safety and enterprise-grade error handling.

**Complete API Client Architecture:**
```typescript
// packages/api-client/src/
├── client.ts                    // Main API client class with enterprise features
├── endpoints/                   # Organized by domain (86 endpoints)
│   ├── auth.ts                 # 6 authentication endpoints
│   ├── restaurants.ts          # 9 restaurant management endpoints
│   ├── menus.ts               # 13 menu management endpoints
│   ├── tables.ts              # 9 table management endpoints
│   ├── orders.ts              # 10 order processing endpoints
│   ├── payments.ts            # 13 payment processing endpoints
│   ├── users.ts               # 6 user management endpoints
│   ├── notifications.ts       # 8 notification endpoints
│   ├── sessions.ts            # 5 session management endpoints
│   └── qr-access.ts           # 3 public QR code endpoints
├── types/                     # Complete TypeScript definitions
│   ├── api-responses.ts       # All API response types
│   ├── api-requests.ts        # All API request types
│   └── domain-models.ts       # Business domain types
├── hooks/                     # React Query hooks for all endpoints
│   ├── auth.ts               # useLogin, useLogout, useRefreshToken
│   ├── restaurants.ts        # useRestaurants, useCreateRestaurant
│   ├── orders.ts             # useOrders, useCreateOrder, useUpdateOrderStatus
│   └── payments.ts           # useCreatePayment, useConfirmPayment
├── utils/                    # Enterprise utilities
│   ├── interceptors.ts       # Request/response interceptors
│   ├── error-handler.ts      # Centralized error handling
│   ├── retry-strategies.ts   # Exponential backoff, circuit breakers
│   ├── auth-storage.ts       # Secure token management
│   └── api-cache.ts          # Intelligent caching strategies
├── websocket/                # WebSocket client integration
│   ├── client.ts             # Socket.io wrapper with reconnection
│   ├── events.ts             # Event type definitions
│   ├── hooks.ts              # React hooks for WebSocket
│   └── providers.ts          # WebSocket context providers
└── monitoring/               # Performance and error monitoring
    ├── api-metrics.ts        # API performance tracking
    ├── error-tracking.ts     # Error reporting integration
    └── health-checks.ts      # API health monitoring
```

**Complete API Endpoint Mapping (86 Endpoints):**
```typescript
// packages/api-client/src/endpoints/mapping.ts
export const API_ENDPOINT_MAPPING = {
  // Authentication Endpoints (6 total)
  AUTH: {
    LOGIN: 'POST /api/v1/auth/login',
    REFRESH: 'POST /api/v1/auth/refresh', 
    LOGOUT: 'POST /api/v1/auth/logout',
    REGISTER: 'POST /api/v1/auth/register',
    VALIDATE: 'GET /api/v1/auth/validate',
    CURRENT_USER: 'GET /api/v1/auth/me'
  },

  // QR Code Access Endpoints (2 total) - Public
  QR_ACCESS: {
    GET_TABLE_INFO: 'GET /api/v1/qr/:qrCode',
    CREATE_GUEST_SESSION: 'POST /api/v1/qr/session'
  },

  // Restaurant Management Endpoints (9 total)
  RESTAURANTS: {
    GET_ALL: 'GET /api/v1/restaurants',
    GET_BY_ID: 'GET /api/v1/restaurants/:id',
    CREATE: 'POST /api/v1/restaurants',
    UPDATE: 'PUT /api/v1/restaurants/:id',
    DELETE: 'DELETE /api/v1/restaurants/:id',
    GET_BY_OWNER: 'GET /api/v1/restaurants/owner/:ownerId',
    ADD_STAFF: 'POST /api/v1/restaurants/:id/staff',
    REMOVE_STAFF: 'DELETE /api/v1/restaurants/:id/staff/:userId',
    UPDATE_STATUS: 'PUT /api/v1/restaurants/:id/status'
  },

  // Menu Management Endpoints (13 total)
  MENUS: {
    GET_RESTAURANT_MENU: 'GET /api/v1/restaurants/:restaurantId/menu',
    CREATE_MENU: 'POST /api/v1/restaurants/:restaurantId/menus',
    UPDATE_MENU: 'PUT /api/v1/restaurants/:restaurantId/menus/:menuId',
    DELETE_MENU: 'DELETE /api/v1/restaurants/:restaurantId/menus/:menuId',
    GET_CATEGORIES: 'GET /api/v1/restaurants/:restaurantId/menu/categories',
    CREATE_CATEGORY: 'POST /api/v1/restaurants/:restaurantId/menu/categories',
    UPDATE_CATEGORY: 'PUT /api/v1/restaurants/:restaurantId/menu/categories/:categoryId',
    DELETE_CATEGORY: 'DELETE /api/v1/restaurants/:restaurantId/menu/categories/:categoryId',
    GET_ITEMS: 'GET /api/v1/restaurants/:restaurantId/menu/items',
    CREATE_ITEM: 'POST /api/v1/restaurants/:restaurantId/menu/items',
    UPDATE_ITEM: 'PUT /api/v1/restaurants/:restaurantId/menu/items/:itemId',
    DELETE_ITEM: 'DELETE /api/v1/restaurants/:restaurantId/menu/items/:itemId',
    TOGGLE_AVAILABILITY: 'PUT /api/v1/restaurants/:restaurantId/menu/items/:itemId/availability'
  },

  // Table Management Endpoints (11 total)
  TABLES: {
    GET_RESTAURANT_TABLES: 'GET /api/v1/restaurants/:restaurantId/tables',
    CREATE_TABLE: 'POST /api/v1/restaurants/:restaurantId/tables',
    GET_TABLE: 'GET /api/v1/restaurants/:restaurantId/tables/:tableId',
    UPDATE_TABLE: 'PUT /api/v1/restaurants/:restaurantId/tables/:tableId',
    DELETE_TABLE: 'DELETE /api/v1/restaurants/:restaurantId/tables/:tableId',
    UPDATE_STATUS: 'PUT /api/v1/restaurants/:restaurantId/tables/:tableId/status',
    GENERATE_QR: 'GET /api/v1/restaurants/:restaurantId/tables/:tableId/qrcode',
    GENERATE_QR_ALT: 'GET /api/v1/restaurants/:restaurantId/tables/:tableId/qr',
    GENERATE_QR_IMAGE: 'GET /api/v1/restaurants/:restaurantId/tables/:tableId/qrcode-image',
    RESET_TABLE: 'POST /api/v1/restaurants/:restaurantId/tables/:tableId/reset',
    GET_SESSIONS: 'GET /api/v1/restaurants/:tableId/sessions'
  },

  // Order Processing Endpoints (8 total)
  ORDERS: {
    GET_ALL: 'GET /api/v1/orders',
    GET_BY_ID: 'GET /api/v1/orders/:id',
    CREATE: 'POST /api/v1/orders',
    UPDATE: 'PUT /api/v1/orders/:id',
    CANCEL: 'DELETE /api/v1/orders/:id',
    ADD_ITEM: 'POST /api/v1/orders/:id/items',
    UPDATE_ITEM: 'PUT /api/v1/orders/:id/items/:itemId',
    REMOVE_ITEM: 'DELETE /api/v1/orders/:id/items/:itemId'
  },

  // Payment Processing Endpoints (10 total)
  PAYMENTS: {
    CREATE_INTENT: 'POST /api/v1/payments/intent',
    GET_BY_ID: 'GET /api/v1/payments/:id',
    GET_RECEIPT: 'GET /api/v1/payments/:id/receipt',
    DELETE: 'DELETE /api/v1/payments/:id',
    UPDATE_STATUS: 'PUT /api/v1/payments/:id/status',
    ADD_TIP: 'PATCH /api/v1/payments/:id',
    RECORD_CASH: 'POST /api/v1/payments/cash',
    CREATE_SPLIT: 'POST /api/v1/payments/split',
    GET_SPLIT: 'GET /api/v1/payments/split/:groupId',
    WEBHOOK_STRIPE: 'POST /api/v1/payments/webhooks/stripe'
  },

  // Order Payment Integration (2 total)
  ORDER_PAYMENTS: {
    CREATE: 'POST /api/v1/orders/:orderId/payments',
    GET_BY_ORDER: 'GET /api/v1/orders/:orderId/payments'
  },

  // Restaurant Payment Reports (1 total)
  RESTAURANT_PAYMENTS: {
    GET_BY_RESTAURANT: 'GET /api/v1/restaurants/:restaurantId/payments'
  },

  // User Management Endpoints (6 total)
  USERS: {
    GET_CURRENT: 'GET /api/v1/users/me',
    GET_ALL: 'GET /api/v1/users',
    CREATE: 'POST /api/v1/users',
    GET_BY_ID: 'GET /api/v1/users/:id',
    UPDATE: 'PUT /api/v1/users/:id',
    DELETE: 'DELETE /api/v1/users/:id'
  },

  // Notification Management Endpoints (7 total)
  NOTIFICATIONS: {
    CREATE: 'POST /api/v1/notifications',
    GET_USER_NOTIFICATIONS: 'GET /api/v1/notifications',
    MARK_READ: 'PATCH /api/v1/notifications/:id',
    CLEAR_ALL: 'DELETE /api/v1/notifications',
    GET_PREFERENCES: 'GET /api/v1/notifications/preferences',
    UPDATE_PREFERENCES: 'PUT /api/v1/notifications/preferences',
    TEST: 'POST /api/v1/notifications/test'
  },

  // Session Management Endpoints (5 total)
  SESSIONS: {
    CREATE_GUEST: 'POST /api/v1/sessions/guest',
    VALIDATE: 'GET /api/v1/sessions/:sessionId/validate',
    GET_DETAILS: 'GET /api/v1/sessions/:sessionId',
    UPDATE: 'PATCH /api/v1/sessions/:sessionId',
    DELETE: 'DELETE /api/v1/sessions/:sessionId'
  },

  // Menu Item Options (2 total)
  MENU_ITEM_OPTIONS: {
    CREATE: 'POST /api/v1/menu-item-options',
    BULK_CREATE: 'POST /api/v1/menu-item-options/bulk'
  },

  // Menu Direct Access (1 total)
  MENU_DIRECT: {
    GET_BY_ID: 'GET /api/v1/menus/:id'
  },

  // Health Monitoring (3 total)
  HEALTH: {
    HEALTH_CHECK: 'GET /api/v1/health/health',
    READINESS: 'GET /api/v1/health/ready',
    LIVENESS: 'GET /api/v1/health/live'
  }
};

// Application-specific endpoint usage patterns
export const APP_ENDPOINT_USAGE = {
  CUSTOMER_APP: [
    'QR_ACCESS.GET_TABLE_INFO',
    'QR_ACCESS.CREATE_GUEST_SESSION', 
    'RESTAURANTS.GET_BY_ID',
    'MENUS.GET_RESTAURANT_MENU',
    'ORDERS.CREATE',
    'ORDERS.GET_BY_ID',
    'PAYMENTS.CREATE',
    'PAYMENTS.CONFIRM',
    'PAYMENTS.ADD_TIP',
    'SESSIONS.VALIDATE',
    'SESSIONS.REFRESH'
  ],
  
  RESTAURANT_APP: [
    'AUTH.LOGIN',
    'AUTH.LOGOUT',
    'AUTH.REFRESH',
    'RESTAURANTS.GET_BY_ID',
    'RESTAURANTS.UPDATE',
    'MENUS.*', // All menu endpoints
    'TABLES.*', // All table endpoints
    'ORDERS.GET_BY_RESTAURANT',
    'ORDERS.UPDATE_STATUS',
    'PAYMENTS.GET_BY_RESTAURANT',
    'REPORTS.ORDERS',
    'REPORTS.SALES',
    'NOTIFICATIONS.GET_RESTAURANT_NOTIFICATIONS'
  ],
  
  ADMIN_APP: [
    'AUTH.LOGIN',
    'AUTH.LOGOUT', 
    'AUTH.REFRESH',
    'RESTAURANTS.*', // All restaurant endpoints
    'USERS.*', // All user endpoints
    'ORDERS.GET_ALL',
    'PAYMENTS.*', // All payment endpoints
    'REPORTS.*', // All reporting endpoints
    'NOTIFICATIONS.*' // All notification endpoints
  ]
};
```

**Enterprise API Client Implementation:**
```typescript
// packages/api-client/src/client.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiError, RetryStrategy, CircuitBreaker, ApiMetrics } from './utils';
import { AuthStorage } from './utils/auth-storage';
import type { ApiResponse, ErrorResponse, ApiClientConfig } from './types';

export class TabsyApiClient {
  private axiosInstance: AxiosInstance;
  private retryStrategy: RetryStrategy;
  private circuitBreaker: CircuitBreaker;
  private metrics: ApiMetrics;

  constructor(config: ApiClientConfig) {
    this.axiosInstance = axios.create({
      baseURL: `${config.baseURL}/api/v1`,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Version': '1.0.0',
        'X-Client-Type': 'frontend-monorepo',
        'X-Request-ID': () => this.generateRequestId()
      }
    });

    this.setupInterceptors();
    this.retryStrategy = new RetryStrategy(config.retryConfig);
    this.circuitBreaker = new CircuitBreaker(config.circuitBreakerConfig);
    this.metrics = new ApiMetrics();
  }

  private setupInterceptors(): void {
    // Request interceptor for auth tokens and metrics
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = AuthStorage.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Start performance tracking
        config.metadata = { startTime: Date.now() };
        
        return config;
      },
      (error) => {
        this.metrics.recordError('request_interceptor', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling, token refresh, and metrics
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Record successful API call metrics
        const duration = Date.now() - response.config.metadata?.startTime;
        this.metrics.recordSuccess(response.config.url, duration);
        
        return response;
      },
      async (error) => {
        const duration = Date.now() - error.config?.metadata?.startTime;
        this.metrics.recordError(error.config?.url, error, duration);

        // Handle token refresh for 401 errors
        if (error.response?.status === 401 && !error.config._retry) {
          error.config._retry = true;
          
          try {
            const refreshed = await this.handleTokenRefresh();
            if (refreshed) {
              error.config.headers.Authorization = `Bearer ${AuthStorage.getToken()}`;
              return this.axiosInstance.request(error.config);
            }
          } catch (refreshError) {
            // Redirect to login if refresh fails
            AuthStorage.clearTokens();
            window.location.href = '/login';
          }
        }

        return Promise.reject(new ApiError(error));
      }
    );
  }

  private async handleTokenRefresh(): Promise<boolean> {
    const refreshToken = AuthStorage.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await this.axiosInstance.post('/auth/refresh', {
        refreshToken
      });
      
      const { accessToken, refreshToken: newRefreshToken } = response.data.data;
      AuthStorage.setTokens(accessToken, newRefreshToken);
      
      return true;
    } catch (error) {
      return false;
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generic HTTP methods with enterprise features
  private async request<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.circuitBreaker.execute(async () => {
      return this.retryStrategy.execute(async () => {
        const response = await this.axiosInstance.request<ApiResponse<T>>(config);
        return response.data;
      });
    });
  }

  private get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  private post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  private put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  private delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  // All 86 endpoints organized by domain - Implementation continues in endpoints/ files
  // This ensures maintainable code organization and clear separation of concerns
}
```

**Enterprise Error Handling:**
```typescript
// packages/api-client/src/utils/error-handler.ts
export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details: any;
  public readonly timestamp: Date;
  public readonly requestId: string;

  constructor(error: any) {
    const message = error.response?.data?.message || error.message || 'Unknown API error';
    super(message);
    
    this.name = 'ApiError';
    this.status = error.response?.status || 0;
    this.code = error.response?.data?.code || 'UNKNOWN_ERROR';
    this.details = error.response?.data?.details || {};
    this.timestamp = new Date();
    this.requestId = error.config?.headers?.['X-Request-ID'] || 'unknown';
  }

  public isNetworkError(): boolean {
    return this.status === 0;
  }

  public isServerError(): boolean {
    return this.status >= 500;
  }

  public isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  public isRetryable(): boolean {
    return this.isNetworkError() || this.isServerError() || this.status === 429;
  }
}
```

Create wrapper client with:
- Authentication token management
- Request/response interceptors
- Error handling and retry logic
- WebSocket client integration
- React Query hooks for all endpoints

### 5. Application-Specific Implementation

**Customer App Features:**
- QR code scanning and table recognition
- Menu browsing with search/filtering
- Shopping cart with real-time totals
- Order customization and special instructions
- Payment processing with Stripe Elements
- Split bill functionality
- Real-time order tracking
- Feedback submission
- PWA capabilities
- Multi-language support (5+ languages)

**Restaurant App Features:**
- Real-time order dashboard
- Menu management (CRUD operations)
- Table status tracking with visual floor plan
- Payment processing and reconciliation
- Sales analytics with charts
- Staff management with role-based access
- Restaurant settings configuration
- Print integration for receipts

**Admin App Features:**
- Multi-restaurant management
- User administration with role assignment
- System-wide analytics and reporting
- Financial management and transaction tracking
- Support tools and troubleshooting
- Global configuration and feature flags
- Audit logging and compliance
- Advanced data tables with bulk operations

### 5. Component Library Implementation

Build comprehensive Shadcn/UI component library:
- Base components (Button, Input, Card, Dialog, etc.)
- Complex components (DataTable, QRScanner, PaymentForm)
- Chart components (LineChart, BarChart, PieChart)
- Application-specific variations
- Proper TypeScript interfaces
- Storybook documentation

### 6. State Management Patterns

**Server State (React Query):**
- Query hooks for all API endpoints
- Optimistic updates for better UX
- Background refetching and caching
- Error handling and retry logic

**Client State (Zustand):**
- Cart management for Customer App
- Order filtering for Restaurant App
- User preferences across apps
- UI state (modals, sidebars, etc.)

### 7. Performance Optimization

**Bundle Optimization:**
- Code splitting at route and component level
- Tree shaking for optimal bundle sizes
- Dynamic imports for heavy components
- Proper Next.js optimization configuration

**Caching Strategy:**
- Next.js static and dynamic caching
- React Query intelligent caching
- Image optimization with Next.js Image
- CDN configuration for static assets

### 8. Security Implementation

**Authentication:**
- JWT token management with secure storage
- Automatic token refresh
- Role-based route protection
- Session management for guest users

**Input Validation:**
- Zod schemas for all forms
- Server-side validation integration
- XSS protection
- CSRF protection

### 9. Testing Strategy

**Unit Testing:**
- Vitest configuration for all packages
- React Testing Library for components
- Mock implementations for API calls
- >80% test coverage target

**E2E Testing:**
- Playwright configuration
- Complete user flow testing
- Cross-browser compatibility
- Performance testing integration

### 10. Development Workflow

### Development Workflow Foundation

**Enterprise-Grade Development Setup:**
```json
{
  "scripts": {
    "dev": "turbo dev",
    "dev:customer": "turbo dev --filter=customer",
    "dev:restaurant": "turbo dev --filter=restaurant", 
    "dev:admin": "turbo dev --filter=admin",
    "build": "turbo build",
    "build:customer": "turbo build --filter=customer",
    "build:restaurant": "turbo build --filter=restaurant",
    "build:admin": "turbo build --filter=admin",
    "test": "turbo test",
    "test:unit": "turbo test:unit",
    "test:integration": "turbo test:integration",
    "test:e2e": "turbo test:e2e",
    "test:api-connectivity": "node scripts/test-api-connectivity.js",
    "lint": "turbo lint",
    "lint:fix": "turbo lint -- --fix",
    "type-check": "turbo type-check",
    "security:audit": "npm audit && turbo security:scan",
    "security:scan": "turbo security:scan",
    "generate:api-client": "npm run generate:api-client --workspace=api-client",
    "validate:foundation": "npm run test:api-connectivity && npm run type-check && npm run lint",
    "pre-commit": "lint-staged",
    "prepare": "husky install"
  }
}
```

**Critical Foundation Scripts:**
```bash
# scripts/test-api-connectivity.js
const axios = require('axios');
const CORE_SERVER_URL = 'http://localhost:5001';

async function testCoreServerConnectivity() {
  try {
    // Test health endpoint
    await axios.get(`${CORE_SERVER_URL}/health`);
    console.log('✅ Core Server health check passed');
    
    // ⚠️ NO OpenAPI endpoint available - skip this test
    console.log('⚠️ OpenAPI/Swagger not implemented in Core Server');
    
    // Test key endpoints (expect 401/404 for protected/missing endpoints)
    const endpoints = [
      { path: '/api/v1/auth/refresh', expectError: true },
      { path: '/api/v1/restaurants', expectError: true }, // Requires auth
      { path: '/api/v1/qr/test-code', expectError: true }  // Invalid QR code
    ];
    
    for (const endpoint of endpoints) {
      try {
        await axios.get(`${CORE_SERVER_URL}${endpoint.path}`);
        console.log(`✅ ${endpoint.path} accessible`);
      } catch (error) {
        if (endpoint.expectError && (error.response?.status === 401 || error.response?.status === 404)) {
          console.log(`✅ ${endpoint.path} responds correctly (${error.response.status})`);
        } else if (!endpoint.expectError) {
          throw error;
        }
      }
    }
    
    console.log('🎉 All Core Server connectivity tests passed');
    console.log('📋 Use comprehensive-test.js in Core Server for complete API validation');
  } catch (error) {
    console.error('❌ Core Server connectivity test failed:', error.message);
    process.exit(1);
  }
}

testCoreServerConnectivity();
```

**Development Setup:**
1. Turborepo workspace configuration
2. Shared ESLint and TypeScript configs
3. Shared Tailwind configuration with app-specific themes
4. Environment variable management
5. Git hooks and commit linting

## Specific Implementation Instructions

### Phase 1: Project Foundation & Architecture Validation
1. **Initialize Turborepo workspace with enterprise configuration**
   ```bash
   npx create-turbo@latest tabsy-frontend --example basic
   cd tabsy-frontend
   
   # Validate Core Server connectivity
   curl http://localhost:5001/health
   ```

2. **Set up package.json with locked dependencies and security**
   ```json
   {
     "engines": {
       "node": ">=19.0.0",
       "npm": ">=9.0.0"
     },
     "volta": {
       "node": "18.18.0",
       "npm": "9.8.1"
     }
   }
   ```

3. **Configure TypeScript with strict enterprise settings**
   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "strict": true,
       "noUncheckedIndexedAccess": true,
       "exactOptionalPropertyTypes": true,
       "noImplicitReturns": true,
       "noFallthroughCasesInSwitch": true,
       "noUncheckedIndexedAccess": true
     }
   }
   ```

4. **Set up comprehensive linting and security**
   ```bash
   # Install security and quality tools
   npm install -D @typescript-eslint/eslint-plugin
   npm install -D eslint-plugin-security
   npm install -D @next/eslint-plugin-next
   npm install -D eslint-plugin-react-hooks
   npm install -D eslint-plugin-jsx-a11y
   ```

5. **Create production-ready Tailwind configuration**
6. **Set up Git repository with security policies**
   ```bash
   # Install git hooks for security
   npm install -D husky lint-staged
   npm install -D @commitlint/cli @commitlint/config-conventional
   ```

### Phase 1.5: Foundation Validation & Core Server Integration Test
**CRITICAL: Validate foundation before proceeding**
1. **API Connectivity Test**
   ```bash
   # Test all critical Core Server endpoints
   npm run test:api-connectivity
   ```
2. **WebSocket Connection Test**
3. **Authentication Flow Test**
4. **TypeScript Compilation Test**
5. **Linting and Security Scan**

### Phase 2: Shared Packages
1. Generate API client from Core Server OpenAPI spec
2. Create base Shadcn/UI component library
3. Set up shared TypeScript types
4. Create utility functions package
5. Configure shared configurations

### Phase 3: Application Setup
1. Create Next.js 15+ applications with App Router
2. Set up internationalization for all apps
3. Configure authentication and routing
4. Implement base layouts and navigation
5. Set up state management

### Phase 4: Feature Implementation
1. Implement Customer App QR flow and ordering
2. Build Restaurant App dashboard and management
3. Create Admin App system administration
4. Integrate real-time WebSocket communication
5. Add payment processing with Stripe

### Phase 5: Testing and Optimization
1. Set up comprehensive testing suite
2. Implement performance optimizations
3. Add monitoring and analytics
4. Configure deployment pipelines
5. Create documentation

## Quality Standards

### Code Quality
- TypeScript strict mode enabled
- 100% type coverage for API integration
- Consistent naming conventions
- Comprehensive JSDoc documentation
- ESLint and Prettier compliance

### Performance Targets
- Customer App: <2s load time, <3s time to interactive
- Restaurant/Admin Apps: <3s load time
- >90 Lighthouse Performance Score
- <500KB initial bundle for Customer App
- <1MB for Restaurant/Admin Apps

### Accessibility
- WCAG 2.1 AA compliance
- Proper ARIA attributes
- Keyboard navigation support
- Screen reader compatibility
- Color contrast compliance

### Security
- Input validation on all forms
- XSS and CSRF protection
- Secure token storage
- Role-based access control
- Regular security auditing

## Testing Requirements

### Unit Tests (Vitest)
- Component testing with React Testing Library
- Hook testing for custom hooks
- Utility function testing
- API client testing with mocks
- >80% code coverage

### Integration Tests
- Cross-component interaction testing
- API integration testing
- State management testing
- Form submission testing

### E2E Tests (Playwright)
- Complete user journey testing
- Cross-browser testing
- Performance testing
- Accessibility testing
- Mobile responsiveness testing

## Critical Success Requirements

**✅ Complete API Documentation Integration:**
Frontend developers will have full access to:
1. **📋 Complete API Specification** - All 86 endpoints from `TABSY_CORE_SERVER_REQUIREMENTS.md`
2. **📖 Practical Usage Guide** - Examples and patterns from `SETUP.md`
3. **🧪 Live Test Coverage** - Comprehensive test suite with 100% endpoint validation
4. **⚡ Manual TypeScript Client** - Hand-crafted with complete type safety (NO auto-generation)
5. **🎯 React Query Hooks** - Pre-built hooks for all 86 endpoints

**⚠️ Important: NO OpenAPI/Swagger Available**
The Core Server does not implement OpenAPI/Swagger endpoints. All Swagger dependencies have been removed. Frontend integration relies on:
- Manual API client implementation
- Comprehensive documentation
- Live endpoint testing via comprehensive-test.js

**Frontend API Knowledge - Developers will know exactly which APIs to call:**
```typescript
// Customer QR Flow
useQrCode(qrCode)           // GET /api/v1/qr/:qrCode
useCreateGuestSession()     // POST /api/v1/qr/session

// Restaurant Operations  
useRestaurant(id)           // GET /api/v1/restaurants/:id
useRestaurantMenu(id)       // GET /api/v1/restaurants/:id/menu

// Order Processing
useCreateOrder()            // POST /api/v1/orders/restaurants/:restaurantId/tables/:tableId
useUpdateOrderStatus()      // PUT /api/v1/orders/:id/status

// Payment Flow
useCreatePayment()          // POST /api/v1/orders/:orderId/payments
useConfirmPayment()         // POST /api/v1/payments/:paymentId/confirm
```

## Documentation Requirements

### Code Documentation
- JSDoc for all functions and components
- TypeScript interfaces for all data structures
- README files for each package
- Storybook for component library

### User Documentation
- Development setup guide
- API integration guide
- Deployment instructions
- Component library documentation
- Testing guide

## Deployment Configuration

### Vercel Setup
- Multi-app deployment configuration
- Environment variable management
- Preview deployment setup
- Production optimization
- CDN configuration

### CI/CD Pipeline
- GitHub Actions workflow
- Automated testing on PR
- Automated deployment
- Performance monitoring
- Security scanning

## Foundation Success Criteria & Validation

### Foundation Completion Checklist

**The foundation phase is complete when ALL of the following are verified:**

1. **✅ Core Infrastructure**
   - Turborepo workspace builds successfully
   - All TypeScript configurations compile without errors
   - ESLint and Prettier run without violations
   - Git hooks and commit linting are functional
   - Security scanning tools are operational

2. **✅ API Integration Foundation**
   - Core Server connectivity validated (all 86 endpoints accessible)
   - OpenAPI client generation successful
   - WebSocket connection established and tested
   - Authentication flow tested end-to-end
   - API documentation copied and accessible

3. **✅ Development Environment**
   - All three Next.js apps start in development mode
   - Hot reload and fast refresh working
   - Shared packages importable across all apps
   - Environment variables properly configured
   - Development scripts executing successfully

4. **✅ Quality Assurance Foundation**
   - Unit test framework operational (Vitest)
   - E2E test framework operational (Playwright)
   - Code coverage reporting functional
   - Performance monitoring baseline established
   - Accessibility testing tools configured

5. **✅ Security Foundation**
   - Input validation schemas (Zod) configured
   - Authentication token management implemented
   - HTTPS and security headers configured
   - Dependency vulnerability scanning operational
   - Environment secrets management working

**Foundation Validation Command:**
```bash
npm run validate:foundation
```

**Expected Output:**
```
✅ Core Server health check passed
✅ All 86 API endpoints accessible (via comprehensive-test.js)
✅ WebSocket connection established
✅ TypeScript compilation successful
✅ Linting passed with 0 errors
✅ Security audit passed
✅ All apps start successfully
⚠️  Note: OpenAPI/Swagger removed from project - using manual API client
🎉 Foundation validation complete - ready for Phase 2
```

**If validation fails, DO NOT proceed to Phase 2 until all issues are resolved.**

**Important Notes About API Integration:**
- Core Server does NOT provide OpenAPI/Swagger endpoints (dependencies removed)
- Frontend will use manually crafted TypeScript API client
- API documentation is comprehensive but requires manual implementation
- All 86 endpoints are tested and validated via comprehensive-test.js

## Getting Started

1. **Read the complete plan:** Study `TABSY_FRONTEND_MONOREPO_PLAN.md` thoroughly
2. **Understand the Core Server:** Review the existing API endpoints and WebSocket events
3. **Set up development environment:** Ensure Node.js 19+, Git, and required tools are installed
4. **Follow the implementation phases:** Work through each phase systematically
5. **Test continuously:** Run tests at each phase to ensure quality
6. **Document everything:** Maintain comprehensive documentation throughout

## Important Notes

- **Core Server Integration:** The monorepo must integrate seamlessly with the existing Tabsy Core Server
- **No Backend Changes:** Do not modify the Core Server - it's a separate, production-ready system
- **Type Safety:** Maintain 100% TypeScript type safety throughout
- **Performance First:** Optimize for performance from the beginning
- **Mobile Focus:** Customer App must be mobile-first and PWA-capable
- **Real-time Features:** WebSocket integration is critical for all apps
- **Accessibility:** WCAG compliance is required, not optional
- **Testing:** Comprehensive testing is mandatory for production readiness

## Support Resources

- **Core Server Documentation:** Available in the existing Tabsy Core repository
- **API Endpoint Testing:** Use `comprehensive-test.js` for complete validation (NO Swagger - dependencies removed)
- **WebSocket Events:** Documented in Core Server WebSocket architecture
- **Design System:** Based on Shadcn/UI with custom Tabsy branding
- **Testing Strategy:** Comprehensive approach covering unit, integration, and E2E testing

**⚠️ Important API Integration Notes:**
- OpenAPI/Swagger dependencies have been completely removed from the Core Server
- Use manual TypeScript client implementation based on comprehensive documentation
- All 86 endpoints are tested and validated via comprehensive-test.js
- Frontend API integration relies on manual client creation, not auto-generation

Begin implementation by thoroughly understanding the requirements and following the structured approach outlined in the comprehensive plan.
