#!/bin/bash

echo "Deploying Search Proxy Server to Digital Ocean..."

# Server details
SERVER="search-proxy.rhinospider.com"
USER="root"
REMOTE_DIR="/root/services/search-proxy"

echo "Connecting to $SERVER..."

# Run deployment commands on the server
ssh -o StrictHostKeyChecking=no $USER@$SERVER << 'EOF'
    echo "Pulling latest code..."
    cd /root/services/search-proxy
    git pull origin main || { echo "Git pull failed"; exit 1; }
    
    echo "Installing dependencies..."
    npm install --production
    
    echo "Restarting search-proxy service..."
    pm2 restart search-proxy || pm2 start server.js --name search-proxy
    
    echo "Checking service status..."
    pm2 status search-proxy
    
    echo "Search proxy deployed successfully!"
EOF

echo "Testing search proxy endpoints..."
sleep 3

# Test health endpoint
echo "Testing health endpoint..."
curl -s https://search-proxy.rhinospider.com/api/health | jq '.'

# Test fetch-data endpoint  
echo "Testing fetch-data endpoint..."
curl -s "https://search-proxy.rhinospider.com/api/fetch-data?url=https://example.com" | head -5

echo "Deployment complete!"