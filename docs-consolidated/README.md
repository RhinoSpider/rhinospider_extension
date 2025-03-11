# RhinoSpider Documentation

## Overview

RhinoSpider is a distributed web scraping system that operates through a Chrome extension. The system uses Internet Identity (II) for authentication and Internet Computer Protocol (ICP) canisters for data storage and management.

## Directory Structure

### `/architecture`
System architecture and design documents:
- [SCRAPING.md](architecture/SCRAPING.md): Core scraping system architecture
- [AUTHENTICATION.md](architecture/AUTHENTICATION.md): Internet Identity integration and auth flows
- [DATA_PROCESSING.md](architecture/DATA_PROCESSING.md): Data processing and storage

### `/features`
Feature-specific documentation:
- [AI_INTEGRATION.md](features/AI_INTEGRATION.md): AI-powered content analysis and extraction

### `/development`
Development guides and processes:
- [TESTING.md](development/TESTING.md): Testing guide and best practices

### `/deployment`
Deployment and operations documentation:
- [DO_SCRAPER_SETUP.md](deployment/DO_SCRAPER_SETUP.md): Digital Ocean scraper service setup
- [IC_PROXY_SETUP.md](deployment/IC_PROXY_SETUP.md): IC Proxy service setup
- [SEARCH_PROXY_SETUP.md](deployment/SEARCH_PROXY_SETUP.md): Search proxy service setup

### `/extension`
Extension-specific documentation:
- [AUTHENTICATION.md](extension/AUTHENTICATION.md): Extension authentication flow
- [SCRAPING.md](extension/SCRAPING.md): Extension scraping implementation

## Project Structure
```
rhinospider/
├── apps/
│   ├── admin/        # Admin portal (ICP-based)
│   └── extension/    # Chrome extension
├── docs/             # Documentation
├── services/
│   ├── ic-proxy/     # IC Proxy service
│   └── search-proxy/ # Search proxy service
└── packages/         # Shared packages
```

## Environment Setup

### Production Environment
Production environment files (`.env`) are configured for IC mainnet:
```
apps/admin/.env
apps/extension/.env
.env (root)
```

### Local Development
Local development environment files (`.env.local`) are configured for local testing:
```
apps/admin/.env.local
apps/extension/.env.local
```
Note: `.env.local` files are gitignored and should be created based on the production `.env` files.

## Documentation Standards

1. **File Names**
   - Use UPPERCASE for main documentation files
   - Use snake_case for supporting files
   - Always include `.md` extension

2. **Content Structure**
   - Start with a clear overview
   - Include implementation details
   - Add code examples where relevant
   - Document testing procedures

3. **Maintenance**
   - Keep documentation up to date
   - Archive obsolete documents
   - Review and update regularly

## Contributing

1. Create a new branch for documentation changes
2. Follow the established directory structure
3. Update this README if adding new sections
4. Submit a pull request for review
