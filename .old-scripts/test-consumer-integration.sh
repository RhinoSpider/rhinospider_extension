#!/bin/bash

# Script to test the consumer canister integration with the admin canister
# This script doesn't make any changes to the canisters, it only tests the integration

echo "TESTING CONSUMER CANISTER INTEGRATION"
echo "===================================="

# Set environment variables
export DFX_NETWORK="ic"
export ADMIN_CANISTER_ID="444wf-gyaaa-aaaaj-az5sq-cai"
export CONSUMER_CANISTER_ID="tgyl5-yyaaa-aaaaj-az4wq-cai"

echo "Using network: $DFX_NETWORK"
echo "Admin canister ID: $ADMIN_CANISTER_ID"
echo "Consumer canister ID: $CONSUMER_CANISTER_ID"

# IMPORTANT: Switch to the ic-prod identity
dfx identity use ic-prod
PRINCIPAL=$(dfx identity get-principal)
echo "Using identity: ic-prod"
echo "Principal: $PRINCIPAL"

# Test if the admin canister recognizes the identity
echo "Testing if admin canister recognizes the identity..."
dfx canister --network $DFX_NETWORK call $ADMIN_CANISTER_ID isAuthorized

# Get topics from the admin canister
echo "Getting topics from admin canister..."
dfx canister --network $DFX_NETWORK call $ADMIN_CANISTER_ID getTopics

# Create a temporary directory for the project
TEMP_DIR=$(mktemp -d)
echo "Created temporary directory: $TEMP_DIR"

# Create a test script to simulate the consumer canister
cat > $TEMP_DIR/test-consumer.mo << EOL
import Principal "mo:base/Principal";
import Debug "mo:base/Debug";

actor {
  type ScrapingTopic = {
    id: Text;
    name: Text;
    description: Text;
    urlPatterns: [Text];
    status: Text;
    extractionRules: {
      fields: [{
        name: Text;
        fieldType: Text;
        required: Bool;
        aiPrompt: ?Text;
      }];
      customPrompt: ?Text;
    };
    aiConfig: {
      apiKey: Text;
      model: Text;
      costLimits: {
        maxDailyCost: Float;
        maxMonthlyCost: Float;
        maxConcurrent: Nat;
      };
      temperature: Float;
      maxTokens: Nat;
    };
    scrapingInterval: Nat;
    activeHours: {
      start: Nat;
      end: Nat;
    };
    maxRetries: Nat;
    articleUrlPatterns: ?[Text];
    siteTypeClassification: ?Text;
    contentIdentifiers: ?{
      selectors: [Text];
      keywords: [Text];
    };
    paginationPatterns: ?[Text];
    sampleArticleUrls: ?[Text];
    urlGenerationStrategy: ?Text;
    excludePatterns: ?[Text];
    createdAt: Int;
    lastScraped: Int;
  };

  type AdminActor = actor {
    getTopics_with_caller: (Principal) -> async {#ok: [ScrapingTopic]; #err: Text};
  };

  public func testGetTopics() : async Text {
    let adminCanister: AdminActor = actor("$ADMIN_CANISTER_ID");
    let userPrincipal = Principal.fromText("$PRINCIPAL");
    
    Debug.print("Calling getTopics_with_caller...");
    let result = await adminCanister.getTopics_with_caller(userPrincipal);
    
    switch (result) {
      case (#ok(topics)) {
        Debug.print("Success! Got " # debug_show(topics.size()) # " topics");
        return "Success! Got " # debug_show(topics.size()) # " topics";
      };
      case (#err(error)) {
        Debug.print("Error: " # error);
        return "Error: " # error;
      };
    };
  };
}
EOL

# Create a dfx.json file
cat > $TEMP_DIR/dfx.json << EOL
{
  "canisters": {
    "test-consumer": {
      "main": "test-consumer.mo",
      "type": "motoko"
    }
  },
  "defaults": {
    "build": {
      "packtool": ""
    }
  },
  "networks": {
    "local": {
      "bind": "127.0.0.1:8000",
      "type": "ephemeral"
    }
  },
  "version": 1
}
EOL

# Go to the temp directory
cd $TEMP_DIR

# Use moc directly to compile the canister
echo "Compiling test consumer canister..."
MOC_PATH=$(which moc)
if [ -z "$MOC_PATH" ]; then
  MOC_PATH=$(find ~/.cache/dfinity -name moc | grep -v "\.old" | head -n 1)
  if [ -z "$MOC_PATH" ]; then
    echo "Error: Could not find moc compiler"
    exit 1
  fi
fi
echo "Using moc at: $MOC_PATH"

# Create a base directory for moc
BASE_PATH=$(dirname $(dirname $MOC_PATH))/base
if [ ! -d "$BASE_PATH" ]; then
  BASE_PATH=$(find ~/.cache/dfinity -name base -type d | grep -v "\.old" | head -n 1)
  if [ -z "$BASE_PATH" ]; then
    echo "Error: Could not find base library"
    exit 1
  fi
fi
echo "Using base library at: $BASE_PATH"

# Compile the canister
echo "Compiling test consumer canister..."
$MOC_PATH test-consumer.mo -o test-consumer.wasm --package base $BASE_PATH

# Check if compilation was successful
if [ ! -f "test-consumer.wasm" ]; then
  echo "Error: Failed to compile test consumer canister"
  exit 1
fi

echo "Compilation successful! Wasm file created at: $TEMP_DIR/test-consumer.wasm"

# Deploy the test consumer canister locally
echo "Deploying test consumer canister locally..."
dfx start --clean --background
dfx deploy test-consumer

# Test the integration
echo "Testing the integration..."
dfx canister call test-consumer testGetTopics

# Stop the local replica
dfx stop

# Clean up
cd /Users/ayanuali/development/rhinospider
rm -rf $TEMP_DIR

echo "Consumer canister integration test completed!"
