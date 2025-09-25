# Backend Payment System Implementation Requirements

This document outlines the complete backend implementation requirements for the Tabsy payment system. The frontend has been fully implemented across all three applications and is waiting for these backend APIs and integrations to become functional.

## Overview

**Status**: Frontend Complete, Backend Implementation Needs Verification
**Priority**: CRITICAL - Core business functionality
**Estimated Effort**: 3-4 weeks for full implementation with proper Stripe integration
**Dependencies**: Stripe account setup, webhook infrastructure, WebSocket implementation

## Current Situation

### ✅ Frontend Implementation (Complete)
- **Customer App**: Complete payment flow with table session integration, split payments, Stripe card form
- **Restaurant Dashboard**: Real-time payment monitoring, analytics, management interface
- **Admin Portal**: System-wide payment oversight, analytics, reconciliation tools
- **Shared Types**: Comprehensive TypeScript interfaces for all payment operations
- **API Client**: Full payment API client with all expected endpoints
- **WebSocket Integration**: Real-time payment event handling across all apps

### ❓ Backend Implementation (Requires Verification)
According to documentation, 13 payment endpoints exist, but actual implementation status unknown:
- Payment intent creation and management
- Split payment processing
- Stripe webhook handling
- Receipt generation
- Payment status updates
- Real-time WebSocket events

## Critical Backend Implementation Requirements

### 1. Database Schema Implementation

#### Payment Tables
```sql
-- Main payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  customer_id UUID REFERENCES users(id),          -- Optional: authenticated users
  session_id VARCHAR(255),                        -- Guest sessions
  table_id UUID REFERENCES tables(id),            -- Table context
  table_session_id UUID,                          -- Multi-user table session

  -- Payment amounts (in cents to avoid floating point issues)
  amount INTEGER NOT NULL,                         -- Subtotal
  tip_amount INTEGER DEFAULT 0,                   -- Tip amount
  tax_amount INTEGER DEFAULT 0,                   -- Tax amount
  total_amount INTEGER NOT NULL,                  -- Final total

  currency VARCHAR(3) DEFAULT 'USD',
  method payment_method_enum NOT NULL,            -- CREDIT_CARD, CASH, DEBIT_CARD, MOBILE_PAYMENT
  provider payment_provider_enum NOT NULL,        -- STRIPE, PAYPAL, SQUARE, CASH
  status payment_status_enum DEFAULT 'PENDING',   -- PENDING, PROCESSING, COMPLETED, FAILED, etc.

  -- Stripe integration fields
  payment_intent_id VARCHAR(255),                 -- Stripe payment intent ID
  transaction_id VARCHAR(255),                    -- External transaction reference
  client_secret VARCHAR(500),                     -- Stripe client secret

  -- Receipt and audit trail
  receipt_url VARCHAR(500),
  receipt_number VARCHAR(50),

  -- Failure handling
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Split payment support
  split_group_id UUID,                            -- Groups related split payments
  is_split_payment BOOLEAN DEFAULT FALSE,

  -- Metadata for extensibility
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT positive_amounts CHECK (
    amount > 0 AND
    tip_amount >= 0 AND
    tax_amount >= 0 AND
    total_amount > 0
  ),
  CONSTRAINT valid_total CHECK (total_amount = amount + tip_amount + tax_amount)
);

-- Payment refunds table
CREATE TABLE payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id),
  refund_amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  refund_id VARCHAR(255),                         -- Stripe refund ID
  status VARCHAR(20) DEFAULT 'PROCESSING',        -- PROCESSING, COMPLETED, FAILED
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT positive_refund_amount CHECK (refund_amount > 0)
);

-- Split payment participants
CREATE TABLE split_payment_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_group_id UUID NOT NULL,
  payment_id UUID NOT NULL REFERENCES payments(id),
  participant_id VARCHAR(255) NOT NULL,          -- Guest session ID or user ID
  participant_name VARCHAR(255),
  amount INTEGER NOT NULL,
  tip_amount INTEGER DEFAULT 0,
  status payment_status_enum DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT positive_split_amount CHECK (amount > 0 AND tip_amount >= 0)
);

-- Payment method details (for saved cards, etc.)
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES users(id),
  stripe_payment_method_id VARCHAR(255),
  type VARCHAR(50) NOT NULL,                      -- card, apple_pay, google_pay
  card_brand VARCHAR(20),                         -- visa, mastercard, amex
  card_last4 VARCHAR(4),
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment audit log
CREATE TABLE payment_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id),
  action VARCHAR(50) NOT NULL,                    -- created, updated, completed, failed, refunded
  previous_status payment_status_enum,
  new_status payment_status_enum,
  details JSONB,
  user_id UUID REFERENCES users(id),              -- Who performed the action
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enums
CREATE TYPE payment_method_enum AS ENUM ('CARD', 'CASH', 'DIGITAL_WALLET', 'CRYPTO');
CREATE TYPE payment_provider_enum AS ENUM ('STRIPE', 'PAYPAL', 'SQUARE', 'CASH');
CREATE TYPE payment_status_enum AS ENUM (
  'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED',
  'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'
);

-- Indexes for performance
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_restaurant_id ON payments(restaurant_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_payments_payment_intent_id ON payments(payment_intent_id);
CREATE INDEX idx_payments_split_group_id ON payments(split_group_id) WHERE split_group_id IS NOT NULL;
CREATE INDEX idx_split_participants_group_id ON split_payment_participants(split_group_id);
```

### 2. Stripe Integration Implementation

#### Core Stripe Setup
```javascript
// Stripe configuration and initialization
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Required environment variables
const requiredEnvVars = [
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_WEBHOOK_ENDPOINT_SECRET'  // For specific webhook endpoints
];

// Stripe payment intent creation
async function createPaymentIntent(orderData) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: orderData.totalAmount,  // Amount in cents
      currency: 'usd',
      metadata: {
        orderId: orderData.orderId,
        restaurantId: orderData.restaurantId,
        tableId: orderData.tableId,
        customerId: orderData.customerId
      },
      automatic_payment_methods: {
        enabled: true
      },
      // For future payments and customer management
      customer: orderData.stripeCustomerId,
      setup_future_usage: 'off_session'  // Enable for saved payment methods
    });

    return paymentIntent;
  } catch (error) {
    logger.error('Stripe payment intent creation failed:', error);
    throw new PaymentProcessingError('Failed to create payment intent', error);
  }
}
```

#### Webhook Implementation (CRITICAL)
```javascript
// Stripe webhook handler
app.post('/api/v1/payments/webhooks/stripe', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      case 'payment_intent.processing':
        await handlePaymentProcessing(event.data.object);
        break;

      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object);
        break;

      case 'charge.dispute.created':
        await handleChargeDispute(event.data.object);
        break;

      default:
        logger.warn(`Unhandled event type: ${event.type}`);
    }

    res.json({received: true});
  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.status(500).json({error: 'Webhook processing failed'});
  }
});

// Webhook event handlers
async function handlePaymentSucceeded(paymentIntent) {
  const payment = await updatePaymentStatus(
    paymentIntent.metadata.orderId,
    'COMPLETED',
    {
      transactionId: paymentIntent.id,
      completedAt: new Date(),
      stripeChargeId: paymentIntent.latest_charge
    }
  );

  // Emit WebSocket event
  await emitPaymentEvent('payment:completed', {
    paymentId: payment.id,
    orderId: payment.orderId,
    restaurantId: payment.restaurantId,
    amount: payment.totalAmount,
    method: payment.method
  });

  // Update order status
  await updateOrderStatus(payment.orderId, 'PAID');

  // Send notifications
  await sendPaymentCompletedNotifications(payment);
}

async function handlePaymentFailed(paymentIntent) {
  const payment = await updatePaymentStatus(
    paymentIntent.metadata.orderId,
    'FAILED',
    {
      failureReason: paymentIntent.last_payment_error?.message,
      transactionId: paymentIntent.id
    }
  );

  // Emit WebSocket event
  await emitPaymentEvent('payment:failed', {
    paymentId: payment.id,
    orderId: payment.orderId,
    restaurantId: payment.restaurantId,
    errorMessage: paymentIntent.last_payment_error?.message,
    amount: payment.totalAmount
  });

  // Handle failure notifications
  await sendPaymentFailedNotifications(payment);
}
```

### 3. API Endpoints Implementation

#### Core Payment Endpoints
```javascript
// POST /api/v1/payments/intent
app.post('/api/v1/payments/intent', authenticateUser, async (req, res) => {
  try {
    const { orderId, amount, currency = 'usd', paymentMethodId } = req.body;

    // Validate order exists and belongs to user/session
    const order = await validateOrderAccess(orderId, req.user, req.session);

    // Create payment record
    const payment = await createPaymentRecord({
      orderId,
      restaurantId: order.restaurantId,
      customerId: req.user?.id,
      sessionId: req.session?.id,
      amount,
      currency,
      method: 'CARD',
      provider: 'STRIPE'
    });

    // Create Stripe payment intent
    const paymentIntent = await createStripePaymentIntent({
      amount,
      currency,
      paymentMethodId,
      metadata: {
        paymentId: payment.id,
        orderId,
        restaurantId: order.restaurantId
      }
    });

    // Update payment with Stripe data
    await updatePayment(payment.id, {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      status: 'PROCESSING'
    });

    res.json({
      success: true,
      data: {
        paymentId: payment.id,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      }
    });
  } catch (error) {
    logger.error('Payment intent creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment intent'
    });
  }
});

// POST /api/v1/payments/split
app.post('/api/v1/payments/split', authenticateUser, async (req, res) => {
  try {
    const { orderId, splits } = req.body;

    // Validate splits total matches order total
    const order = await getOrderById(orderId);
    const totalSplitAmount = splits.reduce((sum, split) => sum + split.amount, 0);

    if (totalSplitAmount !== order.totalAmount) {
      return res.status(400).json({
        success: false,
        error: 'Split amounts do not match order total'
      });
    }

    const splitGroupId = uuidv4();
    const payments = [];

    // Create individual payment records for each split
    for (const split of splits) {
      const payment = await createPaymentRecord({
        orderId,
        restaurantId: order.restaurantId,
        customerId: split.customerId,
        amount: split.amount,
        splitGroupId,
        isSplitPayment: true,
        method: 'CARD',
        provider: 'STRIPE'
      });

      // Create Stripe payment intent for each split
      const paymentIntent = await createStripePaymentIntent({
        amount: split.amount,
        currency: 'usd',
        metadata: {
          paymentId: payment.id,
          orderId,
          splitGroupId,
          participantEmail: split.email
        }
      });

      await updatePayment(payment.id, {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret
      });

      payments.push({
        ...payment,
        clientSecret: paymentIntent.client_secret
      });
    }

    res.json({
      success: true,
      data: {
        groupId: splitGroupId,
        payments
      }
    });
  } catch (error) {
    logger.error('Split payment creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create split payment'
    });
  }
});

// GET /api/v1/payments/:id/receipt
app.get('/api/v1/payments/:id/receipt', authenticateUser, async (req, res) => {
  try {
    const payment = await getPaymentById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    // Verify access
    await validatePaymentAccess(payment, req.user, req.session);

    // Generate receipt
    const receipt = await generatePaymentReceipt(payment);

    res.json({
      success: true,
      data: receipt
    });
  } catch (error) {
    logger.error('Receipt generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate receipt'
    });
  }
});
```

### 4. WebSocket Event Implementation

```javascript
// Payment WebSocket events
const paymentSocketHandler = (io) => {
  // Join payment-specific rooms
  io.on('connection', (socket) => {
    socket.on('join:payment', ({ paymentId, orderId, restaurantId }) => {
      socket.join(`payment:${paymentId}`);
      socket.join(`order:${orderId}`);
      socket.join(`restaurant:${restaurantId}:payments`);
    });

    socket.on('leave:payment', ({ paymentId, orderId, restaurantId }) => {
      socket.leave(`payment:${paymentId}`);
      socket.leave(`order:${orderId}`);
      socket.leave(`restaurant:${restaurantId}:payments`);
    });
  });
};

// Event emission functions
async function emitPaymentEvent(eventType, data) {
  const { paymentId, orderId, restaurantId } = data;

  // Emit to specific payment watchers
  io.to(`payment:${paymentId}`).emit(eventType, data);

  // Emit to order watchers
  io.to(`order:${orderId}`).emit(eventType, data);

  // Emit to restaurant dashboard
  io.to(`restaurant:${restaurantId}:payments`).emit(eventType, data);

  // Emit to admin dashboard
  io.to('admin:payments').emit(eventType, {
    ...data,
    timestamp: new Date().toISOString()
  });
}

// Real-time payment status updates
async function broadcastPaymentStatusUpdate(paymentId, previousStatus, newStatus, details = {}) {
  const payment = await getPaymentById(paymentId);

  const eventData = {
    paymentId,
    orderId: payment.orderId,
    restaurantId: payment.restaurantId,
    previousStatus,
    newStatus,
    amount: payment.totalAmount,
    method: payment.method,
    updatedAt: new Date().toISOString(),
    ...details
  };

  await emitPaymentEvent('payment:status_updated', eventData);
}
```

### 5. Security Implementation

```javascript
// Rate limiting for payment endpoints
const paymentRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 payment requests per windowMs
  message: 'Too many payment requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Payment amount validation
function validatePaymentAmount(amount, orderId) {
  // Verify amount matches order total
  // Prevent amount tampering
  // Check for reasonable limits
}

// PCI DSS compliance measures
const pciComplianceMiddleware = (req, res, next) => {
  // Never log sensitive payment data
  // Ensure HTTPS only for payment endpoints
  // Validate all payment inputs
  // Implement proper session management
  next();
};

// Webhook signature verification
function verifyWebhookSignature(req, res, next) {
  const sig = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    req.stripeEvent = event;
    next();
  } catch (err) {
    logger.error('Webhook signature verification failed:', err);
    return res.status(400).send('Invalid signature');
  }
}
```

### 6. Error Handling & Recovery

```javascript
// Payment error handling
class PaymentError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'PaymentError';
    this.code = code;
    this.details = details;
  }
}

// Retry logic for failed payments
async function retryFailedPayment(paymentId, maxRetries = 3) {
  const payment = await getPaymentById(paymentId);

  if (payment.retryCount >= maxRetries) {
    await updatePaymentStatus(paymentId, 'FAILED', {
      failureReason: 'Max retry attempts reached'
    });
    return false;
  }

  try {
    // Retry payment processing logic
    await processPaymentRetry(payment);
    return true;
  } catch (error) {
    await incrementPaymentRetryCount(paymentId);
    throw error;
  }
}

// Dead letter queue for webhook failures
async function handleWebhookFailure(event, error) {
  await storeFailedWebhookEvent({
    eventId: event.id,
    eventType: event.type,
    error: error.message,
    payload: event,
    attemptCount: 1,
    nextRetryAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
  });
}
```

### 7. Analytics & Reporting

```javascript
// Payment metrics calculation
async function calculatePaymentMetrics(restaurantId, dateRange) {
  const payments = await getPaymentsByRestaurantAndDateRange(restaurantId, dateRange);

  return {
    totalRevenue: payments
      .filter(p => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.totalAmount, 0),

    totalTransactions: payments.length,

    successfulTransactions: payments.filter(p => p.status === 'COMPLETED').length,

    successRate: payments.length > 0
      ? (payments.filter(p => p.status === 'COMPLETED').length / payments.length) * 100
      : 0,

    averageTransactionValue: payments.length > 0
      ? payments.reduce((sum, p) => sum + p.totalAmount, 0) / payments.length
      : 0,

    paymentMethodBreakdown: calculateMethodBreakdown(payments),

    hourlyData: calculateHourlyData(payments),

    failureRate: payments.length > 0
      ? (payments.filter(p => p.status === 'FAILED').length / payments.length) * 100
      : 0
  };
}

// Real-time analytics updates
async function updatePaymentAnalytics(paymentId, eventType) {
  const payment = await getPaymentById(paymentId);

  // Update cached metrics
  await updateCachedMetrics(payment.restaurantId, eventType, payment);

  // Emit analytics update event
  await emitPaymentEvent('analytics:updated', {
    restaurantId: payment.restaurantId,
    metric: 'payments',
    eventType,
    timestamp: new Date().toISOString()
  });
}
```

## Environment Variables Required

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...              # Stripe secret key
STRIPE_PUBLISHABLE_KEY=pk_test_...         # Stripe publishable key
STRIPE_WEBHOOK_SECRET=whsec_...            # Webhook endpoint secret
STRIPE_API_VERSION=2023-10-16              # Stripe API version

# Payment Configuration
PAYMENT_CURRENCY=USD                        # Default currency
PAYMENT_TIMEOUT_MINUTES=60                  # Payment intent expiration
MAX_PAYMENT_AMOUNT=50000                    # Max payment in cents ($500)
MIN_PAYMENT_AMOUNT=50                       # Min payment in cents ($0.50)

# Webhook Configuration
WEBHOOK_BASE_URL=https://api.tabsy.com      # Base URL for webhooks
WEBHOOK_RETRY_ATTEMPTS=3                    # Max webhook retry attempts
WEBHOOK_RETRY_DELAY_MS=5000                # Retry delay

# Security
PAYMENT_RATE_LIMIT_PER_HOUR=100            # Rate limit per IP
WEBHOOK_SIGNATURE_TOLERANCE=300             # Stripe signature tolerance (seconds)
```

## Testing Requirements

### Unit Tests
- Payment intent creation and validation
- Split payment logic and amount validation
- Webhook signature verification
- Error handling and retry logic
- Payment status transitions

### Integration Tests
- End-to-end payment flow (create → process → complete)
- Stripe webhook processing
- Split payment coordination
- Receipt generation
- WebSocket event emission

### Load Tests
- Payment processing under load
- Webhook handling capacity
- Database performance with high payment volume
- WebSocket connection scaling

## Production Deployment Checklist

### Stripe Configuration
- [ ] Live Stripe keys configured
- [ ] Webhook endpoints properly configured in Stripe dashboard
- [ ] Webhook URL accessible and HTTPS-enabled
- [ ] Payment methods enabled (card, Apple Pay, Google Pay)
- [ ] Currency and country settings configured

### Security
- [ ] PCI DSS compliance measures implemented
- [ ] Rate limiting configured
- [ ] Webhook signature verification working
- [ ] HTTPS enforced for all payment endpoints
- [ ] Sensitive data logging disabled

### Monitoring
- [ ] Payment success/failure rate monitoring
- [ ] Webhook delivery monitoring
- [ ] Database performance monitoring
- [ ] Error rate tracking and alerting
- [ ] Real-time payment analytics dashboard

### Business Requirements
- [ ] Tax calculation integration (if required)
- [ ] Accounting system integration
- [ ] Compliance with local payment regulations
- [ ] Refund policy implementation
- [ ] Dispute handling process

## Success Metrics

### Technical KPIs
- Payment success rate > 99%
- Payment processing time < 3 seconds
- Webhook processing < 1 second
- Zero payment data loss
- 99.9% uptime for payment system

### Business KPIs
- Customer payment completion rate > 95%
- Split payment adoption rate
- Average payment processing time
- Customer satisfaction with payment experience
- Revenue processing accuracy 100%

## Implementation Priority

### Phase 1: Core Payment Processing (Week 1-2)
1. Database schema implementation
2. Basic payment intent creation
3. Stripe integration setup
4. Core webhook handler
5. Basic API endpoints

### Phase 2: Advanced Features (Week 2-3)
1. Split payment implementation
2. Receipt generation
3. WebSocket real-time events
4. Payment analytics
5. Error handling and retry logic

### Phase 3: Production Readiness (Week 3-4)
1. Security hardening
2. Performance optimization
3. Monitoring and logging
4. Load testing
5. Documentation and deployment

## Frontend Integration Notes

The frontend implementation is complete and production-ready. Once the backend is implemented:

1. **Update environment variables** with actual Stripe keys
2. **Test webhook delivery** to ensure real-time updates work
3. **Verify API response formats** match frontend expectations
4. **Test error scenarios** to ensure graceful degradation
5. **Performance test** the complete payment flow
6. **Security audit** the integration

The frontend error handling is designed to gracefully handle missing backend APIs and will work seamlessly once the backend is deployed.