/**
 * Test Script for Split Payment Functionality
 * This script tests the split calculation API with various scenarios
 * Run from tabsy-core directory: node ../Tabsy-Frontend/test-split-payment.js
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://192.168.68.51:5001/api/v1';
const TEST_SESSION_ID = '24798ded-b64c-4ee5-b5e7-bf0f3e387e04'; // Replace with actual session ID
const TEST_USERS = [
  '97b71f3fece0dfac838d03693674e7957da929035553e5000ffc418cefd330d0',
  'f93a015bd806613b964e15d8bdb96416684ed8aa17db7cd894c6350713767ab4'
];

// Test configurations for different scenarios
const TEST_SCENARIOS = [
  {
    name: 'BY_AMOUNT with strings (original bug)',
    data: {
      splitType: 'BY_AMOUNT',
      participants: TEST_USERS,
      amounts: {
        [TEST_USERS[0]]: '4.2',  // String values that caused the bug
        [TEST_USERS[1]]: '10'
      }
    }
  },
  {
    name: 'BY_AMOUNT with numbers (fixed)',
    data: {
      splitType: 'BY_AMOUNT',
      participants: TEST_USERS,
      amounts: {
        [TEST_USERS[0]]: 4.2,  // Proper number values
        [TEST_USERS[1]]: 10
      }
    }
  },
  {
    name: 'BY_PERCENTAGE with strings',
    data: {
      splitType: 'BY_PERCENTAGE',
      participants: TEST_USERS,
      percentages: {
        [TEST_USERS[0]]: '30',  // String percentages
        [TEST_USERS[1]]: '70'
      }
    }
  },
  {
    name: 'BY_PERCENTAGE with numbers',
    data: {
      splitType: 'BY_PERCENTAGE',
      participants: TEST_USERS,
      percentages: {
        [TEST_USERS[0]]: 30,  // Number percentages
        [TEST_USERS[1]]: 70
      }
    }
  },
  {
    name: 'EQUAL split',
    data: {
      splitType: 'EQUAL',
      participants: TEST_USERS
    }
  },
  {
    name: 'Invalid amount exceeding balance',
    data: {
      splitType: 'BY_AMOUNT',
      participants: TEST_USERS,
      amounts: {
        [TEST_USERS[0]]: 100,  // This should exceed the balance
        [TEST_USERS[1]]: 100
      }
    },
    shouldFail: true
  },
  {
    name: 'Invalid percentage exceeding 100',
    data: {
      splitType: 'BY_PERCENTAGE',
      participants: TEST_USERS,
      percentages: {
        [TEST_USERS[0]]: 60,
        [TEST_USERS[1]]: 50  // Total 110% - should fail
      }
    },
    shouldFail: true
  },
  {
    name: 'Negative amounts',
    data: {
      splitType: 'BY_AMOUNT',
      participants: TEST_USERS,
      amounts: {
        [TEST_USERS[0]]: -5,  // Negative amount - should fail
        [TEST_USERS[1]]: 10
      }
    },
    shouldFail: true
  },
  {
    name: 'Mixed string and number amounts',
    data: {
      splitType: 'BY_AMOUNT',
      participants: TEST_USERS,
      amounts: {
        [TEST_USERS[0]]: '5.5',  // String
        [TEST_USERS[1]]: 8.7      // Number
      }
    }
  }
];

// Helper function to make API call
async function testSplitCalculation(scenario) {
  const url = `${API_BASE_URL}/table-sessions/${TEST_SESSION_ID}/split-calculation`;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${scenario.name}`);
  console.log(`${'='.repeat(60)}`);
  console.log('Request data:', JSON.stringify(scenario.data, null, 2));

  try {
    const response = await axios.post(url, scenario.data, {
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': TEST_USERS[0] // Simulate request from first user
      }
    });

    if (scenario.shouldFail) {
      console.error('❌ Test FAILED: Expected error but got success');
      console.log('Response:', response.data);
      return false;
    }

    console.log('✅ Test PASSED');
    console.log('Response data:', JSON.stringify(response.data.data, null, 2));

    // Validate response structure
    if (!response.data.data.splitAmounts) {
      console.error('❌ Validation FAILED: Missing splitAmounts in response');
      return false;
    }

    // Calculate total from split amounts
    const total = Object.values(response.data.data.splitAmounts)
      .reduce((sum, amount) => sum + amount, 0);
    console.log(`Total split amount: $${total.toFixed(2)}`);

    return true;
  } catch (error) {
    if (scenario.shouldFail) {
      console.log('✅ Test PASSED (expected failure)');
      console.log('Error code:', error.response?.data?.error?.code);
      console.log('Error message:', error.response?.data?.error?.message);
      return true;
    }

    console.error('❌ Test FAILED with error');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data?.error || error.message);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('Starting Split Payment Tests...');
  console.log('API URL:', API_BASE_URL);
  console.log('Session ID:', TEST_SESSION_ID);
  console.log('Test Users:', TEST_USERS);

  let passedTests = 0;
  let failedTests = 0;

  for (const scenario of TEST_SCENARIOS) {
    const result = await testSplitCalculation(scenario);
    if (result) {
      passedTests++;
    } else {
      failedTests++;
    }

    // Add delay between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('TEST SUMMARY');
  console.log(`${'='.repeat(60)}`);
  console.log(`Total tests: ${TEST_SCENARIOS.length}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);

  if (failedTests === 0) {
    console.log('\n🎉 All tests passed successfully!');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the logs above.');
  }
}

// Check if axios is installed
try {
  require.resolve('axios');
  runAllTests();
} catch(e) {
  console.log('Please install axios first: npm install axios');
  console.log('Run from tabsy-core directory: npm install axios && node ../Tabsy-Frontend/test-split-payment.js');
}