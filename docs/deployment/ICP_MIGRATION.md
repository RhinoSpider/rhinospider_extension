# RhinoSpider ICP Deployment Guide

## 1. Prerequisites
- Node.js and pnpm installed
- DFX CLI installed and configured
- IC identity configured with sufficient cycles

## 2. Project Structure
```
rhinospider/
├── apps/
│   ├── admin/        # Admin portal (ICP-based)
│   └── extension/    # Chrome extension
└── canisters/        # ICP canisters
```

## 3. Canister Deployment

### 3.1 Deploy Canisters
```bash
# Deploy all canisters to IC mainnet
dfx deploy --network ic

# Or deploy individual canisters
dfx deploy --network ic admin
dfx deploy --network ic storage
dfx deploy --network ic auth
```

### 3.2 Get Canister IDs
```bash
# Get deployed canister IDs
dfx canister --network ic id admin    # scvep-byaaa-aaaaj-az4qq-cai
dfx canister --network ic id storage  # smxjh-2iaaa-aaaaj-az4rq-cai
dfx canister --network ic id auth     # slwpt-xqaaa-aaaaj-az4ra-cai
```

## 4. Environment Configuration

### 4.1 Production Environment (.env files)

1. Root `.env`:
```env
VITE_DFX_NETWORK=ic
VITE_ADMIN_CANISTER_ID=scvep-byaaa-aaaaj-az4qq-cai
VITE_STORAGE_CANISTER_ID=smxjh-2iaaa-aaaaj-az4rq-cai
VITE_AUTH_CANISTER_ID=slwpt-xqaaa-aaaaj-az4ra-cai
VITE_II_URL=https://identity.ic0.app
```

2. Admin Portal (`apps/admin/.env`):
```env
VITE_II_URL=https://identity.ic0.app
VITE_DFX_NETWORK=ic
VITE_ADMIN_CANISTER_ID=scvep-byaaa-aaaaj-az4qq-cai
VITE_STORAGE_CANISTER_ID=smxjh-2iaaa-aaaaj-az4rq-cai
VITE_AUTH_CANISTER_ID=slwpt-xqaaa-aaaaj-az4ra-cai
```

3. Extension (`apps/extension/.env`):
```env
VITE_II_URL=https://identity.ic0.app
VITE_ADMIN_CANISTER_ID=scvep-byaaa-aaaaj-az4qq-cai
VITE_STORAGE_CANISTER_ID=smxjh-2iaaa-aaaaj-az4rq-cai
```

### 4.2 Local Development (.env.local files)
Local development files use local canister IDs and are gitignored.

## 5. Building and Deployment

### 5.1 Admin Portal
```bash
# Build admin portal
cd apps/admin
pnpm build

# Deploy to IC
dfx deploy --network ic admin
```

The admin portal will be accessible at:
```
https://scvep-byaaa-aaaaj-az4qq-cai.icp0.io
```

### 5.2 Chrome Extension
```bash
# Build extension
cd apps/extension
pnpm build
```

The extension build will be in `apps/extension/build/`. To install:
1. Open Chrome
2. Go to `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `apps/extension/build` directory

## 6. Verification Steps

1. Admin Portal:
   - Visit `https://scvep-byaaa-aaaaj-az4qq-cai.icp0.io`
   - Verify Internet Identity authentication
   - Check topics management
   - Monitor scraping activity

2. Extension:
   - Install the extension
   - Open extension popup
   - Verify authentication
   - Test scraping on various websites
   - Check scraped content in admin portal

3. Storage:
   - Content is stored in storage canister
   - View at `https://smxjh-2iaaa-aaaaj-az4rq-cai.icp0.io`

## 7. Maintenance

### 7.1 Updating Canisters
```bash
# Update specific canister
dfx deploy --network ic admin --mode upgrade

# Check canister status
dfx canister --network ic status admin
```

### 7.2 Cycle Management
```bash
# Check cycles balance
dfx wallet --network ic balance  # Current balance: 9.466 TC

# Check canister cycles
dfx canister --network ic status admin    # Shows cycles for admin canister
dfx canister --network ic status storage  # Shows cycles for storage canister
dfx canister --network ic status auth     # Shows cycles for auth canister

# Top up cycles if needed
dfx wallet --network ic send <canister-id> <amount>
```

### 7.3 Important IDs and Addresses

1. Production Identity (ic-prod):
   - Principal: p6gaf-qjt3x-6q6ci-ro7nd-aklhp-6hgfo-4dljo-busl6-3ftgp-iliyi-zqe
   - Ledger Account: d835693b374b41716ec476a62107b9960da0fac40267c9402a64377d7b9cb28c
   - Wallet Canister: szqyk-3aaaa-aaaaj-az4sa-cai

2. Deployed Canisters:
   - Admin: scvep-byaaa-aaaaj-az4qq-cai
   - Storage: smxjh-2iaaa-aaaaj-az4rq-cai
   - Auth: slwpt-xqaaa-aaaaj-az4ra-cai

## 8. Identity and Wallet Setup

### 8.1 Production Identity Setup
```bash
# Create production identity
dfx identity new ic-prod
dfx identity use ic-prod

# Get principal and ledger account
dfx identity get-principal  # p6gaf-qjt3x-6q6ci-ro7nd-aklhp-6hgfo-4dljo-busl6-3ftgp-iliyi-zqe
dfx ledger account-id      # d835693b374b41716ec476a62107b9960da0fac40267c9402a64377d7b9cb28c

# Create wallet with cycles
dfx quickstart  # Creates wallet: szqyk-3aaaa-aaaaj-az4sa-cai
```

### 8.2 Canister Control Transfer
```bash
# Add ic-prod as controller to all canisters
dfx canister --network ic update-settings admin --add-controller p6gaf-qjt3x-6q6ci-ro7nd-aklhp-6hgfo-4dljo-busl6-3ftgp-iliyi-zqe
dfx canister --network ic update-settings storage --add-controller p6gaf-qjt3x-6q6ci-ro7nd-aklhp-6hgfo-4dljo-busl6-3ftgp-iliyi-zqe
dfx canister --network ic update-settings auth --add-controller p6gaf-qjt3x-6q6ci-ro7nd-aklhp-6hgfo-4dljo-busl6-3ftgp-iliyi-zqe

# Verify controllers
dfx canister --network ic info admin
dfx canister --network ic info storage
dfx canister --network ic info auth
```

## 9. Troubleshooting

1. Canister Access Issues:
   - Verify canister IDs in `.env` files
   - Check canister status with `dfx canister --network ic status <canister-id>`
   - Ensure sufficient cycles

2. Authentication Issues:
   - Verify Internet Identity URL
   - Check auth canister status
   - Review browser console for errors

3. Scraping Issues:
   - Check extension console logs
   - Verify admin and storage canister endpoints
   - Monitor network requests in DevTools
