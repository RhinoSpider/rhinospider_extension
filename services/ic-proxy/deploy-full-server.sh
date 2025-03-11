#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Remote server details
REMOTE_USER="root"
REMOTE_HOST="143.244.133.154"
IC_PROXY_DIR="/root/rhinospider-ic-proxy"

# Function to print section headers
section() {
  echo -e "\n${BLUE}==== $1 ====${NC}"
}

# Function to print status messages
status() {
  echo -e "${GREEN}$1${NC}"
}

# Function to print warnings
warning() {
  echo -e "${YELLOW}WARNING: $1${NC}"
}

# Function to print errors
error() {
  echo -e "${RED}ERROR: $1${NC}"
  exit 1
}

# Check if we can connect to the server
section "Checking server connection"
if ! ssh -q ${REMOTE_USER}@${REMOTE_HOST} exit; then
  error "Cannot connect to server. Please check your credentials and try again."
fi
status "Server connection successful"

# Deploy the original server.js file
section "Deploying original server.js file"
status "Copying server.js file to server..."
scp /Users/ayanuali/development/rhinospider/services/ic-proxy/server.js ${REMOTE_USER}@${REMOTE_HOST}:${IC_PROXY_DIR}/server.js

# Copy necessary dependencies
section "Copying dependencies"
status "Copying bigint-patch.js..."
scp /Users/ayanuali/development/rhinospider/services/ic-proxy/bigint-patch.js ${REMOTE_USER}@${REMOTE_HOST}:${IC_PROXY_DIR}/bigint-patch.js

# Copy declaration files from extension source
section "Copying declaration files from extension source"
status "Creating declarations directory structure..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "mkdir -p ${IC_PROXY_DIR}/declarations/consumer ${IC_PROXY_DIR}/declarations/admin ${IC_PROXY_DIR}/declarations/storage"

# Copy all declaration files from extension source
status "Copying consumer declarations..."
scp /Users/ayanuali/development/rhinospider/apps/extension/src/declarations/consumer/* ${REMOTE_USER}@${REMOTE_HOST}:${IC_PROXY_DIR}/declarations/consumer/

status "Copying admin declarations..."
scp /Users/ayanuali/development/rhinospider/apps/extension/src/declarations/admin/* ${REMOTE_USER}@${REMOTE_HOST}:${IC_PROXY_DIR}/declarations/admin/

status "Copying storage declarations..."
scp /Users/ayanuali/development/rhinospider/apps/extension/src/declarations/storage/* ${REMOTE_USER}@${REMOTE_HOST}:${IC_PROXY_DIR}/declarations/storage/

# Install dependencies
section "Installing dependencies"
status "Installing required npm packages..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "cd ${IC_PROXY_DIR} && npm install express cors @dfinity/agent @dfinity/identity @dfinity/principal node-fetch"

# Restart the service
section "Restarting IC Proxy service"
status "Restarting IC Proxy service..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "systemctl restart ic-proxy.service"

# Check service status
status "Checking IC Proxy service status..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "systemctl status ic-proxy.service"

section "Deployment Complete"
status "IC Proxy has been deployed with the full server.js file"
status "You can now test the endpoints with the test-proxies.sh script"
