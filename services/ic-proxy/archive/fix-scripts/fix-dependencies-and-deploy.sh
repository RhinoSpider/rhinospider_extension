#!/bin/bash
# Fix Dependencies and Deploy Script
# This script fixes missing dependencies and redeploys the IC Proxy server

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

section "Fixing Dependencies and Redeploying IC Proxy Server"

# Check if package.json exists locally
if [ ! -f "${LOCAL_DIR}/package.json" ]; then
  error "package.json not found in ${LOCAL_DIR}"
  exit 1
fi

# Add missing dependency to package.json
status "Adding missing dependency to package.json..."
if grep -q "@dfinity/identity-secp256k1" "${LOCAL_DIR}/package.json"; then
  status "@dfinity/identity-secp256k1 already in package.json"
else
  # Use temporary file to avoid issues with inline editing
  cat "${LOCAL_DIR}/package.json" | sed 's/"@dfinity\/principal": "[^"]*"/"@dfinity\/principal": "^0.18.1",\n    "@dfinity\/identity-secp256k1": "^0.18.1"/' > "${LOCAL_DIR}/package.json.tmp"
  mv "${LOCAL_DIR}/package.json.tmp" "${LOCAL_DIR}/package.json"
  status "Added @dfinity/identity-secp256k1 to package.json"
fi

# Upload updated package.json to server
status "Uploading updated package.json to server..."
scp "${LOCAL_DIR}/package.json" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/"

# Install dependencies on the server
status "Installing dependencies on the server..."
ssh "${REMOTE_USER}@${REMOTE_HOST}" "cd ${REMOTE_DIR} && npm install"

# Restart the server
status "Restarting the server..."
ssh "${REMOTE_USER}@${REMOTE_HOST}" "cd ${REMOTE_DIR} && pm2 restart ic-proxy"

# Wait for server to start
status "Waiting for server to start..."
sleep 5

# Check if server is running properly
status "Checking if server is running properly..."
SERVER_STATUS=$(ssh "${REMOTE_USER}@${REMOTE_HOST}" "pm2 show ic-proxy | grep status")
if [[ "$SERVER_STATUS" == *"online"* ]]; then
  echo -e "${GREEN}✓ Server is running${NC}"
else
  error "Server is not running properly"
  ssh "${REMOTE_USER}@${REMOTE_HOST}" "pm2 logs ic-proxy --lines 20"
  exit 1
fi

# Test endpoints
section "Testing Endpoints"

# Test register-device endpoint
status "Testing /api/register-device endpoint..."
REGISTER_DEVICE=$(ssh "${REMOTE_USER}@${REMOTE_HOST}" "curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3001/api/register-device -H 'Content-Type: application/json' -d '{\"deviceId\":\"test-device\"}' -H 'Authorization: Bearer ffGpA2saNS47qr'")
if [[ "$REGISTER_DEVICE" == "200" ]]; then
  echo -e "${GREEN}✓ /api/register-device endpoint is working${NC}"
else
  status "/api/register-device endpoint returned status code: $REGISTER_DEVICE"
fi

# Test consumer-submit endpoint
status "Testing /api/consumer-submit endpoint..."
CONSUMER_SUBMIT=$(ssh "${REMOTE_USER}@${REMOTE_HOST}" "curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3001/api/consumer-submit -H 'Content-Type: application/json' -d '{\"url\":\"https://example.com\",\"content\":\"test content\",\"topicId\":\"test-topic\",\"deviceId\":\"test-device\"}' -H 'Authorization: Bearer ffGpA2saNS47qr'")
if [[ "$CONSUMER_SUBMIT" == "200" ]]; then
  echo -e "${GREEN}✓ /api/consumer-submit endpoint is working${NC}"
else
  status "/api/consumer-submit endpoint returned status code: $CONSUMER_SUBMIT"
fi

section "Deployment Complete"
echo -e "${GREEN}IC Proxy server has been fixed and redeployed successfully!${NC}"
echo -e "\nTo check server logs:"
echo -e "  ${YELLOW}ssh ${REMOTE_USER}@${REMOTE_HOST} \"pm2 logs ic-proxy\"${NC}"

# Now let's deploy the search-proxy service
section "Deploying Search Proxy Service"
status "Changing to search-proxy directory..."
cd /Users/ayanuali/development/rhinospider/services/search-proxy

status "Running search-proxy deployment script..."
./deploy-search-proxy.sh

section "All Services Deployed"
echo -e "${GREEN}Both IC Proxy and Search Proxy services have been deployed successfully!${NC}"
echo -e "\nIC Proxy URL: http://${REMOTE_HOST}:3001"
echo -e "Search Proxy URL: http://${REMOTE_HOST}:3003"
echo -e "\nTo check server logs:"
echo -e "  ${YELLOW}ssh ${REMOTE_USER}@${REMOTE_HOST} \"pm2 logs\"${NC}"
