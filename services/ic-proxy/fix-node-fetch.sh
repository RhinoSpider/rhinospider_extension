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

# Install the correct version of node-fetch
section "Installing compatible node-fetch version"
status "Installing node-fetch v2.6.7 (CommonJS compatible)..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "cd ${IC_PROXY_DIR} && npm uninstall node-fetch && npm install node-fetch@2.6.7"

# Restart the service
section "Restarting IC Proxy service"
status "Restarting IC Proxy service..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "systemctl restart ic-proxy.service"

# Check service status
status "Checking IC Proxy service status..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "systemctl status ic-proxy.service"

section "Fix Complete"
status "node-fetch has been downgraded to a CommonJS compatible version"
status "IC Proxy service should now be running correctly"
