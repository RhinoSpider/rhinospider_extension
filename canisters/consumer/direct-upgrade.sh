#!/bin/bash

# Script to directly upgrade the consumer canister using the Motoko compiler

echo "Directly upgrading consumer canister..."

# Set environment variables
export DFX_NETWORK=${1:-"ic"}
export CONSUMER_CANISTER_ID="t3pjp-kqaaa-aaaao-a4ooq-cai"

echo "Using network: $DFX_NETWORK"
echo "Consumer canister ID: $CONSUMER_CANISTER_ID"

# Get the current directory
CURRENT_DIR=$(pwd)

# Install the Motoko compiler if needed
if ! command -v moc &> /dev/null; then
    echo "Installing Motoko compiler..."
    npm install -g @dfinity/moc
fi

# Compile the Motoko code directly
echo "Compiling consumer canister..."
moc main.mo -o consumer.wasm

# Check if compilation was successful
if [ ! -f consumer.wasm ]; then
    echo "Compilation failed!"
    exit 1
fi

echo "Compilation successful!"

# Install the wasm to the existing canister
echo "Installing to existing canister: $CONSUMER_CANISTER_ID"
dfx canister --network $DFX_NETWORK install $CONSUMER_CANISTER_ID --mode upgrade --wasm consumer.wasm

# Clean up
rm consumer.wasm

echo "Upgrade completed!"
