#!/bin/bash
# Check Server Endpoints Script
# This script checks the server endpoints directly on the Digital Ocean server

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

section "Checking Server Endpoints"

# Check if the server is running
status "Checking if the server is running..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "pm2 list"

# Check the server.js file on the server
status "Checking server.js file for endpoint declarations..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "grep -n \"app.post('/api/register-device'\" ${REMOTE_DIR}/server.js"
ssh ${REMOTE_USER}@${REMOTE_HOST} "grep -n \"app.post('/api/consumer-submit'\" ${REMOTE_DIR}/server.js"

# Check server logs for any errors
status "Checking server logs for errors..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "pm2 logs ic-proxy --lines 20"

section "Testing Endpoints Directly on Server"

# Test register-device endpoint directly on the server
status "Testing /api/register-device endpoint directly on the server..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "curl -s -X POST http://localhost:3001/api/register-device -H 'Content-Type: application/json' -d '{\"deviceId\":\"test-device\"}' -i | head -20"

# Test consumer-submit endpoint directly on the server
status "Testing /api/consumer-submit endpoint directly on the server..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "curl -s -X POST http://localhost:3001/api/consumer-submit -H 'Content-Type: application/json' -d '{\"url\":\"https://example.com\",\"content\":\"test content\",\"topicId\":\"test-topic\",\"deviceId\":\"test-device\"}' -i | head -20"

section "Complete"
