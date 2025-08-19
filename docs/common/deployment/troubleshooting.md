# Troubleshooting Guide

## Common Issues and Solutions

### 1. Login Issues

#### Problem: 504 Gateway Timeout on Login
**Cause**: Blocking operations in login flow
**Solution**:
```javascript
// Make login non-blocking
async function handleLogin(principal) {
  // Immediate response
  res.json({ success: true });
  
  // Background processing
  setImmediate(() => {
    updateUserProfile(principal);
  });
}
```

#### Problem: Principal ID Not Found
**Cause**: User not registered in canister
**Solution**:
1. Check if principal exists: `dfx canister call consumer getUserProfile`
2. Register user if needed
3. Verify Internet Identity connection

### 2. Data Submission Errors

#### Problem: "Cannot find field hash _24860_"
**Cause**: Incorrect canister ID in PM2 config
**Solution**:
```bash
# Fix PM2 configuration
vim /root/.pm2/module_conf.json
# Update canister IDs
pm2 kill
pm2 start --update-env
```

#### Problem: 502 Bad Gateway
**Cause**: Service down or port conflict
**Solution**:
```bash
# Check service status
pm2 status
pm2 restart ic-proxy
pm2 restart search-proxy

# Check ports
netstat -tulpn | grep :3001
netstat -tulpn | grep :3002
```

### 3. Extension Issues

#### Problem: "Could not establish connection"
**Cause**: Chrome internal error (can be ignored)
**Solution**:
```javascript
// Add to background script
self.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('Could not establish connection')) {
    event.preventDefault();
  }
});
```

#### Problem: Points Not Updating
**Cause**: Local storage vs canister mismatch
**Solution**:
- Ensure fetching from canister, not local storage
- Check `/api/consumer-profile` endpoint
- Verify principal ID is correct

### 4. Service Configuration

#### Problem: Wrong Canister IDs Loading
**Cause**: PM2 environment variable caching
**Solution**:
```bash
# Complete PM2 reset
rm /root/.pm2/dump.pm2
pm2 kill

# Set correct environment
export STORAGE_CANISTER_ID=hhaip-uiaaa-aaaao-a4khq-cai
export CONSUMER_CANISTER_ID=t3pjp-kqaaa-aaaao-a4ooq-cai
export ADMIN_CANISTER_ID=wvset-niaaa-aaaao-a4osa-cai

# Restart services
pm2 start ecosystem.config.js
pm2 save --force
```

### 5. Network Issues

#### Problem: Rate Limiting (429 errors)
**Cause**: Too many requests to search APIs
**Solution**:
- Implement exponential backoff
- Check quota limits
- Use caching effectively

#### Problem: SSL Certificate Errors
**Cause**: Expired or misconfigured certificates
**Solution**:
```bash
# Renew certificates
certbot renew --nginx

# Verify nginx config
nginx -t
systemctl restart nginx
```

### 6. Performance Issues

#### Problem: Slow Response Times
**Cause**: Unoptimized queries or network latency
**Solution**:
- Enable response caching
- Use batch operations
- Implement connection pooling
- Monitor with PM2: `pm2 monit`

#### Problem: Memory Leaks
**Cause**: Unclosed connections or large arrays
**Solution**:
```bash
# Monitor memory
pm2 monit

# Restart with memory limit
pm2 start app.js --max-memory-restart 1G
```

## Debug Commands

### Check Service Health
```bash
# IC Proxy
curl -I https://ic-proxy.rhinospider.com/api/health

# Search Proxy
curl -I https://search-proxy.rhinospider.com/api/health

# Debug endpoint
curl https://ic-proxy.rhinospider.com/api/debug | jq
```

### View Logs
```bash
# PM2 logs
pm2 logs ic-proxy --lines 100
pm2 logs search-proxy --lines 100

# System logs
tail -f /var/log/nginx/error.log
journalctl -u nginx -n 50
```

### Test Canister Connection
```bash
# Direct dfx call
dfx canister call consumer getUserProfile '(principal "xxxxx")'

# Via IC Proxy
curl -X POST https://ic-proxy.rhinospider.com/api/consumer-profile \
  -H "Content-Type: application/json" \
  -d '{"principalId": "xxxxx"}'
```

## Recovery Procedures

### Complete Service Reset
```bash
#!/bin/bash
# Full reset script

# Stop everything
pm2 kill
systemctl stop nginx

# Clear caches
rm -rf /tmp/node_*
rm /root/.pm2/dump.pm2

# Start services
systemctl start nginx
cd /root/rhinospider
pm2 start ecosystem.config.js
pm2 save --force
```

### Emergency Rollback
```bash
# Backup current
cp -r services services.backup

# Restore previous version
git checkout HEAD~1 services/
pm2 restart all
```

## Monitoring Checklist

### Daily Checks
- [ ] Service status: `pm2 status`
- [ ] Error logs: `pm2 logs --err`
- [ ] Disk space: `df -h`
- [ ] Memory usage: `free -m`

### Weekly Checks
- [ ] Certificate expiry: `certbot certificates`
- [ ] Backup verification
- [ ] Security updates: `apt update && apt upgrade`
- [ ] Canister cycles: `dfx canister status --all`

## Contact Support

### Escalation Path
1. Check this troubleshooting guide
2. Review service logs
3. Check GitHub issues
4. Contact development team

### Useful Resources
- [IC Forum](https://forum.dfinity.org)
- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions)
- [PM2 Documentation](https://pm2.keymetrics.io)