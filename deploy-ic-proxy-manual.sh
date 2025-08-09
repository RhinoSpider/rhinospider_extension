#!/bin/bash

# Deploy IC Proxy to Digital Ocean by creating a tar file
# This script creates a deployable package that you can manually upload

echo "🚀 Creating IC Proxy deployment package..."

# Create deployment directory
DEPLOY_DIR="ic-proxy-deploy"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# Copy IC proxy files
echo "📦 Copying IC proxy files..."
cp -r services/ic-proxy/* $DEPLOY_DIR/
cp services/ic-proxy/.env.example $DEPLOY_DIR/.env.example 2>/dev/null || true

# Remove unnecessary files
rm -rf $DEPLOY_DIR/node_modules
rm -rf $DEPLOY_DIR/.git
rm -f $DEPLOY_DIR/.env
rm -f $DEPLOY_DIR/package-lock.json

# Create deployment archive
echo "📦 Creating deployment archive..."
tar -czf ic-proxy-deploy.tar.gz $DEPLOY_DIR/

# Clean up
rm -rf $DEPLOY_DIR

echo "✅ Deployment package created: ic-proxy-deploy.tar.gz"
echo ""
echo "📋 MANUAL DEPLOYMENT STEPS:"
echo "================================"
echo "1. Upload ic-proxy-deploy.tar.gz to the server at 143.244.133.154"
echo "   You can use SCP, FTP, or any file transfer method"
echo ""
echo "2. SSH into the server:"
echo "   ssh root@143.244.133.154"
echo ""
echo "3. Extract and deploy:"
echo "   cd /var/www"
echo "   rm -rf ic-proxy-backup"
echo "   mv ic-proxy ic-proxy-backup 2>/dev/null || true"
echo "   tar -xzf ~/ic-proxy-deploy.tar.gz"
echo "   mv ic-proxy-deploy ic-proxy"
echo "   cd ic-proxy"
echo "   npm install --legacy-peer-deps"
echo "   pm2 restart ic-proxy || pm2 start server.js --name ic-proxy"
echo "   pm2 save"
echo ""
echo "4. Verify deployment:"
echo "   curl http://localhost:3001/api/health"
echo "   pm2 status ic-proxy"
echo ""
echo "================================"
echo ""
echo "⚠️  IMPORTANT: IC Proxy now includes OpenAI integration!"
echo "   - AI processing endpoint: /api/process-with-ai"
echo "   - Requires OpenAI API key from admin dashboard"
echo "   - Uses gpt-3.5-turbo for cost efficiency"