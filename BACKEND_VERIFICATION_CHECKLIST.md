# Backend Implementation Verification Checklist

This document provides a systematic approach to verify the current backend implementation status and identify what needs to be implemented for the payment system to function properly.

## Quick Backend Health Check

### 1. API Server Status
```bash
# Test if the backend is running
curl http://localhost:5001/health

# Expected response:
{
  "success": true,
  "data": {
    "status": "healthy",
    "services": {
      "stripe": true,    # ← VERIFY THIS
      "websocket": true  # ← VERIFY THIS
    }
  }
}
```

### 2. Payment Endpoints Verification
```bash
# Test payment endpoints (should return proper responses, not 404)

# 1. Create payment intent
curl -X POST http://localhost:5001/api/v1/payments/intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"orderId": "test", "amount": 1000}'

# 2. Get payment by ID
curl http://localhost:5001/api/v1/payments/test-id \
  -H "Authorization: Bearer <token>"

# 3. Stripe webhook endpoint
curl -X POST http://localhost:5001/api/v1/payments/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}'

# 4. Restaurant payments
curl http://localhost:5001/api/v1/restaurants/test-id/payments \
  -H "Authorization: Bearer <token>"
```

### 3. Database Schema Verification
```sql
-- Check if payment-related tables exist
\dt payments;
\dt payment_refunds;
\dt split_payment_participants;
\dt payment_methods;
\dt payment_audit_log;

-- Check table structure
\d+ payments;

-- Verify enums exist
\dT+ payment_status_enum;
\dT+ payment_method_enum;
\dT+ payment_provider_enum;
```

## Detailed Implementation Assessment

### Frontend → Backend API Mapping

| Frontend API Call | Expected Backend Endpoint | Status | Notes |
|------------------|---------------------------|--------|--------|
| `payment.createIntent()` | `POST /api/v1/payments/intent` | ❓ | Check implementation |
| `payment.getById()` | `GET /api/v1/payments/:id` | ❓ | Check implementation |
| `payment.createSplit()` | `POST /api/v1/payments/split` | ❓ | Check implementation |
| `payment.getByRestaurant()` | `GET /api/v1/restaurants/:id/payments` | ❓ | Check implementation |
| `payment.getReceipt()` | `GET /api/v1/payments/:id/receipt` | ❓ | Check implementation |
| `payment.updateStatus()` | `PUT /api/v1/payments/:id/status` | ❓ | Check implementation |
| `payment.addTip()` | `PATCH /api/v1/payments/:id` | ❓ | Check implementation |
| `payment.handleStripeWebhook()` | `POST /api/v1/payments/webhooks/stripe` | ❓ | **CRITICAL** |

### Stripe Integration Checklist

#### Environment Variables
```bash
# Check if these exist in backend .env
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Stripe Webhook Configuration
1. **Stripe Dashboard Setup**:
   - Webhook endpoint: `https://your-api.com/api/v1/payments/webhooks/stripe`
   - Events to listen for:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `payment_intent.processing`
     - `payment_intent.canceled`

2. **Webhook Signature Verification**:
```javascript
// This MUST be implemented in webhook handler
const sig = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
```

#### WebSocket Events Verification

| Event Type | Emitted When | Frontend Handler | Backend Implementation |
|-----------|--------------|------------------|----------------------|
| `payment:created` | Payment intent created | ✅ Implemented | ❓ Check |
| `payment:completed` | Webhook: payment succeeded | ✅ Implemented | ❓ Check |
| `payment:failed` | Webhook: payment failed | ✅ Implemented | ❓ Check |
| `payment:status_updated` | Any status change | ✅ Implemented | ❓ Check |
| `payment:cancelled` | Payment cancelled | ✅ Implemented | ❓ Check |

## Critical Issues to Address

### 1. Database Schema Missing
If payment tables don't exist, implement the complete schema from `BACKEND_PAYMENT_REQUIREMENTS.md`.

### 2. Stripe Integration Issues
**Most likely problems:**
- Missing Stripe SDK initialization
- Webhook signature verification not implemented
- Environment variables not configured
- Payment intent creation logic missing

### 3. WebSocket Events Not Emitting
**Common issues:**
- Payment status changes not triggering WebSocket events
- Incorrect room/namespace management
- Events emitted but not reaching frontend

### 4. Split Payment Logic
**Complex implementation required:**
- Multiple payment intents for one order
- Coordination between split participants
- Status tracking across multiple payments

## Testing Strategy

### 1. Manual Testing Flow
```bash
# 1. Create a test order
curl -X POST http://localhost:5001/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{"restaurantId": "test", "items": [{"name": "test", "price": 1000}]}'

# 2. Create payment intent for order
curl -X POST http://localhost:5001/api/v1/payments/intent \
  -H "Content-Type: application/json" \
  -d '{"orderId": "order-id", "amount": 1000}'

# 3. Simulate Stripe webhook
curl -X POST http://localhost:5001/api/v1/payments/webhooks/stripe \
  -H "stripe-signature: test" \
  -d '{"type": "payment_intent.succeeded", "data": {"object": {"id": "pi_test"}}}'
```

### 2. Automated Testing
```javascript
// Test suite for payment endpoints
describe('Payment API', () => {
  test('creates payment intent', async () => {
    const response = await request(app)
      .post('/api/v1/payments/intent')
      .send({ orderId: 'test', amount: 1000 })
      .expect(200);

    expect(response.body.data.clientSecret).toBeDefined();
  });

  test('handles webhook correctly', async () => {
    const webhookPayload = createTestWebhook();

    const response = await request(app)
      .post('/api/v1/payments/webhooks/stripe')
      .set('stripe-signature', generateTestSignature(webhookPayload))
      .send(webhookPayload)
      .expect(200);
  });
});
```

## Action Items by Priority

### 🔴 CRITICAL (Do First)
1. **Verify payment endpoints exist and return proper responses**
2. **Check Stripe webhook handler implementation and signature verification**
3. **Confirm database schema exists with all payment tables**
4. **Test WebSocket payment events are being emitted**

### 🟡 HIGH (Do Soon)
5. **Verify split payment logic handles multiple participants correctly**
6. **Check receipt generation produces proper format**
7. **Test payment failure scenarios and error handling**
8. **Verify payment analytics calculations are correct**

### 🟢 MEDIUM (Do Later)
9. **Load test payment processing under stress**
10. **Security audit of payment data handling**
11. **Performance optimization of payment queries**
12. **Integration with accounting/reporting systems**

## Expected Issues and Solutions

### Issue: "404 Not Found" on Payment Endpoints
**Root Cause**: Endpoints not implemented or not properly registered
**Solution**: Implement missing endpoints following the API documentation

### Issue: Stripe Webhooks Not Working
**Root Cause**: Missing webhook signature verification or incorrect endpoint setup
**Solution**: Implement proper webhook handler with signature verification

### Issue: WebSocket Events Not Received
**Root Cause**: Events not being emitted from backend payment operations
**Solution**: Add WebSocket event emission to all payment status changes

### Issue: Split Payments Don't Complete
**Root Cause**: Complex coordination logic between multiple payment intents
**Solution**: Implement proper split payment state management and coordination

### Issue: Database Errors
**Root Cause**: Payment schema not properly implemented
**Solution**: Run database migrations with complete payment schema

## Next Steps

1. **Run Backend Verification Script** (create and execute)
2. **Review Implementation Gaps** from verification results
3. **Prioritize Critical Missing Pieces** (webhook handling, database schema)
4. **Implement Core Payment Flow** following the detailed requirements
5. **Test Integration** with existing frontend implementation
6. **Deploy and Monitor** payment system performance

## Success Criteria

✅ **Backend Ready When:**
- All 13 payment endpoints return proper responses (not 404)
- Stripe webhooks process successfully and emit WebSocket events
- Database can store and retrieve payment data correctly
- Split payments coordinate properly across multiple participants
- Real-time payment updates reach frontend applications
- Payment success rate > 99% in testing

The frontend is already production-ready and waiting for these backend implementations to become functional.