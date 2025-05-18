#!/bin/bash

# Script to securely update the OpenAI API key in the admin canister
# This script does not hardcode the API key in the source code

echo "UPDATING OPENAI API KEY IN ADMIN CANISTER"
echo "======================================"

# Set environment variables
export DFX_NETWORK="ic"
export ADMIN_CANISTER_ID="444wf-gyaaa-aaaaj-az5sq-cai"

echo "Using network: $DFX_NETWORK"
echo "Admin canister ID: $ADMIN_CANISTER_ID"

# IMPORTANT: Switch to the ic-prod identity
dfx identity use ic-prod
PRINCIPAL=$(dfx identity get-principal)
echo "Using identity: ic-prod"
echo "Principal: $PRINCIPAL"

# Get the current AI config
echo "Getting current AI config..."
dfx canister --network $DFX_NETWORK call $ADMIN_CANISTER_ID getAIConfig

# Prompt for the API key
echo ""
echo "Enter your OpenAI API key (it will not be displayed or stored in the script):"
read -s API_KEY
echo ""

if [ -z "$API_KEY" ]; then
  echo "Error: API key cannot be empty"
  exit 1
fi

# Create a temporary file for the argument
TEMP_FILE=$(mktemp)
echo "Created temporary file: $TEMP_FILE"

# Create the argument for the updateAIConfig call
cat > $TEMP_FILE << EOL
(
  record {
    model = "gpt-3.5-turbo";
    costLimits = record {
      maxConcurrent = 5;
      maxDailyCost = 10.0;
      maxMonthlyCost = 100.0;
    };
    apiKey = "$API_KEY";
  }
)
EOL

# Call the updateAIConfig method on the admin canister
echo "Updating AI config with new API key..."
dfx canister --network $DFX_NETWORK call $ADMIN_CANISTER_ID updateAIConfig "$(cat $TEMP_FILE)"

# Clean up
rm $TEMP_FILE

# Get the updated AI config (without showing the API key)
echo "Getting updated AI config (API key will be masked)..."
dfx canister --network $DFX_NETWORK call $ADMIN_CANISTER_ID getAIConfig | sed 's/apiKey = "[^"]*"/apiKey = "********"/g'

echo "API key update completed!"
