#!/bin/bash

# Deploy BOTH IC Proxy and Search Proxy to Digital Ocean
# This script creates deployment packages and provides instructions for both services

echo "🚀 Creating deployment packages for IC Proxy and Search Proxy..."
echo "=================================================="

# Create deployment directory
rm -rf deployment-packages
mkdir -p deployment-packages

# ========== SEARCH PROXY ==========
echo ""
echo "📦 [1/2] Creating Search Proxy package..."
SEARCH_DEPLOY_DIR="deployment-packages/search-proxy-deploy"
mkdir -p $SEARCH_DEPLOY_DIR

# Copy search proxy files
cp -r services/search-proxy/* $SEARCH_DEPLOY_DIR/
cp services/search-proxy/.env.example $SEARCH_DEPLOY_DIR/.env.example 2>/dev/null || true

# Clean up search proxy
rm -rf $SEARCH_DEPLOY_DIR/node_modules
rm -rf $SEARCH_DEPLOY_DIR/.git
rm -f $SEARCH_DEPLOY_DIR/.env
rm -f $SEARCH_DEPLOY_DIR/package-lock.json

# Create search proxy archive
cd deployment-packages
tar -czf search-proxy-deploy.tar.gz search-proxy-deploy/
cd ..
echo "✅ Search Proxy package created: deployment-packages/search-proxy-deploy.tar.gz"

# ========== IC PROXY ==========
echo ""
echo "📦 [2/2] Creating IC Proxy package..."
IC_DEPLOY_DIR="deployment-packages/ic-proxy-deploy"
mkdir -p $IC_DEPLOY_DIR

# Copy IC proxy files
cp -r services/ic-proxy/* $IC_DEPLOY_DIR/
cp services/ic-proxy/.env.example $IC_DEPLOY_DIR/.env.example 2>/dev/null || true

# Clean up IC proxy
rm -rf $IC_DEPLOY_DIR/node_modules
rm -rf $IC_DEPLOY_DIR/.git
rm -f $IC_DEPLOY_DIR/.env
rm -f $IC_DEPLOY_DIR/package-lock.json

# Create IC proxy archive
cd deployment-packages
tar -czf ic-proxy-deploy.tar.gz ic-proxy-deploy/
cd ..
echo "✅ IC Proxy package created: deployment-packages/ic-proxy-deploy.tar.gz"

# Clean up temporary directories
rm -rf deployment-packages/search-proxy-deploy
rm -rf deployment-packages/ic-proxy-deploy

echo ""
echo "=================================================="
echo "✅ BOTH PACKAGES READY FOR DEPLOYMENT!"
echo "=================================================="
echo ""
echo "📋 Files created in ./deployment-packages/:"
echo "   - search-proxy-deploy.tar.gz (Search Proxy with new topic structure)"
echo "   - ic-proxy-deploy.tar.gz (IC Proxy with OpenAI integration)"
echo ""
echo "=================================================="
echo "📋 DEPLOYMENT INSTRUCTIONS FOR 143.244.133.154"
echo "=================================================="
echo ""
echo "1️⃣  UPLOAD BOTH FILES to the server:"
echo "    Upload ./deployment-packages/*.tar.gz to root home directory"
echo ""
echo "2️⃣  SSH INTO THE SERVER:"
echo "    ssh root@143.244.133.154"
echo ""
echo "3️⃣  RUN THIS DEPLOYMENT SCRIPT ON THE SERVER:"
echo ""
echo "cat > deploy.sh << 'EOF'"
echo "#!/bin/bash"
echo ""
echo "echo '🚀 Deploying IC Proxy and Search Proxy...'"
echo ""
echo "# Deploy Search Proxy"
echo "echo '📦 [1/2] Deploying Search Proxy...'"
echo "cd /var/www"
echo "tar -xzf ~/search-proxy-deploy.tar.gz"
echo "rm -rf search-proxy-backup"
echo "mv search-proxy search-proxy-backup 2>/dev/null || true"
echo "mv search-proxy-deploy search-proxy"
echo "cd search-proxy"
echo "npm install"
echo "pm2 restart search-proxy || pm2 start server.js --name search-proxy"
echo "echo '✅ Search Proxy deployed'"
echo ""
echo "# Deploy IC Proxy"
echo "echo '📦 [2/2] Deploying IC Proxy...'"
echo "cd /var/www"
echo "tar -xzf ~/ic-proxy-deploy.tar.gz"
echo "rm -rf ic-proxy-backup"
echo "mv ic-proxy ic-proxy-backup 2>/dev/null || true"
echo "mv ic-proxy-deploy ic-proxy"
echo "cd ic-proxy"
echo "npm install --legacy-peer-deps"
echo "pm2 restart ic-proxy || pm2 start server.js --name ic-proxy"
echo "echo '✅ IC Proxy deployed'"
echo ""
echo "# Save PM2 configuration"
echo "pm2 save"
echo ""
echo "# Show status"
echo "echo ''"
echo "echo '================================================'"
echo "echo '✅ DEPLOYMENT COMPLETE!'"
echo "echo '================================================'"
echo "pm2 status"
echo ""
echo "# Test endpoints"
echo "echo ''"
echo "echo 'Testing Search Proxy:'"
echo "curl -s http://localhost:3002/api/health | grep -q 'ok' && echo '✅ Search Proxy is running' || echo '❌ Search Proxy failed'"
echo ""
echo "echo 'Testing IC Proxy:'"
echo "curl -s http://localhost:3001/api/health | grep -q 'ok' && echo '✅ IC Proxy is running' || echo '❌ IC Proxy failed'"
echo ""
echo "EOF"
echo ""
echo "chmod +x deploy.sh"
echo "./deploy.sh"
echo ""
echo "=================================================="
echo "🎯 WHAT'S NEW IN THESE DEPLOYMENTS:"
echo "=================================================="
echo ""
echo "SEARCH PROXY Updates:"
echo "  ✅ Supports new topic structure with searchQueries[]"
echo "  ✅ Filters URLs by preferredDomains and excludeDomains"
echo "  ✅ Processes multiple search queries per topic"
echo ""
echo "IC PROXY Updates:"
echo "  ✅ Real OpenAI integration (not mock!)"
echo "  ✅ New endpoint: /api/process-with-ai"
echo "  ✅ Uses GPT-3.5-turbo for cost efficiency"
echo "  ✅ Processes: summarization, keywords, categorization, sentiment"
echo ""
echo "=================================================="
echo "🔍 VERIFY AFTER DEPLOYMENT:"
echo "=================================================="
echo ""
echo "1. Check services: https://search-proxy.rhinospider.com/api/health"
echo "2. Check services: https://ic-proxy.rhinospider.com/api/health"
echo "3. Test topic creation at: https://sxsvc-aqaaa-aaaaj-az4ta-cai.icp0.io/"
echo ""