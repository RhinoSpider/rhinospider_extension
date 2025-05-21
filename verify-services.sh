#!/bin/bash

echo "===== RhinoSpider Service Verification Script ====="
echo "This script verifies that all services are running correctly"

# Check if we can reach the proxy servers via HTTP
echo "===== Testing HTTP connections ====="
echo "Testing IC Proxy (HTTP)..."
curl -s -o /dev/null -w "%{http_code}\n" http://ic-proxy.rhinospider.com || echo "Failed to connect to IC Proxy via HTTP"

echo "Testing Search Proxy (HTTP)..."
curl -s -o /dev/null -w "%{http_code}\n" http://search-proxy.rhinospider.com || echo "Failed to connect to Search Proxy via HTTP"

# Check if we can reach the proxy servers via HTTPS
echo "===== Testing HTTPS connections ====="
echo "Testing IC Proxy (HTTPS)..."
curl -s -o /dev/null -w "%{http_code}\n" https://ic-proxy.rhinospider.com || echo "Failed to connect to IC Proxy via HTTPS"

echo "Testing Search Proxy (HTTPS)..."
curl -s -o /dev/null -w "%{http_code}\n" https://search-proxy.rhinospider.com || echo "Failed to connect to Search Proxy via HTTPS"

# Check CORS headers
echo "===== Testing CORS headers ====="
echo "Testing IC Proxy CORS headers..."
curl -s -I -X OPTIONS -H "Origin: chrome-extension://extension-id" http://ic-proxy.rhinospider.com | grep -i "access-control"

echo "Testing Search Proxy CORS headers..."
curl -s -I -X OPTIONS -H "Origin: chrome-extension://extension-id" http://search-proxy.rhinospider.com | grep -i "access-control"

# Check if local services are running
echo "===== Checking local services ====="
echo "Checking IC Proxy service (port 3001)..."
netstat -tuln | grep 3001 || echo "IC Proxy service is not running"

echo "Checking Search Proxy service (port 3002)..."
netstat -tuln | grep 3002 || echo "Search Proxy service is not running"

echo "===== Verification completed ====="
