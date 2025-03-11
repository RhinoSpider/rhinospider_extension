#!/bin/bash

# Configuration
SSH_USER="root"
SSH_HOST="143.244.133.154"

echo "=== Cleaning up Direct Storage Server ==="
echo "SSH User: $SSH_USER"
echo "SSH Host: $SSH_HOST"

# Stop and remove the direct storage server
echo "Stopping and removing direct storage server..."
ssh "$SSH_USER@$SSH_HOST" "pm2 delete direct-storage-server || true"

# Check the status of PM2 services
echo "Current PM2 services:"
ssh "$SSH_USER@$SSH_HOST" "pm2 list"

echo "=== Cleanup completed ==="
