#!/bin/bash

# Test script for validating IC Proxy and Search Proxy services
# This script tests the health endpoints and basic functionality

SERVER_IP="143.244.133.154"
IC_PROXY_PORT="3001"
SEARCH_PROXY_PORT="3002"
IC_PROXY_DIR="/root/rhinospider-ic-proxy"
SEARCH_PROXY_DIR="/root/rhinospider-search-proxy"

echo "==== RhinoSpider Proxy Services Validation ===="
echo

# Summary of available endpoints based on server.js files
echo "Available Endpoints Summary:"
echo "IC Proxy Endpoints:"
echo "  - /api/health (GET): Health check"
echo "  - /api/consumer-submit (POST): Submit data to consumer canister"
echo "  - /api/topics (POST): Get topics from consumer canister"
echo "  - /api/profile (POST): Get user profile from consumer canister"
echo "  - /api/fetch-content (POST): Fetch content from URL"
echo
echo "Search Proxy Endpoints:"
echo "  - /api/health (GET): Health check"
echo "  - /api/search (POST): Search with authentication"
echo

# Test IC Proxy health endpoint
echo "Testing IC Proxy health endpoint..."
IC_HEALTH=$(curl -s "http://${SERVER_IP}:${IC_PROXY_PORT}/api/health")
echo "Response: $IC_HEALTH"

if [[ "$IC_HEALTH" == *"ok"* ]]; then
  echo "✅ IC Proxy health check passed"
else
  echo "❌ IC Proxy health check failed"
fi
echo

# Test IC Proxy consumer-submit endpoint
echo "Testing IC Proxy consumer-submit endpoint..."
CONSUMER_SUBMIT=$(curl -s -X POST "http://${SERVER_IP}:${IC_PROXY_PORT}/api/consumer-submit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ffGpA2saNS47qr" \
  -d '{"url":"https://example.com","content":"test content","topicId":"test-topic"}')
echo "Response: $CONSUMER_SUBMIT"

if [[ "$CONSUMER_SUBMIT" == *"success"* ]]; then
  echo "✅ IC Proxy consumer-submit check passed"
else
  echo "❌ IC Proxy consumer-submit check failed"
fi
echo

# Test IC Proxy topics endpoint
echo "Testing IC Proxy topics endpoint..."
TOPICS_RESULT=$(curl -s -X POST "http://${SERVER_IP}:${IC_PROXY_PORT}/api/topics" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ffGpA2saNS47qr" \
  -d '{"principalId":"nqkf7-4psg2-xnfiu-ht7if-oghvx-m2gb5-e3ifk-pjtfq-o5wiu-scumu-dqe"}')
echo "Response: $TOPICS_RESULT"

if [[ "$TOPICS_RESULT" != *"Not Found"* ]]; then
  echo "✅ IC Proxy topics check passed"
else
  echo "❌ IC Proxy topics check failed"
fi
echo

# Test IC Proxy profile endpoint
echo "Testing IC Proxy profile endpoint..."
PROFILE_RESULT=$(curl -s -X POST "http://${SERVER_IP}:${IC_PROXY_PORT}/api/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ffGpA2saNS47qr" \
  -d '{"principalId":"nqkf7-4psg2-xnfiu-ht7if-oghvx-m2gb5-e3ifk-pjtfq-o5wiu-scumu-dqe"}')
echo "Response: $PROFILE_RESULT"

if [[ "$PROFILE_RESULT" != *"Not Found"* ]]; then
  echo "✅ IC Proxy profile check passed"
else
  echo "❌ IC Proxy profile check failed"
fi
echo

# Test Search Proxy health endpoint
echo "Testing Search Proxy health endpoint..."
SEARCH_HEALTH=$(curl -s "http://${SERVER_IP}:${SEARCH_PROXY_PORT}/api/health")
echo "Response: $SEARCH_HEALTH"

if [[ "$SEARCH_HEALTH" == *"ok"* ]]; then
  echo "✅ Search Proxy health check passed"
else
  echo "❌ Search Proxy health check failed"
fi
echo

# Test Search Proxy search endpoint with a test query
echo "Testing Search Proxy search endpoint..."
SEARCH_RESULT=$(curl -s -X POST "http://${SERVER_IP}:${SEARCH_PROXY_PORT}/api/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ffGpA2saNS47qr" \
  -d '{"query":"test","topicId":"test-topic"}')
echo "Response: $SEARCH_RESULT"

if [[ "$SEARCH_RESULT" == *"success"* && "$SEARCH_RESULT" == *"results"* ]]; then
  echo "✅ Search Proxy search check passed"
else
  echo "❌ Search Proxy search check failed"
fi
echo

# Check if both services are running on the server
echo "Checking if services are running on the server..."
echo "IC Proxy service status:"
ssh root@${SERVER_IP} "systemctl status ic-proxy.service | head -n 5"
echo

echo "Search Proxy service status:"
ssh root@${SERVER_IP} "systemctl status search-proxy.service | head -n 5"
echo

echo "==== Validation Complete ===="
