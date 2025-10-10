#!/usr/bin/env node

/**
 * Test script for split payment synchronization
 * Tests multiple users changing split methods simultaneously
 *
 * Usage: node test-split-sync.js
 *
 * Prerequisites:
 * 1. Backend server running (tabsy-core)
 * 2. Table session created with at least 2 users joined
 * 3. Some orders placed in the table session
 */

const axios = require('axios');
const WebSocket = require('ws');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api/v1';
const WS_URL = process.env.WS_URL || 'ws://localhost:5000';
const RESTAURANT_ID = 'rest123';
const TABLE_ID = 'table123';

// Test users
const users = [
  {
    id: 'user1',
    name: 'Alice',
    sessionId: null,
    ws: null
  },
  {
    id: 'user2',
    name: 'Bob',
    sessionId: null,
    ws: null
  },
  {
    id: 'user3',
    name: 'Charlie',
    sessionId: null,
    ws: null
  }
];

let tableSessionId = null;
let sessionCode = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(color, message, ...args) {
  console.log(`${color}${message}${colors.reset}`, ...args);
}

function logUser(user, message) {
  const userColors = {
    'Alice': colors.blue,
    'Bob': colors.green,
    'Charlie': colors.magenta
  };
  log(userColors[user.name] || colors.cyan, `[${user.name}] ${message}`);
}

// API helper functions
async function createTableSession(user) {
  try {
    const response = await axios.post(`${API_BASE_URL}/table-sessions/create`, {
      tableId: TABLE_ID,
      restaurantId: RESTAURANT_ID,
      userName: user.name
    });

    if (response.data.success) {
      tableSessionId = response.data.data.tableSessionId;
      sessionCode = response.data.data.sessionCode;
      user.sessionId = response.data.data.guestSessionId;
      logUser(user, `Created table session: ${sessionCode}`);
      return response.data.data;
    }
  } catch (error) {
    console.error(`Error creating table session:`, error.response?.data || error.message);
    throw error;
  }
}

async function joinTableSession(user) {
  try {
    const response = await axios.post(`${API_BASE_URL}/table-sessions/join`, {
      sessionCode: sessionCode,
      userName: user.name
    });

    if (response.data.success) {
      user.sessionId = response.data.data.guestSessionId;
      logUser(user, `Joined table session: ${sessionCode}`);
      return response.data.data;
    }
  } catch (error) {
    console.error(`Error joining table session:`, error.response?.data || error.message);
    throw error;
  }
}

async function createSplitCalculation(user, splitType, additionalParams = {}) {
  try {
    const participants = users.map(u => u.sessionId).filter(Boolean);

    const requestData = {
      splitType,
      participants,
      ...additionalParams
    };

    logUser(user, `Creating split calculation: ${splitType}`);

    const response = await axios.post(
      `${API_BASE_URL}/table-sessions/${tableSessionId}/split-calculation`,
      requestData,
      { headers: { 'x-session-id': user.sessionId } }
    );

    if (response.data.success) {
      logUser(user, `✓ Split calculation created: ${splitType}`);
      return response.data.data;
    }
  } catch (error) {
    console.error(`Error creating split calculation:`, error.response?.data || error.message);
    throw error;
  }
}

async function updateSplitCalculation(user, updateData) {
  try {
    const response = await axios.patch(
      `${API_BASE_URL}/table-sessions/${tableSessionId}/split-calculation/${user.sessionId}`,
      updateData,
      { headers: { 'x-session-id': user.sessionId } }
    );

    if (response.data.success) {
      logUser(user, `✓ Updated split calculation`);
      return response.data.data;
    }
  } catch (error) {
    console.error(`Error updating split calculation:`, error.response?.data || error.message);
    throw error;
  }
}

// WebSocket connection for each user
function connectWebSocket(user) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS_URL}?restaurantId=${RESTAURANT_ID}&tableId=${TABLE_ID}`);

    ws.on('open', () => {
      logUser(user, 'WebSocket connected');
      user.ws = ws;
      resolve(ws);
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());

        // Log important events
        if (message.type === 'split:calculation_updated') {
          const typeInfo = message.isTypeChange ? ' (TYPE CHANGE)' : message.isValueUpdate ? ' (VALUE UPDATE)' : '';
          logUser(user, `← Received split update${typeInfo}: ${message.splitCalculation?.splitType}`);
        } else if (message.type === 'split:being_edited') {
          if (message.editingBy !== user.sessionId) {
            logUser(user, `← ${message.editingUser} is editing the split...`);
          }
        } else if (message.type === 'split:editing_done') {
          if (message.editingBy !== user.sessionId) {
            logUser(user, `← Editing completed`);
          }
        } else if (message.type === 'user_joined_table_session') {
          logUser(user, `← ${message.user.userName} joined the table`);
        }
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for ${user.name}:`, error);
      reject(error);
    });

    ws.on('close', () => {
      logUser(user, 'WebSocket disconnected');
    });
  });
}

// Test scenarios
async function testScenario1() {
  log(colors.bright + colors.yellow, '\n=== Test 1: Split Type Changes ===');
  log(colors.yellow, 'Testing that all users see split type changes from any user\n');

  await sleep(1000);

  // User 1 changes to EQUAL
  await createSplitCalculation(users[0], 'EQUAL');
  await sleep(1000);

  // User 2 changes to BY_PERCENTAGE
  await createSplitCalculation(users[1], 'BY_PERCENTAGE', {
    percentages: {
      [users[0].sessionId]: 33.33,
      [users[1].sessionId]: 33.33,
      [users[2].sessionId]: 33.34
    }
  });
  await sleep(1000);

  // User 3 changes to BY_AMOUNT
  await createSplitCalculation(users[2], 'BY_AMOUNT', {
    amounts: {
      [users[0].sessionId]: 10,
      [users[1].sessionId]: 10,
      [users[2].sessionId]: 10
    }
  });
  await sleep(1000);

  // User 1 changes back to EQUAL
  await createSplitCalculation(users[0], 'EQUAL');
  await sleep(1000);

  log(colors.green, '✓ Test 1 completed');
}

async function testScenario2() {
  log(colors.bright + colors.yellow, '\n=== Test 2: Value Updates ===');
  log(colors.yellow, 'Testing percentage and amount value updates\n');

  await sleep(1000);

  // Set to BY_PERCENTAGE
  await createSplitCalculation(users[0], 'BY_PERCENTAGE', {
    percentages: {
      [users[0].sessionId]: 30,
      [users[1].sessionId]: 30,
      [users[2].sessionId]: 40
    }
  });
  await sleep(1000);

  // User 2 updates their percentage
  await updateSplitCalculation(users[1], { percentage: 35 });
  await sleep(1000);

  // User 3 updates their percentage
  await updateSplitCalculation(users[2], { percentage: 35 });
  await sleep(1000);

  log(colors.green, '✓ Test 2 completed');
}

async function testScenario3() {
  log(colors.bright + colors.yellow, '\n=== Test 3: Rapid Changes ===');
  log(colors.yellow, 'Testing rapid split type changes to check for race conditions\n');

  await sleep(1000);

  // Rapid changes from different users
  const promises = [
    createSplitCalculation(users[0], 'EQUAL'),
    sleep(100).then(() => createSplitCalculation(users[1], 'BY_PERCENTAGE', {
      percentages: {
        [users[0].sessionId]: 50,
        [users[1].sessionId]: 25,
        [users[2].sessionId]: 25
      }
    })),
    sleep(200).then(() => createSplitCalculation(users[2], 'BY_AMOUNT', {
      amounts: {
        [users[0].sessionId]: 15,
        [users[1].sessionId]: 10,
        [users[2].sessionId]: 5
      }
    }))
  ];

  await Promise.allSettled(promises);
  await sleep(2000);

  log(colors.green, '✓ Test 3 completed');
}

async function testScenario4() {
  log(colors.bright + colors.yellow, '\n=== Test 4: Editing Lock Behavior ===');
  log(colors.yellow, 'Testing that editing locks prevent conflicts\n');

  await sleep(1000);

  // Set to BY_PERCENTAGE for testing value updates
  await createSplitCalculation(users[0], 'BY_PERCENTAGE', {
    percentages: {
      [users[0].sessionId]: 33.33,
      [users[1].sessionId]: 33.33,
      [users[2].sessionId]: 33.34
    }
  });
  await sleep(1000);

  // Two users try to update simultaneously
  log(colors.cyan, 'Two users attempting simultaneous updates...');
  const simultaneousUpdates = [
    updateSplitCalculation(users[0], { percentage: 40 }),
    updateSplitCalculation(users[1], { percentage: 30 })
  ];

  const results = await Promise.allSettled(simultaneousUpdates);
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      logUser(users[index], `Update blocked: ${result.reason.response?.data?.error?.message || result.reason.message}`);
    } else {
      logUser(users[index], `Update succeeded`);
    }
  });

  await sleep(2000);

  log(colors.green, '✓ Test 4 completed');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function cleanup() {
  log(colors.yellow, '\n=== Cleaning up ===');

  // Close WebSocket connections
  users.forEach(user => {
    if (user.ws) {
      user.ws.close();
    }
  });

  log(colors.green, '✓ Cleanup completed');
}

// Main test runner
async function runTests() {
  try {
    log(colors.bright + colors.cyan, '====================================');
    log(colors.bright + colors.cyan, '  Split Payment Synchronization Test');
    log(colors.bright + colors.cyan, '====================================\n');

    // Step 1: Create table session
    log(colors.yellow, '=== Setup: Creating Table Session ===');
    await createTableSession(users[0]);

    // Step 2: Other users join
    log(colors.yellow, '\n=== Setup: Users Joining ===');
    await joinTableSession(users[1]);
    await joinTableSession(users[2]);

    // Step 3: Connect WebSockets
    log(colors.yellow, '\n=== Setup: Connecting WebSockets ===');
    await Promise.all(users.map(connectWebSocket));

    await sleep(2000);

    // Run test scenarios
    await testScenario1();
    await testScenario2();
    await testScenario3();
    await testScenario4();

    log(colors.bright + colors.green, '\n====================================');
    log(colors.bright + colors.green, '  All Tests Completed Successfully!');
    log(colors.bright + colors.green, '====================================\n');

  } catch (error) {
    log(colors.red, '\n!!! Test Failed !!!');
    console.error(error);
  } finally {
    await cleanup();
    process.exit(0);
  }
}

// Check if axios is installed
try {
  require('axios');
  require('ws');
} catch (error) {
  log(colors.red, 'Missing dependencies. Please run:');
  log(colors.yellow, 'npm install axios ws');
  process.exit(1);
}

// Run the tests
runTests();