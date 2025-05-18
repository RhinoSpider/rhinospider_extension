#!/bin/bash

# Script to deploy the rebuilt admin canister

echo "DEPLOYING REBUILT ADMIN CANISTER"
echo "==============================="

# Set environment variables
export DFX_NETWORK="ic"
export ADMIN_CANISTER_ID="444wf-gyaaa-aaaaj-az5sq-cai"

echo "Using network: $DFX_NETWORK"
echo "Admin canister ID: $ADMIN_CANISTER_ID"

# Build the admin canister
echo "Building admin canister..."
dfx build admin

# Check if the build was successful
if [ ! -f ".dfx/$DFX_NETWORK/canisters/admin/admin.wasm" ]; then
  echo "Error: Failed to build admin canister"
  exit 1
fi

# Install the wasm to the existing canister
echo "Installing to existing canister: $ADMIN_CANISTER_ID"
dfx canister --network $DFX_NETWORK install --wasm .dfx/$DFX_NETWORK/canisters/admin/admin.wasm --mode=upgrade --yes $ADMIN_CANISTER_ID

echo "Deployment completed!"
echo "Now initializing sample data..."

# Initialize sample data
dfx canister --network $DFX_NETWORK call $ADMIN_CANISTER_ID initializeSampleData

echo "Sample data initialized!"
