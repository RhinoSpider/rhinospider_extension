#!/bin/bash

# Script to authorize a personal principal with the admin backend canister

echo "AUTHORIZING PERSONAL PRINCIPAL WITH ADMIN BACKEND"
echo "=================================================="

# Set environment variables
export DFX_NETWORK="ic"
export ADMIN_BACKEND_CANISTER_ID="444wf-gyaaa-aaaaj-az5sq-cai"

# Get the principal ID from the user
if [ -z "$1" ]; then
  echo "Please provide your principal ID as an argument."
  echo "Usage: $0 <principal-id>"
  exit 1
fi

PERSONAL_PRINCIPAL="$1"

echo "Using network: $DFX_NETWORK"
echo "Admin backend canister ID: $ADMIN_BACKEND_CANISTER_ID"
echo "Personal principal ID to authorize: $PERSONAL_PRINCIPAL"

# IMPORTANT: Switch to the ic-prod identity
dfx identity use ic-prod
ADMIN_PRINCIPAL=$(dfx identity get-principal)
echo "Using identity: ic-prod"
echo "Admin principal: $ADMIN_PRINCIPAL"

# Create a temporary Candid file for the admin backend canister
cat > admin.did << EOL
service : {
  add_user : (principal, variant { Admin; Operator; SuperAdmin }) -> ();
  get_users : () -> (variant { ok : vec record { principal; role: variant { Admin; SuperAdmin; User }; addedAt: int; addedBy: principal }; err : text });
}
EOL

# Step 1: Authorize the personal principal with the admin backend canister
echo "Authorizing personal principal with admin backend canister..."
dfx canister --network $DFX_NETWORK call --candid admin.did $ADMIN_BACKEND_CANISTER_ID add_user "(principal \"$PERSONAL_PRINCIPAL\", variant {SuperAdmin})"

# Step 2: Verify the authorization
echo "Verifying authorization..."
dfx canister --network $DFX_NETWORK call --candid admin.did $ADMIN_BACKEND_CANISTER_ID get_users

# Clean up
rm admin.did

echo "Authorization completed!"
echo "Your personal principal should now be able to access the admin backend canister."
echo "Please refresh the admin app and verify that it works correctly."
