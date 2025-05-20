# RhinoSpider Admin App Deployment Guide

This document provides instructions for deploying the RhinoSpider admin app to the Internet Computer.

## Important Canister IDs

- **Admin Canister**: `444wf-gyaaa-aaaaj-az5sq-cai` - Handles backend logic and data storage
- **Admin UI Canister**: `sxsvc-aqaaa-aaaaj-az4ta-cai` - Hosts the frontend assets
- **Consumer Canister**: `tgyl5-yyaaa-aaaaj-az4wq-cai` - Integrates with the admin canister
- **Wallet Canister**: `bfjmy-ryaaa-aaaao-a36qq-cai` - Used for managing cycles

## Prerequisites

Before deploying, ensure you have:

1. The correct identity selected (`ic-prod`)
2. Sufficient cycles in your wallet and canisters
3. The admin app built (`npm run build`)

## Deployment Process

### 1. Build the Admin App

```bash
cd /Users/ayanuali/development/rhinospider/apps/admin
npm run build
```

This will create the distribution files in the `dist` directory.

### 2. Check Cycles Balance

Ensure your wallet has sufficient cycles:

```bash
dfx identity use ic-prod
dfx wallet --network ic balance
```

### 3. Convert ICP to Cycles (if needed)

If you need more cycles, convert ICP to cycles:

```bash
dfx cycles convert --amount=0.1 --network ic
```

### 4. Top Up Canisters (if needed)

If the admin UI canister needs cycles:

```bash
dfx cycles top-up sxsvc-aqaaa-aaaaj-az4ta-cai 300000000000 --network ic
```

### 5. Deploy the Admin App

#### Option A: Complete Fix (Recommended)

For the most reliable deployment that handles both CSS and large JavaScript files correctly:

```bash
./scripts/deploy-complete-fix.sh
```

This approach:
1. Uses Vite's code splitting to create multiple smaller JavaScript files
2. Properly handles CSS files with correct content types
3. Automatically detects and splits large files (>300KB) into smaller chunks
4. Creates appropriate loaders for both CSS and JavaScript chunks
5. Ensures all assets are properly referenced in the index.html file

#### Option B: Code Splitting Only

If you want to use just the code splitting approach without special handling for CSS:

```bash
./scripts/deploy-chunked-build.sh
```

This approach:
1. Uses Vite's code splitting to create multiple smaller JavaScript files
2. Organizes code into logical chunks (vendor, UI, hooks, etc.)
3. Uploads each file directly without special handling for CSS

#### Option C: File Splitting (Legacy)

If you prefer the original file splitting approach:

```bash
./scripts/deploy-split-js.sh
```

This script:
1. Splits the large JavaScript file into smaller 40KB chunks
2. Creates a loader script that loads each chunk sequentially
3. Uploads each chunk individually to avoid "Argument list too long" errors
4. Provides a loading progress indicator for better user experience

### 6. Verify Deployment

Visit the admin app URL to verify the deployment:
`https://sxsvc-aqaaa-aaaaj-az4ta-cai.icp0.io/`

## Troubleshooting

### Standard Deployment Fails

If the standard deployment approach fails with errors like "Argument list too long" or "Canister out of cycles", use the split JavaScript approach:

```bash
./scripts/deploy-split-js.sh
```

### Wallet Canister Issues

If you encounter issues with the wallet canister (error code IC0504), top up the wallet canister with cycles:

```bash
dfx cycles top-up bfjmy-ryaaa-aaaao-a36qq-cai 500000000000 --network ic
```

If you need more cycles, convert ICP to cycles first:

```bash
dfx cycles convert --amount=0.1 --network ic
```

### Admin UI Canister Out of Cycles

If the admin UI canister is out of cycles:

```bash
dfx cycles top-up sxsvc-aqaaa-aaaaj-az4ta-cai 300000000000 --network ic
```

### CSS and JavaScript Issues

#### CSS Loading Issues

If you encounter CSS loading issues (502 errors or missing styles), use the complete fix script which properly handles CSS files:

```bash
./scripts/deploy-complete-fix.sh
```

This script ensures that:
1. CSS files are uploaded with the correct content type
2. Large CSS files are split into smaller chunks if needed
3. A special CSS loader is created to load chunked CSS files
4. The index.html file correctly references all CSS assets

#### Large JavaScript Files

The complete fix script also handles large JavaScript files automatically. However, if you want to understand the different approaches:

##### Complete Fix Approach (Recommended)

The most effective solution for handling both CSS and JavaScript files:

1. Splits the codebase into multiple smaller files based on logical modules
2. Properly handles CSS files with correct content types
3. Automatically detects and splits large files (>300KB) into smaller chunks
4. Creates appropriate loaders for both CSS and JavaScript chunks
5. Ensures all assets are properly referenced in the index.html file

To use this approach:

```bash
./scripts/deploy-complete-fix.sh
```

##### Code Splitting Approach

If you only need to handle large JavaScript files:

1. Splits the codebase into multiple smaller JavaScript files based on logical modules
2. Reduces individual file sizes to well below the Internet Computer's limits
3. Improves loading performance through parallel downloads
4. Enables better caching as only changed chunks need to be re-downloaded

To use this approach:

```bash
./scripts/deploy-chunked-build.sh
```

##### File Splitting Approach (Legacy)

The original approach for handling large JavaScript files:

1. Splits large JavaScript files into smaller 40KB chunks
2. Creates a dedicated directory structure for better organization (js/chunks/)
3. Implements a sequential loader that loads chunks in order
4. Provides a visual loading progress indicator for users
5. Handles errors gracefully with user-friendly messages

To use this approach:

```bash
./scripts/deploy-split-js.sh
```

All three approaches work around the Internet Computer's limitations for large assets, but the complete fix approach is the most reliable and provides the best user experience.

## Important Notes

- Always use `--mode=upgrade` when deploying to preserve existing data
- The admin canister (`444wf-gyaaa-aaaaj-az5sq-cai`) requires both the user principal ID and admin app principal ID to be authorized
- When updating the admin canister, always use `--mode=upgrade` to preserve data, never use `--mode=reinstall` as it will wipe all topics
- Large JavaScript files (>100KB) must be split into chunks for reliable deployment
