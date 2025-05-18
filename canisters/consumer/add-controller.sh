#!/bin/bash

# Script to add the current identity as a controller of the consumer canister

echo "Adding current identity as a controller of the consumer canister..."

# Set environment variables
export DFX_NETWORK="ic"
export CONSUMER_CANISTER_ID="tgyl5-yyaaa-aaaaj-az4wq-cai"

echo "Using network: $DFX_NETWORK"
echo "Consumer canister ID: $CONSUMER_CANISTER_ID"

# Switch to the ic-prod identity (which is the controller)
dfx identity use ic-prod
CONTROLLER_PRINCIPAL=$(dfx identity get-principal)
echo "Using controller principal: $CONTROLLER_PRINCIPAL"

# Get the default identity principal
dfx identity use default
DEFAULT_PRINCIPAL=$(dfx identity get-principal)
echo "Default principal: $DEFAULT_PRINCIPAL"

# Switch back to the controller identity
dfx identity use ic-prod

# Add the default identity as a controller
echo "Adding default identity as a controller..."
dfx canister --network $DFX_NETWORK update-settings --add-controller $DEFAULT_PRINCIPAL $CONSUMER_CANISTER_ID

# Switch to the default identity
dfx identity use default

# Check if we can now control the canister
echo "Checking if we can control the canister..."
dfx canister --network $DFX_NETWORK status $CONSUMER_CANISTER_ID

echo "Process completed!"
