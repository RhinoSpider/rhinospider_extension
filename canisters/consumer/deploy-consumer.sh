#!/bin/bash

# Script to deploy the updated consumer canister

echo "Deploying updated consumer canister..."

# Set environment variables
export DFX_NETWORK=${1:-"ic"}
export CONSUMER_CANISTER_ID="tgyl5-yyaaa-aaaaj-az4wq-cai"

echo "Using network: $DFX_NETWORK"
echo "Consumer canister ID: $CONSUMER_CANISTER_ID"

# Create a temporary directory for the build
TEMP_DIR=$(mktemp -d)
cd $TEMP_DIR

# Create a temporary dfx.json file for building
echo "Creating temporary dfx.json file..."
cat > dfx.json << EOL
{
  "canisters": {
    "consumer": {
      "main": "main.mo",
      "type": "motoko"
    }
  },
  "defaults": {
    "build": {
      "packtool": ""
    }
  },
  "version": 1
}
EOL

# Copy the main.mo file to the temp directory
cp ./main.mo .
cp ./consumer.did .

# Create the canister locally
echo "Creating canister locally..."
dfx canister create consumer --network $DFX_NETWORK

# Build the canister
echo "Building consumer canister..."
dfx build consumer --network $DFX_NETWORK

# Install the wasm to the existing canister
echo "Installing to existing canister: $CONSUMER_CANISTER_ID"
dfx canister install consumer --network $DFX_NETWORK --mode=upgrade --wasm .dfx/$DFX_NETWORK/canisters/consumer/consumer.wasm --id $CONSUMER_CANISTER_ID

# Clean up
cd ..
rm -rf $TEMP_DIR

echo "Deployment completed!"