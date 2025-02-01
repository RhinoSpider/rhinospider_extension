# RhinoSpider Extension

RhinoSpider - Web3-enabled distributed web scraping platform extension.

## Project Structure

```
rhinospider_extension/
├── apps/
│   └── extension/          # Chrome extension
├── packages/
│   └── web3-client/       # Shared Web3 integration package
├── canisters/             # ICP canisters
├── services/              # Backend services
├── infrastructure/        # Infrastructure code
└── docs/                  # Documentation
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

# Run tests
pnpm test
```

## Architecture

- **Extension**: Chrome extension built with React and Vite
- **Web3 Client**: Shared package for Web3 integration
- **ICP Canisters**: Smart contracts for storage and authentication
- **Backend Services**: Supporting microservices

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
