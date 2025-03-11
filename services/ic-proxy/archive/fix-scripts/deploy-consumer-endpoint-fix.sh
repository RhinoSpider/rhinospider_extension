#!/bin/bash
# Deploy Consumer Endpoint Fix Script
# This script deploys the fix for the consumer-submit endpoint to the server

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
REMOTE_USER="root"
REMOTE_HOST="143.244.133.154"
REMOTE_DIR="/root/rhinospider-ic-proxy"

# Print section header
section() {
  echo -e "\n${GREEN}==== $1 ====${NC}"
}

# Print status message
status() {
  echo -e "${YELLOW}$1${NC}"
}

section "Deploying Consumer Endpoint Fix"

# First, run the fix-consumer-endpoint.js script locally
status "Running fix-consumer-endpoint.js script locally..."
node fix-consumer-endpoint.js

# Check if the script ran successfully
if [ $? -ne 0 ]; then
  echo -e "${RED}Error running fix-consumer-endpoint.js script${NC}"
  exit 1
fi

# Copy the updated server.js file to the server
status "Copying updated server.js file to the server..."
scp server.js ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/

# Restart the IC Proxy container
status "Restarting the IC Proxy container..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "docker restart ic-proxy-ic-proxy-1"

# Wait for the server to restart
status "Waiting for the server to restart..."
sleep 5

# Test the consumer-submit endpoint
section "Testing Consumer Submit Endpoint"

# Test the consumer-submit endpoint
status "Testing consumer-submit endpoint..."
curl -s -X POST http://${REMOTE_HOST}:3001/api/consumer-submit \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer ffGpA2saNS47qr' \
  -d '{"url":"https://example.com/test","content":"<html><body><p>Test content</p></body></html>","topicId":"test-topic","principalId":"2vxsx-fae","deviceId":"test-device"}'

echo ""

section "Deployment Complete"
echo -e "${GREEN}Consumer endpoint fix has been deployed successfully.${NC}"
echo -e "\nTo test the endpoint from your local machine, run:"
echo -e "  ${YELLOW}node test-consumer-submit.js${NC}"
