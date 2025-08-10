# RhinoSpider Deployment Guide

## Production Environment

### Server Details
- **IP**: 143.244.133.154
- **Provider**: Digital Ocean
- **Services**: IC Proxy, Search Proxy

### Service URLs
- **IC Proxy**: https://ic-proxy.rhinospider.com (port 3001)
- **Search Proxy**: https://search-proxy.rhinospider.com (port 3002)
- **Admin Dashboard**: https://sxsvc-aqaaa-aaaaj-az4ta-cai.icp0.io

## Critical Configuration

### Canister IDs (Production)
```bash
STORAGE_CANISTER_ID=hhaip-uiaaa-aaaao-a4khq-cai
CONSUMER_CANISTER_ID=t3pjp-kqaaa-aaaao-a4ooq-cai
ADMIN_CANISTER_ID=wvset-niaaa-aaaao-a4osa-cai
```

### PM2 Configuration
⚠️ **IMPORTANT**: PM2 caches environment variables in `/root/.pm2/module_conf.json`

If canister IDs are not updating:
1. Check and update `/root/.pm2/module_conf.json`
2. Delete PM2 dump: `rm /root/.pm2/dump.pm2`
3. Kill PM2: `pm2 kill`
4. Restart with correct environment:
```bash
export STORAGE_CANISTER_ID=hhaip-uiaaa-aaaao-a4khq-cai
export CONSUMER_CANISTER_ID=t3pjp-kqaaa-aaaao-a4ooq-cai
export ADMIN_CANISTER_ID=wvset-niaaa-aaaao-a4osa-cai
pm2 start /root/rhinospider/services/ic-proxy/server-fixed.js --name ic-proxy
pm2 start /root/rhinospider/services/search-proxy/server.js --name search-proxy
pm2 save --force
```

## Service Management

### Restarting Services
```bash
# IC Proxy
pm2 restart ic-proxy --update-env

# Search Proxy
pm2 restart search-proxy --update-env

# View logs
pm2 logs ic-proxy --lines 50
pm2 logs search-proxy --lines 50
```

### Health Checks
```bash
# IC Proxy
curl http://143.244.133.154:3001/api/health

# Search Proxy
curl http://143.244.133.154:3002/api/health
```

## Nginx Configuration

Nginx serves as a reverse proxy for both services:
- IC Proxy: port 3001 → ic-proxy.rhinospider.com
- Search Proxy: port 3002 → search-proxy.rhinospider.com

Configuration files located at `/etc/nginx/sites-available/`

## Troubleshooting

### Wrong Canister IDs Loading
1. Check environment: `pm2 env <process_id>`
2. Check module config: `cat /root/.pm2/module_conf.json`
3. If wrong, follow PM2 Configuration steps above

### 504 Gateway Timeout
- Usually caused by blocking operations in background.js
- Check IC proxy logs: `pm2 logs ic-proxy`
- Ensure updateUserLogin is non-blocking

### Data Storage Errors
- Verify canister IDs match production values
- Check IC proxy health endpoint
- Test with debug endpoint: `curl http://143.244.133.154:3001/api/debug`

## Extension Deployment

1. Build extension:
```bash
cd apps/extension
npm run build
```

2. Load in Chrome:
- Navigate to chrome://extensions
- Enable Developer mode
- Load unpacked from `apps/extension/dist`

## Monitoring

Use PM2 for process monitoring:
```bash
pm2 status
pm2 monit
```

Check service availability:
```bash
# From local machine
curl https://ic-proxy.rhinospider.com/api/health
curl https://search-proxy.rhinospider.com/api/health
```