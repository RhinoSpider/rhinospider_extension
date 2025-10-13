# RhinoSpider

This is a decentralized platform (DePIN) for web data collection built on Internet Computer. Basically, users can contribute their bandwidth to help collect web data and they earn points in return. Think of it as getting rewarded for browsing the web while helping train AI models.

Current Version: 7.2.0 (Chrome Extension)

## Recent Updates (January 2025)

### What Makes Us Different

While platforms like GRASS scrape 100TB-1000TB of raw HTML per day, we take a smarter approach:
- We scrape, analyze with AI, and store only 1-5KB of semantic data per page
- That's 100x more storage efficient than competitors
- Perfect fit for IC's cost model - we can handle 10,000 scrapes/day = 50MB on-chain
- We sell AI-ready training data, not raw HTML dumps
- Clear B2B revenue model that actually makes sense

### Recent Production Deployments

**Fixed Critical Memory Issue (Jan 13, 2025)**
- Storage canister was maxed out at 7GB with 148k entries
- Users couldn't earn points because storage was full
- Added memory management functions to clear old data automatically
- Now running healthy at 885MB with auto-cleanup every 7 days
- Both storage and consumer canisters deployed and verified working

**Wallet Integration & Token Economics**
- Added Plug wallet integration for ICP wallets
- Points-to-token conversion infrastructure ready
- Conversion rate: 1,000 points = 1 RHINO token
- 5% conversion fee if withdrawn within 30 days (to reduce sell pressure)
- Backend tracks point timestamps for accurate fee calculation
- UI ready, just waiting for token launch

**Points Timestamp Tracking**
- Every point award is now timestamped
- Enables fair fee calculation based on when points were earned
- Conversion requests tracked and ready for admin dashboard
- No retroactive penalties - only applies to new points

**Service Health Monitoring (Real, Not Mock)**
- Health checks actually call `/api/health` endpoints
- Users see real-time service status
- When services are down, users understand why they're not earning points
- No more confusion about "why isn't it working"

### Why This Wins

1. **100x More Efficient**: We store analyzed data (1-5KB) not raw HTML (100MB+)
2. **Perfect for IC**: Low storage costs, no massive update calls issue
3. **Real Revenue Model**: B2B marketplace for AI training data, not raw scrapes
4. **Production Ready**: No mock data, all canisters deployed and verified
5. **User Experience**: Clear service health indicators, wallet integration, transparent fees
6. **Scalability**: Automatic memory management, can handle growth without hitting limits

See [RESPONSE_TO_COMMITTEE.md](RESPONSE_TO_COMMITTEE.md) for detailed comparison with competitors and [DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md) for technical deployment details.

## Project Structure

```
rhinospider/
├── apps/
│   ├── admin/             # Admin dashboard application
│   ├── extension/         # Chrome extension v7.2.0
│   ├── marketplace/       # Enterprise data marketplace
│   ├── backend/           # Backend services
│   ├── scraper-service/   # Scraper service
│   └── viewer/            # Content viewer
├── canisters/             # ICP canisters
│   ├── admin/             # Admin canister
│   ├── consumer/          # Consumer canister
│   ├── storage/           # Storage canister
│   ├── marketplace/       # Marketplace canister
│   └── auth/              # Authentication canister
├── services/              # Backend services
│   ├── ic-proxy/          # IC Proxy service
│   └── search-proxy/      # Search proxy service
└── docs/
    └── common/            # Unified documentation
        ├── extension/     # Extension docs
        ├── admin/         # Admin panel docs
        ├── services/      # Backend services docs
        └── deployment/    # Deployment guides
```

## What it does

For regular users:
- Popup interface with tabs for everything you need
- Points system - you get 10 points per KB of data you contribute
- RhinoScan feature for discovering content with AI
- Content filtered by region (geo-filtering)
- Uses Internet Identity 2.0 - works with Google login, no annoying identity numbers
- See your stats in real-time
- Referral system so you can earn by inviting friends

Enterprise marketplace (for businesses):
- Browse and buy datasets
- All data is real and syncs with our admin backend
- You can bulk download or use API access
- Dashboard to track what you bought and how much you're using
- User profiles for companies

Tech stuff:
- Everything stored on IC blockchain
- Error handling for pretty much any edge case I could think of
- Service health monitoring
- No mock data anywhere, all real canister integration
- Google Analytics (GA4) built in

## Documentation

Check these out if you need more details:
- [Main docs](./docs/common/README.md)
- [Extension overview](./docs/common/extension/overview.md)
- [Production deployment guide](./docs/common/deployment/production.md)
- [Troubleshooting](./docs/common/deployment/troubleshooting.md)
- [Admin panel guide](./docs/common/admin/overview.md)
- [Services docs](./docs/common/services/overview.md)

## Production Canisters

Here are the production canister IDs if you need them:
- Storage: `hhaip-uiaaa-aaaao-a4khq-cai`
- Consumer: `t3pjp-kqaaa-aaaao-a4ooq-cai`
- Admin Backend: `wvset-niaaa-aaaao-a4osa-cai`
- Admin Frontend: `sxsvc-aqaaa-aaaaj-az4ta-cai`
- Marketplace Backend: `y64hu-laaaa-aaaao-a4ptq-cai`
- Marketplace Frontend: `ztsd2-eiaaa-aaaao-a4pua-cai`
- Auth: `rdmx6-jaaaa-aaaaa-aaadq-cai`

## Live Apps

Admin Panel: https://sxsvc-aqaaa-aaaaj-az4ta-cai.icp0.io/
Enterprise Marketplace: https://ztsd2-eiaaa-aaaao-a4pua-cai.icp0.io/

## Development Setup

If you want to run this locally:

```bash
# install everything
pnpm install

# build all packages
pnpm build

# run the extension in dev mode
cd apps/extension
pnpm run dev

# or run admin dashboard
cd apps/admin
pnpm run dev

# marketplace dev mode
cd apps/marketplace
pnpm run dev

# deploy to local dfx network
cd canisters
dfx deploy --network=local
```

## Privacy

We take privacy seriously. No personal info gets collected, and everything goes through the IC blockchain. See the extension docs for more details.

## Changes

Check out [CHANGELOG.md](CHANGELOG.md) for version history.
