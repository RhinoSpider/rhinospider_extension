#!/bin/bash

# Master deployment script for both IC Proxy and Search Proxy servers
# This script runs both deployment scripts in sequence

echo "===== RHINOSPIDER COMPLETE PROXY ARCHITECTURE DEPLOYMENT ====="

# Make the individual deployment scripts executable
chmod +x deploy_ic_proxy.sh
chmod +x deploy_search_proxy.sh

# Deploy IC Proxy
echo "===== DEPLOYING IC PROXY SERVER ====="
./deploy_ic_proxy.sh

# Deploy Search Proxy
echo "===== DEPLOYING SEARCH PROXY SERVER ====="
./deploy_search_proxy.sh

# Verify deployment
echo "===== VERIFYING DEPLOYMENT ====="

# Test IC Proxy
echo "Testing IC Proxy health endpoint..."
curl -s https://ic-proxy.rhinospider.com/api/health

echo -e "\nTesting IC Proxy topics endpoint..."
curl -s -X POST https://ic-proxy.rhinospider.com/api/topics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ffGpA2saNS47qr" \
  -d '{}'

# Test Search Proxy
echo -e "\nTesting Search Proxy health endpoint..."
curl -s https://search-proxy.rhinospider.com/api/health

echo -e "\nTesting Search Proxy search endpoint..."
curl -s -X POST https://search-proxy.rhinospider.com/api/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ffGpA2saNS47qr" \
  -d '{"query": "test query", "limit": 2}'

echo -e "\n===== DEPLOYMENT VERIFICATION COMPLETE ====="
echo "Both IC Proxy and Search Proxy servers are now deployed and running."
echo "IC Proxy: https://ic-proxy.rhinospider.com"
echo "Search Proxy: https://search-proxy.rhinospider.com"
