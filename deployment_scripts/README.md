# RhinoSpider Deployment Scripts

This folder contains comprehensive deployment scripts for the RhinoSpider proxy architecture. These scripts handle the complete deployment process for both the IC Proxy and Search Proxy servers, including server setup, dependencies, configuration, and service management.

## Scripts Overview

### 1. IC Proxy Deployment Script

- **File**: `deploy_ic_proxy.sh`
- **Purpose**: Deploys the IC Proxy server that handles profile, topics, and consumer-submit endpoints
- **Target**: ic-proxy.rhinospider.com (port 3001)
- **Features**:
  - Complete server setup (Node.js, PM2, nginx)
  - Automatic SSL configuration with Certbot
  - Proper CORS configuration
  - PM2 process management
  - BigInt serialization support for Internet Computer data

### 2. Search Proxy Deployment Script

- **File**: `deploy_search_proxy.sh`
- **Purpose**: Deploys the Search Proxy server that handles search functionality
- **Target**: search-proxy.rhinospider.com (port 3002)
- **Features**:
  - Complete server setup (Node.js, PM2, nginx)
  - Automatic SSL configuration with Certbot
  - Proper CORS configuration
  - PM2 process management

## Usage Instructions

1. Make the scripts executable:
   ```bash
   chmod +x deploy_ic_proxy.sh deploy_search_proxy.sh
   ```

2. Run the deployment scripts:
   ```bash
   # To deploy the IC Proxy server
   ./deploy_ic_proxy.sh
   
   # To deploy the Search Proxy server
   ./deploy_search_proxy.sh
   ```

3. The scripts will:
   - Connect to the target server via SSH
   - Set up all required dependencies
   - Configure the server and services
   - Start the services with PM2
   - Set up nginx as a reverse proxy
   - Configure SSL certificates

## Configuration

The deployment scripts include default configuration values, but you can modify them if needed:

### IC Proxy Configuration

- Server: root@ic-proxy.rhinospider.com
- Password: ffGpA2saNS47qr
- Port: 3001
- API Key: ffGpA2saNS47qr
- Consumer Canister ID: tgyl5-yyaaa-aaaaj-az4wq-cai
- Admin Canister ID: szqyk-3aaaa-aaaaj-az4sa-cai
- IC Host: https://icp0.io

### Search Proxy Configuration

- Server: root@search-proxy.rhinospider.com
- Password: ffGpA2saNS47qr
- Port: 3002
- API Key: ffGpA2saNS47qr

## Important Notes

- These scripts are designed to be idempotent - they can be run multiple times without causing issues
- They handle both fresh installations and updates to existing installations
- All configuration is done automatically, including nginx and SSL setup
- The scripts include proper error handling and logging

For more information about the RhinoSpider proxy architecture, please refer to the `PROXY_ARCHITECTURE_GUIDE.md` in the parent directory.
