# Environment Configuration Guide

## Overview

RhinoSpider requires specific environment variables for different deployment environments. This guide covers both production and development configurations.

## Environment Files

### 1. Production (.env)
```sh
# Internet Computer
VITE_II_URL=https://identity.ic0.app
VITE_DFX_NETWORK=ic
VITE_IC_HOST=https://icp0.io

# Canister IDs
VITE_ADMIN_CANISTER_ID=s6r66-wyaaa-aaaaj-az4sq-cai
VITE_STORAGE_CANISTER_ID=smxjh-2iaaa-aaaaj-az4rq-cai

# AI Configuration
VITE_OPENAI_API_KEY=sk-...
VITE_GPT_MODEL=gpt-4
VITE_MAX_TOKENS=4000

# Digital Ocean
VITE_DO_SCRAPER_URL=https://scraper.rhinospider.com
VITE_DO_API_KEY=your_do_api_key
```

### 2. Local Development (.env.local)
```sh
# Internet Computer
VITE_II_URL=http://127.0.0.1:8000
VITE_DFX_NETWORK=local
VITE_IC_HOST=http://127.0.0.1:8000

# Canister IDs - Will be updated after dfx deploy
VITE_ADMIN_CANISTER_ID=br5f7-7uaaa-aaaaa-qaaca-cai
VITE_STORAGE_CANISTER_ID=be2us-64aaa-aaaaa-qaabq-cai

# AI Configuration
VITE_OPENAI_API_KEY=sk-...
VITE_GPT_MODEL=gpt-3.5-turbo
VITE_MAX_TOKENS=2000

# Digital Ocean (Local)
VITE_DO_SCRAPER_URL=http://localhost:3000
VITE_DO_API_KEY=development_key
```

## Configuration Details

### 1. Internet Computer
- `VITE_DFX_NETWORK`: Network to deploy to
  - `ic`: Production mainnet
  - `local`: Local development
- `VITE_IC_HOST`: IC network host
  - Production: `https://icp0.io`
  - Local: `http://127.0.0.1:8000`
- `VITE_II_URL`: Internet Identity URL
  - Production: `https://identity.ic0.app`
  - Local: `http://127.0.0.1:8000`

### 2. Canister IDs
- `VITE_ADMIN_CANISTER_ID`: Admin interface
- `VITE_STORAGE_CANISTER_ID`: Data storage

### 3. AI Configuration
- `VITE_OPENAI_API_KEY`: OpenAI API key
- `VITE_GPT_MODEL`: GPT model to use
  - Production: `gpt-4`
  - Development: `gpt-3.5-turbo`
- `VITE_MAX_TOKENS`: Token limit per request

### 4. Digital Ocean
- `VITE_DO_SCRAPER_URL`: Scraping service URL
- `VITE_DO_API_KEY`: DO API authentication

## Environment Management

### 1. File Hierarchy
```
.env                # Production defaults
.env.local         # Local development overrides
.env.example       # Template with all variables
.env.test          # Testing configuration
```

### 2. Priority Order
1. `.env.local`
2. `.env`
3. Default values

### 3. Security
- Never commit `.env` files
- Use `.env.example` as template
- Rotate API keys regularly
- Use separate keys per environment

## Development Setup

### 1. Initial Setup
```bash
# Copy example config
cp .env.example .env.local

# Update local values
nano .env.local

# Deploy local canisters
dfx deploy --network=local
```

### 2. Canister Updates
```bash
# After deploying, update IDs
ADMIN_ID=$(dfx canister id admin)
STORAGE_ID=$(dfx canister id storage)

# Update .env.local
sed -i '' "s/VITE_ADMIN_CANISTER_ID=.*/VITE_ADMIN_CANISTER_ID=$ADMIN_ID/" .env.local
sed -i '' "s/VITE_STORAGE_CANISTER_ID=.*/VITE_STORAGE_CANISTER_ID=$STORAGE_ID/" .env.local
```

## Production Deployment

### 1. Environment Setup
```bash
# Create production env
cp .env.example .env

# Update production values
nano .env

# Verify configuration
npm run verify-env
```

### 2. Deployment
```bash
# Deploy to IC
dfx deploy --network=ic

# Update canister IDs in .env
ADMIN_ID=$(dfx canister --network=ic id admin)
STORAGE_ID=$(dfx canister --network=ic id storage)

sed -i '' "s/VITE_ADMIN_CANISTER_ID=.*/VITE_ADMIN_CANISTER_ID=$ADMIN_ID/" .env
sed -i '' "s/VITE_STORAGE_CANISTER_ID=.*/VITE_STORAGE_CANISTER_ID=$STORAGE_ID/" .env
```

## Troubleshooting

### 1. Common Issues
- Missing variables
- Invalid canister IDs
- Network configuration
- API key issues

### 2. Verification
```bash
# Verify environment
npm run verify-env

# Test configuration
npm run test:env

# Check canister status
dfx canister status --network=ic admin
dfx canister status --network=ic storage
```

## Best Practices

### 1. Security
- Use environment-specific keys
- Regular key rotation
- Secure storage of secrets
- Access control per environment

### 2. Maintenance
- Regular configuration review
- Update documentation
- Monitor resource usage
- Backup configurations

### 3. Development
- Use local overrides
- Test all environments
- Version control templates
- Document changes
