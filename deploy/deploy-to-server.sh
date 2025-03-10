#!/bin/bash

# Deployment script for RhinoSpider Search Proxy Service
# This script deploys the search proxy service to a remote server via SSH

# Server details
SERVER_USER="root"
SERVER_HOST="143.244.133.154"
SERVER_PORT="22"
DEPLOY_PATH="/opt/rhinospider/search-proxy"

echo "=== RhinoSpider Search Proxy Deployment ==="
echo "This script will deploy the search proxy service to your server."
echo "You will be prompted for your SSH password during the process."

# 1. Create the deployment directory on the server if it doesn't exist
echo "Creating deployment directory on server..."
ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "mkdir -p $DEPLOY_PATH"

# 2. Copy the packaged service to the server
echo "Copying search proxy service to server..."
scp -P $SERVER_PORT /Users/ayanuali/development/rhinospider/deploy/search-proxy.tar.gz $SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/

# 3. SSH into the server and set up the service
echo "Setting up the service on the server..."
ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST << EOF
  # Navigate to the deployment directory
  cd $DEPLOY_PATH

  # Extract the package
  tar -xzf search-proxy.tar.gz

  # Install dependencies
  npm ci --production

  # Create a systemd service file for auto-start and management
  sudo tee /etc/systemd/system/rhinospider-search-proxy.service > /dev/null << SERVICEEOF
[Unit]
Description=RhinoSpider Search Proxy Service
After=network.target

[Service]
Type=simple
User=nobody
WorkingDirectory=$DEPLOY_PATH
ExecStart=/usr/bin/node $DEPLOY_PATH/server.js
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=3003

[Install]
WantedBy=multi-user.target
SERVICEEOF

  # Reload systemd, enable and start the service
  sudo systemctl daemon-reload
  sudo systemctl enable rhinospider-search-proxy
  sudo systemctl start rhinospider-search-proxy

  # Check the service status
  sudo systemctl status rhinospider-search-proxy
EOF

echo "=== Deployment completed ==="
echo "The search proxy service has been deployed to your server."
echo "To check the service status, SSH into your server and run:"
echo "  sudo systemctl status rhinospider-search-proxy"
echo ""
echo "To view logs, run:"
echo "  sudo journalctl -u rhinospider-search-proxy -f"
