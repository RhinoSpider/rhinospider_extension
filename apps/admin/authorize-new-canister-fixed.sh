#!/bin/bash

# Script to authorize the new admin UI canister with the admin backend canister

echo "AUTHORIZING NEW ADMIN UI CANISTER WITH ADMIN BACKEND"
echo "=================================================="

# Set environment variables
export DFX_NETWORK="ic"
export ADMIN_BACKEND_CANISTER_ID="444wf-gyaaa-aaaaj-az5sq-cai"
export NEW_ADMIN_UI_CANISTER_ID="ca6op-fyaaa-aaaao-a4k2q-cai"

echo "Using network: $DFX_NETWORK"
echo "Admin backend canister ID: $ADMIN_BACKEND_CANISTER_ID"
echo "New admin UI canister ID: $NEW_ADMIN_UI_CANISTER_ID"

# IMPORTANT: Switch to the ic-prod identity
dfx identity use ic-prod
PRINCIPAL=$(dfx identity get-principal)
echo "Using identity: ic-prod"
echo "Principal: $PRINCIPAL"

# Create a temporary Candid file for the admin backend canister
cat > admin.did << EOL
service : {
  add_user : (principal, variant { Admin; Operator; SuperAdmin }) -> ();
  get_users : () -> (variant { ok : vec record { principal; role: variant { Admin; SuperAdmin; User }; addedAt: int; addedBy: principal }; err : text });
}
EOL

# Step 1: Authorize the new admin UI canister with the admin backend canister
echo "Authorizing new admin UI canister with admin backend canister..."
dfx canister --network $DFX_NETWORK call --candid admin.did $ADMIN_BACKEND_CANISTER_ID add_user "(principal \"$NEW_ADMIN_UI_CANISTER_ID\", variant {SuperAdmin})"

# Step 2: Verify the authorization
echo "Verifying authorization..."
dfx canister --network $DFX_NETWORK call --candid admin.did $ADMIN_BACKEND_CANISTER_ID get_users

# Clean up
rm admin.did

echo "Authorization completed!"
echo "The new admin UI canister should now be able to access the admin backend canister."
echo "Please refresh the admin app and verify that it works correctly."
