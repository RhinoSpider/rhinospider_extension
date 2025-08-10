# Chrome Web Store Compliance - HTTPS Only

## Important Requirements

Chrome Web Store requires that extensions **ONLY use HTTPS connections** for all external communications. Extensions that use HTTP connections will be rejected during review.

## Current Status

The extension currently has HTTP fallbacks in several files that need to be removed before Chrome Web Store submission:

### Files with HTTP References (Need Cleanup):
1. `src/config.js` - Contains `httpFallbackUrl` properties
2. `src/connection-handler.js` - Has HTTP and IP fallback mechanisms
3. `src/proxy-client.js` - References httpFallbackUrl (though not used)
4. Various test and debug files with HTTP endpoints

## HTTPS-Only Implementation

We've created HTTPS-only versions of the critical files:

### New HTTPS-Only Files:
1. `src/config-https-only.js` - Configuration with HTTPS URLs only
2. `src/connection-handler-https-only.js` - Connection handler using only HTTPS

## Migration Steps for Chrome Store Submission

Before submitting to Chrome Web Store, you must:

1. **Replace configuration file:**
   ```bash
   mv src/config.js src/config-http-fallback.js
   mv src/config-https-only.js src/config.js
   ```

2. **Replace connection handler:**
   ```bash
   mv src/connection-handler.js src/connection-handler-http-fallback.js
   mv src/connection-handler-https-only.js src/connection-handler.js
   ```

3. **Clean up other files:**
   - Remove all HTTP references from test files
   - Remove debug tools that test HTTP connections
   - Update any remaining HTTP URLs to HTTPS

4. **Update manifest.json permissions:**
   Ensure only HTTPS URLs are listed in host permissions:
   ```json
   "host_permissions": [
     "https://ic-proxy.rhinospider.com/*",
     "https://search-proxy.rhinospider.com/*",
     "https://*.ic0.app/*",
     "https://*.icp0.io/*"
   ]
   ```

5. **Rebuild the extension:**
   ```bash
   npm run build
   ```

6. **Test thoroughly:**
   - Verify all functionality works with HTTPS only
   - Check console for any HTTP connection attempts
   - Test on different networks to ensure HTTPS works everywhere

## Server Requirements

Ensure your servers have valid SSL certificates:
- `ic-proxy.rhinospider.com` - ✅ Has valid SSL
- `search-proxy.rhinospider.com` - ✅ Has valid SSL

## Chrome Web Store Review Checklist

- [ ] No HTTP URLs in code (only HTTPS)
- [ ] No hardcoded IP addresses for external connections
- [ ] All external domains use HTTPS with valid SSL certificates
- [ ] Manifest permissions only include HTTPS URLs
- [ ] No localhost/127.0.0.1 references (except for development builds)
- [ ] All fetch() calls use HTTPS URLs
- [ ] No mixed content warnings in console

## Testing for Compliance

Run this command to check for HTTP references:
```bash
grep -r "http://" src/ --exclude-dir=node_modules | grep -v "https://"
```

This should return no results before submission.

## Benefits of HTTPS-Only

1. **Security**: All data is encrypted in transit
2. **Privacy**: User data cannot be intercepted
3. **Chrome Store Compliance**: Required for approval
4. **User Trust**: HTTPS badge shows secure connection
5. **Modern Web Standards**: HTTPS is the standard for modern web

## Notes

- The current codebase has HTTP fallbacks for development/debugging
- These MUST be removed before Chrome Web Store submission
- The HTTPS-only versions are ready to use
- All production servers already support HTTPS