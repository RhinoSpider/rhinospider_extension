#!/bin/bash
# Fix Remaining Services Script
# This script fixes the Direct Storage Server and Search Proxy services

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
REMOTE_USER="root"
REMOTE_HOST="143.244.133.154"

# Print section header
section() {
  echo -e "\n${GREEN}==== $1 ====${NC}"
}

# Print status message
status() {
  echo -e "${YELLOW}$1${NC}"
}

section "Fixing Remaining Services"

# Check existing Docker containers
status "Checking existing Docker containers..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "docker ps -a"

# Stop and remove existing containers for direct-storage-server and search-proxy
status "Stopping and removing existing containers for direct-storage-server and search-proxy..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "docker stop direct-storage-server search-proxy 2>/dev/null || true"
ssh ${REMOTE_USER}@${REMOTE_HOST} "docker rm direct-storage-server search-proxy 2>/dev/null || true"

# Create Docker run commands for direct-storage-server and search-proxy
status "Creating Docker run commands for direct-storage-server and search-proxy..."

# Run direct-storage-server
status "Running direct-storage-server container..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "docker run -d --name direct-storage-server \
  -p 3002:3002 \
  -v /root/rhinospider-direct-storage:/app \
  -w /app \
  -e PORT=3002 \
  -e NODE_ENV=production \
  -e API_PASSWORD=ffGpA2saNS47qr \
  --restart unless-stopped \
  node:18 bash -c 'cd /app && npm install && node server.js'"

# Run search-proxy
status "Running search-proxy container..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "docker run -d --name search-proxy \
  -p 3003:3003 \
  -v /root/rhinospider-search-proxy:/app \
  -w /app \
  -e PORT=3003 \
  -e NODE_ENV=production \
  -e GOOGLE_SEARCH_API_KEY=AIzaSyDJF0iLnwGcVTkIkuJ9CUWXnZM1hMEuiLU \
  -e GOOGLE_SEARCH_ENGINE_ID=013036536707430787589:_pqjad5hr1a \
  --restart unless-stopped \
  node:18 bash -c 'cd /app && npm install && node server.js'"

# Wait for services to start
status "Waiting for services to start..."
sleep 10

# Check if services are running
status "Checking if services are running..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "docker ps"

# Test the endpoints
section "Testing Endpoints"

# Test the IC Proxy endpoint
status "Testing IC Proxy endpoint..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "curl -s -X GET http://143.244.133.154:3001/api/health || echo 'Failed to connect'"

# Test the Direct Storage Server endpoint
status "Testing Direct Storage Server endpoint..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "curl -s -X GET http://143.244.133.154:3002/health || echo 'Failed to connect'"

# Test the Search Proxy endpoint
status "Testing Search Proxy endpoint..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "curl -s -X GET http://143.244.133.154:3003/health || echo 'Failed to connect'"

section "Testing Consumer Submit Endpoint"

# Test the Consumer Submit endpoint
status "Testing Consumer Submit endpoint..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "curl -s -X POST http://143.244.133.154:3001/api/consumer-submit \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer ffGpA2saNS47qr' \
  -d '{\"url\":\"https://example.com\",\"content\":\"test content\",\"topicId\":\"test-topic\",\"deviceId\":\"test-device\",\"principalId\":\"2vxsx-fae\"}' || echo 'Failed to connect'"

section "Deployment Complete"
echo -e "${GREEN}Services have been deployed with proper port mapping.${NC}"
echo -e "\nIC Proxy URL: http://${REMOTE_HOST}:3001"
echo -e "Direct Storage Server URL: http://${REMOTE_HOST}:3002"
echo -e "Search Proxy URL: http://${REMOTE_HOST}:3003"
echo -e "\nTo check Docker logs:"
echo -e "  ${YELLOW}ssh ${REMOTE_USER}@${REMOTE_HOST} \"docker logs ic-proxy-ic-proxy-1\"${NC}"
echo -e "  ${YELLOW}ssh ${REMOTE_USER}@${REMOTE_HOST} \"docker logs direct-storage-server\"${NC}"
echo -e "  ${YELLOW}ssh ${REMOTE_USER}@${REMOTE_HOST} \"docker logs search-proxy\"${NC}"
