#!/bin/bash
# Deploy Direct Storage Server
# This script deploys the standalone direct storage server without modifying the existing proxy server

# Define variables
SSH_USER=${1:-root}
SSH_HOST=${2:-143.244.133.154}
REMOTE_DIR="/root/rhinospider-ic-proxy"

echo "=== Deploying Direct Storage Server ==="
echo "SSH User: $SSH_USER"
echo "SSH Host: $SSH_HOST"
echo "Remote Directory: $REMOTE_DIR"

# Copy the direct storage server to the server
echo "Copying direct storage server to the server..."
scp direct-storage-server.js "$SSH_USER@$SSH_HOST:$REMOTE_DIR/"

# Create the PM2 configuration file
echo "Creating PM2 configuration file..."
cat > direct-storage-ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'direct-storage-server',
      script: 'direct-storage-server.js',
      env: {
        NODE_ENV: 'production',
        DIRECT_PORT: 3002,
        PROXY_HOST: 'localhost',
        PROXY_PORT: 3001,
        API_PASSWORD: 'ffGpA2saNS47qr'
      }
    }
  ]
};
EOF

# Copy the PM2 configuration file to the server
echo "Copying PM2 configuration file to the server..."
scp direct-storage-ecosystem.config.js "$SSH_USER@$SSH_HOST:$REMOTE_DIR/"

# Start the direct storage server on the remote server
echo "Starting the direct storage server..."
ssh "$SSH_USER@$SSH_HOST" << 'ENDSSH'
cd ~/rhinospider-ic-proxy

# Install any missing dependencies
npm install express node-fetch

# Start the direct storage server with PM2
pm2 start direct-storage-ecosystem.config.js

# Check the status of the server
pm2 status
ENDSSH

echo "=== Deployment completed ==="
echo "Direct Storage Server has been deployed and is running on port 3002."
echo ""
echo "To test the endpoints, run:"
echo "curl -X POST -H \"Authorization: Bearer ffGpA2saNS47qr\" -H \"Content-Type: application/json\" -d '{\"url\":\"https://example.com\",\"content\":\"Test content\",\"topicId\":\"test-topic\"}' http://$SSH_HOST:3002/api/direct-submit"
echo ""
echo "curl -H \"Authorization: Bearer ffGpA2saNS47qr\" http://$SSH_HOST:3002/api/fetch-data?url=https://example.com"
echo ""
echo "The direct storage server is now ready to use with your extension."
