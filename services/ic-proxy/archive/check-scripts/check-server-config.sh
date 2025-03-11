#!/bin/bash
# Check Server Configuration Script
# This script checks the server configuration and verifies the endpoints are properly set up

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

section "Checking Server Configuration"

# Check if the server is running
status "Checking if the server is running..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "pm2 list"

# Check for any firewall rules that might be blocking connections
status "Checking firewall rules..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "iptables -L -n"

# Check if the server is listening on the correct port
status "Checking if the server is listening on port 3001..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "netstat -tuln | grep 3001"

# Check the server logs for any errors
status "Checking server logs for errors..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "pm2 logs ic-proxy --lines 20"

# Check if the server can be accessed locally on the server
section "Testing Endpoints Locally on Server"

# Test consumer-submit endpoint directly on the server
status "Testing /api/consumer-submit endpoint directly on the server..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "curl -s -X POST http://localhost:3001/api/consumer-submit -H 'Content-Type: application/json' -H 'Authorization: Bearer ffGpA2saNS47qr' -d '{\"url\":\"https://example.com\",\"content\":\"test content\",\"topicId\":\"test-topic\",\"deviceId\":\"test-device\",\"principalId\":\"2vxsx-fae\"}' -i | head -20"

# Test submit endpoint directly on the server
status "Testing /api/submit endpoint directly on the server..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "curl -s -X POST http://localhost:3001/api/submit -H 'Content-Type: application/json' -H 'Authorization: Bearer ffGpA2saNS47qr' -d '{\"url\":\"https://example.com\",\"content\":\"test content\",\"topicId\":\"test-topic\",\"deviceId\":\"test-device\",\"principalId\":\"2vxsx-fae\"}' -i | head -20"

# Test if the server can be accessed from outside
section "Testing External Access"

# Test if the server can be accessed from outside using the public IP
status "Testing if the server can be accessed from outside..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "curl -s -X GET http://143.244.133.154:3001/api/health -i | head -20"

section "Complete"
