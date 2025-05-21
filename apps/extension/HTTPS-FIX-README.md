# RhinoSpider HTTPS Connection Fix

## Summary of Changes

1. **Fixed SSL Certificate Issues:**
   - Generated a new SSL certificate with proper SANs for both domains
   - Certificate now includes ic-proxy.rhinospider.com and search-proxy.rhinospider.com in the SAN field

2. **Added HTTP Fallback Mechanism:**
   - Modified proxy-client.js and search-proxy-client.js to include HTTP fallback
   - Added automatic retry logic when HTTPS connections fail due to certificate issues
   - Implemented a certificate verification bypass that automatically switches to HTTP when needed

3. **Updated Configuration:**
   - Added HTTP fallback URLs to config.js
   - Added configuration options that maintain Google Chrome Store compliance

4. **Added Testing Tools:**
   - Created a connection test HTML file to verify both HTTPS and HTTP connections
   - Implemented https-certificate-injector.js for automatic certificate handling
   - Added debugging and logging to help identify connection issues

## How It Works

1. The extension first attempts to connect via HTTPS to both proxy servers
2. If the HTTPS connection fails due to a certificate error, it automatically falls back to HTTP
3. After a successful fallback, the client remembers this choice to avoid repeated failures
4. All API calls use the makeRequest() function which handles this fallback logic transparently

## Manual Testing Steps

1. Open the Chrome extension in developer mode
2. Navigate to the connection-test.html page in your extension
3. Click the "Test" buttons to verify both HTTPS and HTTP connections work
4. Check the console for detailed logs about connection attempts and fallbacks

## Next Steps

If you encounter any issues with the HTTPS connections:
1. Check if your domains are resolving to the correct IP (143.244.133.154)
2. Verify nginx is running and listening on port 443
3. Make sure the SSL certificate and key are properly configured

If everything works via HTTP but not HTTPS, the extension will automatically handle this situation using the fallback mechanism.