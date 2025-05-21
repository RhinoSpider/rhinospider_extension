# RhinoSpider HTTPS Connection Fix

This is a comprehensive fix for the HTTPS connection issues in the RhinoSpider extension.

## What's Included

1. **Enhanced Certificate Patch**: Improved certificate handling with HTTPS-to-HTTP fallback
2. **Connection Logging**: Better tracking of connection attempts and errors
3. **Server Configuration Scripts**: Tools to verify and fix the nginx configuration
4. **Diagnostic Tools**: Scripts to test all connections
5. **Updated Permissions**: Host permissions for both HTTP and HTTPS versions of all domains

## How to Apply These Fixes

### Step 1: Fix the Digital Ocean Server First

1. SSH into your Digital Ocean server:
   ```bash
   ssh root@143.244.133.154
   # Password: ffGpA2saNS47qr
   ```

2. Upload and run the server verification script:
   ```bash
   # On your local machine
   scp /Users/ayanuali/development/rhinospider/scripts/verify-services.sh root@143.244.133.154:~/
   
   # On the server
   chmod +x ~/verify-services.sh
   ./verify-services.sh
   ```

3. Fix any server issues:
   ```bash
   # On your local machine
   scp /Users/ayanuali/development/rhinospider/scripts/server-fix.sh root@143.244.133.154:~/
   
   # On the server
   chmod +x ~/server-fix.sh
   ./server-fix.sh
   ```

4. Test both HTTP and HTTPS endpoints from the server:
   ```bash
   # On your local machine
   scp /Users/ayanuali/development/rhinospider/scripts/test-connections.sh root@143.244.133.154:~/
   
   # On the server
   chmod +x ~/test-connections.sh
   ./test-connections.sh
   ```

5. Verify that both domains are properly configured and accessible:
   ```bash
   # Check HTTP
   curl -v http://ic-proxy.rhinospider.com/api/health
   curl -v http://search-proxy.rhinospider.com/api/health
   
   # Check HTTPS (with -k to allow self-signed certificates)
   curl -v -k https://ic-proxy.rhinospider.com/api/health
   curl -v -k https://search-proxy.rhinospider.com/api/health
   ```

### Step 2: Update and Rebuild the Extension

1. Rebuild the extension:
   ```bash
   cd /Users/ayanuali/development/rhinospider/apps/extension
   npm run build
   ```

2. Load the extension in Chrome:
   - Go to chrome://extensions
   - Enable Developer Mode
   - Click "Load unpacked"
   - Select the `/Users/ayanuali/development/rhinospider/apps/extension/dist` directory

### Step 3: Test the Extension

1. Open the Chrome extension
2. Open the console (Right-click > Inspect > Console)
3. Run the connection test:
   ```javascript
   rhinoSpiderDebug.testAllConnections()
   ```

4. Check the results - both HTTPS and HTTP connections should work, with HTTPS being the primary connection method and HTTP as fallback.

### Step 4: Verify From Your Local Machine

1. Run the test-connections.sh script locally:
   ```bash
   chmod +x /Users/ayanuali/development/rhinospider/scripts/test-connections.sh
   /Users/ayanuali/development/rhinospider/scripts/test-connections.sh
   ```

## Troubleshooting

If you're still seeing issues:

1. Check the connection logs in the extension:
   ```javascript
   rhinoSpiderLogging.dump()
   ```

2. Enable development mode for more verbose logging:
   ```javascript
   rhinoSpiderDebug.setDevelopmentMode(true)
   ```

3. Test the domains from your local machine:
   ```bash
   # Test with curl
   curl -v -k https://ic-proxy.rhinospider.com/api/health
   curl -v -k https://search-proxy.rhinospider.com/api/health
   
   # Test with openssl to check certificates
   echo | openssl s_client -servername ic-proxy.rhinospider.com -connect ic-proxy.rhinospider.com:443
   echo | openssl s_client -servername search-proxy.rhinospider.com -connect search-proxy.rhinospider.com:443
   ```

4. Check nginx logs on the server:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   sudo tail -f /var/log/nginx/access.log
   ```

## What to Expect

- The extension first tries HTTPS connections to the proxy servers
- If HTTPS fails (e.g., due to certificate issues), the extension automatically falls back to HTTP
- Even if HTTPS is not yet fully configured, the extension will continue to work via HTTP fallback
- Both domains (ic-proxy.rhinospider.com and search-proxy.rhinospider.com) should be accessible via both HTTP and HTTPS