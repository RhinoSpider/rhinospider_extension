# Backend Services Documentation

## Service Architecture

RhinoSpider uses two main backend services to bridge the Chrome extension with the Internet Computer blockchain:

1. **IC Proxy Service** - Handles blockchain interactions
2. **Search Proxy Service** - Manages content discovery

## IC Proxy Service

### Purpose
Acts as a bridge between the Chrome extension and Internet Computer canisters, handling authentication, data submission, and user management.

### Endpoints

#### Health Check
```
GET /api/health
Response: { status: 'ok', timestamp, canisters: {...} }
```

#### User Profile
```
POST /api/user-profile-by-principal
Body: { principalId: string }
Response: { points, scrapedUrls, referralCode, ... }
```

#### Consumer Profile
```
POST /api/consumer-profile
Body: { principalId: string }
Response: { points, totalDataScraped, ... }
```

#### Submit Scraped Data
```
POST /api/submit-scraped-data
Body: { 
  url: string,
  content: string,
  principalId: string,
  timestamp: number
}
Response: { success: boolean, points: number }
```

#### Debug Info
```
GET /api/debug
Response: { environment, canisters, version }
```

### Configuration
```javascript
// Environment variables
STORAGE_CANISTER_ID=hhaip-uiaaa-aaaao-a4khq-cai
CONSUMER_CANISTER_ID=t3pjp-kqaaa-aaaao-a4ooq-cai
ADMIN_CANISTER_ID=wvset-niaaa-aaaao-a4osa-cai
IC_NETWORK=mainnet
PORT=3001
```

### Error Handling
- Retry queue for failed submissions
- Exponential backoff
- Non-blocking operations
- Comprehensive logging

## Search Proxy Service

### Purpose
Provides content discovery through multiple search engines and manages user quotas for API usage.

### Features
- Multi-engine search rotation
- Rate limiting per user
- Quota management
- Topic-based URL generation
- Caching for performance

### Endpoints

#### Health Check
```
GET /api/health
Response: { status: 'ok', timestamp }
```

#### Get Topics
```
GET /api/topics
Response: [{ id, name, keywords, priority }, ...]
```

#### Get URLs for Topic
```
POST /api/urls-for-topic
Body: { 
  topic: string,
  principalId: string,
  count: number
}
Response: { urls: [...], remaining_quota: number }
```

#### Prefetch URLs
```
POST /api/prefetch-urls
Body: { principalId: string }
Response: { success: boolean, topics_loaded: number }
```

### Search Engines Integration
1. **DuckDuckGo** - Primary, no API key required
2. **Google Custom Search** - With API key
3. **SerpAPI** - Premium search results
4. **NewsAPI** - News content
5. **Common Crawl** - Web archive
6. **Wayback Machine** - Historical content

### Quota System
```javascript
// User quota configuration
{
  "daily_limit": 1000,
  "rate_limit": 10, // requests per minute
  "quota_reset": "00:00 UTC",
  "premium_multiplier": 2
}
```

### Caching Strategy
- In-memory cache for topics
- URL deduplication
- 15-minute cache TTL
- Automatic cache invalidation

## Service Communication

### Flow Diagram
```
Extension → IC Proxy → IC Canisters
    ↓          ↓
    └→ Search Proxy → Search APIs
```

### Security
- HTTPS only
- CORS configured for extension
- No API keys in code
- Environment-based configuration

## Deployment

### PM2 Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'ic-proxy',
      script: 'server-fixed.js',
      env: {
        PORT: 3001,
        NODE_ENV: 'production'
      }
    },
    {
      name: 'search-proxy',
      script: 'server.js',
      env: {
        PORT: 3002,
        NODE_ENV: 'production'
      }
    }
  ]
}
```

### Monitoring
```bash
# Check service status
pm2 status

# View logs
pm2 logs ic-proxy
pm2 logs search-proxy

# Monitor resources
pm2 monit
```

## Error Recovery

### IC Proxy
- Automatic reconnection to IC
- Queue for failed submissions
- Graceful degradation
- Health endpoint monitoring

### Search Proxy
- Fallback search engines
- Quota overflow handling
- Cache recovery
- API key rotation

## Performance Optimization

### IC Proxy
- Connection pooling
- Batch submissions
- Async processing
- Response caching

### Search Proxy
- Parallel search queries
- Result deduplication
- Smart caching
- Load balancing

## Troubleshooting

### Common Issues

1. **502 Bad Gateway**
   - Check PM2 status
   - Verify port availability
   - Review nginx configuration

2. **Canister Connection Failed**
   - Verify canister IDs
   - Check IC network status
   - Review authentication

3. **Search Quota Exceeded**
   - Check quota configuration
   - Review user limits
   - Monitor API usage

### Debug Tools
```bash
# Test IC Proxy
curl https://ic-proxy.rhinospider.com/api/health

# Test Search Proxy
curl https://search-proxy.rhinospider.com/api/health

# Check environment
curl https://ic-proxy.rhinospider.com/api/debug
```