#!/bin/bash

echo "🚀 DEPLOYING IC PROXY TO PRODUCTION SERVER"
echo "=========================================="

SERVER="root@143.244.133.154"
CONSUMER_ID="umunu-kh777-77774-qaaca-cai"

echo "📝 Updating local server files with correct consumer ID..."

# Update the fixed server file
sed -i "" "s/t3pjp-kqaaa-aaaao-a4ooq-cai/${CONSUMER_ID}/g" services/ic-proxy/server-fixed.js
sed -i "" "s/uzt4z-lp777-77774-qaabq-cai/${CONSUMER_ID}/g" services/ic-proxy/server-fixed.js

echo "🔧 Creating deployment package..."
mkdir -p deployment-temp
cp services/ic-proxy/server-fixed.js deployment-temp/server.js

echo "📤 Uploading to server..."
scp deployment-temp/server.js ${SERVER}:/tmp/new-server.js

echo "🔄 Deploying on server..."
ssh ${SERVER} << 'ENDSSH'
    echo "📋 Backing up current server..."
    cp /var/www/ic-proxy-v2/server.js /var/www/ic-proxy-v2/server.js.backup.$(date +%Y%m%d-%H%M%S)
    
    echo "🔄 Installing new server..."
    cp /tmp/new-server.js /var/www/ic-proxy-v2/server.js
    
    echo "♻️ Restarting IC Proxy..."
    pm2 restart ic-proxy-v2
    
    echo "⏳ Waiting 5 seconds for startup..."
    sleep 5
    
    echo "🩺 Testing health endpoint..."
    curl -s https://ic-proxy.rhinospider.com/api/health | jq '.'
    
    echo ""
    echo "📊 Checking PM2 status..."
    pm2 list | grep ic-proxy-v2
    
    echo ""
    echo "📝 Recent logs..."
    pm2 logs ic-proxy-v2 --lines 10 --nostream
ENDSSH

echo "🧹 Cleaning up..."
rm -rf deployment-temp

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "🌐 Test the endpoints:"
echo "  Health:  curl https://ic-proxy.rhinospider.com/api/health"
echo "  Topics:  curl https://ic-proxy.rhinospider.com/api/topics"
echo ""
echo "📊 Consumer Canister: ${CONSUMER_ID}"
echo "🔗 Admin URL: https://sxsvc-aqaaa-aaaaj-az4ta-cai.icp0.io/"