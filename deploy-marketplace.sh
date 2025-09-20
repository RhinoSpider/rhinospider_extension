#!/bin/bash

echo "🚀 Deploying RhinoSpider Marketplace..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
NETWORK="ic-prod"  # Use ic-prod network as mentioned
BUILD_ENV="production"

# Function to check if command succeeded
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1${NC}"
    else
        echo -e "${RED}✗ $1 failed${NC}"
        exit 1
    fi
}

# Step 1: Build the frontend
echo -e "${YELLOW}Building marketplace frontend...${NC}"
cd apps/marketplace
npm install
check_status "npm install"

npm run build
check_status "Frontend build"
cd ../..

# Step 2: Deploy the backend canister
echo -e "${YELLOW}Deploying marketplace backend canister...${NC}"
cd canisters

# Deploy to IC network
dfx deploy marketplace --network $NETWORK
check_status "Marketplace backend deployment"

# Initialize the canister
echo -e "${YELLOW}Initializing marketplace canister...${NC}"
dfx canister --network $NETWORK call marketplace init
check_status "Marketplace initialization"

# Step 3: Deploy the frontend assets
echo -e "${YELLOW}Deploying marketplace frontend assets...${NC}"
dfx deploy marketplace_assets --network $NETWORK
check_status "Frontend assets deployment"

# Step 4: Get canister IDs
echo -e "${GREEN}Deployment complete!${NC}"
echo ""
echo "Canister IDs:"
echo "============="
MARKETPLACE_ID=$(dfx canister --network $NETWORK id marketplace)
ASSETS_ID=$(dfx canister --network $NETWORK id marketplace_assets)

echo "Marketplace Backend: $MARKETPLACE_ID"
echo "Marketplace Frontend: $ASSETS_ID"
echo ""
echo "Access your marketplace at:"
echo "https://$ASSETS_ID.icp0.io"
echo ""

# Save canister IDs to file
echo "{
  \"marketplace\": \"$MARKETPLACE_ID\",
  \"marketplace_assets\": \"$ASSETS_ID\"
}" > marketplace_canister_ids.json

echo -e "${GREEN}Canister IDs saved to marketplace_canister_ids.json${NC}"

# Optional: Add admin if principal provided
if [ ! -z "$1" ]; then
    echo -e "${YELLOW}Adding admin principal: $1${NC}"
    dfx canister --network $NETWORK call marketplace addAdmin "principal \"$1\""
    check_status "Admin addition"
fi

echo -e "${GREEN}✨ Marketplace deployment complete!${NC}"