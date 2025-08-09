#!/bin/bash
echo "🚀 Deploying both services..."

# Deploy Search Proxy
cd /var/www
tar -xzf ~/search-proxy-deploy.tar.gz
rm -rf search-proxy-backup
mv search-proxy search-proxy-backup 2>/dev/null || true
mv search-proxy-deploy search-proxy
cd search-proxy && npm install
pm2 restart search-proxy || pm2 start server.js --name search-proxy

# Deploy IC Proxy
cd /var/www
tar -xzf ~/ic-proxy-deploy.tar.gz
rm -rf ic-proxy-backup
mv ic-proxy ic-proxy-backup 2>/dev/null || true
mv ic-proxy-deploy ic-proxy
cd ic-proxy && npm install --legacy-peer-deps
pm2 restart ic-proxy || pm2 start server.js --name ic-proxy

pm2 save
pm2 status
echo "✅ Deployment complete!"
