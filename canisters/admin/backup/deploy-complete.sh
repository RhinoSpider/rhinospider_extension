#!/bin/bash

# Script to deploy the complete admin canister with all required methods

echo "DEPLOYING COMPLETE ADMIN CANISTER"
echo "==============================="

# Set environment variables
export DFX_NETWORK="ic"
export ADMIN_CANISTER_ID="444wf-gyaaa-aaaaj-az5sq-cai"

echo "Using network: $DFX_NETWORK"
echo "Admin canister ID: $ADMIN_CANISTER_ID"

# IMPORTANT: Switch to the ic-prod identity
dfx identity use ic-prod
PRINCIPAL=$(dfx identity get-principal)
echo "Using identity: ic-prod"
echo "Principal: $PRINCIPAL"

# Create a temporary directory for the project
TEMP_DIR=$(mktemp -d)
echo "Created temporary directory: $TEMP_DIR"

# Copy the complete admin canister code
cp /Users/ayanuali/development/rhinospider/canisters/admin/admin-complete.mo $TEMP_DIR/main.mo
echo "Copied complete admin code to temp directory"

# Create a dfx.json file
cat > $TEMP_DIR/dfx.json << EOL
{
  "canisters": {
    "admin": {
      "main": "main.mo",
      "type": "motoko"
    }
  },
  "defaults": {
    "build": {
      "packtool": ""
    }
  },
  "networks": {
    "local": {
      "bind": "127.0.0.1:8000",
      "type": "ephemeral"
    }
  },
  "version": 1
}
EOL
echo "Created dfx.json in temp directory"

# Go to the temp directory
cd $TEMP_DIR

# Use moc directly to compile the canister
echo "Compiling with moc directly..."
MOC_PATH=$(which moc)
if [ -z "$MOC_PATH" ]; then
  MOC_PATH=$(find ~/.cache/dfinity -name moc | grep -v "\.old" | head -n 1)
  if [ -z "$MOC_PATH" ]; then
    echo "Error: Could not find moc compiler"
    exit 1
  fi
fi
echo "Using moc at: $MOC_PATH"

# Create a base directory for moc
BASE_PATH=$(dirname $(dirname $MOC_PATH))/base
if [ ! -d "$BASE_PATH" ]; then
  BASE_PATH=$(find ~/.cache/dfinity -name base -type d | grep -v "\.old" | head -n 1)
  if [ -z "$BASE_PATH" ]; then
    echo "Error: Could not find base library"
    exit 1
  fi
fi
echo "Using base library at: $BASE_PATH"

# Compile the canister
echo "Compiling admin canister..."
$MOC_PATH main.mo -o admin.wasm --package base $BASE_PATH

# Check if compilation was successful
if [ ! -f "admin.wasm" ]; then
  echo "Error: Failed to compile admin canister"
  exit 1
fi

echo "Compilation successful! Wasm file created at: $TEMP_DIR/admin.wasm"

# Deploy the wasm to the existing canister on IC
echo "Deploying to existing canister: $ADMIN_CANISTER_ID"
dfx canister --network $DFX_NETWORK install --wasm admin.wasm --mode=upgrade --yes $ADMIN_CANISTER_ID

# Check if the deployment was successful
if [ $? -eq 0 ]; then
  echo "Deployment successful!"
  
  # Check if the caller is authorized
  echo "Checking if caller is authorized..."
  dfx canister --network $DFX_NETWORK call $ADMIN_CANISTER_ID isAuthorized
  
  # Get topics to verify functionality
  echo "Getting topics to verify functionality..."
  dfx canister --network $DFX_NETWORK call $ADMIN_CANISTER_ID getTopics
  
  # Check if getAIConfig method is available
  echo "Checking if getAIConfig method is available..."
  dfx canister --network $DFX_NETWORK call $ADMIN_CANISTER_ID getAIConfig
else
  echo "Deployment failed!"
fi

# Clean up
cd /Users/ayanuali/development/rhinospider
rm -rf $TEMP_DIR

echo "Admin canister deployment completed!"
