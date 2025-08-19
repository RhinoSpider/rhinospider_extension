# Production Deployment Guide

## Server Infrastructure

### Production Server
- **Provider**: Digital Ocean
- **IP Address**: 143.244.133.154
- **Services**: IC Proxy, Search Proxy
- **Process Manager**: PM2

## Service URLs

### Public Endpoints
- **IC Proxy**: https://ic-proxy.rhinospider.com (port 3001)
- **Search Proxy**: https://search-proxy.rhinospider.com (port 3002)
- **Admin Dashboard**: https://sxsvc-aqaaa-aaaaj-az4ta-cai.icp0.io

## Canister Configuration

### Production Canister IDs
```bash
STORAGE_CANISTER_ID=hhaip-uiaaa-aaaao-a4khq-cai
CONSUMER_CANISTER_ID=t3pjp-kqaaa-aaaao-a4ooq-cai
ADMIN_CANISTER_ID=wvset-niaaa-aaaao-a4osa-cai
```

## Deployment Process

### 1. Initial Setup
```bash
# SSH into server
ssh root@143.244.133.154

# Navigate to project
cd /root/rhinospider

# Pull latest code
git pull origin main
```

### 2. Service Deployment

#### IC Proxy Service
```bash
# Set environment variables
export STORAGE_CANISTER_ID=hhaip-uiaaa-aaaao-a4khq-cai
export CONSUMER_CANISTER_ID=t3pjp-kqaaa-aaaao-a4ooq-cai
export ADMIN_CANISTER_ID=wvset-niaaa-aaaao-a4osa-cai

# Start/restart service
pm2 restart ic-proxy --update-env
# OR for first time
pm2 start services/ic-proxy/server-fixed.js --name ic-proxy

# Save PM2 configuration
pm2 save --force
```

#### Search Proxy Service
```bash
# Start/restart service
pm2 restart search-proxy --update-env
# OR for first time
pm2 start services/search-proxy/server.js --name search-proxy

# Save configuration
pm2 save --force
```

### 3. Extension Deployment

#### Build Extension
```bash
cd apps/extension
npm run build
```

#### Chrome Web Store Upload
1. Create ZIP file: `npm run package`
2. Go to [Chrome Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard)
3. Upload new version
4. Submit for review

## PM2 Management

### Common Commands
```bash
# View all processes
pm2 list

# View logs
pm2 logs ic-proxy
pm2 logs search-proxy

# Monitor resources
pm2 monit

# Restart all
pm2 restart all

# Stop services
pm2 stop ic-proxy
pm2 stop search-proxy
```

### PM2 Configuration Reset
⚠️ **Important**: PM2 caches environment variables

If environment variables aren't updating:
```bash
# 1. Check cached config
cat /root/.pm2/module_conf.json

# 2. Clear PM2 state
rm /root/.pm2/dump.pm2
pm2 kill

# 3. Restart with fresh environment
export STORAGE_CANISTER_ID=hhaip-uiaaa-aaaao-a4khq-cai
export CONSUMER_CANISTER_ID=t3pjp-kqaaa-aaaao-a4ooq-cai
export ADMIN_CANISTER_ID=wvset-niaaa-aaaao-a4osa-cai
pm2 start services/ic-proxy/server-fixed.js --name ic-proxy
pm2 start services/search-proxy/server.js --name search-proxy
pm2 save --force
```

## SSL/TLS Configuration

### Nginx Configuration
```nginx
server {
    listen 443 ssl;
    server_name ic-proxy.rhinospider.com;
    
    ssl_certificate /etc/letsencrypt/live/ic-proxy.rhinospider.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ic-proxy.rhinospider.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Certificate Renewal
```bash
# Auto-renewal is configured via cron
# Manual renewal if needed
certbot renew --nginx
```

## Monitoring

### Health Checks
```bash
# IC Proxy health
curl https://ic-proxy.rhinospider.com/api/health

# Search Proxy health
curl https://search-proxy.rhinospider.com/api/health

# Debug endpoint
curl https://ic-proxy.rhinospider.com/api/debug
```

### Log Files
```bash
# PM2 logs
~/.pm2/logs/ic-proxy-out.log
~/.pm2/logs/ic-proxy-error.log
~/.pm2/logs/search-proxy-out.log
~/.pm2/logs/search-proxy-error.log

# Nginx logs
/var/log/nginx/access.log
/var/log/nginx/error.log
```

## Backup Strategy

### Database Backup
```bash
# Canister data is on blockchain - no backup needed
# Local cache/quota files
tar -czf backup-$(date +%Y%m%d).tar.gz services/search-proxy/data/
```

### Code Backup
- Primary: GitHub repository
- Secondary: Local development machines
- Canister code: Stored on IC blockchain