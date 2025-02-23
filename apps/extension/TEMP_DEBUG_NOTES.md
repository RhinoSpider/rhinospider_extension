# Temporary Debug Notes (DO NOT COMMIT)

## Critical Issue: Declarations Path
Need to find where declarations are actually generated:
1. Previous failing paths:
   - `../../declarations/consumer/index.js`
   - `../../declarations/consumer/consumer.did.js`
   - `../../../../src/declarations/consumer/index.js`
2. Correct configuration:
   - Root path: `/Users/ayanuali/development/rhinospider/src/declarations/`
   - Vite alias: `@declarations` -> `../../src/declarations`
   - Import path: `@declarations/consumer/index.js`
3. Files found:
   - `consumer.did`
   - `consumer.did.d.ts`
   - `consumer.did.js`
   - `index.js`

## Production Environment
1. Canisters:
   - Running on ICP mainnet
   - NO localhost/127.0.0.1 references allowed
   - Host should be https://ic0.app
   - Consumer canister ID from env: VITE_CONSUMER_CANISTER_ID

2. Extension Security:
   - CSP doesn't allow external scripts (including CDN)
   - Need to bundle Tailwind locally
   - script-src 'self' only

## What Was Working Before
1. Login Flow:
   - Dashboard opens as full page view
   - Shows Internet Identity login first
   - Only shows dashboard after successful auth
   - Proper delegation chain handling

2. Dashboard UI:
   - Full screen layout
   - Clean styling with purple gradients
   - Proper navigation between views
   - Stats display working
   - Using bundled Tailwind (not CDN)

3. File Structure:
   - Single dashboard.html with both login and dashboard views
   - dashboard.js handling both auth and UI
   - Proper import paths for declarations

## Current Issues
1. CSP Violations:
   - Using Tailwind CDN (not allowed)
   - Need to switch to bundled Tailwind

2. Environment Issues:
   - Found localhost references (remove all)
   - Should use ic0.app consistently

3. Build Issues:
   - Import paths need to be relative to extension folder
   - Should be `../../declarations/consumer/...`

## Current Critical Issues
1. Styling Broken:
   - Tailwind CDN blocked by CSP
   - styles.css missing
   - Need to bundle Tailwind with Vite

2. Login Issues:
   - login.js not found
   - Separate login page not working
   - Need to revert to single dashboard page with login section

## Previous Working State
1. Dashboard Structure:
   - Single dashboard.html file
   - Login section shown first
   - Dashboard section shown after auth
   - All styles bundled with Vite

2. Login Flow:
   - Part of dashboard.html
   - No separate login.html/login.js
   - Auth handled in dashboard.js
   - Proper delegation chain handling

## Next Steps
1. Fix Styling:
   - Add Tailwind to build process
   - Create src/styles/main.css
   - Import Tailwind in main.css
   - Configure Vite to bundle CSS

2. Fix Login:
   - Remove login.html
   - Revert dashboard.html to include login section
   - Remove login.js references
   - Keep auth in dashboard.js

3. Remove Tailwind CDN
4. Remove all localhost references
5. Fix import paths
6. Test full auth flow

## Important!
DO NOT MODIFY:
- Auth flow that's already working
- Dashboard UI layout
- File structure
- Admin portal code

## Working Configuration
```javascript
// Correct host
const IC_HOST = 'https://ic0.app';

// Correct import paths
import { createActor } from '../../declarations/consumer/index.js';
import { idlFactory } from '../../declarations/consumer/consumer.did.js';

// Correct actor initialization
createActor({
    agentOptions: {
        identity,
        host: 'https://ic0.app'
    }
});
```
