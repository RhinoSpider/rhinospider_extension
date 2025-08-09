#!/bin/bash

# Complete deployment script for IC Proxy and Search Proxy
# This single script creates packages and deploys both services

echo "🚀 COMPLETE DEPLOYMENT SCRIPT FOR RHINOSPIDER"
echo "=============================================="
echo ""

# Step 1: Create deployment packages
echo "📦 STEP 1: Creating deployment packages..."
echo "------------------------------------------"

# Clean up old packages
rm -rf deployment-packages
mkdir -p deployment-packages

# Create Search Proxy package
echo "Creating Search Proxy package..."
SEARCH_DIR="deployment-packages/search-proxy-deploy"
mkdir -p $SEARCH_DIR
cp -r services/search-proxy/* $SEARCH_DIR/
cp services/search-proxy/.env.example $SEARCH_DIR/.env.example 2>/dev/null || true
rm -rf $SEARCH_DIR/node_modules $SEARCH_DIR/.git $SEARCH_DIR/.env $SEARCH_DIR/package-lock.json
cd deployment-packages && tar -czf search-proxy-deploy.tar.gz search-proxy-deploy/ && cd ..
echo "✅ Search Proxy package created"

# Create IC Proxy package
echo "Creating IC Proxy package..."
IC_DIR="deployment-packages/ic-proxy-deploy"
mkdir -p $IC_DIR
cp -r services/ic-proxy/* $IC_DIR/
cp services/ic-proxy/.env.example $IC_DIR/.env.example 2>/dev/null || true
rm -rf $IC_DIR/node_modules $IC_DIR/.git $IC_DIR/.env $IC_DIR/package-lock.json
cd deployment-packages && tar -czf ic-proxy-deploy.tar.gz ic-proxy-deploy/ && cd ..
echo "✅ IC Proxy package created"

# Clean up temp directories
rm -rf deployment-packages/search-proxy-deploy
rm -rf deployment-packages/ic-proxy-deploy

echo ""
echo "✅ Packages ready in ./deployment-packages/"
echo ""

# Step 2: Create remote deployment script
echo "📝 STEP 2: Creating remote deployment script..."
echo "----------------------------------------------"

cat > deployment-packages/REMOTE_DEPLOY.sh << 'SCRIPT_END'
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
SCRIPT_END

chmod +x deployment-packages/REMOTE_DEPLOY.sh

echo "✅ Remote deployment script created"
echo ""
echo "=============================================="
echo "📋 DEPLOYMENT INSTRUCTIONS"
echo "=============================================="
echo ""
echo "1️⃣  UPLOAD these 3 files to server (143.244.133.154):"
echo "   - deployment-packages/search-proxy-deploy.tar.gz"
echo "   - deployment-packages/ic-proxy-deploy.tar.gz"
echo "   - deployment-packages/REMOTE_DEPLOY.sh"
echo ""
echo "2️⃣  SSH into server:"
echo "   ssh root@143.244.133.154"
echo ""
echo "3️⃣  RUN ONE COMMAND on server:"
echo "   chmod +x REMOTE_DEPLOY.sh && ./REMOTE_DEPLOY.sh"
echo ""
echo "=============================================="
echo "That's it! One command on the server deploys everything!"
echo ""
echo "🎯 What gets deployed:"
echo "- Search Proxy with new topic structure support"
echo "- IC Proxy with real OpenAI integration"
echo ""