#!/bin/bash

# Cleanup script for Digital Ocean deployment
# This script will stop and remove the current deployment

# Set variables
DO_IP="143.244.133.154"
DO_USER="root"
REMOTE_DIR="/root/ic-proxy"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Cleaning up IC Proxy deployment on Digital Ocean...${NC}"

# SSH into the server and stop/remove containers
echo -e "${GREEN}Stopping and removing Docker containers...${NC}"
ssh $DO_USER@$DO_IP << EOF
  cd $REMOTE_DIR
  docker-compose down
  docker system prune -f
  echo "Containers stopped and removed"
EOF

echo -e "${GREEN}Cleanup completed successfully!${NC}"
echo -e "${GREEN}The proxy server has been stopped on $DO_IP${NC}"
