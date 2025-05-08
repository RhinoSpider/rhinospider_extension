#!/bin/bash

# Script to upgrade the consumer canister

echo "Upgrading consumer canister..."

# Set environment variables
export DFX_NETWORK=${1:-"ic"}
export CONSUMER_CANISTER_ID="tgyl5-yyaaa-aaaaj-az4wq-cai"

echo "Using network: $DFX_NETWORK"
echo "Consumer canister ID: $CONSUMER_CANISTER_ID"

# Create a temporary directory for the build
TEMP_DIR=$(mktemp -d)
echo "Created temporary directory: $TEMP_DIR"

# Copy the files to the temp directory
cp /Users/ayanuali/development/rhinospider/canisters/consumer/main.mo $TEMP_DIR/
cp /Users/ayanuali/development/rhinospider/canisters/consumer/consumer.did $TEMP_DIR/

cd $TEMP_DIR

# Create a temporary dfx.json file for building
echo "Creating temporary dfx.json file..."
cat > dfx.json << EOL
{
  "canisters": {
    "consumer": {
      "main": "main.mo",
      "type": "motoko",
      "candid": "consumer.did"
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

# Build the canister
echo "Building consumer canister..."
dfx build consumer

# Get the wasm path
WASM_PATH="$TEMP_DIR/.dfx/local/canisters/consumer/consumer.wasm"
echo "Wasm path: $WASM_PATH"

# Install the wasm to the existing canister
echo "Installing to existing canister: $CONSUMER_CANISTER_ID"
dfx canister install consumer --mode=upgrade --wasm $WASM_PATH --network $DFX_NETWORK $CONSUMER_CANISTER_ID

# Clean up
cd - > /dev/null
rm -rf $TEMP_DIR

echo "Upgrade completed!"
