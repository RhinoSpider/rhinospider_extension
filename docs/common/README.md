# RhinoSpider Docs

## Structure

```
docs/common/
├── README.md              # this file
├── extension/            # extension docs
│   ├── overview.md
│   ├── development.md
│   └── changelog.md
├── admin/                # admin panel docs
│   ├── overview.md
│   └── geo-distribution.md
├── services/             # backend services
│   ├── ic-proxy.md
│   └── search-proxy.md
└── deployment/
    ├── production.md
    └── troubleshooting.md
```

## Quick Links

Developers:
- [Extension Development](./extension/development.md)
- [Technical Architecture](./extension/overview.md)
- [Service APIs](./services/ic-proxy.md)

Operations:
- [Production Deployment](./deployment/production.md)
- [Troubleshooting](./deployment/troubleshooting.md)
- [Admin Panel](./admin/overview.md)

Business:
- [Points & Referrals](./extension/overview.md#points-system)
- [AI Integration](./extension/overview.md#ai-integration)

## Production Info

Live services:
- Admin: https://sxsvc-aqaaa-aaaaj-az4ta-cai.icp0.io
- IC Proxy: https://ic-proxy.rhinospider.com
- Search Proxy: https://search-proxy.rhinospider.com

Canister IDs:
- Storage: `hhaip-uiaaa-aaaao-a4khq-cai`
- Consumer: `t3pjp-kqaaa-aaaao-a4ooq-cai`
- Admin: `wvset-niaaa-aaaao-a4osa-cai`

Version: v5.6.0