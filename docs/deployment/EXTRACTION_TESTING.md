# Extraction Testing Guide

## Testing Modes

### Local Development Mode
When running locally (`dfx start`), the system uses `testExtractionLocal` which:
- Doesn't require cycles
- Can handle both URLs and direct HTML content
- Uses mock responses for URLs
- Processes actual HTML content directly

#### Testing with URLs
```bash
# The URL will be mocked with sample content
https://example.com/product
```

#### Testing with HTML
```html
<!-- Direct HTML content will be processed as is -->
<div class="product">
  <h1>Test Product</h1>
  <div class="price">$99</div>
  <div class="description">Test description</div>
</div>
```

### Production Mode
When deployed to ICP (`dfx deploy --network ic`), the system uses `testExtraction` which:
- Requires cycles (1.6B cycles per request)
- Only accepts valid URLs
- Makes actual HTTP requests
- Returns real webpage content

## Migration to Production

### 1. Environment Setup
The system automatically switches between local and production modes based on the environment:
```typescript
// Local development
IS_LOCAL = true  // Uses testExtractionLocal
HOST = "http://127.0.0.1:8000"

// Production
IS_LOCAL = false  // Uses testExtraction
HOST = "https://ic0.app"
```

### 2. Cycles Requirements
When deploying to production:
1. Convert ICP to cycles:
   ```bash
   dfx cycles convert --amount <ICP_AMOUNT> --network=ic
   ```

2. Top up the canister:
   ```bash
   dfx canister --network=ic deposit-cycles <AMOUNT> <CANISTER_ID>
   ```

3. Estimate cycles needed:
   - Each HTTP request: 1.6B cycles
   - Daily requests × 1.6B = Daily cycles needed
   - Add 20% buffer for other operations

### 3. Deployment Steps
1. Update environment variables:
   ```bash
   # .env.production
   VITE_IC_HOST=https://ic0.app
   ```

2. Deploy to ICP network:
   ```bash
   dfx deploy --network=ic
   ```

3. Verify extraction testing:
   - Test with real URLs
   - Monitor cycles consumption
   - Check response times

### 4. Monitoring
Monitor in production:
- Cycles balance
- Request success rate
- Response times
- Error rates

## Best Practices

### Local Testing
1. Test with various HTML structures
2. Use sample templates for common scenarios
3. Verify extraction rules work as expected
4. Test error handling

### Production Testing
1. Start with low-traffic URLs
2. Monitor cycles consumption
3. Implement rate limiting
4. Add error handling for failed requests

## Troubleshooting

### Common Issues

1. **Cycles Error**
   ```
   Error: http_request request sent with 0 cycles
   ```
   Solution: Ensure canister has sufficient cycles

2. **Invalid URL**
   ```
   Error: Invalid URL format
   ```
   Solution: Use complete URLs with protocol (http/https)

3. **Local Testing Issues**
   - Check if dfx is running
   - Verify canister is deployed
   - Check HTML content format
