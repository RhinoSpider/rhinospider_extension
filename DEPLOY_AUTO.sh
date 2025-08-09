#!/bin/bash

# Automatic deployment with password
# Run this single script to do EVERYTHING

echo "🚀 AUTOMATIC DEPLOYMENT SCRIPT"
echo "=============================="
echo ""

# Check if sshpass is installed
if ! command -v sshpass &> /dev/null; then
    echo "⚠️  sshpass not installed. Install with: brew install hudochenkov/sshpass/sshpass"
    echo "   Or upload files manually and run REMOTE_DEPLOY.sh on server"
    exit 1
fi

# Server details
SERVER="143.244.133.154"
PASSWORD="DON'T BELIEVE EVERYTHING YOU THINK, EXPANDED EDITION"

# Step 1: Create packages
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
echo ""

# Step 2: Create deployment script
cat > deployment-packages/deploy.sh << 'EOF'
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
EOF

# Step 3: Upload files
echo "📤 Uploading files to server..."
sshpass -p "$PASSWORD" scp deployment-packages/*.tar.gz deployment-packages/deploy.sh root@$SERVER:~/

# Step 4: Execute deployment
echo "🚀 Running deployment on server..."
sshpass -p "$PASSWORD" ssh root@$SERVER "chmod +x deploy.sh && ./deploy.sh"

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "Services available at:"
echo "- https://search-proxy.rhinospider.com"
echo "- https://ic-proxy.rhinospider.com"