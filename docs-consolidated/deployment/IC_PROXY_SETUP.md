# IC Proxy Service Setup

## Overview

The IC Proxy service acts as a middleware between the RhinoSpider extension and the Internet Computer canisters. It handles authentication, data processing, and communication with the canisters. This document outlines the setup and deployment process for the IC Proxy service.

## Prerequisites

- Server with Ubuntu 22.04 LTS
- Node.js 18+ installed
- Domain name (optional)
- SSH access to the server

## Initial Setup

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js dependencies
sudo apt install -y curl build-essential git

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node -v  # Should show v18.x.x
npm -v   # Should show 8.x.x or higher
```

### 2. Application Setup

```bash
# Create application directory
sudo mkdir -p /opt/rhinospider-ic-proxy
sudo chown $USER:$USER /opt/rhinospider-ic-proxy
cd /opt/rhinospider-ic-proxy

# Clone repository (if using Git)
git clone https://github.com/your-org/rhinospider.git .
cd services/ic-proxy

# Or copy files manually from your local services/ic-proxy directory
```

### 3. Install Dependencies

```bash
# Install dependencies
npm install

# Fix node-fetch if needed
./fix-node-fetch.sh
```

## Configuration

### 1. Environment Setup

Create a `.env` file with the required configuration:

```bash
cat > .env << EOL
# Server Configuration
PORT=3002
NODE_ENV=production

# Canister IDs
ADMIN_CANISTER_ID=<admin-canister-id>
CONSUMER_CANISTER_ID=<consumer-canister-id>
STORAGE_CANISTER_ID=<storage-canister-id>

# IC Host
IC_HOST=https://ic0.app

# CORS Configuration
ALLOWED_ORIGINS=chrome-extension://<extension-id>
EOL
```

### 2. Server Configuration

The IC Proxy server requires proper configuration to include all necessary endpoints:

```javascript
// server.js must include these essential endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/consumer-submit', async (req, res) => {
  // Handle consumer submissions
});

app.get('/api/topics', async (req, res) => {
  // Handle topic fetching
});

app.get('/api/profile', async (req, res) => {
  // Handle profile fetching
});

// Additional required endpoints
app.post('/api/submit-scraped-content', async (req, res) => {
  // Handle scraped content submission
});

app.get('/api/get-scraped-data', async (req, res) => {
  // Handle scraped data retrieval
});
```

> **Important**: The deployment script (deploy-nodeps.sh) creates a simplified server.js file that only includes basic endpoints (/api/health and /api/consumer-submit), but the extension requires additional endpoints like /api/topics and /api/profile. Always ensure all required endpoints are included in the deployed server.js file.

## Deployment

### 1. Using PM2 for Process Management

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the application with PM2
pm2 start server.js --name rhinospider-ic-proxy

# Configure PM2 to start on system boot
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
pm2 save

# Check status
pm2 status
pm2 logs rhinospider-ic-proxy
```

### 2. Using the Deployment Script

The repository includes a deployment script that simplifies the process:

```bash
# Make the script executable
chmod +x deploy-nodeps.sh

# Run the deployment script
./deploy-nodeps.sh
```

> **Note**: The deployment script creates a simplified server.js file. You may need to modify it to include all required endpoints.

### 3. Nginx Configuration (Optional)

If you want to use Nginx as a reverse proxy:

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/rhinospider-ic-proxy

# Add the following configuration
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable the site
sudo ln -s /etc/nginx/sites-available/rhinospider-ic-proxy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Set up SSL with Certbot
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Verification

### 1. Test the Service

```bash
# Test the health endpoint
curl http://localhost:3002/api/health

# Expected response
{"status":"ok"}
```

### 2. Monitor Logs

```bash
# Using PM2
pm2 logs rhinospider-ic-proxy

# Or directly
tail -f /opt/rhinospider-ic-proxy/logs/app.log
```

## Troubleshooting

### 1. Common Issues

#### Missing Endpoints
If the extension reports 404 errors for certain endpoints, ensure that all required endpoints are included in the server.js file:

```bash
# Check the server.js file
cat /opt/rhinospider-ic-proxy/server.js

# If endpoints are missing, edit the file
nano /opt/rhinospider-ic-proxy/server.js

# Add the missing endpoints and restart the service
pm2 restart rhinospider-ic-proxy
```

#### Authentication Errors
If the extension reports authentication errors:

1. Check that the delegation chain is properly formatted
2. Verify that the canister IDs are correct in the .env file
3. Ensure that the IC_HOST is set correctly

#### Connection Errors
If the extension cannot connect to the proxy:

1. Verify that the proxy is running: `pm2 status`
2. Check that the port is open: `sudo ufw status`
3. Ensure that the ALLOWED_ORIGINS in the .env file includes the extension ID

### 2. Debug Commands

```bash
# Check service status
pm2 status

# View detailed logs
pm2 logs rhinospider-ic-proxy --lines 100

# Check for errors in the logs
grep "error" /opt/rhinospider-ic-proxy/logs/app.log

# Test connectivity
curl -v http://localhost:3002/api/health
```

## Maintenance

### 1. Updates

```bash
# Pull latest changes (if using Git)
cd /opt/rhinospider-ic-proxy
git pull

# Update dependencies
npm install

# Restart the service
pm2 restart rhinospider-ic-proxy
```

### 2. Backup

```bash
# Backup configuration
cp /opt/rhinospider-ic-proxy/.env /backup/ic-proxy-env-$(date +%Y%m%d).bak

# Backup logs
cp -r /opt/rhinospider-ic-proxy/logs /backup/ic-proxy-logs-$(date +%Y%m%d)
```

### 3. Monitoring

Set up monitoring for:
- CPU usage
- Memory usage
- Disk space
- Request latency
- Error rates

## Security Considerations

1. **Firewall Configuration**
```bash
# Allow only necessary ports
sudo ufw allow ssh
sudo ufw allow 3002/tcp
sudo ufw enable
```

2. **CORS Configuration**
Ensure that the ALLOWED_ORIGINS in the .env file only includes trusted origins.

3. **Authentication Validation**
The proxy should validate all authentication before forwarding requests to the canisters.

4. **Rate Limiting**
Consider implementing rate limiting to prevent abuse.

## Direct Storage Server

A standalone Direct Storage Server can be configured to run alongside the existing proxy server:

1. **Server Configuration**
   - Runs on port 3002 (separate from proxy server on port 3001)
   - Uses the same authentication mechanism as the proxy server
   - Handles expected authorization errors gracefully

2. **Key Endpoints**
   - `/api/submit-scraped-content` and `/api/submit-data` (fallback) for submission
   - `/api/get-scraped-data` and `/api/scraped-data` (fallback) for fetching

3. **Implementation Details**
   - Includes required principalId field with valid format ('2vxsx-fae')
   - Handles different response formats
   - Provides detailed error logging
   - Works without modifying existing extension code
