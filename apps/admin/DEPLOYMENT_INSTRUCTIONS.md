# RhinoSpider Admin App Deployment Issue

## Problem Description

The RhinoSpider Admin App is experiencing a CSS loading issue when deployed to the Internet Computer. The CSS file is returning a 502 Bad Gateway error, causing the app to display without styling.

**Error:**
```
GET https://sxsvc-aqaaa-aaaaj-az4ta-cai.icp0.io/assets/index-flOe2csO.css 502 (Bad Gateway)
```

## Project Location and Structure

- **Project Path:** `/Users/ayanuali/development/rhinospider/apps/admin`
- **Build Output:** `/Users/ayanuali/development/rhinospider/apps/admin/dist`
- **Canister ID:** `sxsvc-aqaaa-aaaaj-az4ta-cai`
- **Deployment Identity:** `ic-prod`

## What's Been Tried

1. Standard `dfx deploy` command (fails due to wallet being out of cycles)
2. Direct asset uploading using the `store` method
3. Embedding CSS in HTML
4. Splitting large files into chunks
5. Converting ICP to cycles and topping up the canister

## Deployment Instructions

### Option 1: Using dfx deploy (Requires sufficient cycles in wallet)

1. Ensure you have sufficient cycles in your wallet:
   ```bash
   dfx identity use ic-prod
   dfx wallet --network ic balance
   ```

2. If needed, convert ICP to cycles:
   ```bash
   dfx cycles convert --network ic --amount 0.1
   ```

3. Create a temporary dfx.json file:
   ```json
   {
     "canisters": {
       "admin_ui": {
         "frontend": {
           "entrypoint": "dist/index.html"
         },
         "source": [
           "dist/"
         ],
         "type": "assets",
         "id": "sxsvc-aqaaa-aaaaj-az4ta-cai"
       }
     },
     "defaults": {
       "build": {
         "args": "",
         "packtool": ""
       }
     },
     "networks": {
       "ic": {
         "providers": ["https://ic0.app"],
         "type": "persistent"
       }
     },
     "version": 1
   }
   ```

4. Deploy using dfx:
   ```bash
   dfx deploy --network ic admin_ui --mode=upgrade
   ```

### Option 2: Direct Asset Upload (No wallet required)

1. Build the admin app:
   ```bash
   npm run build
   ```

2. Upload each asset individually:
   ```bash
   # Upload index.html
   dfx canister --network ic call sxsvc-aqaaa-aaaaj-az4ta-cai store "(record { key = \"index.html\"; content_type = \"text/html; charset=utf-8\"; content_encoding = \"identity\"; content = blob \"$(xxd -p dist/index.html | tr -d '\n')\" })"

   # Upload CSS file
   dfx canister --network ic call sxsvc-aqaaa-aaaaj-az4ta-cai store "(record { key = \"assets/index.flOe2csO.css\"; content_type = \"text/css\"; content_encoding = \"identity\"; content = blob \"$(xxd -p dist/assets/index.flOe2csO.css | tr -d '\n')\" })"

   # Upload JS files
   # (Repeat for each JS file in dist/assets)
   ```

3. For large files, use a temporary file approach:
   ```bash
   # Create temp file with hex content
   xxd -p large_file.js | tr -d '\n' > temp_content.txt
   
   # Create command file
   echo "(record { key = \"assets/large_file.js\"; content_type = \"application/javascript\"; content_encoding = \"identity\"; content = blob \"$(cat temp_content.txt)\" })" > temp_cmd.txt
   
   # Execute command
   dfx canister --network ic call sxsvc-aqaaa-aaaaj-az4ta-cai store "$(cat temp_cmd.txt)"
   ```

## Potential Solutions

1. **Fix CSS Content Type**: Ensure the CSS file is uploaded with the correct content type "text/css"

2. **Embed CSS in HTML**: Modify the HTML file to include the CSS inline

3. **Code Splitting**: Modify the Vite config to split large files:
   ```javascript
   // vite.config.ts
   export default defineConfig({
     build: {
       rollupOptions: {
         output: {
           manualChunks: {
             'vendor-react': ['react', 'react-dom'],
             'vendor-dfinity': ['@dfinity/agent', '@dfinity/auth-client']
           }
         }
       }
     }
   });
   ```

4. **Increase Cycles**: Ensure the wallet and canister have sufficient cycles

## Previous Successful Deployment Method

The app was previously deployed successfully using the standard dfx deploy command when the wallet had sufficient cycles.

## Additional Resources

- [Internet Computer Documentation](https://internetcomputer.org/docs/current/developer-docs/build/cdks/motoko-dfinity/asset-canister)
- [dfx CLI Reference](https://internetcomputer.org/docs/current/references/cli-reference/dfx-deploy)
