# Search Proxy Deployment Guide

## Server Details
- **IP**: 143.244.133.154
- **User**: root
- **Service Path**: /var/www/search-proxy

## What the Search Proxy Does (with new system)
The search proxy is critical for the new topic structure:
1. **Receives search queries** from the extension (based on topic search queries)
2. **Performs web searches** to find relevant URLs
3. **Returns URLs** that match the topic criteria
4. **Tracks quotas** per user/device

## Files to Deploy

### Step 1: Connect to Server
```bash
ssh root@143.244.133.154
```

### Step 2: Navigate to search proxy directory
```bash
cd /var/www/search-proxy
```

### Step 3: Backup current version (optional)
```bash
cp -r /var/www/search-proxy /var/www/search-proxy.backup
```

### Step 4: Update the code
The search proxy code at `/services/search-proxy/` should be copied to the server.

**From your local machine**, run:
```bash
# Copy the search proxy files (excluding node_modules and .env)
rsync -avz --exclude 'node_modules' --exclude '.env' --exclude '.git' \
  ./services/search-proxy/ root@143.244.133.154:/var/www/search-proxy/
```

Or manually copy these key files:
- `server.js`
- `package.json`
- `routes/` directory
- `services/` directory
- `middlewares/` directory

### Step 5: On the server, install dependencies
```bash
cd /var/www/search-proxy
npm install
```

### Step 6: Check environment variables
```bash
# Make sure .env file exists with proper configuration
nano .env
```

Required environment variables:
```
PORT=3002
NODE_ENV=production
IC_PROXY_URL=https://ic-proxy.rhinospider.com
CONSUMER_CANISTER_ID=tgyl5-yyaaa-aaaaj-az4wq-cai
```

### Step 7: Restart the service
```bash
# If using PM2
pm2 restart search-proxy
pm2 save

# Or if using systemd
systemctl restart search-proxy

# Check status
pm2 status search-proxy
# or
systemctl status search-proxy
```

### Step 8: Test the deployment
```bash
# Test health endpoint
curl http://localhost:3002/api/health

# Should return:
# {"status":"ok","service":"search-proxy","timestamp":"..."}
```

## What Changed for the New System

The search proxy doesn't need major changes because:
1. It already has the `/api/search` endpoint that the extension expects
2. It already performs actual web searches (using the search engine service)
3. It already returns URLs in the format the extension expects

The main change is how the extension uses it:
- **OLD**: Extension generated URLs from patterns
- **NEW**: Extension sends search queries to search proxy, gets real search results

## Verification

After deployment, verify:
1. Health check: https://search-proxy.rhinospider.com/api/health
2. The extension can connect and get search results
3. PM2/service is running: `pm2 status` or `systemctl status search-proxy`

## Troubleshooting

If the service doesn't start:
```bash
# Check logs
pm2 logs search-proxy --lines 100

# Or for systemd
journalctl -u search-proxy -n 100

# Check if port 3002 is in use
lsof -i :3002

# Restart PM2
pm2 kill
pm2 start server.js --name search-proxy
```