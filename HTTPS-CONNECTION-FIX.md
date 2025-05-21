# RhinoSpider HTTPS Connection Fix

This document provides a comprehensive solution for fixing HTTPS connection issues in the RhinoSpider Chrome extension.

## Problem Summary

The Chrome extension is experiencing issues connecting to the proxy servers via HTTPS:

1. The domains `ic-proxy.rhinospider.com` and `search-proxy.rhinospider.com` are resolving to `127.0.0.1` instead of the Digital Ocean server IP (`143.244.133.154`)
2. This causes `net::ERR_CONNECTION_REFUSED` errors when connecting to HTTPS endpoints
3. Certificate verification is failing with "Signature verification failed" errors
4. Google Chrome Store requires HTTPS connections for compliance

## Solution Overview

The solution consists of three main components:

1. **DNS Fix**: Update DNS resolution to point to the correct server IP
2. **Robust Connection Handler**: Enhanced connection handling with multiple fallback methods
3. **Connection Test Tool**: A tool to verify connections to all endpoints

## Implementation Details

### 1. DNS Fix

The DNS fix script (`fix-dns.sh`) updates your local `/etc/hosts` file to ensure the domains resolve to the correct IP address:

```bash
# Run the DNS fix script as root
sudo ./fix-dns.sh
```

This script:
- Adds entries for both domains in your `/etc/hosts` file
- Flushes your DNS cache
- Tests connections to verify the fix

### 2. Robust Connection Handler

The new connection handler (`connection-handler.js`) provides a robust mechanism for connecting to the proxy servers:

1. First tries HTTPS with domain name (preferred for Chrome Store compliance)
2. Falls back to HTTP with domain name if HTTPS fails
3. Falls back to direct IP connection as a last resort

The connection handler automatically remembers which method works best for each service and uses that method for future requests.

### 3. Connection Test Tool

The connection test tool (`connection-test.html`) provides a user-friendly interface for testing connections to all endpoints:

1. Open the extension popup
2. Click on "Debug Tools"
3. Click on "Run Connection Test"

This will open a page that tests all connection methods and shows which ones are working.

## How to Use

### Step 1: Fix DNS Resolution

```bash
# Run the DNS fix script as root
sudo ./fix-dns.sh
```

### Step 2: Restart Your Browser

Close and reopen your browser to ensure the DNS changes take effect.

### Step 3: Test Connections

1. Open the extension popup
2. Click on "Debug Tools"
3. Click on "Run Connection Test"
4. Verify that at least one connection method is working for each service

### Step 4: Use the Extension

The extension should now be able to connect to the proxy servers using the best available method.

## Technical Details

### Connection Handler

The connection handler (`connection-handler.js`) provides these key functions:

- `makeRequest(service, endpoint, options)`: Makes a request with automatic fallback
- `testConnections()`: Tests all connection methods for both services
- `getBestUrl(service, endpoint)`: Gets the best URL to use based on past success

### Proxy Clients

Both proxy clients (`proxy-client.js` and `search-proxy-client.js`) have been updated to use the new connection handler:

- `ProxyClient.makeRequest(endpoint, options)`: Uses the connection handler to make requests to the IC Proxy
- `SearchProxyClient.makeRequest(endpoint, options)`: Uses the connection handler to make requests to the Search Proxy

### Background Script

The background script (`background.js`) has been updated to:

- Import and use the connection handler
- Add a new debug tool for running the connection test
- Use the connection handler for all proxy requests

## Troubleshooting

### If DNS Resolution Still Fails

1. Verify that the DNS fix script ran successfully
2. Check your `/etc/hosts` file to ensure the entries were added
3. Try flushing your DNS cache manually
4. Restart your computer

### If HTTPS Connections Still Fail

1. Check if HTTP connections are working
2. Verify that the SSL certificates are valid and properly installed on the server
3. Check if direct IP connections are working

### If All Connection Methods Fail

1. Verify that the proxy servers are running on the Digital Ocean server
2. Check if the server is accessible from your network
3. Verify that the ports (3001 and 3002) are open on the server

## Server-Side Configuration

If you need to update the server-side configuration:

1. SSH into the Digital Ocean server:
   ```bash
   ssh root@143.244.133.154
   ```

2. Check the nginx configuration:
   ```bash
   cat /etc/nginx/sites-available/rhinospider
   ```

3. Verify that the SSL certificates are properly installed:
   ```bash
   ls -la /etc/letsencrypt/live/ic-proxy.rhinospider.com/
   ls -la /etc/letsencrypt/live/search-proxy.rhinospider.com/
   ```

4. Check if the proxy servers are running:
   ```bash
   netstat -tuln | grep 3001
   netstat -tuln | grep 3002
   ```

## Conclusion

This comprehensive solution should fix the HTTPS connection issues in the RhinoSpider Chrome extension. If you continue to experience issues, please contact the development team for further assistance.
