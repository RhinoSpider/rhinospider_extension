#!/bin/bash

# Default SSH settings
SSH_USER=${1:-root}
SSH_HOST=${2:-143.244.133.154}
REMOTE_DIR="/root/rhinospider-ic-proxy"

echo "=== Deploying Consumer Integration Update ==="
echo "SSH User: $SSH_USER"
echo "SSH Host: $SSH_HOST"
echo "Remote Directory: $REMOTE_DIR"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Create backup of current server.js and integration files
echo "Creating backup of current server files..."
ssh "$SSH_USER@$SSH_HOST" "cd $REMOTE_DIR && cp server.js server.js.backup"

# Copy the updated files to the server
echo "Copying updated server.js to the server..."
scp "$SCRIPT_DIR/server.js" "$SSH_USER@$SSH_HOST:$REMOTE_DIR/"

echo "Copying new integrate-consumer-endpoints.js to the server..."
scp "$SCRIPT_DIR/integrate-consumer-endpoints.js" "$SSH_USER@$SSH_HOST:$REMOTE_DIR/"

# Restart the IC proxy service
echo "Restarting the IC proxy service..."
ssh "$SSH_USER@$SSH_HOST" "cd $REMOTE_DIR && pm2 restart ic-proxy"

echo "=== Deployment Complete ==="
echo "The consumer integration has been deployed and the service has been restarted."
echo "If you encounter any issues, you can restore the backup with:"
echo "ssh $SSH_USER@$SSH_HOST \"cd $REMOTE_DIR && cp server.js.backup server.js && pm2 restart ic-proxy\""
