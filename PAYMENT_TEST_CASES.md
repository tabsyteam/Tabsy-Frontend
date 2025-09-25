# Payment System Test Cases & Scenarios

**Project:** Tabsy Payment System Testing Strategy
**Coverage:** All 7 use cases + edge cases + concurrency scenarios
**Framework:** Jest + Playwright + Artillery.io for load testing

---

## 🎯 Testing Strategy Overview

This document provides comprehensive test cases covering all payment scenarios identified in the audit. Each test case includes setup procedures, expected behaviors, success criteria, and edge case variations.

### Test Environment Requirements
- **Development:** Full test database with realistic data volume
- **Staging:** Production-like environment with Stripe test mode
- **Performance:** Load testing with 100+ concurrent users
- **Security:** Penetration testing and vulnerability scanning

---

## 🔬 Use Case 1: Single Guest - Same QR, Same Session

### Test Case 1.1: Happy Path - Single Guest Payment
**Priority:** CRITICAL | **Type:** E2E | **Duration:** 5 minutes

```typescript
describe('Single Guest Payment Flow', () => {
  test('complete payment journey from QR scan to success', async () => {
    const { page, restaurant, table } = await setupTestEnvironment()

    // Step 1: QR Code Scan
    await page.goto(`/qr/${restaurant.id}/${table.id}`)

    // Step 2: Session Creation
    await expect(page.locator('[data-testid="table-info"]')).toBeVisible()
    const sessionData = await getSessionFromStorage(page)
    expect(sessionData.tableId).toBe(table.id)
    expect(sessionData.restaurantId).toBe(restaurant.id)

    // Step 3: Menu Navigation & Ordering
    await page.click('[data-testid="menu-item-1"]')
    await page.click('[data-testid="add-to-order"]')
    await page.click('[data-testid="place-order"]')

    // Wait for order confirmation
    await expect(page.locator('[data-testid="order-success"]')).toBeVisible()

    // Step 4: Payment Flow
    await page.click('[data-testid="pay-now"]')

    // Verify payment form loads
    await expect(page.locator('[data-testid="payment-view"]')).toBeVisible()

    // Step 5: Payment Processing
    await page.fill('[data-testid="card-number"]', '4242424242424242')
    await page.fill('[data-testid="card-expiry"]', '12/25')
    await page.fill('[data-testid="card-cvc"]', '123')

    await page.click('[data-testid="complete-payment"]')

    // Step 6: Success Verification
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible({
      timeout: 30000
    })

    // Verify session cleanup
    const finalSessionData = await getSessionFromStorage(page)
    expect(finalSessionData).toBeNull() // Session should be cleared
  })
})
```

**Expected Results:**
- Session creates successfully with 3-hour expiration
- Order placement works without errors
- Payment processes within 30 seconds
- Success page displays with receipt
- Session data is cleared post-payment
- Database records are consistent

**Edge Cases to Test:**
```typescript
test('handles session expiry during payment', async () => {
  // Expire session mid-payment and verify recovery
})

test('handles payment failure and retry', async () => {
  // Use failing test card, verify error handling and retry flow
})

test('handles network interruption during payment', async () => {
  // Simulate network failure, verify recovery mechanisms
})
```

---

## 🔬 Use Case 2: Two Guests - Same QR, Different Sessions, One Payer

### Test Case 2.1: Dual Guest Session with Single Payment
**Priority:** HIGH | **Type:** Integration | **Duration:** 8 minutes

```typescript
describe('Multi-Guest Single Payer Scenario', () => {
  test('two guests order separately, one pays for all', async () => {
    const { restaurant, table } = await setupTestEnvironment()

    // Setup two browser contexts for concurrent users
    const guest1Context = await browser.newContext()
    const guest2Context = await browser.newContext()

    const guest1Page = await guest1Context.newPage()
    const guest2Page = await guest2Context.newPage()

    // Step 1: Both guests scan QR and create sessions
    await Promise.all([
      guest1Page.goto(`/qr/${restaurant.id}/${table.id}`),
      guest2Page.goto(`/qr/${restaurant.id}/${table.id}`)
    ])

    // Verify both guests joined the same table session
    const guest1Session = await getSessionFromStorage(guest1Page)
    const guest2Session = await getSessionFromStorage(guest2Page)

    expect(guest1Session.tableSessionId).toBe(guest2Session.tableSessionId)
    expect(guest1Session.sessionId).not.toBe(guest2Session.sessionId) // Different guest sessions

    // Step 2: Both guests place orders
    await placeOrderForGuest(guest1Page, ['item-1', 'item-2'])
    await placeOrderForGuest(guest2Page, ['item-3', 'item-4'])

    // Step 3: Verify both orders appear in table session
    await guest1Page.goto('/table/bill')
    const billData = await getBillData(guest1Page)

    expect(billData.orders).toHaveLength(2)
    expect(billData.totalAmount).toBeGreaterThan(0)
    expect(billData.remainingBalance).toBe(billData.totalAmount)

    // Step 4: Guest 1 pays for entire table
    await guest1Page.click('[data-testid="pay-full-amount"]')

    // Verify payment amount includes both orders
    const paymentAmount = await getPaymentAmount(guest1Page)
    expect(paymentAmount).toBe(billData.totalAmount)

    // Step 5: Complete payment
    await completePayment(guest1Page, {
      cardNumber: '4242424242424242',
      expiry: '12/25',
      cvc: '123'
    })

    // Step 6: Verify payment success for both guests
    await expect(guest1Page.locator('[data-testid="payment-success"]')).toBeVisible()

    // Guest 2 should also see payment completed
    await guest2Page.reload()
    await expect(guest2Page.locator('[data-testid="bill-paid"]')).toBeVisible()

    // Step 7: Verify database state
    const tableSession = await getTableSessionFromDB(guest1Session.tableSessionId)
    expect(tableSession.status).toBe('PAYMENT_COMPLETE')
    expect(tableSession.paidAmount).toBe(tableSession.totalAmount)

    // Both guest sessions should be cleaned up
    await wait(2000) // Allow cleanup to complete
    const guest1FinalSession = await getSessionFromStorage(guest1Page)
    const guest2FinalSession = await getSessionFromStorage(guest2Page)
    expect(guest1FinalSession).toBeNull()
    expect(guest2FinalSession).toBeNull()
  })
})
```

**Edge Cases:**
```typescript
test('handles guest leaving before payment completes', async () => {
  // One guest closes browser/tab during payment by other guest
})

test('handles payment with custom tips from paying guest', async () => {
  // Verify tip is applied to total bill, not individual orders
})

test('handles order modifications after initial orders placed', async () => {
  // Guest adds/removes items before payment starts
})
```

---

## 🔬 Use Case 3: Two Guests - Sequential Separate Payments

### Test Case 3.1: Sequential Payment Processing
**Priority:** HIGH | **Type:** Integration | **Duration:** 10 minutes

```typescript
describe('Sequential Separate Payments', () => {
  test('guest A pays, then guest B pays later', async () => {
    const { restaurant, table } = await setupMultiGuestEnvironment()

    // Phase 1: Both guests order
    const { guest1Page, guest2Page } = await setupTwoGuests(restaurant.id, table.id)

    await placeOrderForGuest(guest1Page, ['appetizer-1'], {
      guestName: 'Alice',
      amount: 15.00
    })
    await placeOrderForGuest(guest2Page, ['main-course-1'], {
      guestName: 'Bob',
      amount: 25.00
    })

    // Phase 2: Guest 1 pays for their order only
    await guest1Page.goto('/table/bill')
    await guest1Page.click('[data-testid="pay-my-items"]')

    // Verify payment amount is only Guest 1's orders
    const guest1PaymentAmount = await getPaymentAmount(guest1Page)
    expect(guest1PaymentAmount).toBe(15.00)

    await completePayment(guest1Page, testCard.valid)

    // Verify Guest 1 payment success
    await expect(guest1Page.locator('[data-testid="payment-success"]')).toBeVisible()

    // Phase 3: Verify table state after first payment
    const billAfterGuest1 = await getBillFromAPI(guest1Page)
    expect(billAfterGuest1.totalAmount).toBe(40.00) // Both orders
    expect(billAfterGuest1.paidAmount).toBe(15.00)  // Only Guest 1 paid
    expect(billAfterGuest1.remainingBalance).toBe(25.00) // Guest 2's order

    // Guest 2 should see updated bill
    await guest2Page.reload()
    await guest2Page.goto('/table/bill')
    const guest2BillView = await getBillData(guest2Page)
    expect(guest2BillView.remainingBalance).toBe(25.00)
    expect(guest2BillView.paidItems).toContain('Alice\'s order')

    // Phase 4: Guest 2 pays for their order
    await guest2Page.click('[data-testid="pay-remaining-amount"]')

    const guest2PaymentAmount = await getPaymentAmount(guest2Page)
    expect(guest2PaymentAmount).toBe(25.00)

    await completePayment(guest2Page, testCard.valid)

    // Phase 5: Verify final state
    await expect(guest2Page.locator('[data-testid="payment-success"]')).toBeVisible()

    const finalBillState = await getBillFromAPI(guest2Page)
    expect(finalBillState.paidAmount).toBe(40.00)
    expect(finalBillState.remainingBalance).toBe(0.00)

    // Table session should be auto-closed
    const tableSession = await getTableSessionFromDB()
    expect(tableSession.status).toBe('CLOSED')

    // Both sessions should be cleaned up
    const sessionsAfterPayment = await getActiveSessionsFromDB(table.id)
    expect(sessionsAfterPayment).toHaveLength(0)
  })
})
```

**Complex Edge Cases:**
```typescript
test('handles overlapping payment attempts during sequential payments', async () => {
  // Guest 2 starts payment while Guest 1 is still processing
})

test('handles session expiry between payments', async () => {
  // Guest 1 pays, session expires, Guest 2 tries to pay
})

test('handles additional orders after first payment', async () => {
  // Guest 2 adds more items after Guest 1 already paid
})
```

---

## 🔬 Use Case 4: Two Guests - Split Payment Across Two Payers

### Test Case 4.1: Split Bill Payment Processing
**Priority:** CRITICAL | **Type:** Integration | **Duration:** 12 minutes

```typescript
describe('Split Payment Processing', () => {
  test('guests split bill using multiple methods', async () => {
    const { guest1Page, guest2Page } = await setupTwoGuestsWithOrders({
      guest1Orders: [{ item: 'steak', price: 30.00 }],
      guest2Orders: [{ item: 'salmon', price: 25.00 }],
      sharedItems: [{ item: 'appetizer', price: 15.00 }]
    })

    const totalBill = 70.00 // 30 + 25 + 15

    // Step 1: Initiate split payment
    await guest1Page.goto('/table/bill')
    await guest1Page.click('[data-testid="split-bill"]')

    // Step 2: Choose split method - "By Items"
    await guest1Page.click('[data-testid="split-by-items"]')

    // Step 3: Assign items to users
    await assignItemToGuest(guest1Page, 'steak', 'Alice')
    await assignItemToGuest(guest1Page, 'salmon', 'Bob')
    await assignItemToGuest(guest1Page, 'appetizer', 'Shared') // Split equally

    // Step 4: Review split calculation
    const splitCalculation = await getSplitCalculation(guest1Page)
    expect(splitCalculation).toEqual({
      Alice: 37.50, // 30.00 + 7.50 (half of shared)
      Bob: 32.50    // 25.00 + 7.50 (half of shared)
    })

    // Step 5: Proceed to payment
    await guest1Page.click('[data-testid="proceed-to-split-payment"]')

    // Step 6: Both guests complete their portions
    const guest1PaymentPromise = completePayment(guest1Page, {
      amount: 37.50,
      card: testCard.valid
    })

    const guest2PaymentPromise = completePayment(guest2Page, {
      amount: 32.50,
      card: testCard.valid
    })

    // Wait for both payments to complete
    await Promise.all([guest1PaymentPromise, guest2PaymentPromise])

    // Step 7: Verify both payments succeeded
    await expect(guest1Page.locator('[data-testid="payment-success"]')).toBeVisible()
    await expect(guest2Page.locator('[data-testid="payment-success"]')).toBeVisible()

    // Step 8: Verify database consistency
    const splitPayments = await getSplitPaymentsFromDB()
    expect(splitPayments).toHaveLength(2)
    expect(splitPayments[0].amount + splitPayments[1].amount).toBe(70.00)
    expect(splitPayments[0].splitPaymentGroup).toBe(splitPayments[1].splitPaymentGroup)

    // All payments should be completed
    splitPayments.forEach(payment => {
      expect(payment.status).toBe('COMPLETED')
    })
  })
})
```

**Split Payment Variations:**
```typescript
describe('Split Payment Methods', () => {
  test('equal split between N guests', async () => {
    // Split $100 bill equally between 4 guests = $25 each
  })

  test('percentage-based split', async () => {
    // Guest 1: 60%, Guest 2: 40% of total bill
  })

  test('custom amount split', async () => {
    // Guest 1: $45, Guest 2: $25 (total: $70)
  })

  test('split with different tip amounts per person', async () => {
    // Each guest adds individual tip to their portion
  })
})
```

**Split Payment Edge Cases:**
```typescript
test('handles split payment with one failed payment', async () => {
  // Guest 1 payment succeeds, Guest 2 fails -> rollback or partial completion?
})

test('handles guest leaving during split payment setup', async () => {
  // Guest disconnects while configuring split -> remaining guests continue
})

test('handles split payment timeout', async () => {
  // One guest takes too long to pay their portion
})
```

---

## 🔬 Use Case 5: Two Guests - Simultaneous Payments

### Test Case 5.1: Concurrent Payment Attempts
**Priority:** CRITICAL | **Type:** Load/Concurrency | **Duration:** 3 minutes

```typescript
describe('Simultaneous Payment Processing', () => {
  test('handles exactly simultaneous payment attempts', async () => {
    const { guest1Page, guest2Page } = await setupTwoGuestsWithOrders()

    // Both guests navigate to payment at same time
    await Promise.all([
      guest1Page.goto('/payment?type=table_session'),
      guest2Page.goto('/payment?type=table_session')
    ])

    // Both click "Initialize Payment" at exactly the same time
    const guest1PaymentIntentPromise = guest1Page.click('[data-testid="initialize-payment"]')
    const guest2PaymentIntentPromise = guest2Page.click('[data-testid="initialize-payment"]')

    await Promise.all([guest1PaymentIntentPromise, guest2PaymentIntentPromise])

    // Expected behavior: Only one should succeed, other should be blocked
    await page.waitForTimeout(2000) // Allow backend processing

    const guest1State = await getPaymentState(guest1Page)
    const guest2State = await getPaymentState(guest2Page)

    // One should have payment form ready, other should show conflict message
    const successfulStates = [guest1State, guest2State].filter(state =>
      state === 'PAYMENT_READY'
    )
    const blockedStates = [guest1State, guest2State].filter(state =>
      state === 'PAYMENT_CONFLICT'
    )

    expect(successfulStates).toHaveLength(1)
    expect(blockedStates).toHaveLength(1)

    // The successful guest completes payment
    const successfulPage = guest1State === 'PAYMENT_READY' ? guest1Page : guest2Page
    await completePayment(successfulPage, testCard.valid)

    // Verify payment completed successfully
    await expect(successfulPage.locator('[data-testid="payment-success"]')).toBeVisible()

    // The blocked guest should see payment completed notification
    const blockedPage = guest1State === 'PAYMENT_CONFLICT' ? guest1Page : guest2Page
    await expect(blockedPage.locator('[data-testid="payment-completed-by-other"]')).toBeVisible()
  })
})
```

**High-Concurrency Tests:**
```typescript
describe('High Concurrency Scenarios', () => {
  test('100 simultaneous payment attempts across different tables', async () => {
    const tables = await createTestTables(100)
    const paymentPromises = tables.map(table =>
      attemptPayment(table.id, testCard.valid)
    )

    const results = await Promise.all(paymentPromises)

    // All payments should succeed (different tables)
    results.forEach(result => {
      expect(result.success).toBe(true)
    })
  })

  test('stress test: 10 guests per table, 20 tables, simultaneous payments', async () => {
    // Create realistic load scenario
    const scenario = await createHighLoadScenario({
      tables: 20,
      guestsPerTable: 10,
      simultaneousPaymentAttempts: 50
    })

    const results = await executeLoadTest(scenario)

    expect(results.successRate).toBeGreaterThan(0.98) // 98% success rate
    expect(results.averageResponseTime).toBeLessThan(30000) // 30 second max
    expect(results.concurrencyConflicts).toBeLessThan(5) // Minimal conflicts
  })
})
```

---

## 🔬 Use Case 6: New Guest After Payments Completed

### Test Case 6.1: Post-Payment Guest Arrival
**Priority:** MEDIUM | **Type:** Integration | **Duration:** 6 minutes

```typescript
describe('New Guest After Payment Completion', () => {
  test('new guest arrives after table bill fully paid', async () => {
    // Phase 1: Complete full payment cycle
    const { tableId, restaurantId } = await completeFullPaymentCycle()

    // Verify table session is in PAYMENT_COMPLETE state
    const tableSession = await getTableSessionFromDB(tableId)
    expect(tableSession.status).toBe('PAYMENT_COMPLETE')
    expect(tableSession.gracePeriodExpiresAt).toBeTruthy()

    // Phase 2: New guest arrives during grace period
    const newGuestPage = await browser.newPage()
    await newGuestPage.goto(`/qr/${restaurantId}/${tableId}`)

    // Should show option to reactivate session or start new one
    await expect(newGuestPage.locator('[data-testid="session-options"]')).toBeVisible()

    const options = await getSessionOptions(newGuestPage)
    expect(options).toContain('Join existing session')
    expect(options).toContain('Start new session')

    // Phase 3: Test reactivation of existing session
    await newGuestPage.click('[data-testid="join-existing-session"]')

    // Should reactivate the table session
    const reactivatedSession = await getSessionFromStorage(newGuestPage)
    expect(reactivatedSession.tableSessionId).toBe(tableSession.id)

    // New guest should see previous orders marked as paid
    await newGuestPage.goto('/table/bill')
    const billHistory = await getBillHistory(newGuestPage)
    expect(billHistory.previousPayments).toHaveLength(1)
    expect(billHistory.remainingBalance).toBe(0)

    // Phase 4: New guest places order
    await placeOrderForGuest(newGuestPage, ['dessert-1'], { amount: 8.00 })

    // Bill should show new order
    const updatedBill = await getBillData(newGuestPage)
    expect(updatedBill.remainingBalance).toBe(8.00)
    expect(updatedBill.totalAmount).toBeGreaterThan(8.00) // Previous + new

    // Phase 5: New guest pays for their order
    await completePaymentForAmount(newGuestPage, 8.00)

    // Payment should succeed
    await expect(newGuestPage.locator('[data-testid="payment-success"]')).toBeVisible()
  })
})
```

**Grace Period Edge Cases:**
```typescript
test('new guest arrives after grace period expires', async () => {
  // Grace period expired -> should force new table session
})

test('multiple new guests arrive simultaneously after payment', async () => {
  // Test concurrent new guest session creation
})

test('original guest returns after payment completion', async () => {
  // Guest who paid earlier returns to same table
})
```

---

## 🔬 Use Case 7: Session Expiry and Client State Management

### Test Case 7.1: Session State Synchronization
**Priority:** HIGH | **Type:** Integration | **Duration:** 8 minutes

```typescript
describe('Session Expiry and State Management', () => {
  test('handles session expiry during payment process', async () => {
    const { guestPage, tableSessionId } = await createGuestWithOrder()

    // Navigate to payment page
    await guestPage.goto('/payment')
    await expect(guestPage.locator('[data-testid="payment-view"]')).toBeVisible()

    // Simulate session expiry on backend
    await expireSessionInDatabase(tableSessionId)

    // Attempt to initialize payment (should trigger session recovery)
    await guestPage.click('[data-testid="initialize-payment"]')

    // Should show session recovery message
    await expect(guestPage.locator('[data-testid="session-recovery"]')).toBeVisible()

    // Recovery should attempt to restore session
    await expect(guestPage.locator('[data-testid="recovery-success"]')).toBeVisible({
      timeout: 10000
    })

    // Payment should proceed normally after recovery
    await expect(guestPage.locator('[data-testid="payment-form"]')).toBeVisible()

    // Complete payment to verify full functionality
    await completePayment(guestPage, testCard.valid)
    await expect(guestPage.locator('[data-testid="payment-success"]')).toBeVisible()
  })

  test('clears stale client state after payment completion', async () => {
    const guestPage = await completeFullPaymentFlow()

    // Verify client state is cleared
    const sessionStorage = await guestPage.evaluate(() => {
      return {
        diningSession: sessionStorage.getItem('diningSession'),
        tableSession: sessionStorage.getItem('tableSession'),
        paymentState: sessionStorage.getItem('paymentState')
      }
    })

    expect(sessionStorage.diningSession).toBeNull()
    expect(sessionStorage.tableSession).toBeNull()
    expect(sessionStorage.paymentState).toBeNull()

    // Navigate to different page and back
    await guestPage.goto('/')
    await guestPage.goto('/payment')

    // Should redirect to home (no valid session)
    await expect(guestPage).toHaveURL('/')

    // Local storage should remain clean
    const localStorageAfterNav = await guestPage.evaluate(() =>
      localStorage.getItem('diningSession')
    )
    expect(localStorageAfterNav).toBeNull()
  })

  test('handles browser refresh during payment flow', async () => {
    const { guestPage, orderId } = await createGuestWithOrder()

    // Start payment process
    await guestPage.goto(`/payment?order=${orderId}`)
    await guestPage.click('[data-testid="initialize-payment"]')

    // Wait for payment intent to be created
    await expect(guestPage.locator('[data-testid="payment-form"]')).toBeVisible()

    // Simulate browser refresh
    await guestPage.reload()

    // Should recover payment state
    await expect(guestPage.locator('[data-testid="payment-form"]')).toBeVisible({
      timeout: 5000
    })

    // Payment form should still work
    await completePayment(guestPage, testCard.valid)
    await expect(guestPage.locator('[data-testid="payment-success"]')).toBeVisible()
  })
})
```

**State Management Edge Cases:**
```typescript
test('handles multiple browser tabs with same session', async () => {
  // Tab 1: Complete payment
  // Tab 2: Should detect payment completion and sync state
})

test('handles offline/online transitions during payment', async () => {
  // Go offline during payment -> come back online -> resume payment
})

test('handles session recovery after app crash/restart', async () => {
  // Simulate app restart, verify session recovery works
})
```

---

## 🎭 Load Testing & Performance Scenarios

### Load Test 1: High-Volume Concurrent Payments
```javascript
// Artillery.io configuration
module.exports = {
  config: {
    target: 'https://api-staging.tabsy.com',
    phases: [
      { duration: '2m', arrivalRate: 10 }, // Ramp up
      { duration: '5m', arrivalRate: 50 }, // Sustained load
      { duration: '2m', arrivalRate: 100 }, // Peak load
    ],
    payload: {
      path: './test-data/restaurants.csv'
    }
  },
  scenarios: [
    {
      name: 'Concurrent Payment Processing',
      weight: 70,
      flow: [
        { function: 'createGuestSession' },
        { function: 'placeOrder' },
        { function: 'initiatePayment' },
        { function: 'completePayment' },
        { function: 'verifyPaymentSuccess' }
      ]
    },
    {
      name: 'Split Payment Processing',
      weight: 30,
      flow: [
        { function: 'createMultipleGuestSessions' },
        { function: 'placeMultipleOrders' },
        { function: 'initiateSplitPayment' },
        { function: 'completeSplitPayments' },
        { function: 'verifySplitSuccess' }
      ]
    }
  ]
}
```

### Performance Benchmarks
```typescript
describe('Performance Benchmarks', () => {
  test('payment processing under load', async () => {
    const results = await runLoadTest({
      concurrentUsers: 100,
      testDuration: '10m',
      paymentRequestsPerSecond: 50
    })

    expect(results.averageResponseTime).toBeLessThan(30000) // 30s
    expect(results.p95ResponseTime).toBeLessThan(45000) // 45s
    expect(results.errorRate).toBeLessThan(0.02) // <2% errors
    expect(results.throughput).toBeGreaterThan(45) // >45 req/s
  })

  test('database performance under concurrent payments', async () => {
    const dbMetrics = await monitorDatabaseDuringLoad({
      testDuration: '5m',
      concurrentPayments: 200
    })

    expect(dbMetrics.averageQueryTime).toBeLessThan(100) // 100ms
    expect(dbMetrics.connectionPoolUtilization).toBeLessThan(0.8) // <80%
    expect(dbMetrics.deadlocks).toBe(0) // No deadlocks
    expect(dbMetrics.transactionRollbacks).toBeLessThan(5) // Minimal rollbacks
  })
})
```

---

## 🛡️ Security Testing Scenarios

### Security Test 1: Payment Amount Manipulation
```typescript
describe('Security: Payment Amount Validation', () => {
  test('prevents client-side amount tampering', async () => {
    const { guestPage, orderId } = await createGuestWithOrder({ amount: 25.00 })

    // Navigate to payment page
    await guestPage.goto(`/payment?order=${orderId}`)

    // Attempt to manipulate payment amount via browser console
    await guestPage.evaluate(() => {
      // Try to modify payment amount in local storage
      localStorage.setItem('paymentAmount', '1.00')

      // Try to modify order total in session storage
      const session = JSON.parse(sessionStorage.getItem('diningSession') || '{}')
      session.orderTotal = 1.00
      sessionStorage.setItem('diningSession', JSON.stringify(session))
    })

    // Initialize payment
    await guestPage.click('[data-testid="initialize-payment"]')

    // Server should reject manipulated amount
    const paymentIntent = await getPaymentIntentFromBackend(orderId)
    expect(paymentIntent.amount).toBe(2500) // Original amount in cents

    // Payment form should show correct amount
    const displayedAmount = await guestPage.textContent('[data-testid="payment-amount"]')
    expect(displayedAmount).toBe('$25.00')
  })

  test('prevents session hijacking', async () => {
    const guest1Session = await createGuestSession()
    const guest2Page = await browser.newPage()

    // Attempt to use Guest 1's session ID in Guest 2's browser
    await guest2Page.evaluate((sessionId) => {
      localStorage.setItem('diningSession', JSON.stringify({
        sessionId: sessionId,
        // ... other session data
      }))
    }, guest1Session.sessionId)

    // Attempt to access payment for Guest 1's order
    await guest2Page.goto(`/payment?order=${guest1Session.orderId}`)

    // Should be redirected or show error
    await expect(guest2Page.locator('[data-testid="unauthorized-error"]')).toBeVisible()
  })
})
```

### Security Test 2: SQL Injection & XSS Prevention
```typescript
describe('Security: Injection Prevention', () => {
  test('prevents SQL injection in payment parameters', async () => {
    const maliciousPayloads = [
      "'; DROP TABLE payments; --",
      "1' OR '1'='1",
      "'; UPDATE payments SET amount = 0; --"
    ]

    for (const payload of maliciousPayloads) {
      const response = await apiRequest('POST', '/api/v1/payments', {
        orderId: payload,
        paymentMethod: 'CREDIT_CARD'
      })

      expect(response.status).toBe(400) // Bad request
      expect(response.data.error).toContain('validation')
    }
  })

  test('prevents XSS in payment success messages', async () => {
    const xssPayload = '<script>alert("XSS")</script>'

    const { guestPage } = await completePaymentWithGuestName(xssPayload)

    // Success page should escape the script
    const successMessage = await guestPage.innerHTML('[data-testid="success-message"]')
    expect(successMessage).not.toContain('<script>')
    expect(successMessage).toContain('&lt;script&gt;')
  })
})
```

---

## 🔧 Test Utilities & Helpers

### Test Setup Utilities
```typescript
// Test environment setup
export async function setupTestEnvironment() {
  const restaurant = await createTestRestaurant({
    name: 'Test Restaurant',
    active: true
  })

  const table = await createTestTable({
    restaurantId: restaurant.id,
    tableNumber: 'T1',
    seats: 4
  })

  const menu = await createTestMenu({
    restaurantId: restaurant.id,
    items: [
      { name: 'Test Item 1', price: 15.00 },
      { name: 'Test Item 2', price: 25.00 },
      { name: 'Shared Appetizer', price: 12.00 }
    ]
  })

  return { restaurant, table, menu }
}

// Guest session utilities
export async function createGuestWithOrder(options = {}) {
  const { restaurant, table } = await setupTestEnvironment()
  const page = await browser.newPage()

  await page.goto(`/qr/${restaurant.id}/${table.id}`)
  await page.waitForSelector('[data-testid="menu-items"]')

  const orderItems = options.items || ['test-item-1']
  for (const item of orderItems) {
    await page.click(`[data-testid="${item}"]`)
  }

  await page.click('[data-testid="place-order"]')
  await page.waitForSelector('[data-testid="order-success"]')

  const orderId = await getOrderIdFromPage(page)
  const sessionData = await getSessionFromStorage(page)

  return { guestPage: page, orderId, sessionData, restaurant, table }
}

// Payment completion utilities
export async function completePayment(page, cardDetails) {
  await page.fill('[data-testid="card-number"]', cardDetails.cardNumber)
  await page.fill('[data-testid="card-expiry"]', cardDetails.expiry)
  await page.fill('[data-testid="card-cvc"]', cardDetails.cvc)

  await page.click('[data-testid="complete-payment"]')

  return page.waitForSelector('[data-testid="payment-success"]', {
    timeout: 30000
  })
}

// Database verification utilities
export async function verifyPaymentInDatabase(paymentId, expectedStatus = 'COMPLETED') {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { order: true }
  })

  expect(payment).toBeTruthy()
  expect(payment.status).toBe(expectedStatus)
  expect(payment.stripePaymentId).toBeTruthy()

  return payment
}
```

### Mock Data & Test Cards
```typescript
// Test payment methods
export const testCards = {
  valid: {
    cardNumber: '4242424242424242',
    expiry: '12/25',
    cvc: '123'
  },
  declined: {
    cardNumber: '4000000000000002',
    expiry: '12/25',
    cvc: '123'
  },
  insufficientFunds: {
    cardNumber: '4000000000009995',
    expiry: '12/25',
    cvc: '123'
  },
  requiresAuthentication: {
    cardNumber: '4000002500003155',
    expiry: '12/25',
    cvc: '123'
  }
}

// Test data factories
export function createTestOrder(overrides = {}) {
  return {
    id: uuid(),
    orderNumber: `TEST-${Date.now()}`,
    subtotal: 20.00,
    tax: 2.00,
    tip: 3.00,
    total: 25.00,
    status: 'RECEIVED',
    ...overrides
  }
}
```

---

## 📊 Test Execution & Reporting

### Test Execution Strategy
```bash
# Unit tests (fast feedback)
npm run test:unit --coverage

# Integration tests (comprehensive)
npm run test:integration --reporter=json > test-results.json

# E2E tests (real browser testing)
npm run test:e2e --headed --workers=4

# Load tests (performance validation)
npm run test:load --config=load-test.config.js

# Security tests (vulnerability scanning)
npm run test:security --scan=payments
```

### Test Reporting & Metrics
```typescript
interface TestResults {
  totalTests: number
  passedTests: number
  failedTests: number
  skippedTests: number
  coverage: {
    statements: number
    branches: number
    functions: number
    lines: number
  }
  performance: {
    averageTestDuration: number
    slowestTest: string
    totalExecutionTime: number
  }
  security: {
    vulnerabilities: number
    criticalIssues: number
    recommendations: string[]
  }
}
```

### Continuous Integration
```yaml
# GitHub Actions workflow
name: Payment System Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup test environment
        run: docker-compose up -d test-db test-redis
      - name: Run unit tests
        run: npm run test:unit
      - name: Run integration tests
        run: npm run test:integration
      - name: Run E2E tests
        run: npm run test:e2e
      - name: Run security tests
        run: npm run test:security
      - name: Upload test results
        uses: actions/upload-artifact@v2
        with:
          name: test-results
          path: test-results/
```

---

**Test Suite Prepared By:** Senior Software Architecture Analysis
**Date:** December 24, 2024
**Coverage Target:** 95% for payment-critical code paths
**Execution Frequency:** Every commit + nightly full suite
**Review Schedule:** Monthly test strategy review