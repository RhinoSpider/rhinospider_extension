# RhinoSpider Documentation

## Project Structure

```
docs/common/
├── README.md              # This file - main documentation index
├── extension/            # Chrome Extension documentation
│   ├── overview.md       # Extension features and architecture
│   ├── development.md    # Development setup and guidelines
│   └── changelog.md      # Version history
├── admin/                # Admin Panel documentation
│   ├── overview.md       # Admin features and usage
│   └── geo-distribution.md # Geo-filtering functionality
├── services/             # Backend Services documentation
│   ├── ic-proxy.md       # IC Proxy service
│   └── search-proxy.md   # Search Proxy service
└── deployment/           # Deployment documentation
    ├── production.md     # Production deployment guide
    └── troubleshooting.md # Common issues and solutions
```

## Quick Links

### For Developers
- [Extension Development](./extension/development.md)
- [Technical Architecture](./extension/overview.md)
- [Service APIs](./services/ic-proxy.md)

### For Operations
- [Production Deployment](./deployment/production.md)
- [Troubleshooting Guide](./deployment/troubleshooting.md)
- [Admin Panel Guide](./admin/overview.md)

### For Business
- [Points & Referral System](./extension/overview.md#points-system)
- [AI Integration Benefits](./extension/overview.md#ai-integration)

## Production Information

### Live Services
- **Admin Dashboard**: https://sxsvc-aqaaa-aaaaj-az4ta-cai.icp0.io
- **IC Proxy**: https://ic-proxy.rhinospider.com
- **Search Proxy**: https://search-proxy.rhinospider.com

### Canister IDs (Production)
- Storage: `hhaip-uiaaa-aaaao-a4khq-cai`
- Consumer: `t3pjp-kqaaa-aaaao-a4ooq-cai`
- Admin: `wvset-niaaa-aaaao-a4osa-cai`

## Version
Current: v5.6.0 (2025-08-17)