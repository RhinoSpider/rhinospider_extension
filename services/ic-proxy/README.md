# IC Proxy Server

A proxy server for Internet Computer interactions, designed to bypass certificate verification issues in Chrome extensions.

## Overview

This proxy server acts as an intermediary between the RhinoSpider Chrome extension and the Internet Computer. It handles all the certificate verification on the server side, allowing the extension to communicate with the IC without dealing with verification issues.

## Setup

### Local Development

1. Install dependencies:
   ```
   npm install
   ```

2. Copy declarations from the extension:
   ```
   ./copy-declarations.sh
   ```

3. Start the server:
   ```
   npm start
   ```

The server will run on port 3000 by default.

### Docker Deployment

1. Build and start the container:
   ```
   docker-compose up -d
   ```

## Digital Ocean Deployment

### Option 1: Using the deploy.sh script

1. Ensure you have SSH access to your Digital Ocean droplet.

2. Run the deployment script:
   ```
   ./deploy.sh
   ```

This script will:
- Copy declarations from the extension
- Create a deployment package
- Copy the package to your Digital Ocean server
- Deploy the application using Docker Compose
- Clean up temporary files

### Option 2: Manual Deployment

1. Copy declarations from the extension:
   ```
   ./copy-declarations.sh
   ```

2. Create a deployment package:
   ```
   tar -czf ic-proxy.tar.gz package.json server.js Dockerfile docker-compose.yml declarations README.md
   ```

3. Copy the package to your Digital Ocean server:
   ```
   scp ic-proxy.tar.gz root@143.244.133.154:/root/ic-proxy/
   ```

4. SSH into the server and deploy:
   ```
   ssh root@143.244.133.154
   cd /root/ic-proxy
   tar -xzf ic-proxy.tar.gz
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```

## API Endpoints

- `GET /health` - Health check endpoint
- `POST /api/profile` - Get user profile (requires principal in request body)
- `POST /api/topics` - Get topics (requires principal in request body)

## Environment Variables

- `IC_HOST` - Internet Computer host URL (default: https://icp0.io)
- `CONSUMER_CANISTER_ID` - Consumer canister ID (default: tgyl5-yyaaa-aaaaj-az4wq-cai)
- `PORT` - Port to run the server on (default: 3000)
