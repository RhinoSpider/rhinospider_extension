#!/bin/bash
# Deploy Fixed Server Script
# This script uploads the fixed server.js file to the Digital Ocean server

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

section "Deploying Fixed Server"

# Create backup of existing server.js on the remote server
status "Creating backup of existing server.js on remote server..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "if [ -f ${REMOTE_DIR}/server.js ]; then cp ${REMOTE_DIR}/server.js ${REMOTE_DIR}/server.js.backup-$(date +%Y%m%d_%H%M%S); fi"

# Upload the fixed server.js file
status "Uploading fixed server.js file..."
scp ${LOCAL_DIR}/server.js ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/

# Restart the server
status "Restarting the server..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "cd ${REMOTE_DIR} && pm2 restart ic-proxy"

# Verify the server is running
section "Verifying Server"

# Wait a moment for the server to start
sleep 3

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
echo -e "${GREEN}Fixed server has been deployed successfully!${NC}"
echo -e "\nTo check server logs:"
echo -e "  ${YELLOW}ssh ${REMOTE_USER}@${REMOTE_HOST} \"pm2 logs ic-proxy\"${NC}"
