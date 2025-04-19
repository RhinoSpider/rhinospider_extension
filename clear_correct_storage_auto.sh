#!/bin/bash

# Script to reset the CORRECT storage canister used by the admin app
CANISTER_ID="i2gk7-oyaaa-aaaao-a37cq-cai"  # This is the actual storage canister ID used by the admin app
PRINCIPAL_ID="nqkf7-4psg2-xnfiu-ht7if-oghvx-m2gb5-e3ifk-pjtfq-o5wiu-scumu-dqe"

echo "===== CORRECT Storage Canister Reset Script ====="
echo "This script will reset the CORRECT storage canister with ID: $CANISTER_ID"
echo "This is the canister that the admin app is actually using!"
echo "Using admin principal ID: $PRINCIPAL_ID"
echo ""

# Check if dfx is installed
if ! command -v dfx &> /dev/null; then
    echo "Error: dfx is not installed. Please install the Internet Computer SDK."
    exit 1
fi

echo "⚠️ WARNING: This will COMPLETELY RESET the storage canister!"
echo "All data will be permanently deleted."
echo "Press Ctrl+C now to abort, or wait 5 seconds to continue..."
sleep 5

echo ""
echo "Starting the reset process..."

# Use the ic-prod identity
echo "Using ic-prod identity..."
dfx identity use ic-prod

# Step 1: Stop the canister
echo ""
echo "Step 1: Stopping the canister..."
dfx canister --network ic stop $CANISTER_ID

# Step 2: Get the controllers of the canister
echo ""
echo "Step 2: Getting controllers of the canister..."
CONTROLLERS=$(dfx canister --network ic info $CANISTER_ID | grep "Controllers" | sed 's/Controllers: //')
echo "Current controllers: $CONTROLLERS"

# Step 3: Install empty code to the canister
echo ""
echo "Step 3: Installing empty code to the canister..."

# Create a temporary directory
TEMP_DIR=$(mktemp -d)
cd $TEMP_DIR

# Create an empty Motoko canister
cat > empty.mo <<EOF
actor {
  // Empty canister
}
EOF

# Compile the empty canister
echo "Compiling empty canister..."
$(dfx cache show)/moc empty.mo -o empty.wasm

# Install the empty canister to reset the state with automatic yes confirmation
echo "Installing empty canister to reset state..."
echo "yes" | dfx canister --network ic install --mode=reinstall --wasm empty.wasm $CANISTER_ID

# Clean up
cd -
rm -rf $TEMP_DIR

echo ""
echo "Reset process completed."
echo "The CORRECT storage canister has been reset to an empty state."
echo "All data has been cleared."
echo ""
echo "You will need to redeploy the proper storage canister code to restore functionality."
echo "Make sure to deploy with the same canister ID: $CANISTER_ID"
