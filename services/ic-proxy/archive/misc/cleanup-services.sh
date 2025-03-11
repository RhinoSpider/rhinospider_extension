#!/bin/bash
# Cleanup script to remove redundant services
# This script will stop and remove all direct storage related services except the main one

# Define variables
SSH_USER=${1:-root}
SSH_HOST=${2:-143.244.133.154}

echo "=== Cleaning up redundant services ==="
echo "SSH User: $SSH_USER"
echo "SSH Host: $SSH_HOST"

# Connect to the server and clean up
ssh "$SSH_USER@$SSH_HOST" << 'ENDSSH'
# Stop and remove the direct-endpoint service
pm2 stop direct-endpoint
pm2 delete direct-endpoint

# Keep only one direct storage service - the most recent one
pm2 stop direct-storage-server
pm2 delete direct-storage-server

# Check the status after cleanup
pm2 status

echo "=== Cleanup completed ==="
ENDSSH

echo "Redundant services have been removed."
echo "Only the main ic-proxy service should remain running."
