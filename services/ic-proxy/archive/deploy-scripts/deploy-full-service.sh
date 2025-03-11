#!/bin/bash
# Full IC Proxy Service Deployment Script
# This script deploys the entire IC proxy service to the Digital Ocean server

# Define variables
SSH_USER=${1:-root}
SSH_HOST=${2:-143.244.133.154}
REMOTE_DIR="/root/rhinospider-ic-proxy"

echo "=== Deploying Full IC Proxy Service ==="
echo "SSH User: $SSH_USER"
echo "SSH Host: $SSH_HOST"
echo "Remote Directory: $REMOTE_DIR"

# Create a deployment package
echo "Creating deployment package..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMP_DIR=$(mktemp -d)
PACKAGE_NAME="ic-proxy-package.tar.gz"

# Copy necessary files to the temp directory
cp -r "$SCRIPT_DIR"/*.js "$TEMP_DIR"/ 
cp -r "$SCRIPT_DIR"/package.json "$TEMP_DIR"/
cp -r "$SCRIPT_DIR"/package-lock.json "$TEMP_DIR"/
cp -r "$SCRIPT_DIR"/declarations "$TEMP_DIR"/
cp -r "$SCRIPT_DIR"/node_modules "$TEMP_DIR"/

# Create the tarball
tar -czf "$PACKAGE_NAME" -C "$TEMP_DIR" .

# Create the PM2 configuration file
echo "Creating PM2 configuration file..."
cat > ic-proxy-ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'ic-proxy',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        IC_HOST: 'https://icp0.io',
        CONSUMER_CANISTER_ID: 'tgyl5-yyaaa-aaaaj-az4wq-cai',
        STORAGE_CANISTER_ID: 'i2gk7-oyaaa-aaaao-a37cq-cai',
        API_PASSWORD: 'ffGpA2saNS47qr'
      }
    },
    {
      name: 'direct-storage-server',
      script: 'direct-storage-server.js',
      env: {
        NODE_ENV: 'production',
        DIRECT_PORT: 3002,
        PROXY_HOST: 'localhost',
        PROXY_PORT: 3001,
        API_PASSWORD: 'ffGpA2saNS47qr'
      }
    }
  ]
};
EOF

# Backup the server configuration
echo "Creating backup of current server configuration..."
ssh "$SSH_USER@$SSH_HOST" "if [ -d $REMOTE_DIR ]; then cd $REMOTE_DIR && tar -czf ~/ic-proxy-backup-$(date +%Y%m%d%H%M%S).tar.gz .; fi"

# Create the remote directory if it doesn't exist
echo "Creating remote directory if it doesn't exist..."
ssh "$SSH_USER@$SSH_HOST" "mkdir -p $REMOTE_DIR"

# Copy the deployment package to the server
echo "Copying deployment package to the server..."
scp "$PACKAGE_NAME" "$SSH_USER@$SSH_HOST:$REMOTE_DIR/"
scp ic-proxy-ecosystem.config.js "$SSH_USER@$SSH_HOST:$REMOTE_DIR/"

# Extract and set up the service on the remote server
echo "Setting up the service on the remote server..."
ssh "$SSH_USER@$SSH_HOST" << ENDSSH
cd $REMOTE_DIR

# Extract the package
tar -xzf $PACKAGE_NAME

# Install dependencies (if needed)
npm ci --production

# Stop any existing services
pm2 stop ic-proxy direct-storage-server || true
pm2 delete ic-proxy direct-storage-server || true

# Start the services with PM2
pm2 start ic-proxy-ecosystem.config.js

# Save the PM2 configuration
pm2 save

# Set up PM2 to start on system boot
pm2 startup | tail -n 1 | bash

# Clean up
rm -f $PACKAGE_NAME
ENDSSH

# Clean up local files
rm -f "$PACKAGE_NAME"
rm -f ic-proxy-ecosystem.config.js
rm -rf "$TEMP_DIR"

echo "=== Deployment Complete ==="
echo "The IC proxy service has been deployed and started on the server."
echo "Service URLs:"
echo "  - IC Proxy: http://$SSH_HOST:3001"
echo "  - Direct Storage Server: http://$SSH_HOST:3002"
echo ""
echo "Admin Frontend URL: https://sxsvc-aqaaa-aaaaj-az4ta-cai.icp0.io/"
echo ""
echo "If you encounter any issues, you can check the logs with:"
echo "  ssh $SSH_USER@$SSH_HOST \"pm2 logs\""
