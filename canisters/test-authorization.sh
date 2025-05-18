#!/bin/bash

# Script to test the authorization between consumer and admin canisters

echo "Testing authorization between consumer and admin canisters..."

# Set environment variables
export DFX_NETWORK="ic"
export CONSUMER_CANISTER_ID="tgyl5-yyaaa-aaaaj-az4wq-cai"
export ADMIN_CANISTER_ID="444wf-gyaaa-aaaaj-az5sq-cai"

echo "Using network: $DFX_NETWORK"
echo "Consumer canister ID: $CONSUMER_CANISTER_ID"
echo "Admin canister ID: $ADMIN_CANISTER_ID"

# Test consumer canister getTopics method
echo "Testing consumer canister getTopics method..."
dfx canister --network $DFX_NETWORK call $CONSUMER_CANISTER_ID getTopics

# Test direct call to admin canister getTopics method
echo "Testing direct call to admin canister getTopics method..."
dfx canister --network $DFX_NETWORK call $ADMIN_CANISTER_ID getTopics

# Test admin canister getTopics_with_caller method
echo "Testing admin canister getTopics_with_caller method..."
dfx canister --network $DFX_NETWORK call $ADMIN_CANISTER_ID getTopics_with_caller "(principal \"$CONSUMER_CANISTER_ID\")"

echo "Testing completed!"
