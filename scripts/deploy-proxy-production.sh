#!/bin/bash

# Deploy proxy server geo-filtering fix to production
# This script needs to be run with proper SSH access to 143.244.133.154

REMOTE_HOST="143.244.133.154"
REMOTE_USER="root"
LOCAL_FILE="/Users/ayanuali/development/rhinospider/services/ic-proxy/server-fixed.js"

echo "=== RhinoSpider Proxy Production Deployment ==="
echo "This will deploy the geo-filtering fix to production"
echo ""
echo "Changes being deployed:"
echo "1. Server-side geo-filtering based on user IP"
echo "2. KZ users get only ai_agents_1 topic"
echo "3. US users get depin_infra_1 and geo_test_1 topics"
echo "4. Removes duplicate client-side filtering"
echo ""

# Check if we can connect
echo "Testing connection to $REMOTE_HOST..."
ssh -o ConnectTimeout=5 $REMOTE_USER@$REMOTE_HOST "echo 'Connection successful'" || {
    echo "ERROR: Cannot connect to production server"
    echo "Please ensure you have SSH access to $REMOTE_HOST"
    exit 1
}

# Backup current version
echo "Creating backup of current proxy..."
ssh $REMOTE_USER@$REMOTE_HOST "cp /root/ic-proxy/server.js /root/ic-proxy/server.js.backup.$(date +%Y%m%d_%H%M%S)"

# Copy new version
echo "Deploying new proxy code..."
scp $LOCAL_FILE $REMOTE_USER@$REMOTE_HOST:/root/ic-proxy/server.js

# Restart the service
echo "Restarting proxy service..."
ssh $REMOTE_USER@$REMOTE_HOST "cd /root/ic-proxy && pm2 restart ic-proxy"

# Verify it's running
echo "Verifying deployment..."
sleep 3
ssh $REMOTE_USER@$REMOTE_HOST "pm2 status ic-proxy"

# Test the endpoint
echo ""
echo "Testing geo-filtering..."
echo "Testing with KZ IP (should return 1 topic):"
curl -s -X POST https://ic-proxy.rhinospider.com/api/consumer-topics \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 93.190.242.254" \
  -d '{"principalId":"test"}' | python3 -c "import sys, json; d=json.load(sys.stdin); print(f'KZ user gets {len(d)} topics')"

echo "Testing with US IP (should return 2 topics):"
curl -s -X POST https://ic-proxy.rhinospider.com/api/consumer-topics \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 8.8.8.8" \
  -d '{"principalId":"test"}' | python3 -c "import sys, json; d=json.load(sys.stdin); print(f'US user gets {len(d)} topics')"

echo ""
echo "=== Deployment Complete ==="
echo "Please verify:"
echo "1. KZ users can now scrape (ai_agents_1 topic)"
echo "2. US users get correct topics (depin_infra_1, geo_test_1)"
echo "3. Admin panel shows country and points split"