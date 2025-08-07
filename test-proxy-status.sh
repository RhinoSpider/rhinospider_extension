#!/bin/bash

# Test current proxy status
echo "🔍 Testing RhinoSpider Proxy Status"
echo "==================================="
echo ""

# Test IC Proxy
echo "Testing ic-proxy.rhinospider.com..."
echo "-----------------------------------"
echo "HTTPS Health Check:"
curl -s -w "\nStatus: %{http_code}\n" https://ic-proxy.rhinospider.com/api/health || echo "Failed"
echo ""
echo "HTTPS Topics Endpoint:"
curl -s -w "\nStatus: %{http_code}\n" https://ic-proxy.rhinospider.com/api/topics | head -20 || echo "Failed"

echo ""
echo ""

# Test Search Proxy
echo "Testing search-proxy.rhinospider.com..."
echo "--------------------------------------"
echo "HTTPS Health Check:"
curl -s -w "\nStatus: %{http_code}\n" https://search-proxy.rhinospider.com/api/health || echo "Failed"

echo ""
echo ""

# Test direct IP
echo "Testing direct IP access (143.244.133.154)..."
echo "-------------------------------------------"
echo "Port 3001 (IC Proxy):"
curl -s -w "\nStatus: %{http_code}\n" http://143.244.133.154:3001/api/health || echo "No response"
echo ""
echo "Port 3002 (Search Proxy):"
curl -s -w "\nStatus: %{http_code}\n" http://143.244.133.154:3002/api/health || echo "No response"