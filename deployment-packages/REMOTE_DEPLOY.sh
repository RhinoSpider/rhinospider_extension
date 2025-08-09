#!/bin/bash

# This script runs ON THE SERVER after uploading the tar.gz files
echo "🚀 Starting deployment on server..."

# Check if files exist
if [ ! -f ~/search-proxy-deploy.tar.gz ] || [ ! -f ~/ic-proxy-deploy.tar.gz ]; then
    echo "❌ Error: deployment files not found in home directory"
    echo "Make sure you uploaded both .tar.gz files to the server"
    exit 1
fi

echo ""
echo "📦 Deploying Search Proxy..."
echo "----------------------------"
cd /var/www
tar -xzf ~/search-proxy-deploy.tar.gz
rm -rf search-proxy-backup
mv search-proxy search-proxy-backup 2>/dev/null || true
mv search-proxy-deploy search-proxy
cd search-proxy
echo "Installing dependencies..."
npm install
pm2 restart search-proxy || pm2 start server.js --name search-proxy
echo "✅ Search Proxy deployed"

echo ""
echo "📦 Deploying IC Proxy..."
echo "------------------------"
cd /var/www
tar -xzf ~/ic-proxy-deploy.tar.gz
rm -rf ic-proxy-backup
mv ic-proxy ic-proxy-backup 2>/dev/null || true
mv ic-proxy-deploy ic-proxy
cd ic-proxy
echo "Installing dependencies (with legacy peer deps)..."
npm install --legacy-peer-deps
pm2 restart ic-proxy || pm2 start server.js --name ic-proxy
echo "✅ IC Proxy deployed"

echo ""
echo "💾 Saving PM2 configuration..."
pm2 save

echo ""
echo "📊 Service Status:"
echo "------------------"
pm2 status

echo ""
echo "🧪 Testing endpoints..."
echo "----------------------"
curl -s http://localhost:3002/api/health | grep -q 'ok' && echo "✅ Search Proxy: RUNNING" || echo "❌ Search Proxy: FAILED"
curl -s http://localhost:3001/api/health | grep -q 'ok' && echo "✅ IC Proxy: RUNNING" || echo "❌ IC Proxy: FAILED"

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo ""
echo "Access points:"
echo "- Search Proxy: https://search-proxy.rhinospider.com"
echo "- IC Proxy: https://ic-proxy.rhinospider.com"
echo "- Admin Dashboard: https://sxsvc-aqaaa-aaaaj-az4ta-cai.icp0.io/"
echo ""
