#!/bin/bash

# Combined script to deploy both the admin canister and admin app

echo "DEPLOYING RHINOSPIDER ADMIN SYSTEM"
echo "================================="

# Set environment variables
export DFX_NETWORK="ic"
export ADMIN_CANISTER_ID="444wf-gyaaa-aaaaj-az5sq-cai"
export ADMIN_UI_CANISTER_ID="sxsvc-aqaaa-aaaaj-az4ta-cai"

echo "Using network: $DFX_NETWORK"
echo "Admin canister ID: $ADMIN_CANISTER_ID"
echo "Admin UI canister ID: $ADMIN_UI_CANISTER_ID"

# IMPORTANT: Switch to the ic-prod identity
dfx identity use ic-prod
PRINCIPAL=$(dfx identity get-principal)
echo "Using identity: ic-prod"
echo "Principal: $PRINCIPAL"

# Check wallet balance
WALLET_BALANCE=$(dfx wallet --network ic balance)
echo "Wallet balance: $WALLET_BALANCE"

# Step 1: Deploy the admin canister
echo ""
echo "STEP 1: DEPLOYING ADMIN CANISTER"
echo "=============================="
echo "Running deploy-interface-fix.sh..."
/Users/ayanuali/development/rhinospider/canisters/admin/scripts/deploy-interface-fix.sh

# Step 2: Build the admin app
echo ""
echo "STEP 2: BUILDING ADMIN APP"
echo "========================="
cd /Users/ayanuali/development/rhinospider/apps/admin
echo "Running npm run build..."
npm run build

# Step 3: Deploy the admin app
echo ""
echo "STEP 3: DEPLOYING ADMIN APP"
echo "=========================="
echo "Running deploy-ui.sh..."
/Users/ayanuali/development/rhinospider/apps/admin/scripts/deploy-ui.sh

echo ""
echo "DEPLOYMENT COMPLETED!"
echo "===================="
echo "Admin canister: $ADMIN_CANISTER_ID"
echo "Admin UI: https://$ADMIN_UI_CANISTER_ID.icp0.io/"
