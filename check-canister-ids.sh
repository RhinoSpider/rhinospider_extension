#!/bin/bash

# Script to check the current storage canister ID in both canisters

echo "Checking storage canister ID in admin and consumer canisters..."

# Set environment variables
export DFX_NETWORK="ic"
export ADMIN_CANISTER_ID="sxsvc-aqaaa-aaaaj-az4ta-cai"
export CONSUMER_CANISTER_ID="tgyl5-yyaaa-aaaaj-az4wq-cai"
export EXPECTED_STORAGE_CANISTER_ID="hhaip-uiaaa-aaaao-a4khq-cai"

echo "Using network: $DFX_NETWORK"
echo "Admin canister ID: $ADMIN_CANISTER_ID"
echo "Consumer canister ID: $CONSUMER_CANISTER_ID"
echo "Expected storage canister ID: $EXPECTED_STORAGE_CANISTER_ID"

# Check admin canister
echo ""
echo "Checking admin canister..."
dfx canister --network ic info $ADMIN_CANISTER_ID

# Check consumer canister
echo ""
echo "Checking consumer canister..."
dfx canister --network ic info $CONSUMER_CANISTER_ID

# Attempt to call getStorageCanisterId on admin canister
echo ""
echo "Attempting to call getStorageCanisterId on admin canister..."
dfx canister --network ic call $ADMIN_CANISTER_ID getStorageCanisterId 2>/dev/null || echo "Method not found or error occurred"

# Attempt to call getStorageCanisterId on consumer canister
echo ""
echo "Attempting to call getStorageCanisterId on consumer canister..."
dfx canister --network ic call $CONSUMER_CANISTER_ID getStorageCanisterId 2>/dev/null || echo "Method not found or error occurred"

echo ""
echo "Check completed. Please review the output to verify the storage canister IDs."
