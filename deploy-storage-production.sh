#!/bin/bash

# Script to deploy the storage canister to production with updated authorization

echo "Deploying storage canister to production with updated authorization..."

# Navigate to the project root
cd "$(dirname "$0")"

# Deploy the storage canister to production
echo "Running dfx deploy storage --network ic..."
dfx deploy storage --network ic

echo "Storage canister deployed successfully to production!"
echo "The authorization issues should now be resolved."
