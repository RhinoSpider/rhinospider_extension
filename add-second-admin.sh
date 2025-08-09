#!/bin/bash

# Add second admin to admin backend canister
ADMIN_PRINCIPAL="m2x6b-rijrs-nmddl-i4o4z-x2ymi-5equa-cgtmd-y5pag-6f6p4-plfjj-vae"

echo "🔑 Adding second admin to admin backend canister..."
echo "Principal: $ADMIN_PRINCIPAL"

# Add user to admin backend canister with SuperAdmin role
echo "Adding admin with SuperAdmin role..."
dfx canister call wvset-niaaa-aaaao-a4osa-cai add_user "(
  principal \"$ADMIN_PRINCIPAL\",
  variant { SuperAdmin }
)" --network ic

echo ""
echo "✅ Second admin added! They now have full backend access."
echo ""
echo "Both admins can now:"
echo "- Access frontend at: https://sxsvc-aqaaa-aaaaj-az4ta-cai.icp0.io/"
echo "- Create/edit/delete topics"
echo "- Configure AI settings"
echo "- Manage the system"