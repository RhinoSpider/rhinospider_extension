#!/bin/bash
# Complete Server Deployment Script
# This script deploys both the IC Proxy server and the Direct Storage server

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
REMOTE_USER="root"
REMOTE_HOST="143.244.133.154"
REMOTE_DIR="/root/rhinospider-ic-proxy"
LOCAL_DIR="$(pwd)"
BACKUP_DIR="${REMOTE_DIR}/backup_$(date +%Y%m%d_%H%M%S)"

# Print section header
section() {
  echo -e "\n${GREEN}==== $1 ====${NC}"
}

# Print status message
status() {
  echo -e "${YELLOW}$1${NC}"
}

# Print error message
error() {
  echo -e "${RED}ERROR: $1${NC}"
}

# Check if a command exists on the remote server
remote_command_exists() {
  ssh ${REMOTE_USER}@${REMOTE_HOST} "command -v $1 >/dev/null 2>&1" && return 0 || return 1
}

section "Starting Complete Server Deployment"

# Create remote directory if it doesn't exist
status "Creating remote directory structure..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "mkdir -p ${REMOTE_DIR}"

# Create backup of existing files
status "Creating backup of existing files..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "if [ -f ${REMOTE_DIR}/server.js ]; then mkdir -p ${BACKUP_DIR} && cp -r ${REMOTE_DIR}/* ${BACKUP_DIR}/; fi"

# Upload essential files
status "Uploading essential files..."
scp ${LOCAL_DIR}/server.js ${LOCAL_DIR}/package.json ${LOCAL_DIR}/package-lock.json ${LOCAL_DIR}/bigint-patch.js ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/

# Upload direct storage server
status "Uploading direct storage server..."
scp ${LOCAL_DIR}/direct-storage-server.js ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/

# Upload ecosystem.config.js for PM2
status "Creating PM2 ecosystem config..."
cat > /tmp/ecosystem.config.js << 'EOL'
module.exports = {
  apps: [
    {
      name: 'ic-proxy',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
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
EOL

scp /tmp/ecosystem.config.js ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/

# Install dependencies on the remote server
section "Installing dependencies"
status "Checking for Node.js..."
if ! remote_command_exists "node"; then
  status "Installing Node.js..."
  ssh ${REMOTE_USER}@${REMOTE_HOST} "curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && apt-get install -y nodejs"
fi

status "Checking for PM2..."
if ! remote_command_exists "pm2"; then
  status "Installing PM2..."
  ssh ${REMOTE_USER}@${REMOTE_HOST} "npm install -g pm2"
fi

status "Installing project dependencies..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "cd ${REMOTE_DIR} && npm install"

# Start or restart the servers
section "Starting servers"
status "Starting IC Proxy and Direct Storage servers with PM2..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "cd ${REMOTE_DIR} && pm2 delete all || true && pm2 start ecosystem.config.js"

# Save PM2 configuration
status "Saving PM2 configuration..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "pm2 save"

# Set up PM2 to start on system boot
status "Setting up PM2 to start on system boot..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "pm2 startup | tail -n 1 | bash -"

# Verify servers are running
section "Verifying servers"

# Check IC Proxy server
status "Checking IC Proxy server (port 3001)..."
IC_PROXY_HEALTH=$(ssh ${REMOTE_USER}@${REMOTE_HOST} "curl -s http://localhost:3001/health || echo 'Failed'")
if [[ "$IC_PROXY_HEALTH" == *"status"*"ok"* ]]; then
  echo -e "${GREEN}✓ IC Proxy server is running correctly${NC}"
else
  error "IC Proxy server is not responding correctly"
  echo "Response: $IC_PROXY_HEALTH"
fi

# Check Direct Storage server
status "Checking Direct Storage server (port 3002)..."
DIRECT_STORAGE_HEALTH=$(ssh ${REMOTE_USER}@${REMOTE_HOST} "curl -s http://localhost:3002/health || echo 'Failed'")
if [[ "$DIRECT_STORAGE_HEALTH" == *"status"*"ok"* ]]; then
  echo -e "${GREEN}✓ Direct Storage server is running correctly${NC}"
else
  error "Direct Storage server is not responding correctly"
  echo "Response: $DIRECT_STORAGE_HEALTH"
fi

# Check specific endpoints
section "Checking specific endpoints"

# Check consumer-submit endpoint
status "Checking /api/consumer-submit endpoint..."
CONSUMER_SUBMIT=$(ssh ${REMOTE_USER}@${REMOTE_HOST} "curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3001/api/consumer-submit -H 'Content-Type: application/json' -d '{\"test\":true}'")
if [[ "$CONSUMER_SUBMIT" == "401" ]]; then
  echo -e "${GREEN}✓ /api/consumer-submit endpoint exists (returns 401 Unauthorized as expected)${NC}"
elif [[ "$CONSUMER_SUBMIT" == "404" ]]; then
  error "/api/consumer-submit endpoint not found (404)"
else
  status "/api/consumer-submit endpoint returned status code: $CONSUMER_SUBMIT"
fi

# Check direct-submit endpoint
status "Checking /api/direct-submit endpoint..."
DIRECT_SUBMIT=$(ssh ${REMOTE_USER}@${REMOTE_HOST} "curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3002/api/direct-submit -H 'Content-Type: application/json' -d '{\"test\":true}'")
if [[ "$DIRECT_SUBMIT" == "401" ]]; then
  echo -e "${GREEN}✓ /api/direct-submit endpoint exists (returns 401 Unauthorized as expected)${NC}"
elif [[ "$DIRECT_SUBMIT" == "404" ]]; then
  error "/api/direct-submit endpoint not found (404)"
else
  status "/api/direct-submit endpoint returned status code: $DIRECT_SUBMIT"
fi

# Check register-device endpoint
status "Checking /api/register-device endpoint..."
REGISTER_DEVICE=$(ssh ${REMOTE_USER}@${REMOTE_HOST} "curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3001/api/register-device -H 'Content-Type: application/json' -d '{\"test\":true}'")
if [[ "$REGISTER_DEVICE" == "401" ]]; then
  echo -e "${GREEN}✓ /api/register-device endpoint exists (returns 401 Unauthorized as expected)${NC}"
elif [[ "$REGISTER_DEVICE" == "404" ]]; then
  error "/api/register-device endpoint not found (404)"
else
  status "/api/register-device endpoint returned status code: $REGISTER_DEVICE"
fi

section "Deployment Complete"
echo -e "${GREEN}IC Proxy server and Direct Storage server have been deployed successfully!${NC}"
echo -e "IC Proxy URL: http://${REMOTE_HOST}:3001"
echo -e "Direct Storage URL: http://${REMOTE_HOST}:3002"
echo -e "\nTo check server logs:"
echo -e "  IC Proxy: ${YELLOW}ssh ${REMOTE_USER}@${REMOTE_HOST} \"pm2 logs ic-proxy\"${NC}"
echo -e "  Direct Storage: ${YELLOW}ssh ${REMOTE_USER}@${REMOTE_HOST} \"pm2 logs direct-storage-server\"${NC}"
echo -e "\nTo restart servers:"
echo -e "  ${YELLOW}ssh ${REMOTE_USER}@${REMOTE_HOST} \"cd ${REMOTE_DIR} && pm2 restart all\"${NC}"
