#!/bin/bash

# Script to deploy the updated consumer canister

echo "Deploying updated consumer canister..."

# Set environment variables
export DFX_NETWORK=${1:-"ic"}
export CONSUMER_CANISTER_ID="t3pjp-kqaaa-aaaao-a4ooq-cai"

echo "Using network: $DFX_NETWORK"
echo "Consumer canister ID: $CONSUMER_CANISTER_ID"

# Create a temporary directory for the build
TEMP_DIR=$(mktemp -d)
cd $TEMP_DIR

# Create a temporary dfx.json file for building
echo "Creating temporary dfx.json file..."
cat > dfx.json << EOL
{
  "canisters": {
    "consumer": {
      "main": "main.mo",
      "type": "motoko"
    }
  },
  "defaults": {
    "build": {
      "packtool": ""
    }
  },
  "version": 1
}
EOL

# Copy the main.mo file to the temp directory
cp /Users/ayanuali/development/rhinospider/canisters/consumer/main.mo .

# Check if consumer.did exists, if not create a basic one
if [ -f "/Users/ayanuali/development/rhinospider/canisters/consumer/consumer.did" ]; then
  cp /Users/ayanuali/development/rhinospider/canisters/consumer/consumer.did .
else
  echo "Creating basic consumer.did file..."
  cat > consumer.did << EOL
service : {
  getTopics : () -> (variant { ok: vec record { id: text; name: text; description: text; urlPatterns: vec text; aiConfig: record { apiKey: text; model: text; costLimits: record { maxDailyCost: float64; maxMonthlyCost: float64; maxConcurrent: nat } }; status: text; extractionRules: record { title: text; content: text; date: text; author: text; }; scrapingInterval: nat; lastScraped: int; activeHours: record { start: nat; end: nat }; maxRetries: nat; createdAt: int; siteTypeClassification: text; urlGenerationStrategy: text; articleUrlPatterns: opt vec text; contentIdentifiers: opt record { titleSelector: text; contentSelector: text; dateSelector: text; authorSelector: text }; paginationPatterns: opt vec text; excludePatterns: opt vec text }; err: variant { NotAuthorized; SystemError: text } });
}
EOL
fi

# Build the canister locally
echo "Building consumer canister locally..."
dfx build

# Check if the build was successful
if [ ! -f ".dfx/local/canisters/consumer/consumer.wasm" ]; then
  echo "Error: Failed to build consumer canister"
  exit 1
fi

# Install the wasm to the existing canister
echo "Installing to existing canister: $CONSUMER_CANISTER_ID"
dfx canister install consumer --network $DFX_NETWORK --mode=upgrade --yes --argument '()' --canister-id $CONSUMER_CANISTER_ID

# Clean up
cd ..
rm -rf $TEMP_DIR

echo "Deployment completed!"