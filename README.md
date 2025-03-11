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
├── packages/              # Shared packages
├── canisters/             # ICP canisters
│   ├── admin/             # Admin canister
│   ├── consumer/          # Consumer canister
│   └── storage/           # Storage canister
├── services/              # Backend services
│   ├── ic-proxy/          # IC Proxy service
│   └── scraper/           # Scraper service
└── docs-consolidated/     # Consolidated documentation
```

## Key Features

- 🔒 **Privacy-First Design**: Extension never accesses user browsing data
- 🌐 **Distributed Scraping**: Background scraping based on server-provided topics
- 🔐 **Internet Identity Authentication**: Secure Web3 authentication
- 💾 **Decentralized Storage**: Content stored on Internet Computer
- 🤖 **AI-Powered Processing**: Field-specific extraction with custom prompts
- 📊 **Admin Dashboard**: Topic management and content monitoring

## Architecture

RhinoSpider follows a strict data flow pattern:

```
Extension → Consumer Canister → Admin/Storage Canisters
```

Key principles:
- Extension NEVER directly accesses admin or storage canisters
- All data flows through consumer canister
- All requests are properly authenticated with Internet Identity
- Extension operates in read-only mode for admin data

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run extension in development mode
cd apps/extension
npm run dev

# Run admin dashboard in development mode
cd apps/admin
npm run dev

# Deploy canisters to local network
cd canisters
dfx deploy --network=local
```

## Documentation

Comprehensive documentation is available in the `docs-consolidated` directory:

- [Architecture Documentation](docs-consolidated/architecture/)
- [Extension Documentation](docs-consolidated/extension/)
- [Deployment Guides](docs-consolidated/deployment/)
- [Development Guides](docs-consolidated/development/)
- [Feature Documentation](docs-consolidated/features/)

## Security & Privacy

RhinoSpider adheres to strict privacy and security guidelines:
- NEVER accesses user's browsing history, open tabs, or personal data
- ONLY works as a background process based on server-provided topics
- NEVER opens new tabs or pages
- NEVER tracks what the user is browsing

## License

Copyright 2025 RhinoSpider Team
