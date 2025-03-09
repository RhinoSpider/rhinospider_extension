#!/bin/bash

# Script to deploy the updated consumer canister

echo "Deploying updated consumer canister..."

# Set environment variables
export DFX_NETWORK=${1:-"ic"}
export CONSUMER_CANISTER_ID="tgyl5-yyaaa-aaaaj-az4wq-cai"

echo "Using network: $DFX_NETWORK"
echo "Consumer canister ID: $CONSUMER_CANISTER_ID"

# Build the consumer canister
echo "Building consumer canister..."
dfx build --network $DFX_NETWORK consumer

# Deploy the consumer canister
echo "Deploying consumer canister..."
dfx deploy --network $DFX_NETWORK --no-wallet consumer

echo "Deployment completed!"