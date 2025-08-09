#!/bin/bash

# Add user to admin canister
# Your principal from the logs
USER_PRINCIPAL="t52au-jmmys-xpd7e-f2cc7-xgsya-2ajbl-22leo-e7hep-kclwp-kqzoq-jae"

echo "🔑 Adding user to admin canister..."
echo "Principal: $USER_PRINCIPAL"

# Add user to admin backend canister
echo "Adding user with SuperAdmin role..."
dfx canister call wvset-niaaa-aaaao-a4osa-cai add_user "(
  principal \"$USER_PRINCIPAL\",
  variant { SuperAdmin }
)" --network ic

echo ""
echo "✅ User added! You should now be able to create topics."
echo ""
echo "Try creating a topic now at: https://sxsvc-aqaaa-aaaaj-az4ta-cai.icp0.io/"