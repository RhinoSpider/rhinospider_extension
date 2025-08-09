#!/bin/bash

# Deploy Search Proxy to Digital Ocean Droplet
# Usage: ./deploy-search-proxy.sh

echo "🚀 Deploying Search Proxy to Digital Ocean..."

# Server details
SERVER_IP="143.244.133.154"
SERVER_USER="root"
REMOTE_PATH="/var/www/search-proxy"

# Local path
LOCAL_PATH="./services/search-proxy"

echo "📦 Preparing files for deployment..."

# Create a temporary directory for deployment files
TEMP_DIR=$(mktemp -d)
echo "Using temporary directory: $TEMP_DIR"

# Copy search proxy files to temp directory
cp -r $LOCAL_PATH/* $TEMP_DIR/
cp $LOCAL_PATH/.env.example $TEMP_DIR/.env.example 2>/dev/null || true

# Remove unnecessary files
rm -rf $TEMP_DIR/node_modules
rm -rf $TEMP_DIR/.git
rm -f $TEMP_DIR/.env

echo "📤 Copying files to server..."
# Copy files to server
scp -r $TEMP_DIR/* $SERVER_USER@$SERVER_IP:$REMOTE_PATH/

# Clean up temp directory
rm -rf $TEMP_DIR

echo "🔧 Installing dependencies and restarting service..."
# SSH to server and restart the service
ssh $SERVER_USER@$SERVER_IP << 'EOF'
cd /var/www/search-proxy

# Install dependencies
echo "Installing dependencies..."
npm install

# Check if PM2 is running the search proxy
if pm2 list | grep -q "search-proxy"; then
    echo "Restarting search-proxy with PM2..."
    pm2 restart search-proxy
else
    echo "Starting search-proxy with PM2..."
    pm2 start server.js --name search-proxy
fi

# Save PM2 configuration
pm2 save

# Show status
pm2 status search-proxy

echo "✅ Search proxy deployment complete!"
EOF

echo "🎉 Deployment finished!"
echo "📍 Search proxy should be available at:"
echo "   - https://search-proxy.rhinospider.com"
echo "   - http://$SERVER_IP:3002"