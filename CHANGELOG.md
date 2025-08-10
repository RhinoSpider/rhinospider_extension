# Changelog

## [2025-08-10] - Critical Production Fixes

### Fixed
- **Login Blocking Issue**: Made `updateUserLogin` non-blocking to prevent 504 Gateway Timeout errors
  - Added retry queue system for failed operations
  - Login now completes immediately while user profile updates happen asynchronously
  
- **Data Storage Hash Error**: Fixed "Cannot find field hash _24860_" error
  - Root cause: PM2 module configuration had incorrect canister IDs
  - Fixed PM2 configuration at `/root/.pm2/module_conf.json`
  - Corrected canister IDs now properly loaded from environment
  
- **IC Proxy Configuration**: Fixed incorrect canister ID loading
  - Storage canister: `hhaip-uiaaa-aaaao-a4khq-cai`
  - Consumer canister: `t3pjp-kqaaa-aaaao-a4ooq-cai`
  - Admin canister: `wvset-niaaa-aaaao-a4osa-cai`

### Added
- Retry queue system with exponential backoff for failed operations
- Debug endpoint at `/api/debug` for troubleshooting environment variables
- Proper error handling and logging throughout the extension

### Infrastructure
- Updated production server configuration (143.244.133.154)
- Fixed PM2 process management configuration
- Ensured proper environment variable loading with dotenv

## Known Issues Resolved
1. Extension login no longer times out
2. Data submission to storage canister now works correctly
3. Points and bandwidth tracking functional
4. URL fetching returns proper batches instead of single URLs