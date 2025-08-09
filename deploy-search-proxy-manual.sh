#!/bin/bash

# Deploy Search Proxy to Digital Ocean by creating a tar file
# This script creates a deployable package that you can manually upload

echo "🚀 Creating Search Proxy deployment package..."

# Create deployment directory
DEPLOY_DIR="search-proxy-deploy"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# Copy search proxy files
echo "📦 Copying search proxy files..."
cp -r services/search-proxy/* $DEPLOY_DIR/
cp services/search-proxy/.env.example $DEPLOY_DIR/.env.example 2>/dev/null || true

# Remove unnecessary files
rm -rf $DEPLOY_DIR/node_modules
rm -rf $DEPLOY_DIR/.git
rm -f $DEPLOY_DIR/.env
rm -f $DEPLOY_DIR/package-lock.json

# Create deployment archive
echo "📦 Creating deployment archive..."
tar -czf search-proxy-deploy.tar.gz $DEPLOY_DIR/

# Clean up
rm -rf $DEPLOY_DIR

echo "✅ Deployment package created: search-proxy-deploy.tar.gz"
echo ""
echo "📋 MANUAL DEPLOYMENT STEPS:"
echo "================================"
echo "1. Upload search-proxy-deploy.tar.gz to the server at 143.244.133.154"
echo "   You can use SCP, FTP, or any file transfer method"
echo ""
echo "2. SSH into the server:"
echo "   ssh root@143.244.133.154"
echo ""
echo "3. Extract and deploy:"
echo "   cd /var/www"
echo "   rm -rf search-proxy-backup"
echo "   mv search-proxy search-proxy-backup 2>/dev/null || true"
echo "   tar -xzf ~/search-proxy-deploy.tar.gz"
echo "   mv search-proxy-deploy search-proxy"
echo "   cd search-proxy"
echo "   npm install"
echo "   pm2 restart search-proxy || pm2 start server.js --name search-proxy"
echo "   pm2 save"
echo ""
echo "4. Verify deployment:"
echo "   curl http://localhost:3002/api/health"
echo "   pm2 status search-proxy"
echo ""
echo "================================"