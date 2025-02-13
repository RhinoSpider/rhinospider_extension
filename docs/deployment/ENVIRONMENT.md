# Environment Variables

## Admin Portal

### Production (.env)
```sh
VITE_II_URL=https://identity.ic0.app
VITE_DFX_NETWORK=ic
VITE_ADMIN_CANISTER_ID=scvep-byaaa-aaaaj-az4qq-cai
VITE_STORAGE_CANISTER_ID=smxjh-2iaaa-aaaaj-az4rq-cai
VITE_AUTH_CANISTER_ID=slwpt-xqaaa-aaaaj-az4ra-cai
VITE_IC_HOST=https://icp0.io  # Optional, defaults to icp0.io for ic network
```

### Local Development (.env.local)
```sh
VITE_II_URL=http://127.0.0.1:8000
VITE_DFX_NETWORK=local
VITE_ADMIN_CANISTER_ID=br5f7-7uaaa-aaaaa-qaaca-cai
VITE_STORAGE_CANISTER_ID=be2us-64aaa-aaaaa-qaabq-cai
VITE_AUTH_CANISTER_ID=bd3sg-teaaa-aaaaa-qaaba-cai
VITE_IC_HOST=http://127.0.0.1:8000
```

## Environment Variables Explained

### Network Configuration
- `VITE_DFX_NETWORK`: Network to deploy to ('ic' for mainnet, 'local' for development)
- `VITE_IC_HOST`: Host URL for the Internet Computer network
  - Production: https://icp0.io
  - Local: http://127.0.0.1:8000

### Authentication
- `VITE_II_URL`: Internet Identity URL
  - Production: https://identity.ic0.app
  - Local: http://127.0.0.1:8000

### Canister IDs
- `VITE_ADMIN_CANISTER_ID`: Admin canister ID
- `VITE_STORAGE_CANISTER_ID`: Storage canister ID
- `VITE_AUTH_CANISTER_ID`: Auth canister ID

## Notes
1. `.env` is used for production settings
2. `.env.local` overrides `.env` for local development
3. Never commit `.env.local` to version control
4. Always update `.env.example` when adding new variables
