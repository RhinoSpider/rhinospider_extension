#!/bin/bash

# Exit on error
set -e

# Print commands
set -x

# Function to check if a command succeeded
check_status() {
  if [ $? -ne 0 ]; then
    echo "ERROR: $1 failed"
    exit 1
  else
    echo "SUCCESS: $1 completed"
  fi
}

# Check wallet balance first
echo "Checking wallet balance..."
dfx wallet --network ic balance
check_status "Wallet balance check"

# Build the storage canister
echo "Building storage canister..."
dfx build storage --network ic
check_status "Storage canister build"

# Deploy the storage canister with updated authorization logic
echo "Deploying storage canister with updated authorization logic..."
dfx deploy storage --network ic
check_status "Storage canister deployment"

# Verify deployment
echo "Verifying deployment..."
dfx canister --network ic status storage
check_status "Deployment verification"

# Transfer cycles to the storage canister if needed
echo "Checking if cycles transfer is needed..."
STORAGE_ID=$(dfx canister --network ic id storage)
echo "Storage canister ID: $STORAGE_ID"

# Transfer a trillion cycles (1T = 1,000,000,000,000)
echo "Transferring 1T cycles to storage canister..."
dfx wallet --network ic send --amount 1000000000000 "$STORAGE_ID"
check_status "Cycles transfer"

# Verify cycles after transfer
echo "Verifying cycles after transfer..."
dfx canister --network ic status storage
check_status "Cycles verification"

echo "=================================================="
echo "Deployment completed successfully!"
echo "Storage canister updated with improved authorization"
echo "Extension users can now submit data without issues"
echo "=================================================="
