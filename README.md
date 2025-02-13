# RhinoSpider Extension

RhinoSpider - Web3-enabled distributed web scraping platform extension.

## Project Structure

```
rhinospider_extension/
├── apps/
│   ├── admin/             # Admin dashboard application
│   └── extension/         # Chrome extension
├── packages/
│   └── web3-client/      # Shared Web3 integration package
├── canisters/            # ICP canisters
├── services/             # Backend services
├── infrastructure/       # Infrastructure code
└── docs/                 # Documentation
```

## Features

- 🌐 Web scraping with AI-powered configuration
- 🔒 Web3 authentication with NFID
- 💾 Decentralized storage on Internet Computer
- 🔄 Distributed scraping network
- 📊 Real-time analytics and monitoring

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run extension in development mode
pnpm --filter extension dev

# Run admin dashboard in development mode
pnpm --filter admin dev

# Run tests
pnpm test
```

## ICP Canisters

The project uses several Internet Computer canisters:

1. **Admin Backend** (`s6r66-wyaaa-aaaaj-az4sq-cai`)
   - Manages topics, users, and AI configuration
   - Handles authentication and authorization
   - Provides APIs for the admin dashboard

2. **Admin Frontend** (`sxsvc-aqaaa-aaaaj-az4ta-cai`)
   - Serves the admin dashboard web application
   - URL: https://sxsvc-aqaaa-aaaaj-az4ta-cai.icp0.io/

3. **Auth** (`slwpt-xqaaa-aaaaj-az4ra-cai`)
   - Handles user authentication
   - Manages user roles and permissions

4. **Storage** (`smxjh-2iaaa-aaaaj-az4rq-cai`)
   - Stores scraped data
   - Manages data persistence and retrieval

5. **Internet Identity** (Remote canister)
   - ID: `rdmx6-jaaaa-aaaaa-aaadq-cai`
   - Provides decentralized authentication

### Deploying Canisters

```bash
# Deploy all canisters
dfx deploy --network ic

# Deploy specific canister
dfx deploy --network ic <canister_name>

# Deploy admin frontend
cd apps/admin && npm run build
dfx deploy --network ic admin_frontend
```

## Architecture

- **Extension**: Chrome extension built with React and Vite
- **Admin Dashboard**: React application for managing scraping configuration
- **Web3 Client**: Shared package for Web3 integration
- **ICP Canisters**: Smart contracts for storage, authentication, and administration
- **Backend Services**: Supporting microservices

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
