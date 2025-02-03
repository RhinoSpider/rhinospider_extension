# RhinoSpider Extension Testing Guide

## Test Environments

### 1. Local Development Testing
```bash
# Start local test environment
npm run test:dev

# Start with simulated extensions
npm run test:multi
```

### 2. Test Modes

#### A. Single Extension Mode
- Default mode
- Tests basic functionality
- Uses test API key

#### B. Multi-Extension Simulator
```javascript
// Start simulator with 10 extensions
await TestSimulator.start({
  extensionCount: 10,
  requestsPerHour: 5,
  runTime: '1h'
});
```

### 3. Test Scenarios

#### A. Budget Control Tests
- Budget limit reached
- Rate limiting
- Cache effectiveness
- Cost distribution

```javascript
// Test budget limits
await TestScenarios.runBudgetTest({
  budget: 10,
  duration: '24h',
  extensions: 5
});
```

#### B. System Degradation Tests
- Graceful degradation
- User notifications
- Recovery procedures
- Error handling

```javascript
// Test system degradation
await TestScenarios.runDegradationTest({
  trigger: 'BUDGET_LOW',
  extensions: 3
});
```

#### C. API Integration Tests
- API key validation
- Rate limit handling
- Error responses
- Backup strategies

#### D. Cache Tests
- Hit rates
- Invalidation
- Storage limits
- Performance

### 4. Performance Testing

#### A. Load Tests
```javascript
// Run load test
await TestScenarios.runLoadTest({
  concurrent: 50,
  duration: '1h',
  rampUp: '5m'
});
```

#### B. Stress Tests
```javascript
// Run stress test
await TestScenarios.runStressTest({
  maxExtensions: 100,
  maxRequestsPerSecond: 10
});
```

### 5. Security Tests
- API key storage
- Data encryption
- Permission validation
- XSS prevention

### 6. Integration Tests
- Chrome API integration
- Background script communication
- Storage synchronization
- Event handling

## Running Tests

### 1. Unit Tests
```bash
npm run test:unit
```

### 2. Integration Tests
```bash
npm run test:integration
```

### 3. End-to-End Tests
```bash
npm run test:e2e
```

### 4. Load Tests
```bash
npm run test:load
```

## Test Data

### 1. Sample API Responses
Located in `tests/fixtures/api-responses/`

### 2. Mock Configurations
Located in `tests/fixtures/configs/`

### 3. Test API Keys
Located in `tests/fixtures/api-keys.json`

## Monitoring Test Results

### 1. Metrics Dashboard
- Available at `http://localhost:3000/test-metrics`
- Real-time test results
- Performance graphs
- Error logs

### 2. Test Reports
- Generated in `tests/reports/`
- Coverage reports
- Performance metrics
- Error summaries

## Common Test Scenarios

### 1. Normal Operation
```javascript
await TestScenarios.runNormalOperation({
  duration: '1h',
  extensions: 5
});
```

### 2. Error Conditions
```javascript
await TestScenarios.runErrorScenarios({
  scenarios: ['api_down', 'network_error', 'rate_limit']
});
```

### 3. Recovery Testing
```javascript
await TestScenarios.runRecoveryTest({
  error: 'BUDGET_LOW',
  recoveryTime: '10m'
});
```

## Best Practices

1. Always run tests in isolation
2. Use fresh test data for each run
3. Clean up test artifacts
4. Monitor resource usage
5. Log all test results

## Automated Testing Pipeline

```yaml
test-pipeline:
  stages:
    - unit
    - integration
    - e2e
    - load
    - security
```
