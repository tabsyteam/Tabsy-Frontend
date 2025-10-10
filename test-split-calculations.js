#!/usr/bin/env node

/**
 * Test script for split payment calculations and edge cases
 * Tests various scenarios including zero amounts, invalid percentages, etc.
 *
 * Usage: node test-split-calculations.js
 *
 * Prerequisites:
 * 1. Backend server running (tabsy-core)
 * 2. Table session with known ID and amount
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api/v1';

// Test scenarios
const testScenarios = [
  {
    name: 'Equal Split - Normal',
    description: 'Equal split among 3 users with $30 total',
    tableSessionId: 'test-session-1',
    remainingBalance: 30.00,
    splitType: 'EQUAL',
    participants: ['user1', 'user2', 'user3'],
    expectedResult: {
      user1: 10.00,
      user2: 10.00,
      user3: 10.00,
      valid: true
    }
  },
  {
    name: 'By Percentage - Perfect 100%',
    description: 'Split by percentage totaling exactly 100%',
    tableSessionId: 'test-session-2',
    remainingBalance: 50.00,
    splitType: 'BY_PERCENTAGE',
    participants: ['user1', 'user2', 'user3'],
    percentages: {
      user1: 50,    // 50% = $25
      user2: 30,    // 30% = $15
      user3: 20     // 20% = $10
    },
    expectedResult: {
      user1: 25.00,
      user2: 15.00,
      user3: 10.00,
      valid: true
    }
  },
  {
    name: 'By Percentage - Under 100%',
    description: 'Split by percentage totaling less than 100% (should warn)',
    tableSessionId: 'test-session-3',
    remainingBalance: 40.00,
    splitType: 'BY_PERCENTAGE',
    participants: ['user1', 'user2'],
    percentages: {
      user1: 40,    // 40% = $16
      user2: 30     // 30% = $12 (Total 70%, $12 unpaid)
    },
    expectedResult: {
      user1: 16.00,
      user2: 12.00,
      valid: true,
      warning: 'Incomplete split - 30% remaining ($12.00 unpaid)'
    }
  },
  {
    name: 'By Percentage - Over 100%',
    description: 'Split by percentage exceeding 100% (should fail)',
    tableSessionId: 'test-session-4',
    remainingBalance: 60.00,
    splitType: 'BY_PERCENTAGE',
    participants: ['user1', 'user2'],
    percentages: {
      user1: 60,    // 60%
      user2: 50     // 50% (Total 110%)
    },
    expectedError: 'Total percentage cannot exceed 100%'
  },
  {
    name: 'By Amount - Perfect Match',
    description: 'Split by amount totaling exactly the remaining balance',
    tableSessionId: 'test-session-5',
    remainingBalance: 45.00,
    splitType: 'BY_AMOUNT',
    participants: ['user1', 'user2', 'user3'],
    amounts: {
      user1: 20.00,
      user2: 15.00,
      user3: 10.00
    },
    expectedResult: {
      user1: 20.00,
      user2: 15.00,
      user3: 10.00,
      valid: true
    }
  },
  {
    name: 'By Amount - Under Total',
    description: 'Split by amount less than total (should warn)',
    tableSessionId: 'test-session-6',
    remainingBalance: 75.00,
    splitType: 'BY_AMOUNT',
    participants: ['user1', 'user2'],
    amounts: {
      user1: 30.00,
      user2: 20.00  // Total $50, $25 unpaid
    },
    expectedResult: {
      user1: 30.00,
      user2: 20.00,
      valid: true,
      warning: 'Incomplete split - $25.00 remaining'
    }
  },
  {
    name: 'By Amount - Exceeds Total',
    description: 'Split by amount exceeding remaining balance (should fail)',
    tableSessionId: 'test-session-7',
    remainingBalance: 25.00,
    splitType: 'BY_AMOUNT',
    participants: ['user1', 'user2'],
    amounts: {
      user1: 20.00,
      user2: 15.00  // Total $35, exceeds by $10
    },
    expectedError: 'Total amounts cannot exceed remaining balance'
  },
  {
    name: 'Zero Amount User',
    description: 'One user with $0.00 amount (should disable payment)',
    tableSessionId: 'test-session-8',
    remainingBalance: 20.00,
    splitType: 'BY_AMOUNT',
    participants: ['user1', 'user2'],
    amounts: {
      user1: 20.00,
      user2: 0.00   // User2 can't pay
    },
    expectedResult: {
      user1: 20.00,
      user2: 0.00,
      valid: true,
      paymentDisabled: ['user2']
    }
  },
  {
    name: 'Negative Amount',
    description: 'Negative amount (should fail)',
    tableSessionId: 'test-session-9',
    remainingBalance: 30.00,
    splitType: 'BY_AMOUNT',
    participants: ['user1', 'user2'],
    amounts: {
      user1: 40.00,
      user2: -10.00  // Invalid negative
    },
    expectedError: 'Invalid amount for user user2: -10'
  },
  {
    name: 'Zero Remaining Balance',
    description: 'No remaining balance to split',
    tableSessionId: 'test-session-10',
    remainingBalance: 0.00,
    splitType: 'EQUAL',
    participants: ['user1', 'user2'],
    expectedResult: {
      user1: 0.00,
      user2: 0.00,
      valid: true,
      paymentDisabled: ['user1', 'user2']
    }
  },
  {
    name: 'String Input Conversion',
    description: 'String amounts/percentages should be converted',
    tableSessionId: 'test-session-11',
    remainingBalance: 100.00,
    splitType: 'BY_PERCENTAGE',
    participants: ['user1', 'user2'],
    percentages: {
      user1: "60",    // String
      user2: "40"     // String
    },
    expectedResult: {
      user1: 60.00,
      user2: 40.00,
      valid: true
    }
  },
  {
    name: 'Floating Point Precision',
    description: 'Handle floating point calculations correctly',
    tableSessionId: 'test-session-12',
    remainingBalance: 33.33,
    splitType: 'EQUAL',
    participants: ['user1', 'user2', 'user3'],
    expectedResult: {
      user1: 11.11,
      user2: 11.11,
      user3: 11.11,
      valid: true
    }
  }
];

// Color formatting for console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

// Test a single scenario
async function testScenario(scenario) {
  log(colors.cyan, `\nTesting: ${scenario.name}`);
  log(colors.blue, scenario.description);

  try {
    // Build request data
    const requestData = {
      splitType: scenario.splitType,
      participants: scenario.participants,
      percentages: scenario.percentages,
      amounts: scenario.amounts,
      itemAssignments: scenario.itemAssignments
    };

    // Mock the API call (in real test, this would call the actual endpoint)
    const result = await calculateSplitLocally(scenario);

    // Check expected results
    if (scenario.expectedError) {
      if (result.error === scenario.expectedError) {
        log(colors.green, '✓ Expected error received: ' + result.error);
      } else {
        log(colors.red, '✗ Expected error not received');
        log(colors.red, `  Expected: ${scenario.expectedError}`);
        log(colors.red, `  Got: ${result.error || 'No error'}`);
        return false;
      }
    } else if (scenario.expectedResult) {
      let success = true;

      // Check each user's amount
      for (const userId of scenario.participants) {
        const expected = scenario.expectedResult[userId];
        const actual = result.splitAmounts[userId];

        if (Math.abs(expected - actual) > 0.01) {
          log(colors.red, `✗ Amount mismatch for ${userId}`);
          log(colors.red, `  Expected: $${expected.toFixed(2)}`);
          log(colors.red, `  Got: $${actual.toFixed(2)}`);
          success = false;
        }
      }

      // Check warnings
      if (scenario.expectedResult.warning && !result.warning) {
        log(colors.yellow, `⚠ Expected warning not present: ${scenario.expectedResult.warning}`);
      }

      // Check payment disabled users
      if (scenario.expectedResult.paymentDisabled) {
        for (const userId of scenario.expectedResult.paymentDisabled) {
          const amount = result.splitAmounts[userId];
          if (amount > 0) {
            log(colors.red, `✗ Payment should be disabled for ${userId} (amount: $${amount})`);
            success = false;
          } else {
            log(colors.green, `✓ Payment correctly disabled for ${userId}`);
          }
        }
      }

      if (success) {
        log(colors.green, '✓ Test passed');
      }
      return success;
    }

    return true;
  } catch (error) {
    log(colors.red, `✗ Test failed with error: ${error.message}`);
    return false;
  }
}

// Local calculation to simulate backend logic
async function calculateSplitLocally(scenario) {
  const { splitType, participants, remainingBalance, percentages, amounts } = scenario;
  const splitAmounts = {};
  let warning = null;

  try {
    switch (splitType) {
      case 'EQUAL':
        const equalAmount = remainingBalance / participants.length;
        participants.forEach(userId => {
          splitAmounts[userId] = Math.round(equalAmount * 100) / 100;
        });
        break;

      case 'BY_PERCENTAGE':
        const numericPercentages = {};
        if (percentages) {
          Object.entries(percentages).forEach(([userId, percentage]) => {
            numericPercentages[userId] = typeof percentage === 'string' ? parseFloat(percentage) : Number(percentage);

            if (isNaN(numericPercentages[userId]) || numericPercentages[userId] < 0 || numericPercentages[userId] > 100) {
              throw new Error(`Invalid percentage for user ${userId}: ${percentage}`);
            }
          });
        }

        const totalPercentage = Object.values(numericPercentages).reduce((sum, pct) => sum + pct, 0);

        if (totalPercentage > 100.01) {
          throw new Error('Total percentage cannot exceed 100%');
        }

        if (totalPercentage < 99.99) {
          const remainingPct = 100 - totalPercentage;
          const unpaidAmount = (remainingPct / 100) * remainingBalance;
          warning = `Incomplete split - ${remainingPct.toFixed(1)}% remaining ($${unpaidAmount.toFixed(2)} unpaid)`;
        }

        Object.entries(numericPercentages).forEach(([userId, percentage]) => {
          splitAmounts[userId] = Math.round((remainingBalance * percentage / 100) * 100) / 100;
        });
        break;

      case 'BY_AMOUNT':
        const numericAmounts = {};
        if (amounts) {
          Object.entries(amounts).forEach(([userId, amount]) => {
            numericAmounts[userId] = typeof amount === 'string' ? parseFloat(amount) : Number(amount);

            if (isNaN(numericAmounts[userId]) || numericAmounts[userId] < 0) {
              throw new Error(`Invalid amount for user ${userId}: ${amount}`);
            }
          });
        }

        const totalAmount = Object.values(numericAmounts).reduce((sum, amt) => sum + amt, 0);

        if (totalAmount > remainingBalance + 0.01) {
          throw new Error('Total amounts cannot exceed remaining balance');
        }

        if (totalAmount < remainingBalance - 0.01) {
          const remainingAmount = remainingBalance - totalAmount;
          warning = `Incomplete split - $${remainingAmount.toFixed(2)} remaining`;
        }

        Object.entries(numericAmounts).forEach(([userId, amount]) => {
          splitAmounts[userId] = Math.round(amount * 100) / 100;
        });
        break;
    }

    return {
      splitAmounts,
      valid: true,
      warning
    };
  } catch (error) {
    return {
      error: error.message,
      valid: false
    };
  }
}

// Run all tests
async function runAllTests() {
  log(colors.bright + colors.cyan, '\n====================================');
  log(colors.bright + colors.cyan, '  Split Payment Calculation Tests');
  log(colors.bright + colors.cyan, '====================================\n');

  let passedTests = 0;
  let failedTests = 0;

  for (const scenario of testScenarios) {
    const passed = await testScenario(scenario);
    if (passed) {
      passedTests++;
    } else {
      failedTests++;
    }
  }

  log(colors.bright + colors.cyan, '\n====================================');
  log(colors.bright + colors.cyan, '  Test Results');
  log(colors.bright + colors.cyan, '====================================\n');

  log(colors.green, `✓ Passed: ${passedTests}`);
  if (failedTests > 0) {
    log(colors.red, `✗ Failed: ${failedTests}`);
  }

  const totalTests = passedTests + failedTests;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);

  log(colors.cyan, `\nSuccess Rate: ${successRate}%`);

  if (failedTests === 0) {
    log(colors.bright + colors.green, '\n🎉 All tests passed!');
  } else {
    log(colors.bright + colors.yellow, '\n⚠ Some tests failed. Please review the output above.');
  }
}

// Run the tests
runAllTests();