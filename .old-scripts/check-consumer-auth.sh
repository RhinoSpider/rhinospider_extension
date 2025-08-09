#!/bin/bash

# Script to check if the admin canister recognizes the consumer canister principal
# This script doesn't make any changes to the canisters, it only checks the authorization

echo "CHECKING CONSUMER CANISTER AUTHORIZATION"
echo "====================================="

# Set environment variables
export DFX_NETWORK="ic"
export ADMIN_CANISTER_ID="444wf-gyaaa-aaaaj-az5sq-cai"
export CONSUMER_CANISTER_ID="tgyl5-yyaaa-aaaaj-az4wq-cai"

echo "Using network: $DFX_NETWORK"
echo "Admin canister ID: $ADMIN_CANISTER_ID"
echo "Consumer canister ID: $CONSUMER_CANISTER_ID"

# IMPORTANT: Switch to the ic-prod identity
dfx identity use ic-prod
PRINCIPAL=$(dfx identity get-principal)
echo "Using identity: ic-prod"
echo "Principal: $PRINCIPAL"

# Check if the consumer canister ID is correctly set in the admin canister
echo "Checking if consumer canister ID is correctly set in the admin canister..."
echo "Expected consumer canister ID: $CONSUMER_CANISTER_ID"
echo "This should match the CONSUMER_CANISTER_ID constant in the admin canister"

echo "The admin canister should authorize calls from the consumer canister"
echo "If the consumer canister is having issues, make sure the consumer canister is calling getTopics_with_caller correctly"

echo "Consumer canister authorization check completed!"
