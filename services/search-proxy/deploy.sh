#!/bin/bash

# Deployment script for RhinoSpider Search Proxy Service
# This script deploys the updated search proxy service to Digital Ocean

# Get password from command line argument
if [ -z "$1" ]; then
  echo "Error: Password is required as the first argument"
  echo "Usage: $0 <password>"
  exit 1
fi

SSH_PASSWORD="$1"

echo "=== RhinoSpider Search Proxy Deployment ==="

# Configuration
SERVER_HOST="search-proxy.rhinospider.com"
SSH_USER="root"
SERVICE_NAME="search-proxy"
SERVICE_PORT=3002

# Use root as SSH user
echo "Using SSH user: $SSH_USER"

# Create a deployment package
echo "Creating deployment package..."
DEPLOY_DIR="deploy_package"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# Copy necessary files
cp -r services $DEPLOY_DIR/
cp -r routes $DEPLOY_DIR/
cp server.js $DEPLOY_DIR/
cp package.json $DEPLOY_DIR/
cp package-lock.json $DEPLOY_DIR/
cp .env $DEPLOY_DIR/ 2>/dev/null || echo "No .env file found, skipping..."

# Create tar archive
TAR_NAME="search-proxy-deploy.tar.gz"
tar -czf $TAR_NAME $DEPLOY_DIR

# Set password for SSH (this is not secure for production, but works for this demo)
SSH_PASS="ffGpA2saNS47qr"

# Check if sshpass is installed
if ! command -v sshpass &> /dev/null; then
  echo "sshpass is not installed. Please install it first with: brew install hudochenkov/sshpass/sshpass"
  exit 1
fi

# Upload to server using sshpass
echo "Uploading to $SERVER_HOST..."
sshpass -p "$SSH_PASSWORD" scp -o StrictHostKeyChecking=no $TAR_NAME $SSH_USER@$SERVER_HOST:/tmp/

# Execute deployment commands on the server using sshpass
echo "Deploying on the server..."
sshpass -p "$SSH_PASSWORD" ssh -o StrictHostKeyChecking=no $SSH_USER@$SERVER_HOST << EOF
  # Stop the existing service
  echo "Stopping existing service..."
  pm2 stop $SERVICE_NAME || true
  
  # Extract the new files
  echo "Extracting new files..."
  mkdir -p /opt/rhinospider/$SERVICE_NAME-new
  tar -xzf /tmp/$TAR_NAME -C /opt/rhinospider/$SERVICE_NAME-new
  mv /opt/rhinospider/$SERVICE_NAME-new/$DEPLOY_DIR/* /opt/rhinospider/$SERVICE_NAME-new/
  rmdir /opt/rhinospider/$SERVICE_NAME-new/$DEPLOY_DIR
  
  # Backup the old version
  echo "Backing up old version..."
  if [ -d "/opt/rhinospider/$SERVICE_NAME" ]; then
    mv /opt/rhinospider/$SERVICE_NAME /opt/rhinospider/$SERVICE_NAME-backup-\$(date +%Y%m%d%H%M%S)
  fi
  
  # Move the new version into place
  mv /opt/rhinospider/$SERVICE_NAME-new /opt/rhinospider/$SERVICE_NAME
  
  # Install dependencies
  echo "Installing dependencies..."
  cd /opt/rhinospider/$SERVICE_NAME
  npm ci --production
  
  # Start the service
  echo "Starting service..."
  # Set environment variables for the service
  PORT=$SERVICE_PORT \
  API_PASSWORD="ffGpA2saNS47qr" \
  MAX_URLS_PER_DAY=1000 \
  MAX_CONCURRENT_REQUESTS=5 \
  BATCH_SIZE=30 \
  INITIAL_BACKOFF_MS=5000 \
  MAX_BACKOFF_MS=3600000 \
  ENABLE_COMMON_CRAWL=true \
  ENABLE_GOV_SITEMAPS=true \
  ENABLE_RSS_FEEDS=true \
  ENABLE_WAYBACK_MACHINE=true \
  ENABLE_WIKIMEDIA_API=true \
  pm2 start server.js --name $SERVICE_NAME
  
  # Save PM2 configuration
  pm2 save
  
  # Cleanup
  rm /tmp/$TAR_NAME
EOF

# Clean up local files
rm -rf $DEPLOY_DIR
rm $TAR_NAME

echo "=== Deployment completed ==="
echo "The search proxy service has been deployed to https://$SERVER_HOST"
echo "Verify the deployment by checking:"
echo "  curl https://$SERVER_HOST/api/health"
