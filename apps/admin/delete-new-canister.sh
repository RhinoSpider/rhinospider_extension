#!/bin/bash

# Script to delete the new admin UI canister that we no longer need

echo "DELETING NEW ADMIN UI CANISTER"
echo "============================="

# Set environment variables
export DFX_NETWORK="ic"
export NEW_ADMIN_UI_CANISTER_ID="ca6op-fyaaa-aaaao-a4k2q-cai"

echo "Using network: $DFX_NETWORK"
echo "New admin UI canister ID to delete: $NEW_ADMIN_UI_CANISTER_ID"

# IMPORTANT: Switch to the ic-prod identity
dfx identity use ic-prod
PRINCIPAL=$(dfx identity get-principal)
echo "Using identity: ic-prod"
echo "Principal: $PRINCIPAL"

# Confirm deletion
echo "Are you sure you want to delete the canister $NEW_ADMIN_UI_CANISTER_ID? (y/n)"
read -p "> " CONFIRM

if [[ "$CONFIRM" == "y" || "$CONFIRM" == "Y" ]]; then
  echo "Deleting canister $NEW_ADMIN_UI_CANISTER_ID..."
  dfx canister --network $DFX_NETWORK delete $NEW_ADMIN_UI_CANISTER_ID
  
  echo "Canister deleted successfully!"
else
  echo "Deletion cancelled."
fi
