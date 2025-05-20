#!/bin/bash

# Script to create a new admin UI canister and deploy the admin app
# This approach creates a fresh canister instead of trying to fix the old one

echo "CREATING NEW ADMIN UI CANISTER AND DEPLOYING APP"
echo "=============================================="

# Set environment variables
export DFX_NETWORK="ic"
export ADMIN_BACKEND_CANISTER_ID="444wf-gyaaa-aaaaj-az5sq-cai"

echo "Using network: $DFX_NETWORK"
echo "Admin backend canister ID: $ADMIN_BACKEND_CANISTER_ID"

# IMPORTANT: Switch to the ic-prod identity
dfx identity use ic-prod
PRINCIPAL=$(dfx identity get-principal)
echo "Using identity: ic-prod"
echo "Principal: $PRINCIPAL"

# Make sure the dist directory exists
if [ ! -d "dist" ]; then
  echo "Error: dist directory not found. Please run 'npm run build' first."
  exit 1
fi

# Step 1: Create a temporary dfx.json file for creating a new canister
cat > dfx.json.temp << EOL
{
  "canisters": {
    "new_admin_ui": {
      "type": "assets",
      "source": ["dist/"]
    }
  },
  "defaults": {
    "build": {
      "args": "",
      "packtool": ""
    }
  },
  "networks": {
    "ic": {
      "providers": ["https://ic0.app"],
      "type": "persistent"
    }
  },
  "version": 1
}
EOL

# Backup the original dfx.json
cp dfx.json dfx.json.bak

# Use the temporary dfx.json
cp dfx.json.temp dfx.json

# Step 2: Create a new canister
echo "Creating a new admin UI canister..."
dfx canister --network $DFX_NETWORK create new_admin_ui --with-cycles 1000000000000
NEW_CANISTER_ID=$(dfx canister --network $DFX_NETWORK id new_admin_ui)
echo "New admin UI canister ID: $NEW_CANISTER_ID"

# Step 3: Deploy the UI assets to the new canister
echo "Deploying UI assets to the new canister..."
dfx deploy --network $DFX_NETWORK new_admin_ui

# Step 4: Grant the admin backend canister access to the new UI canister
echo "Granting the admin backend canister access to the new UI canister..."
dfx canister --network $DFX_NETWORK call $NEW_CANISTER_ID authorize "principal \"$ADMIN_BACKEND_CANISTER_ID\""

# Restore the original dfx.json
cp dfx.json.bak dfx.json
rm dfx.json.bak
rm dfx.json.temp

echo "Deployment completed!"
echo "New admin UI canister ID: $NEW_CANISTER_ID"
echo "Visit https://$NEW_CANISTER_ID.icp0.io/ to view the admin app."
echo ""
echo "IMPORTANT: Update your application configuration to use the new canister ID."
echo "Once you've verified the new canister works, you can delete the old one."
