#!/bin/bash
# Fix Docker Port Mapping Script
# This script fixes the Docker port mapping to ensure the server is accessible from outside

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

section "Fixing Docker Port Mapping"

# Check if Docker is running
status "Checking if Docker is running..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "docker ps"

# Check the Docker network configuration
status "Checking Docker network configuration..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "docker network ls"
ssh ${REMOTE_USER}@${REMOTE_HOST} "docker network inspect bridge"

# Create a new Docker Compose file for the IC Proxy service
status "Creating Docker Compose file for IC Proxy service..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "cat > /root/docker-compose.yml << 'EOL'
version: '3'

services:
  ic-proxy:
    image: node:18
    container_name: ic-proxy
    restart: unless-stopped
    working_dir: /app
    volumes:
      - /root/rhinospider-ic-proxy:/app
    ports:
      - '3001:3001'
    command: >
      bash -c 'cd /app && npm install && node server.js'
    environment:
      - PORT=3001
      - NODE_ENV=production
      - IC_HOST=https://icp0.io
      - CONSUMER_CANISTER_ID=tgyl5-yyaaa-aaaaj-az4wq-cai
      - ADMIN_CANISTER_ID=444wf-gyaaa-aaaaj-az5sq-cai
      - STORAGE_CANISTER_ID=i2gk7-oyaaa-aaaao-a37cq-cai
      - API_PASSWORD=ffGpA2saNS47qr

  direct-storage-server:
    image: node:18
    container_name: direct-storage-server
    restart: unless-stopped
    working_dir: /app
    volumes:
      - /root/rhinospider-direct-storage:/app
    ports:
      - '3002:3002'
    command: >
      bash -c 'cd /app && npm install && node server.js'
    environment:
      - PORT=3002
      - NODE_ENV=production
      - API_PASSWORD=ffGpA2saNS47qr

  search-proxy:
    image: node:18
    container_name: search-proxy
    restart: unless-stopped
    working_dir: /app
    volumes:
      - /root/rhinospider-search-proxy:/app
    ports:
      - '3003:3003'
    command: >
      bash -c 'cd /app && npm install && node server.js'
    environment:
      - PORT=3003
      - NODE_ENV=production
      - GOOGLE_SEARCH_API_KEY=AIzaSyDJF0iLnwGcVTkIkuJ9CUWXnZM1hMEuiLU
      - GOOGLE_SEARCH_ENGINE_ID=013036536707430787589:_pqjad5hr1a
EOL"

# Stop the existing PM2 services
status "Stopping existing PM2 services..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "pm2 delete all"

# Start the services using Docker Compose
status "Starting services using Docker Compose..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "cd /root && docker-compose down || true && docker-compose up -d"

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

section "Deployment Complete"
echo -e "${GREEN}Services have been deployed using Docker Compose with proper port mapping.${NC}"
echo -e "\nIC Proxy URL: http://${REMOTE_HOST}:3001"
echo -e "Direct Storage Server URL: http://${REMOTE_HOST}:3002"
echo -e "Search Proxy URL: http://${REMOTE_HOST}:3003"
echo -e "\nTo check Docker logs:"
echo -e "  ${YELLOW}ssh ${REMOTE_USER}@${REMOTE_HOST} \"docker logs ic-proxy\"${NC}"
echo -e "  ${YELLOW}ssh ${REMOTE_USER}@${REMOTE_HOST} \"docker logs direct-storage-server\"${NC}"
echo -e "  ${YELLOW}ssh ${REMOTE_USER}@${REMOTE_HOST} \"docker logs search-proxy\"${NC}"
