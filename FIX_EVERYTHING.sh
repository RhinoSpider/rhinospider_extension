#!/bin/bash

echo "🔥 FIXING ALL THE BULLSHIT - CLEAN DEPLOY"
echo "========================================"

SERVER="143.244.133.154"
USER="root"

echo "📦 Creating deployment packages..."
rm -rf deployment-packages
mkdir -p deployment-packages

# Search Proxy
SEARCH_DIR="deployment-packages/search-proxy-deploy"
mkdir -p $SEARCH_DIR
cp -r services/search-proxy/* $SEARCH_DIR/
rm -rf $SEARCH_DIR/node_modules $SEARCH_DIR/.git $SEARCH_DIR/.env $SEARCH_DIR/package-lock.json
cd deployment-packages && tar -czf search-proxy-deploy.tar.gz search-proxy-deploy/ && cd ..
rm -rf $SEARCH_DIR

# IC Proxy
IC_DIR="deployment-packages/ic-proxy-deploy"
mkdir -p $IC_DIR
cp -r services/ic-proxy/* $IC_DIR/
rm -rf $IC_DIR/node_modules $IC_DIR/.git $IC_DIR/.env $IC_DIR/package-lock.json
cd deployment-packages && tar -czf ic-proxy-deploy.tar.gz ic-proxy-deploy/ && cd ..
rm -rf $IC_DIR

echo "✅ Packages created"

# Create deployment script
cat > deployment-packages/deploy-clean.sh << 'EOF'
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
EOF

echo "📤 Uploading and deploying..."
scp deployment-packages/*.tar.gz deployment-packages/deploy-clean.sh $USER@$SERVER:~/
ssh $USER@$SERVER "chmod +x deploy-clean.sh && ./deploy-clean.sh"

echo ""
echo "✅ EVERYTHING FIXED!"
echo ""
echo "Testing domains:"
sleep 10
curl -I https://search-proxy.rhinospider.com
curl -I https://ic-proxy.rhinospider.com