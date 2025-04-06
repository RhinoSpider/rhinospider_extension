# RhinoSpider Proxy Architecture Guide

## Overview

The RhinoSpider extension relies on two proxy servers to function correctly:

1. **IC Proxy** (ic-proxy.rhinospider.com, port 3001)
   - Handles profile, topics, and consumer-submit endpoints
   - Communicates with Internet Computer canisters

2. **Search Proxy** (search-proxy.rhinospider.com, port 3002)
   - Handles search functionality only
   - Provides URLs for topics

Both servers are hosted on Digital Ocean and managed via PM2, with nginx as a reverse proxy to handle incoming requests.

## Server Architecture

### IC Proxy Server

The IC Proxy server is responsible for communicating with the Internet Computer canisters to retrieve and submit data. It uses the following components:

- **Express.js**: Web server framework
- **@dfinity/agent**: Library for communicating with Internet Computer canisters
- **@dfinity/identity**: Library for managing server identity
- **dotenv**: For environment variables
- **cors**: For handling Cross-Origin Resource Sharing

#### Key Endpoints

- `/api/health` (GET): Health check endpoint
- `/api/profile` (POST): Retrieves user profile information
- `/api/topics` (POST): Retrieves topics from the consumer canister
- `/api/consumer-submit` (POST): Submits scraped data to the consumer canister

#### Environment Variables

- `PORT`: Port for the IC Proxy server (default: 3001)
- `API_KEY`: API key for authentication
- `CONSUMER_CANISTER_ID`: ID for the consumer canister
- `ADMIN_CANISTER_ID`: ID for the admin canister
- `IC_HOST`: Host for the Internet Computer (default: https://icp0.io)

### Search Proxy Server

The Search Proxy server handles search functionality and provides URLs for topics. It has a simpler architecture and doesn't communicate with the Internet Computer directly.

#### Key Endpoints

- `/api/health` (GET): Health check endpoint
- `/api/search` (POST): Performs search operations

## Server Locations and Access

### Server Details

- **IC Proxy**: ic-proxy.rhinospider.com
  - Username: root
  - Password: ffGpA2saNS47qr
  - Port: 3001

- **Search Proxy**: search-proxy.rhinospider.com
  - Username: root
  - Password: ffGpA2saNS47qr
  - Port: 3002

### Directory Structure

- **IC Proxy**: `/opt/ic-proxy/`
  - `server.js`: Main server file
  - `server-identity.json`: Server identity file
  - `.env`: Environment variables

- **Search Proxy**: `/opt/search-proxy/`
  - `server.js`: Main server file
  - `.env`: Environment variables

## Common Issues and Fixes

### 1. Syntax Errors in server.js

**Symptoms**:
- 502 Bad Gateway error from nginx
- Server shows as "errored" in PM2
- Error logs show syntax errors

**Fix**:
```bash
# SSH into the server
ssh root@ic-proxy.rhinospider.com

# Stop the server
pm2 stop ic-proxy

# Edit the server.js file
nano /opt/ic-proxy/server.js

# Fix the syntax errors
# Common issues include:
# - Missing async/await
# - Incorrect use of template literals
# - Trailing commas in object literals

# Start the server
pm2 restart ic-proxy

# Check logs for errors
pm2 logs ic-proxy
```

### 2. BigInt Serialization Issues

**Symptoms**:
- Error: "Do not know how to serialize a BigInt"
- Topics endpoint returns error instead of data

**Fix**:
Add BigInt serialization support to the server.js file:

```javascript
// Add this near the top of server.js, after the require statements
BigInt.prototype.toJSON = function() {
  return this.toString();
};
```

### 3. CORS Header Issues

**Symptoms**:
- Chrome extension fails with CORS errors
- Multiple Access-Control-Allow-Origin headers

**Fix**:
1. Remove CORS headers from Node.js servers
2. Configure CORS only in nginx

```bash
# SSH into the server
ssh root@ic-proxy.rhinospider.com

# Edit nginx configuration
nano /etc/nginx/sites-available/ic-proxy.rhinospider.com

# Ensure the configuration includes:
location / {
    proxy_pass http://localhost:3001;
    proxy_hide_header Access-Control-Allow-Origin;
    proxy_hide_header Access-Control-Allow-Methods;
    proxy_hide_header Access-Control-Allow-Headers;
    
    add_header Access-Control-Allow-Origin '*' always;
    add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS' always;
    add_header Access-Control-Allow-Headers 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
    
    if ($request_method = 'OPTIONS') {
        add_header Access-Control-Allow-Origin '*' always;
        add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS' always;
        add_header Access-Control-Allow-Headers 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        add_header Access-Control-Max-Age 1728000;
        add_header Content-Type 'text/plain; charset=utf-8';
        add_header Content-Length 0;
        return 204;
    }
}

# Restart nginx
systemctl restart nginx
```

### 4. Server Crashes or Unresponsive

**Symptoms**:
- 502 Bad Gateway error
- Server not responding to requests

**Fix**:
```bash
# SSH into the server
ssh root@ic-proxy.rhinospider.com

# Check server status
pm2 list

# If server is stopped or errored, restart it
pm2 restart ic-proxy

# If server keeps crashing, check logs
pm2 logs ic-proxy

# If needed, completely rebuild the server
cd /opt/ic-proxy
npm install
pm2 restart ic-proxy
```

### 5. Authorization Issues with Canisters

**Symptoms**:
- Error: "NotAuthorized" when calling canister methods
- Unable to retrieve topics or profile information

**Fix**:
1. Check server identity setup
2. Ensure the consumer canister interface matches the actual canister

```bash
# SSH into the server
ssh root@ic-proxy.rhinospider.com

# Check if server identity exists
ls -la /opt/ic-proxy/server-identity.json

# If missing, the server will create a new one on restart
pm2 restart ic-proxy

# Verify the consumer canister ID is correct in .env
cat /opt/ic-proxy/.env
```

## Server Management Commands

### PM2 Commands

```bash
# List all processes
pm2 list

# Start/stop/restart a process
pm2 start/stop/restart ic-proxy

# View logs
pm2 logs ic-proxy

# Monitor processes
pm2 monit
```

### Nginx Commands

```bash
# Test nginx configuration
nginx -t

# Restart nginx
systemctl restart nginx

# Check nginx status
systemctl status nginx
```

### Deployment and Updates

To deploy updates to the servers:

1. Prepare your updated server.js file
2. SSH into the server
3. Backup the existing file
4. Copy the new file to the server
5. Restart the service

Example:
```bash
# Backup existing file
cp /opt/ic-proxy/server.js /opt/ic-proxy/server.js.backup

# Copy new file (from local machine)
scp server.js root@ic-proxy.rhinospider.com:/opt/ic-proxy/

# Restart the service
pm2 restart ic-proxy
```

## Canister Information

### Consumer Canister

- **ID**: tgyl5-yyaaa-aaaaj-az4wq-cai
- **Interface**: Provides read-only access to topics and profiles
- **Methods**:
  - `getTopics()`: Retrieves topics from the admin canister
  - `getProfile()`: Retrieves user profile information
  - `submitScrapedData()`: Submits scraped data

### Admin Canister

- **ID**: szqyk-3aaaa-aaaaj-az4sa-cai
- **Interface**: Provides administrative access to topics and profiles
- **Methods**:
  - Various methods for managing topics and profiles
  - Requires authorization for most operations

## Troubleshooting Scripts

Several troubleshooting scripts have been created to help diagnose and fix issues:

1. **fix-syntax-error-targeted.sh**: Fixes syntax errors in server.js
2. **fix-bigint-serialization.sh**: Adds BigInt serialization support
3. **check-server-logs.sh**: Checks server logs for errors
4. **fix-server-comprehensive.sh**: Comprehensive server rebuild

These scripts can be found in the project repository and can be used to quickly fix common issues.

## Conclusion

This guide provides a comprehensive overview of the RhinoSpider proxy architecture and common issues that may arise. By following the troubleshooting steps outlined here, you should be able to diagnose and fix most problems with the IC Proxy and Search Proxy servers.

Remember to always check the server logs first when diagnosing issues, as they often contain valuable information about what's going wrong.

For any questions or issues not covered in this guide, please contact the development team.
