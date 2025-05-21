#!/bin/bash

echo "===== RhinoSpider Connection Test Script ====="
echo "This script tests connections to all endpoints"

# Test local endpoints
echo "===== Testing local endpoints ====="
echo "Testing IC Proxy (local port 3001)..."
curl -v http://localhost:3001

echo "Testing Search Proxy (local port 3002)..."
curl -v http://localhost:3002

# Test domain HTTP endpoints
echo "===== Testing HTTP endpoints ====="
echo "Testing IC Proxy (HTTP)..."
curl -v http://ic-proxy.rhinospider.com

echo "Testing Search Proxy (HTTP)..."
curl -v http://search-proxy.rhinospider.com

# Test domain HTTPS endpoints
echo "===== Testing HTTPS endpoints ====="
echo "Testing IC Proxy (HTTPS)..."
curl -v https://ic-proxy.rhinospider.com

echo "Testing Search Proxy (HTTPS)..."
curl -v https://search-proxy.rhinospider.com

# Test with specific headers that the extension would use
echo "===== Testing with extension headers ====="
echo "Testing IC Proxy with device-id header..."
curl -v -H "x-device-id: test-device" https://ic-proxy.rhinospider.com

echo "Testing Search Proxy with device-id header..."
curl -v -H "x-device-id: test-device" https://search-proxy.rhinospider.com

echo "===== Connection tests completed ====="
