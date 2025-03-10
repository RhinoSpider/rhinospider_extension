#!/bin/bash

# Deploy script for IC Proxy server
# This script deploys the server.js file to the Digital Ocean server

# Define variables
SSH_USER=${1:-root}
SSH_HOST=${2:-143.244.133.154}
REMOTE_DIR="/root/rhinospider-ic-proxy"

echo "=== Deploying IC Proxy Server ==="
echo "SSH User: $SSH_USER"
echo "SSH Host: $SSH_HOST"
echo "Remote Directory: $REMOTE_DIR"

# Copy the server.js file to the server
echo "Copying server.js to the server..."
scp server.js "$SSH_USER@$SSH_HOST:$REMOTE_DIR/"

# Restart the server using PM2
echo "Restarting the server..."
ssh "$SSH_USER@$SSH_HOST" "cd $REMOTE_DIR && pm2 restart server.js"

echo "=== Deployment completed ==="
