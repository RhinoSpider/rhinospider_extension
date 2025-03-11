# RhinoSpider Local Development Setup

## Overview

This guide outlines the process for setting up a local development environment for the RhinoSpider project, including the extension, IC proxy, and related services.

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm 8+ or yarn
- Chrome browser
- Git
- Docker and Docker Compose (optional, for containerized services)

## Repository Structure

```
rhinospider/
├── extension/           # Chrome extension code
├── ic-proxy/            # IC Proxy service
├── services/
│   ├── scraper/         # Scraper service
│   └── storage/         # Direct storage service
├── canisters/           # Internet Computer canisters
│   ├── admin/           # Admin canister
│   ├── consumer/        # Consumer canister
│   └── storage/         # Storage canister
└── docs-consolidated/   # Project documentation
```

## Extension Setup

### 1. Install Dependencies

```bash
cd extension
npm install
```

### 2. Configure Environment

Create a `.env` file in the extension directory:

```
# Extension Environment Variables
PROXY_URL=http://localhost:3002
EXTENSION_ID=your-extension-id
```

### 3. Build Extension

```bash
# Development build with watch mode
npm run dev

# Production build
npm run build
```

### 4. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top-right corner)
3. Click "Load unpacked" and select the `extension/dist` directory
4. Note the generated extension ID and update your `.env` file

## IC Proxy Setup

### 1. Install Dependencies

```bash
cd ic-proxy
npm install
```

### 2. Configure Environment

Create a `.env` file in the ic-proxy directory:

```
# Server Configuration
PORT=3002
NODE_ENV=development

# Canister IDs (use local or production IDs)
ADMIN_CANISTER_ID=local-admin-canister-id
CONSUMER_CANISTER_ID=local-consumer-canister-id
STORAGE_CANISTER_ID=local-storage-canister-id

# IC Host (local or production)
IC_HOST=http://localhost:8000

# CORS Configuration
ALLOWED_ORIGINS=chrome-extension://your-extension-id
```

### 3. Start the Server

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

> **Important**: Ensure that the server includes all required endpoints, especially `/api/topics` and `/api/profile` which are essential for the extension to function properly.

## Local Canister Setup

### 1. Install DFINITY SDK

```bash
sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"
```

### 2. Start Local Internet Computer

```bash
cd canisters
dfx start --background
```

### 3. Deploy Local Canisters

```bash
dfx deploy --network=local
```

### 4. Get Canister IDs

```bash
dfx canister id admin
dfx canister id consumer
dfx canister id storage
```

Update the IC Proxy `.env` file with these IDs.

## Docker Setup (Optional)

For a containerized development environment:

### 1. Build and Start Services

```bash
docker-compose -f docker-compose.dev.yml up -d
```

### 2. Check Service Status

```bash
docker-compose -f docker-compose.dev.yml ps
```

### 3. View Logs

```bash
docker-compose -f docker-compose.dev.yml logs -f
```

## Development Workflow

### 1. Extension Development

1. Make changes to extension code
2. Run `npm run dev` in the extension directory
3. Reload the extension in Chrome (chrome://extensions/ → refresh icon)
4. Test changes

### 2. IC Proxy Development

1. Make changes to IC Proxy code
2. The server will automatically restart if running in dev mode
3. Test changes via the extension or API client

### 3. Canister Development

1. Make changes to canister code
2. Deploy changes: `dfx deploy --network=local <canister_name>`
3. Test changes via the IC Proxy

## Testing

### 1. Extension Testing

```bash
cd extension
npm test
```

### 2. IC Proxy Testing

```bash
cd ic-proxy
npm test
```

### 3. End-to-End Testing

For manual end-to-end testing:

1. Ensure all services are running (IC Proxy, local canisters)
2. Load the extension in Chrome
3. Open the extension popup
4. Verify authentication flow
5. Test topic fetching
6. Test content submission

## Debugging

### 1. Extension Debugging

1. Open Chrome DevTools for the extension:
   - Right-click the extension icon → Inspect popup
   - Or navigate to chrome://extensions, click "background page" under your extension

2. Use the Console and Network tabs to debug

### 2. IC Proxy Debugging

1. Check server logs:
   ```bash
   cd ic-proxy
   npm run dev
   ```

2. Use API testing tools like Postman or curl:
   ```bash
   curl http://localhost:3002/api/health
   ```

### 3. Canister Debugging

1. Check canister logs:
   ```bash
   dfx canister call <canister_name> get_logs
   ```

2. Use Candid UI for manual testing:
   - Open http://localhost:8000/candid?canisterId=<canister_id>

## Common Issues

### 1. CORS Errors

If you see CORS errors in the extension:

1. Ensure the extension ID is correctly set in the IC Proxy's `.env` file
2. Restart the IC Proxy server
3. Check that the server is properly setting CORS headers

### 2. Authentication Errors

If authentication fails:

1. Check that Internet Identity is properly configured
2. Verify delegation chain format
3. Ensure the extension is using the correct proxy URL

### 3. Missing Endpoints

If the extension reports 404 errors:

1. Verify that all required endpoints are implemented in the IC Proxy
2. Check server logs for routing issues
3. Ensure the server is running on the expected port

## Best Practices

### 1. Code Style

Follow the established code style:
- Use ESLint and Prettier for code formatting
- Follow the TypeScript coding guidelines
- Write meaningful commit messages

### 2. Security

Adhere to security best practices:
- Never commit sensitive information (.env files, keys)
- Follow the principle of least privilege
- Validate all inputs
- Handle errors gracefully

### 3. Documentation

Keep documentation up to date:
- Document new features
- Update API documentation
- Add comments for complex logic

## Resources

- [Internet Computer Documentation](https://internetcomputer.org/docs/current/developer-docs/)
- [Chrome Extension Development](https://developer.chrome.com/docs/extensions/)
- [Node.js Documentation](https://nodejs.org/en/docs/)
- [Express.js Documentation](https://expressjs.com/)
