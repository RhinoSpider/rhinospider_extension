# RhinoSpider Search Proxy Deployment Guide

This guide outlines the process for deploying the updated Search Proxy service to your Digital Ocean server.

## Prerequisites

- SSH access to your Digital Ocean server
- PM2 installed on the server
- Node.js installed on the server

## What's Being Deployed

The updated Search Proxy includes the following new features:

1. **User Quota Management System**
   - Tracks daily and total URLs scraped, points earned, bandwidth usage
   - Provides tiered user levels with different quotas
   - Stores detailed analytics on user activity

2. **Scraped URLs Tracker**
   - Prevents duplicate URL scraping
   - Maintains statistics on scraped URLs

3. **IC Proxy Integration**
   - Client-side integration with the IC proxy (port 3001)
   - Sends user data and scraping reports to the consumer canister via the IC proxy
   - Retrieves user data from the consumer canister via the IC proxy

4. **New API Endpoints**
   - `/api/health` - Health check endpoint
   - `/api/search/quota` - Get user quota information
   - `/api/search/report-scrape` - Report URLs scraped by the extension
   - `/api/search/analytics` - Get detailed user analytics
   - `/api/search/system-stats` - Get system-wide statistics
   - `/api/search/canister-data` - Get user data from the IC proxy/consumer canister

## Deployment Steps

1. **Prepare Environment Variables**

   Make sure your `.env` file contains the necessary configuration:

   ```
   PORT=3002
   NODE_ENV=production
   IC_PROXY_URL=http://ic-proxy.rhinospider.com
   IC_PROXY_PORT=3001
   ```
   
   **Note**: The API_PASSWORD variable in the .env file appears to be unused in the current codebase and should be reviewed for security purposes.

2. **Run the Deployment Script**

   ```bash
   ./deploy.sh
   ```

   The script will:
   - Create a deployment package
   - Upload it to your Digital Ocean server
   - Stop the existing service
   - Back up the old version
   - Install the new version
   - Start the service on port 3002

3. **Verify the Deployment**

   After deployment, verify that the service is running correctly:

   ```bash
   curl http://your-server-ip:3002/api/health
   ```

   You should see a response like:
   ```json
   {"status":"ok","service":"search-proxy","timestamp":"2025-04-08T16:22:34.625Z"}
   ```

## Nginx Configuration

The Search Proxy should already be configured in your Nginx setup. If you need to update the configuration, make sure it points to port 3002:

```nginx
server {
    listen 80;
    server_name search-proxy.rhinospider.com;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Troubleshooting

If you encounter issues during deployment:

1. **Check the PM2 logs**:
   ```bash
   pm2 logs search-proxy
   ```

2. **Verify the service is running**:
   ```bash
   pm2 status
   ```

3. **Check if the port is in use**:
   ```bash
   netstat -tulpn | grep 3002
   ```

4. **Restore from backup if needed**:
   The deployment script creates a backup of the old version in `/opt/rhinospider/search-proxy-backup-TIMESTAMP`.
   You can restore it if needed.

## Important Notes

- The Search Proxy now runs on port 3002 to match the production architecture
- The IC Proxy integration is configured to communicate with the IC Proxy on port 3001
- No changes have been made to the IC Proxy itself
