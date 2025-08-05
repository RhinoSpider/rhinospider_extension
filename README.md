# RhinoSpider

RhinoSpider is a privacy-focused distributed web scraping platform built on the Internet Computer Protocol (ICP).

## Project Structure

```
rhinospider/
├── apps/
│   ├── admin/             # Admin dashboard application
│   ├── extension/         # Chrome extension
│   ├── backend/           # Backend services
│   ├── scraper-service/   # Scraper service
│   └── viewer/            # Content viewer
├── packages/
│   ├── scraping-core/     # Core scraping functionality
│   ├── ui/                # Shared UI components
│   └── web3-client/       # Web3 client utilities
├── canisters/             # ICP canisters
│   ├── admin/             # Admin canister
│   ├── analytics/         # Analytics canister
│   ├── auth/              # Authentication canister
│   ├── consumer/          # Consumer canister
│   ├── storage/           # Storage canister
│   └── user_profile/      # User profile canister
├── services/              # Backend services
│   ├── ic-proxy/          # IC Proxy service
│   ├── scraper/           # Scraper service
│   └── search-proxy/      # Search proxy service
└── docs/                  # Documentation
```

## Documentation

- [Business Logic](docs/business)
- [Technical Documentation](docs/technical)

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

# Deploy canisters to local network
cd canisters
dfx deploy --network=local
```

## Security & Privacy

RhinoSpider adheres to strict privacy and security guidelines. For more information, see the [Extension Documentation](docs/technical/extension.md).

## Changelog

For a complete list of changes, see the [CHANGELOG.md](CHANGELOG.md).
