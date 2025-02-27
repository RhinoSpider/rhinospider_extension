#!/bin/bash

# Deploy IC Proxy to Digital Ocean
# This script assumes you have SSH access to your Digital Ocean droplet

# Set variables
DO_IP="143.244.133.154"
DO_USER="root"
DO_PASSWORD="ffGpA2saNS47qr"
REMOTE_DIR="/root/ic-proxy"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Deploying IC Proxy to Digital Ocean...${NC}"

# Step 1: Create a deployment package
echo -e "${GREEN}Creating deployment package...${NC}"
tar -czf ic-proxy.tar.gz \
    package.json \
    server.js \
    Dockerfile \
    docker-compose.yml \
    README.md

# Step 2: Copy the package to the server
echo -e "${GREEN}Copying package to server...${NC}"
scp ic-proxy.tar.gz $DO_USER@$DO_IP:$REMOTE_DIR/

# Step 3: SSH into the server and deploy
echo -e "${GREEN}Deploying on the server...${NC}"
ssh $DO_USER@$DO_IP << EOF
  cd $REMOTE_DIR
  tar -xzf ic-proxy.tar.gz
  docker-compose down
  docker-compose build --no-cache
  docker-compose up -d
  rm ic-proxy.tar.gz
  echo "Deployment completed"
EOF

# Step 4: Clean up local files
echo -e "${GREEN}Cleaning up...${NC}"
rm ic-proxy.tar.gz

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}Your proxy server is now running at http://$DO_IP:3001${NC}"
