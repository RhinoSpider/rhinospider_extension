#!/bin/bash
# Deploy Consumer Endpoints Update
# This script deploys only the direct-storage-endpoint.js file with consumer canister support

# Define variables
SSH_USER=${1:-root}
SSH_HOST=${2:-143.244.133.154}
REMOTE_DIR="/root/rhinospider-ic-proxy"

echo "=== Deploying Consumer Endpoints Update ==="
echo "SSH User: $SSH_USER"
echo "SSH Host: $SSH_HOST"
echo "Remote Directory: $REMOTE_DIR"

# Create a backup of the current direct-storage-endpoint.js on the server
echo "Creating backup of current direct-storage-endpoint.js..."
ssh "$SSH_USER@$SSH_HOST" "cd $REMOTE_DIR && cp direct-storage-endpoint.js direct-storage-endpoint.js.backup"

# Copy the updated direct-storage-endpoint.js to the server
echo "Copying updated direct-storage-endpoint.js to the server..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
scp "$SCRIPT_DIR/direct-storage-endpoint.js" "$SSH_USER@$SSH_HOST:$REMOTE_DIR/"

# Restart the IC proxy service
echo "Restarting the IC proxy service..."
ssh "$SSH_USER@$SSH_HOST" "cd $REMOTE_DIR && pm2 restart ic-proxy"

echo "=== Deployment Complete ==="
echo "The consumer endpoints have been deployed and the service has been restarted."
echo "If you encounter any issues, you can restore the backup with:"
echo "ssh $SSH_USER@$SSH_HOST \"cd $REMOTE_DIR && cp direct-storage-endpoint.js.backup direct-storage-endpoint.js && pm2 restart ic-proxy\""
