# RhinoSpider Testing Guide

## Overview

This guide covers testing practices for RhinoSpider, including unit tests, integration tests, and end-to-end testing. It also includes information about the test mode feature for local development.

## Test Environment Setup

### Local Development
1. Start local IC replica:
   ```bash
   dfx start --clean --background
   ```

2. Deploy canisters:
   ```bash
   dfx deploy
   ```

3. Run extension in development mode:
   ```bash
   cd apps/extension
   npm run dev
   ```

### Test Mode

Test mode provides a controlled environment for testing without making actual web requests or consuming resources.

#### Enabling Test Mode
1. Open extension options
2. Enable "Test Mode" toggle
3. Configure test settings:
   ```json
   {
     "mockResponses": true,
     "bypassRateLimits": true,
     "localStorageOnly": true
   }
   ```

#### Test Mode Features
- Mock HTTP responses
- Local storage only
- Bypass rate limits
- Simulated AI responses
- Fast scheduling

## Testing Levels

### 1. Unit Tests

#### Running Unit Tests
```bash
npm test
```

#### Key Test Areas
- Data extraction
- Topic management
- Rate limiting
- Storage operations

### 2. Integration Tests

#### Running Integration Tests
```bash
npm run test:integration
```

#### Key Test Areas
- Canister communication
- Extension-backend integration
- Storage synchronization
- AI service integration

### 3. End-to-End Tests

#### Running E2E Tests
```bash
npm run test:e2e
```

#### Key Test Areas
- Complete user workflows
- Cross-platform sync
- Data persistence
- Error handling

## Testing Specific Features

### 1. Data Extraction

#### Local Testing
Use `testExtractionLocal` endpoint:
```bash
dfx canister call storage testExtractionLocal '(
  record { 
    html_content = "<div>Test content</div>";
    extraction_rules = record {
      fields = vec {
        record {
          name = "test_field";
          fieldType = "text";
          aiPrompt = "Extract test data";
          required = true
        }
      };
      custom_prompt = null
    }
  }
)'
```

#### Production Testing
Use `testExtraction` endpoint (requires cycles):
```bash
dfx canister call storage testExtraction '(
  record {
    url = "https://example.com";
    extraction_rules = record {
      fields = vec { ... };
      custom_prompt = null
    }
  }
)'
```

### 2. Topic Management

Test topic creation and updates:
```bash
dfx canister call storage addTopic '(
  record {
    name = "Test Topic";
    description = "Test description";
    extraction_rules = record { ... }
  }
)'
```

### 3. Rate Limiting

Test rate limit behavior:
```typescript
describe('Rate Limiting', () => {
  it('should respect domain-specific limits', async () => {
    // Test code
  });
});
```

## Mocking

### 1. HTTP Responses
```typescript
const mockHttpResponse = {
  status: 200,
  headers: [],
  body: new TextEncoder().encode("<html>...</html>")
};
```

### 2. AI Responses
```typescript
const mockAIResponse = {
  extracted_data: {
    field_name: "Mock value"
  }
};
```

### 3. Storage Operations
```typescript
const mockStorage = {
  get: async (key) => mockData[key],
  set: async (key, value) => { mockData[key] = value }
};
```

## Test Data Management

### 1. Fixtures
Store test data in `tests/fixtures/`:
```
tests/fixtures/
  ├── html/
  ├── topics/
  └── responses/
```

### 2. Test Database
Use test database for integration tests:
```javascript
const testDb = {
  name: "rhinospider_test",
  version: 1
};
```

## Continuous Integration

### GitHub Actions
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm test
```

## Best Practices

1. **Isolation**
   - Use clean test environment
   - Reset state between tests
   - Avoid test interdependencies

2. **Coverage**
   - Aim for high test coverage
   - Focus on critical paths
   - Test edge cases

3. **Maintenance**
   - Keep tests up to date
   - Document test requirements
   - Regular test review
