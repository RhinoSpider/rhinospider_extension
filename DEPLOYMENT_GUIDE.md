# RhinoSpider Deployment Guide

## System Architecture

RhinoSpider is a DePIN (Decentralized Physical Infrastructure Network) system for distributed web scraping with the following components:

### Internet Computer Canisters

| Canister | ID | Purpose | URL |
|----------|-----|---------|-----|
| Admin Backend | `wvset-niaaa-aaaao-a4osa-cai` | Topic management, AI config | [Candid UI](https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=wvset-niaaa-aaaao-a4osa-cai) |
| Admin Frontend | `sxsvc-aqaaa-aaaaj-az4ta-cai` | Web dashboard | https://sxsvc-aqaaa-aaaaj-az4ta-cai.icp0.io/ |
| Consumer | `tgyl5-yyaaa-aaaaj-az4wq-cai` | User profiles, points, auth | [Candid UI](https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=tgyl5-yyaaa-aaaaj-az4wq-cai) |
| Storage | `hhaip-uiaaa-aaaao-a4khq-cai` | Scraped data storage | [Candid UI](https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=hhaip-uiaaa-aaaao-a4khq-cai) |
| Referral | `t3pjp-kqaaa-aaaao-a4ooq-cai` | Referral system | [Candid UI](https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=t3pjp-kqaaa-aaaao-a4ooq-cai) |

### External Services

| Service | Location | Purpose |
|---------|----------|---------|
| IC Proxy | https://ic-proxy.rhinospider.com | Bridge between extension and IC |
| Search Proxy | https://search-proxy.rhinospider.com | URL discovery service |

## Deployment Commands

### Deploy Canisters

```bash
# Deploy admin backend
dfx deploy admin_backend --network ic

# Deploy consumer canister
dfx deploy consumer --network ic

# Deploy storage canister
dfx deploy storage --network ic

# Deploy admin frontend
cd apps/admin && npm run build
dfx deploy admin_frontend --network ic
```

### Deploy External Services

#### IC Proxy (Digital Ocean)
```bash
# The IC proxy runs on Digital Ocean
# Server: 143.244.133.154
# Update and restart via PM2
ssh root@143.244.133.154
cd /var/www/ic-proxy
git pull
pm2 restart ic-proxy
```

#### Search Proxy (Digital Ocean)
```bash
# Deploy using the script
./deploy-search-proxy.sh

# Or manually:
ssh root@143.244.133.154
cd /var/www/search-proxy
git pull
npm install
pm2 restart search-proxy
```

## Topic Management

Topics use search-based discovery instead of URL patterns:

### Creating Topics

1. Go to https://sxsvc-aqaaa-aaaaj-az4ta-cai.icp0.io/
2. Login with Internet Identity
3. Click "Add Topic"
4. Configure:
   - **Search Queries**: What to search for
   - **Required Keywords**: Must be present in content
   - **Content Selectors**: CSS selectors for extraction
   - **Operational Settings**: Batch size, interval, priority

### Example Topic Configuration

```javascript
{
  name: "DePIN Infrastructure News",
  searchQueries: ["DePIN blockchain", "decentralized infrastructure"],
  requiredKeywords: ["DePIN", "infrastructure"],
  contentSelectors: ["article", "main", ".content"],
  maxUrlsPerBatch: 10,
  scrapingInterval: 1800, // 30 minutes
  priority: 8
}
```

## AI Configuration

AI enhancement is **optional** and **disabled by default**:

1. Go to Admin Dashboard → AI Settings
2. Configure:
   - Provider: OpenAI
   - Model: gpt-3.5-turbo (cheapest)
   - API Key: Your OpenAI key
   - Features: Enable as needed

## Important Notes

1. **NEVER** use `--mode=reinstall` when deploying canisters (wipes data)
2. **ALWAYS** use `--mode=upgrade` to preserve data
3. Admin backend canister requires authorization (your principal is pre-authorized)
4. URL deduplication is automatic per user
5. Points are awarded at 10 points per KB scraped

## Troubleshooting

### Canister Issues
```bash
# Check canister status
dfx canister status <canister-name> --network ic

# View canister logs
dfx canister logs <canister-name> --network ic
```

### Service Issues
```bash
# Check IC proxy
curl https://ic-proxy.rhinospider.com/health

# Check search proxy
curl https://search-proxy.rhinospider.com/api/health
```

## Environment Variables

### Extension (.env)
```
VITE_IC_HOST=https://icp0.io
VITE_CONSUMER_CANISTER_ID=tgyl5-yyaaa-aaaaj-az4wq-cai
VITE_IC_PROXY_URL=https://ic-proxy.rhinospider.com
```

### IC Proxy (.env)
```
PORT=3001
IC_HOST=https://icp0.io
CONSUMER_CANISTER_ID=tgyl5-yyaaa-aaaaj-az4wq-cai
ADMIN_CANISTER_ID=wvset-niaaa-aaaao-a4osa-cai
STORAGE_CANISTER_ID=hhaip-uiaaa-aaaao-a4khq-cai
```

### Search Proxy (.env)
```
PORT=3002
NODE_ENV=production
IC_PROXY_URL=https://ic-proxy.rhinospider.com
CONSUMER_CANISTER_ID=tgyl5-yyaaa-aaaaj-az4wq-cai
```