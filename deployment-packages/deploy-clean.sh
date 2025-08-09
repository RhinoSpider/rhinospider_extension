#!/bin/bash
echo "🔥 CLEAN DEPLOYMENT - REMOVING ALL OLD SHIT"

# KILL ALL PROCESSES
echo "Stopping ALL processes..."
pm2 stop all
pm2 delete all

echo "Cleaning up directories..."
cd /var/www
rm -rf search-proxy* ic-proxy*

echo "Deploying NEW code as v2..."

# Deploy Search Proxy as v2
tar -xzf ~/search-proxy-deploy.tar.gz
mv search-proxy-deploy search-proxy-v2
cd search-proxy-v2 && npm install
pm2 start server.js --name search-proxy-v2

# Deploy IC Proxy as v2
cd /var/www
tar -xzf ~/ic-proxy-deploy.tar.gz
mv ic-proxy-deploy ic-proxy-v2
cd ic-proxy-v2 && npm install --legacy-peer-deps
pm2 start server.js --name ic-proxy-v2

pm2 save

echo "✅ DEPLOYMENT COMPLETE - CHECKING STATUS"
pm2 status

echo "🌐 TESTING DOMAINS..."
sleep 5
curl -I https://search-proxy.rhinospider.com || echo "❌ Search proxy not responding"
curl -I https://ic-proxy.rhinospider.com || echo "❌ IC proxy not responding"

echo "✅ ALL DONE!"
