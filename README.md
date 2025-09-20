# RhinoSpider

RhinoSpider is a DePIN (Decentralized Physical Infrastructure Network) platform for distributed web intelligence built on the Internet Computer Protocol (ICP). Users contribute their bandwidth for web data collection while earning points and rewards.

**Current Version**: 7.2.0 (Chrome Extension)

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

## Key Features

### For Users
- 🎯 **Enhanced Popup Interface**: All features in a compact, tabbed popup
- 💰 **Points System**: Earn 10 points per KB of data contributed
- 🔍 **RhinoScan**: AI-powered content discovery
- 🌍 **Geo-Filtered Content**: Regional content distribution
- 🔐 **Internet Identity 2.0**: Next-gen authentication with Google login, no identity numbers, and multi-account support
- 📊 **Real-time Stats**: Track earnings and contributions
- 🔗 **Referral System**: Earn rewards for bringing new users

### Enterprise Marketplace
- 🏪 **Data Marketplace**: Browse and purchase enterprise-grade datasets
- 📈 **Real Data Integration**: Syncs with admin backend for live scraping topics
- 💳 **Flexible Purchasing**: Bulk download or API access options
- 📊 **User Dashboard**: Track purchases, API usage, and spending
- 👤 **User Profiles**: Company information and usage statistics

### For Developers
- ⛓️ **IC Blockchain**: Decentralized data storage
- 🔄 **Error Recovery**: Comprehensive error handling for all edge cases
- 📡 **Service Health**: Real-time monitoring and health checks
- 🛡️ **Production Ready**: No mock data, real canister integration
- 📈 **Analytics**: Google Analytics integration (GA4)

## Documentation

- [📚 Main Documentation](./docs/common/README.md)
- [🦏 Extension Overview](./docs/common/extension/overview.md)
- [🚀 Production Deployment](./docs/common/deployment/production.md)
- [🔧 Troubleshooting](./docs/common/deployment/troubleshooting.md)
- [📊 Admin Panel Guide](./docs/common/admin/overview.md)
- [🔌 Services Documentation](./docs/common/services/overview.md)

## Production Canister IDs

- **Storage**: `hhaip-uiaaa-aaaao-a4khq-cai`
- **Consumer**: `t3pjp-kqaaa-aaaao-a4ooq-cai`
- **Admin Backend**: `wvset-niaaa-aaaao-a4osa-cai`
- **Admin Frontend**: `sxsvc-aqaaa-aaaaj-az4ta-cai`
- **Marketplace Backend**: `y64hu-laaaa-aaaao-a4ptq-cai`
- **Marketplace Frontend**: `ztsd2-eiaaa-aaaao-a4pua-cai`
- **Auth**: `rdmx6-jaaaa-aaaaa-aaadq-cai`

## Live Applications

- **Admin Panel**: [https://sxsvc-aqaaa-aaaaj-az4ta-cai.icp0.io/](https://sxsvc-aqaaa-aaaaj-az4ta-cai.icp0.io/)
- **Enterprise Marketplace**: [https://ztsd2-eiaaa-aaaao-a4pua-cai.icp0.io/](https://ztsd2-eiaaa-aaaao-a4pua-cai.icp0.io/)

## Development

For local development setup, see the [Development Guide](docs/technical/development.md).

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run extension in development mode
cd apps/extension
pnpm run dev

# Run admin dashboard in development mode
cd apps/admin
pnpm run dev

# Run marketplace in development mode
cd apps/marketplace
pnpm run dev

# Deploy canisters to local network
cd canisters
dfx deploy --network=local
```

## Security & Privacy

RhinoSpider adheres to strict privacy and security guidelines. For more information, see the [Extension Documentation](docs/technical/extension.md).

## Changelog

For a complete list of changes, see the [CHANGELOG.md](CHANGELOG.md).
