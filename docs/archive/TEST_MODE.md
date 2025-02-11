# RhinoSpider Test Mode Guide

## Overview

Test Mode is a development and testing feature that allows you to:
1. Test the extension without consuming real API credits
2. Simulate various scenarios and error conditions
3. Validate extension behavior under different conditions
4. Generate test metrics and reports

## Test API Key

The test mode uses a special API key: `test-key-rhino-spider-2024`

This key:
- Only works when test mode is enabled
- Generates mock responses
- Simulates API latency
- Doesn't consume real API credits

## Enabling Test Mode

```javascript
// In development console or test script
await testMode.enable();

// Check if enabled
const isTestMode = testMode.isEnabled();
```

## Configuration

Test mode can be configured in `testMode.js`:

```javascript
TEST_MODE_CONFIG = {
  MAX_REQUESTS: 100,      // Maximum requests allowed
  SIMULATED_LATENCY: 200, // Artificial delay in ms
  ERROR_RATE: 0.1,        // 10% simulated errors
  MOCK_RESPONSES: true    // Use mock response data
}
```

## Testing Scenarios

### 1. Basic API Testing
```javascript
// Enable test mode
await testMode.enable();

// Use test API key
const apiKey = testMode.getTestApiKey();

// Make test request
const response = await testMode.handleRequest({
  query: "test query"
});
```

### 2. Error Handling
```javascript
try {
  // Will randomly fail based on ERROR_RATE
  await testMode.handleRequest(config);
} catch (error) {
  // Handle error
}
```

### 3. Request Limits
```javascript
// Test request limit exceeded
for (let i = 0; i < 101; i++) {
  try {
    await testMode.handleRequest(config);
  } catch (error) {
    // Should throw on 101st request
    console.log('Limit exceeded:', error);
  }
}
```

## Monitoring & Metrics

### 1. Get Test Statistics
```javascript
const stats = testMode.getStats();
console.log(stats);
// {
//   enabled: true,
//   startTime: timestamp,
//   runTime: milliseconds,
//   requestCount: number,
//   errorCount: number,
//   errorRate: number,
//   remainingRequests: number
// }
```

### 2. Log Test Results
```javascript
await testMode.logTestResults();
// Saves results to chrome.storage.local
```

## Integration with Test Simulator

Test mode can be used with the test simulator for comprehensive testing:

```javascript
// Enable test mode
await testMode.enable();

// Start simulator with test configuration
await testSimulator.start({
  extensionCount: 5,
  requestsPerHour: 10,
  runTime: '1h',
  useTestMode: true
});
```

## Best Practices

1. **Always disable test mode after testing**
```javascript
await testMode.disable();
```

2. **Clear test data between runs**
```javascript
await chrome.storage.local.remove(['testMode', 'testResults']);
```

3. **Monitor test metrics**
```javascript
// Regular stats checking
setInterval(async () => {
  const stats = testMode.getStats();
  console.log('Test Stats:', stats);
}, 5000);
```

4. **Handle errors appropriately**
```javascript
window.onerror = (message, source, line, column, error) => {
  if (testMode.isEnabled()) {
    console.log('Test Error:', {
      message,
      source,
      line,
      column,
      error
    });
  }
};
```

## Production Safeguards

1. Test mode is automatically disabled in production builds
2. Test API key is rejected in production environment
3. Test mode configuration is stripped from production code
4. Test results are only stored locally

## Common Test Scenarios

### 1. API Response Testing
```javascript
// Test different response types
const responses = await Promise.all([
  testMode.handleRequest({ type: 'product' }),
  testMode.handleRequest({ type: 'article' }),
  testMode.handleRequest({ type: 'search' })
]);
```

### 2. Error Handling
```javascript
// Test error scenarios
const errorTests = [
  'network_error',
  'invalid_response',
  'rate_limit',
  'timeout'
];

for (const errorType of errorTests) {
  try {
    await testMode.handleRequest({ error: errorType });
  } catch (error) {
    console.log(`${errorType}:`, error);
  }
}
```

### 3. Performance Testing
```javascript
// Test response times
const startTime = Date.now();
await testMode.handleRequest(config);
const endTime = Date.now();

console.log('Response time:', endTime - startTime);
```

## Debugging

1. Test mode logs all activities to console with 🧪 prefix
2. Test results are stored in chrome.storage.local
3. Error logs include full stack traces
4. Performance metrics are tracked automatically

## Security Notes

1. Test API key should never be used in production
2. Test data should not contain sensitive information
3. Test mode should be disabled before deployment
4. Test results should be cleared after testing
