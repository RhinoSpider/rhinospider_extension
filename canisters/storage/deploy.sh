#!/bin/bash

# Deploy the storage canister
echo "Deploying storage canister..."
cd "$(dirname "$0")"
cd ../..

# Set environment variables
source .env

# Deploy the storage canister
echo "Building and deploying storage canister..."
dfx deploy storage --network ic

echo "Storage canister deployed successfully!"
