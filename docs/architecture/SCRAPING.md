# RhinoSpider Scraping Architecture

## Overview

RhinoSpider implements a distributed web scraping system with a hybrid architecture combining Internet Computer (IC) canisters and a Digital Ocean (DO) intermediate service. This design solves several key challenges:
- Consensus issues in IC HTTP outcalls
- Reliable web scraping of modern websites
- Consistent data collection
- Scalable processing

## System Components

### 1. Admin Portal (IC Canister)
- Manages scraping topics and rules
- Defines extraction patterns
- Views and analyzes collected data
- Handles user permissions
- Monitors system health

### 2. Extension
- Chrome extension for user interaction
- Sends scraping requests to DO service
- Communicates with IC canisters for:
  - Topic rules
  - Data storage
  - User authentication

### 3. Digital Ocean Scraping Service
- Intermediate layer for reliable web scraping
- Features:
  - Uses Puppeteer for modern web compatibility
  - Handles rate limiting
  - Manages request queuing
  - Provides consistent responses
- Components:
  - Express.js server
  - Redis for queue management
  - Docker containers for isolation

### 4. Storage Canister (IC)
- Stores scraped content
- Manages data persistence
- Handles access control
- Provides data to admin portal

## Topic System

### 1. Topic Structure
A Topic represents a specific type of content to scrape:
- **Basic Info**:
  - Name and description
  - Target URL
  - Status (active/inactive)

- **Scheduling**:
  - `scrapingInterval`: How often to scrape (in seconds)
  - `activeHours`: When scraping is allowed (UTC hours)
  - `lastScraped`: Last successful scrape timestamp
  - `maxRetries`: Maximum retry attempts per URL

- **AI Configuration**:
  - Model (gpt-4, gpt-3.5-turbo)
  - Temperature
  - Max tokens
  - Cost limits (daily/monthly)

- **Extraction Rules**:
  - Fields to extract
  - Custom prompts
  - Field requirements

### 2. Workflow

#### Topic Discovery
1. Extension fetches active topics from admin canister
2. Filters topics based on:
   - Within active hours
   - Enough time since last scrape
   - Topic is active
   - Cost limits not exceeded

#### Scraping Process
```mermaid
sequenceDiagram
    participant Extension
    participant DO as Digital Ocean
    participant AI as AI Service
    participant IC as Internet Computer
    
    Extension->>IC: Get Active Topics
    IC-->>Extension: Topics List
    
    loop Each Topic
        Extension->>DO: Send Scraping Request
        DO->>DO: Process with Puppeteer
        DO-->>Extension: Raw Content
        
        Extension->>AI: Process Content
        AI-->>Extension: Structured Data
        
        Extension->>IC: Store Results
        IC-->>Extension: Confirmation
        
        Extension->>IC: Update Analytics
    end
```

### 3. Error Handling
1. **Rate Limiting**
   - Exponential backoff
   - Per-domain limits
   - Respect robots.txt

2. **Content Validation**
   - Schema validation
   - Required field checks
   - Data quality metrics

3. **Recovery**
   - Automatic retries
   - Error logging
   - Admin notifications

## Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Extension
    participant DO as DO Scraper
    participant IC as IC Canisters
    participant Web as Website

    User->>Extension: Select content/URL
    Extension->>IC: Get topic rules
    IC-->>Extension: Return rules
    Extension->>DO: Send scraping request
    DO->>Web: Fetch content
    Web-->>DO: Return HTML
    DO->>IC: Store scraped content
    IC-->>Extension: Confirm storage
    Extension->>User: Show success
```

## Implementation Details

### 1. Digital Ocean Setup
```bash
# Server Requirements
- Ubuntu 22.04 LTS
- Docker & Docker Compose
- Node.js 18+
- 1GB RAM minimum
- 25GB SSD

# Key Components
/opt/rhinospider-scraper/
├── docker-compose.yml    # Service orchestration
├── Dockerfile           # Node.js & Chrome setup
├── src/
│   └── index.js        # Main scraping service
└── package.json        # Dependencies
```

### 2. Security Considerations
- DO service only accepts requests from authenticated extensions
- All sensitive data stored in IC canisters
- DO service acts as stateless proxy
- Regular security updates for DO service

### 3. Error Handling
- Automatic retries for failed requests
- Queue-based processing
- Error reporting to IC canister
- Monitoring and alerts

### 4. Scaling
- Horizontal scaling via DO droplets
- Redis for queue management
- Load balancing if needed
- Resource monitoring

## Analytics & Monitoring

### 1. Metrics Tracked
- Scraping success rate
- Processing time
- AI token usage
- Error rates
- Cost per topic

### 2. Monitoring
- Real-time status dashboard
- Error alerts
- Cost tracking
- Performance metrics

### 3. Optimization
- Dynamic scheduling
- Resource allocation
- Cost optimization
- Quality improvements

## Security Considerations

### 1. Access Control
- Role-based permissions
- IP whitelisting
- Rate limiting
- Authentication

### 2. Data Protection
- Encryption at rest
- Secure transmission
- Data retention policies
- Privacy compliance

### 3. Infrastructure
- Container isolation
- Regular updates
- Security monitoring
- Backup systems

## Future Improvements

1. **Scalability**
   - Multiple DO instances
   - Load balancing
   - Geographic distribution

2. **Features**
   - Advanced scheduling
   - More AI models
   - Custom extractors
   - Real-time monitoring

3. **Integration**
   - More data sources
   - Export options
   - API access
   - Webhooks

## Deployment

### 1. Digital Ocean Service
```bash
# Initial setup
ssh root@<droplet-ip>
cd /opt/rhinospider-scraper
docker compose up -d

# Monitoring
docker compose logs -f
curl http://localhost:3000/health
```

### 2. Extension Configuration
```typescript
// Update extension config to use DO service
const SCRAPER_SERVICE_URL = 'http://<droplet-ip>:3000';
```

### 3. IC Canister Updates
- Modified to receive data from DO service
- Enhanced error handling
- Improved data validation

## Maintenance

### 1. Regular Tasks
- Monitor DO service health
- Update dependencies
- Backup Redis data
- Review error logs

### 2. Performance Monitoring
- Track response times
- Monitor queue length
- Check resource usage
- Analyze error rates

### 3. Updates
- Regular security patches
- Dependency updates
- Feature enhancements
- Performance optimizations
