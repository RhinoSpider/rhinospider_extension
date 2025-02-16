# Extraction Testing Guide

## Overview

RhinoSpider provides two testing modes for content extraction:
1. Local Development Mode (using `testExtractionLocal`)
2. Production Mode (using `testExtraction`)

## Testing Modes

### 1. Local Development Mode

When running locally (`dfx start`), use `testExtractionLocal` which:
- No cycles required
- Accepts URLs or HTML content
- Uses mock responses
- Fast development cycle

#### Example: Testing with Topic

```typescript
interface TestTopic {
  name: string;
  url: string;
  extractionRules: ExtractionConfig;
}

const testTopic = {
  name: "Product Details",
  url: "https://example.com/product",
  extractionRules: {
    fields: [
      {
        name: "title",
        fieldType: "text",
        required: true,
        aiPrompt: "Extract the product title"
      },
      {
        name: "price",
        fieldType: "number",
        required: true,
        aiPrompt: "Extract the product price"
      }
    ]
  }
};
```

#### Example: Testing with HTML

```typescript
const testHTML = `
<div class="product">
  <h1>Test Product</h1>
  <div class="price">$99</div>
  <div class="description">Test description</div>
</div>
`;

const result = await testExtractionLocal({
  html: testHTML,
  topic: testTopic
});
```

### 2. Production Mode

When deployed to IC mainnet, use `testExtraction` which:
- Requires cycles (1.6B per request)
- Only accepts valid URLs
- Makes real HTTP requests
- Full production pipeline

#### Example: Testing Production

```typescript
const result = await testExtraction({
  url: "https://example.com/product",
  topic: testTopic
});
```

## Testing Process

### 1. Local Development

1. **Start Local Environment**
   ```bash
   dfx start --clean
   dfx deploy
   ```

2. **Run Tests**
   ```bash
   npm run test:extraction
   ```

3. **Check Results**
   ```typescript
   interface TestResult {
     success: boolean;
     data?: ExtractedData;
     error?: string;
     metrics: {
       processingTime: number;
       tokensUsed: number;
       aiCalls: number;
     };
   }
   ```

### 2. Production Testing

1. **Deploy to IC**
   ```bash
   dfx deploy --network ic
   ```

2. **Ensure Sufficient Cycles**
   ```bash
   # Check cycles balance
   dfx canister --network ic status admin

   # Top up if needed
   dfx ledger --network ic top-up admin --amount 1.0
   ```

3. **Run Production Tests**
   ```bash
   npm run test:extraction:prod
   ```

## Error Handling

### 1. Common Issues

1. **URL Access**
   - Blocked by robots.txt
   - Rate limiting
   - Network errors

2. **Content Issues**
   - Dynamic content
   - JavaScript required
   - Invalid HTML

3. **Extraction Issues**
   - Missing required fields
   - Invalid data types
   - AI processing errors

### 2. Solutions

1. **URL Access**
   ```typescript
   // Add delay between requests
   const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
   await delay(1000); // 1 second delay
   
   // Handle rate limiting
   if (response.status === 429) {
     const retryAfter = response.headers.get('Retry-After');
     await delay(parseInt(retryAfter) * 1000);
   }
   ```

2. **Content Issues**
   ```typescript
   // Use puppeteer for dynamic content
   const browser = await puppeteer.launch();
   const page = await browser.newPage();
   await page.goto(url);
   await page.waitForSelector('.product');
   const html = await page.content();
   ```

3. **Extraction Issues**
   ```typescript
   // Validate extracted data
   const validateData = (data: ExtractedData): boolean => {
     for (const field of requiredFields) {
       if (!data[field]) return false;
     }
     return true;
   };
   ```

## Best Practices

### 1. Testing Strategy
- Start with local tests
- Use real HTML samples
- Test edge cases
- Validate all fields

### 2. Performance
- Monitor processing time
- Track AI token usage
- Optimize requests
- Cache results

### 3. Maintenance
- Regular test updates
- Monitor success rates
- Update extraction rules
- Track changes in sites

## Future Improvements

### 1. Testing Features
- Automated test suite
- Performance benchmarks
- Coverage tracking
- Error analytics

### 2. Tools
- Visual test runner
- Result comparison
- Batch testing
- Error reporting

### 3. Integration
- CI/CD pipeline
- Monitoring system
- Alert system
- Analytics dashboard
