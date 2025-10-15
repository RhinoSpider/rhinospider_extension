#!/bin/bash

echo "Deploying IC Proxy to Digital Ocean..."

# Server details
SERVER_IP="167.99.185.59"
SERVER_USER="root"
SERVER_PATH="/var/www/ic-proxy"

echo "Copying server-fixed.js to server..."
# Try with SSH key first, if fails, prompt for password
scp -o StrictHostKeyChecking=no \
    /Users/ayanuali/development/rhinospider/services/ic-proxy/server-fixed.js \
    ${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/server.js 2>/dev/null

if [ $? -ne 0 ]; then
    echo "SSH key auth failed. Please use password: ffGpA2saNS47qr"
    scp -o StrictHostKeyChecking=no \
        /Users/ayanuali/development/rhinospider/services/ic-proxy/server-fixed.js \
        ${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/server.js
fi

echo "Restarting IC proxy service..."
ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "cd ${SERVER_PATH} && pm2 restart ic-proxy" 2>/dev/null

if [ $? -ne 0 ]; then
    echo "SSH key auth failed. Please use password: ffGpA2saNS47qr"
    ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "cd ${SERVER_PATH} && pm2 restart ic-proxy"
fi

echo "Deployment complete!"
echo ""
echo "Test the new endpoint:"
echo "curl https://ic-proxy.rhinospider.com/api/rhinoscan-stats"