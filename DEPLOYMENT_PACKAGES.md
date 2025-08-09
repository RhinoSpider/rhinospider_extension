# Deployment Packages Ready

## Files Created for Deployment

### 1. Search Proxy Package
**File**: `search-proxy-deploy.tar.gz`
**Contains**: Complete search proxy with new topic structure support
**Features**:
- Handles searchQueries arrays
- Filters by preferredDomains and excludeDomains
- Supports requiredKeywords and excludeKeywords

### 2. IC Proxy Package
**File**: `ic-proxy-deploy.tar.gz`
**Contains**: Complete IC proxy with OpenAI integration
**Features**:
- Real OpenAI API integration
- AI processing endpoint `/api/process-with-ai`
- Supports summarization, keywords, categorization, sentiment

## How to Deploy

### Step 1: Upload Files to Server
Upload both `.tar.gz` files to 143.244.133.154 using:
- FTP client (FileZilla, Cyberduck, etc.)
- Web-based file manager (if available)
- Control panel upload
- Or any method you have access to

### Step 2: Deploy Search Proxy
```bash
ssh root@143.244.133.154
cd /var/www
rm -rf search-proxy-backup
mv search-proxy search-proxy-backup
tar -xzf ~/search-proxy-deploy.tar.gz
mv search-proxy-deploy search-proxy
cd search-proxy
npm install
pm2 restart search-proxy || pm2 start server.js --name search-proxy
pm2 save
```

### Step 3: Deploy IC Proxy
```bash
cd /var/www
rm -rf ic-proxy-backup
mv ic-proxy ic-proxy-backup
tar -xzf ~/ic-proxy-deploy.tar.gz
mv ic-proxy-deploy ic-proxy
cd ic-proxy
npm install --legacy-peer-deps
pm2 restart ic-proxy || pm2 start server.js --name ic-proxy
pm2 save
```

### Step 4: Verify Services
```bash
# Check PM2 status
pm2 status

# Test search proxy
curl http://localhost:3002/api/health

# Test IC proxy
curl http://localhost:3001/api/health
```

## What's New in These Packages

### Search Proxy Updates:
- ✅ Processes multiple searchQueries per topic
- ✅ Filters URLs by excludeDomains
- ✅ Prioritizes preferredDomains
- ✅ Ready for production use

### IC Proxy Updates:
- ✅ OpenAI integration added
- ✅ AI processing endpoint ready
- ✅ Uses gpt-3.5-turbo model
- ✅ Processes content when AI enabled

## Testing After Deployment

### 1. Test Topic Creation:
- Go to https://sxsvc-aqaaa-aaaaj-az4ta-cai.icp0.io/
- Create a topic with searchQueries
- Verify it saves successfully

### 2. Test Search Proxy:
```bash
curl -X POST https://search-proxy.rhinospider.com/api/search/urls \
  -H "Content-Type: application/json" \
  -d '{
    "extensionId": "test",
    "topics": [{
      "id": "test1",
      "name": "Test Topic",
      "searchQueries": ["blockchain news"],
      "preferredDomains": ["coindesk.com"],
      "excludeDomains": ["reddit.com"],
      "requiredKeywords": ["blockchain"]
    }],
    "batchSize": 10
  }'
```

### 3. Test AI Processing (if enabled):
```bash
curl -X POST https://ic-proxy.rhinospider.com/api/process-with-ai \
  -H "Content-Type: application/json" \
  -H "x-device-id: test" \
  -d '{
    "content": "This is test content about blockchain technology.",
    "aiConfig": {
      "enabled": true,
      "apiKey": "YOUR_OPENAI_KEY",
      "model": "gpt-3.5-turbo",
      "maxTokensPerRequest": 150,
      "features": {
        "summarization": true,
        "keywordExtraction": true
      }
    }
  }'
```

## Package Contents

### search-proxy-deploy.tar.gz includes:
- server.js (main server)
- routes/search.js (updated for new topics)
- services/searchHandler.js (filtering logic)
- All other search proxy files
- package.json with dependencies

### ic-proxy-deploy.tar.gz includes:
- server.js (with AI endpoint)
- OpenAI integration code
- All IC proxy files
- package.json with openai dependency

## Notes
- Both packages are production-ready
- Old services will be backed up before deployment
- PM2 will automatically restart services
- Services run on ports 3001 (IC) and 3002 (search)