# Web3 Integration Documentation

## Overview
RhinoSpider uses Web3 technologies for authentication, storage, and payments:
- NFID for user authentication
- Internet Computer (ICP) for decentralized storage
- ICP cycles for usage tracking and payments

## Components

### 1. NFID Authentication
- **Status**: In Progress
- **Location**: `packages/web3-client/src/hooks/useNFID.ts`
- **Features**:
  - [x] NFID Integration Setup
  - [ ] Login/Signup Flow
  - [ ] Session Management
  - [ ] Profile Management

### 2. ICP Storage
- **Status**: Not Started
- **Location**: `canisters/storage/`
- **Features**:
  - [ ] Canister Setup
  - [ ] Data Models
  - [ ] CRUD Operations
  - [ ] Access Control

### 3. Payments & Billing
- **Status**: Not Started
- **Location**: `canisters/billing/`
- **Features**:
  - [ ] Cycles Management
  - [ ] Usage Tracking
  - [ ] Payment Processing
  - [ ] Subscription Management

## Implementation Progress

### Current Sprint: NFID Authentication
1. Set up NFID client integration
2. Implement login/signup flow
3. Handle session management
4. Add profile management

### Next Steps
1. Deploy and test authentication
2. Set up ICP canisters
3. Implement storage functionality

## Configuration

### NFID Setup
```typescript
// Required environment variables
NFID_CLIENT_ID=<your-client-id>
NFID_REDIRECT_URI=<your-redirect-uri>
```

### ICP Setup
```bash
# Install DFX
sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"

# Start local replica
dfx start --background
```

## Testing
- Unit tests: `pnpm test`
- Integration tests: `pnpm test:integration`
- E2E tests: `pnpm test:e2e`

## Security Considerations
1. Secure key management
2. Session timeout handling
3. Rate limiting
4. Error handling
5. Data encryption

## Resources
- [NFID Documentation](https://docs.nfid.one)
- [Internet Computer SDK](https://internetcomputer.org/docs/current/developer-docs/setup/install)
- [ICP Dashboard](https://dashboard.internetcomputer.org)
