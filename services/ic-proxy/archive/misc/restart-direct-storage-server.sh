#!/bin/bash
# Restart Direct Storage Server
# This script restarts the direct storage server to fix port conflicts

# Define variables
SSH_USER=${1:-root}
SSH_HOST=${2:-143.244.133.154}
REMOTE_DIR="/root/rhinospider-ic-proxy"

echo "=== Restarting Direct Storage Server ==="
echo "SSH User: $SSH_USER"
echo "SSH Host: $SSH_HOST"
echo "Remote Directory: $REMOTE_DIR"

# SSH into the server and restart the direct storage server
ssh "$SSH_USER@$SSH_HOST" << 'ENDSSH'
cd ~/rhinospider-ic-proxy

# Find and kill any processes using port 3002
echo "Finding processes using port 3002..."
lsof -i:3002 | awk 'NR>1 {print $2}' | xargs -r kill -9

# Stop the direct storage server if it's running
echo "Stopping direct storage server..."
pm2 stop direct-storage-server || true

# Start the direct storage server with PM2
echo "Starting direct storage server..."
pm2 start direct-storage-ecosystem.config.js

# Check the status
echo "Checking status..."
pm2 status direct-storage-server

# Show the logs
echo "Recent logs:"
pm2 logs direct-storage-server --lines 10 --nostream
ENDSSH

echo "=== Direct Storage Server Restart Complete ==="
