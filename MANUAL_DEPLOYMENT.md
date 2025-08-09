# Manual Deployment Instructions

## Deploy Search Proxy to Digital Ocean

Since SSH is not working directly, manually deploy by:

### Option 1: Copy files via another method
1. Zip the search proxy folder:
```bash
cd services
tar -czf search-proxy.tar.gz search-proxy/
```

2. Upload to server (use your preferred method - FTP, control panel, etc.)

3. On the server:
```bash
cd /var/www
tar -xzf search-proxy.tar.gz
cd search-proxy
npm install
pm2 restart search-proxy
```

### Option 2: Pull from GitHub on server
1. SSH into your server:
```bash
ssh root@143.244.133.154
```

2. Navigate to search proxy directory:
```bash
cd /var/www/search-proxy
```

3. Pull latest code:
```bash
git pull origin main
```

4. Install dependencies:
```bash
npm install
```

5. Restart service:
```bash
pm2 restart search-proxy
pm2 save
```

## Deploy IC Proxy to Digital Ocean

1. SSH into server:
```bash
ssh root@143.244.133.154
```

2. Navigate to IC proxy:
```bash
cd /var/www/ic-proxy
```

3. Pull latest code:
```bash
git pull origin main
```

4. Install dependencies (including OpenAI):
```bash
npm install --legacy-peer-deps
```

5. Restart service:
```bash
pm2 restart ic-proxy
pm2 save
```

## Verify Deployments

Check that services are running:
```bash
pm2 status
```

Test endpoints:
- Search Proxy: https://search-proxy.rhinospider.com/api/health
- IC Proxy: https://ic-proxy.rhinospider.com/api/health

## Current Status

### ✅ Fixed Issues:
1. **Topic Creation**: Optional fields now properly handled
2. **Search Proxy**: Supports new topic structure with searchQueries
3. **AI Integration**: Real OpenAI integration added

### 📝 Topic Creation Now Works:
- Go to https://sxsvc-aqaaa-aaaaj-az4ta-cai.icp0.io/
- Click "Add Topic"
- Fill in fields (titleSelectors is optional, no need to fill)
- Click "Create Topic"

### 🚀 Ready Features:
- Search-based URL discovery (using searchQueries)
- Domain filtering (preferredDomains, excludeDomains)
- Keyword requirements (requiredKeywords, excludeKeywords)
- AI enhancement (when enabled with API key)