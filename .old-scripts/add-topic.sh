#!/bin/bash

# Script to add a topic directly to the admin canister

echo "ADDING TOPIC TO ADMIN CANISTER"
echo "============================"

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

# Create a temporary directory for the project
TEMP_DIR=$(mktemp -d)
echo "Created temporary directory: $TEMP_DIR"

# Create a script to add a topic
cat > $TEMP_DIR/add-topic.mo << EOL
import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import Time "mo:base/Time";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Float "mo:base/Float";
import Result "mo:base/Result";

actor {
  type ExtractionField = {
    name: Text;
    fieldType: Text;
    required: Bool;
    aiPrompt: ?Text;
  };

  type ExtractionRules = {
    fields: [ExtractionField];
    customPrompt: ?Text;
  };

  type CostLimits = {
    maxDailyCost: Float;
    maxMonthlyCost: Float;
    maxConcurrent: Nat;
  };

  type AIConfig = {
    apiKey: Text;
    model: Text;
    costLimits: CostLimits;
    temperature: Float;
    maxTokens: Nat;
  };

  type ContentIdentifiers = {
    selectors: [Text];
    keywords: [Text];
  };

  type CreateTopicRequest = {
    name: Text;
    description: Text;
    urlPatterns: [Text];
    extractionRules: ExtractionRules;
    scrapingInterval: Nat;
    activeHours: {
      start: Nat;
      end: Nat;
    };
    maxRetries: Nat;
    siteTypeClassification: ?Text;
    urlGenerationStrategy: ?Text;
    articleUrlPatterns: ?[Text];
    contentIdentifiers: ?ContentIdentifiers;
    paginationPatterns: ?[Text];
    sampleArticleUrls: ?[Text];
    excludePatterns: ?[Text];
  };

  type ScrapingTopic = {
    id: Text;
    name: Text;
    description: Text;
    urlPatterns: [Text];
    status: Text;
    extractionRules: ExtractionRules;
    aiConfig: AIConfig;
    scrapingInterval: Nat;
    activeHours: {
      start: Nat;
      end: Nat;
    };
    maxRetries: Nat;
    articleUrlPatterns: ?[Text];
    siteTypeClassification: ?Text;
    contentIdentifiers: ?ContentIdentifiers;
    paginationPatterns: ?[Text];
    sampleArticleUrls: ?[Text];
    urlGenerationStrategy: ?Text;
    excludePatterns: ?[Text];
    createdAt: Int;
    lastScraped: Int;
  };

  type AdminActor = actor {
    createTopic: (CreateTopicRequest) -> async {#ok: ScrapingTopic; #err: Text};
    getTopics: () -> async {#ok: [ScrapingTopic]; #err: Text};
  };

  public func addTopic() : async Text {
    let adminCanister: AdminActor = actor("$ADMIN_CANISTER_ID");
    
    // Create a topic with all required fields and properly formatted optional fields
    let topicRequest: CreateTopicRequest = {
      name = "Tech News";
      description = "Scrapes technology news articles from major tech websites";
      urlPatterns = ["https://techcrunch.com/*", "https://www.theverge.com/*"];
      extractionRules = {
        fields = [
          {
            name = "Title";
            fieldType = "text";
            required = true;
            aiPrompt = ?"Extract the main headline or title of the article";
          },
          {
            name = "Content";
            fieldType = "text";
            required = true;
            aiPrompt = ?"Extract the main body content of the article, excluding comments and advertisements";
          },
          {
            name = "Author";
            fieldType = "text";
            required = false;
            aiPrompt = ?"Extract the name of the author of the article";
          },
          {
            name = "Publication Date";
            fieldType = "text";
            required = false;
            aiPrompt = ?"Extract the date when the article was published";
          }
        ];
        customPrompt = ?"Extract information from the webpage about Tech News";
      };
      scrapingInterval = 3600;
      activeHours = {
        start = 0;
        end = 24;
      };
      maxRetries = 3;
      siteTypeClassification = ?"news";
      urlGenerationStrategy = ?"pattern_based";
      articleUrlPatterns = ?["https://techcrunch.com/*/", "https://www.theverge.com/*/*/*/"];
      contentIdentifiers = ?{
        selectors = [".article-content", ".entry-content", "article", ".post-content"];
        keywords = ["technology", "tech", "software", "hardware", "AI"];
      };
      paginationPatterns = ?["page=*", "/page/*"];
      sampleArticleUrls = ?["https://techcrunch.com/2023/05/18/example-article/"];
      excludePatterns = ?["*/comments/*", "*/author/*", "*/tag/*", "*/category/*"];
    };
    
    Debug.print("Calling createTopic...");
    let result = await adminCanister.createTopic(topicRequest);
    
    switch (result) {
      case (#ok(topic)) {
        Debug.print("Success! Created topic: " # topic.id);
        return "Success! Created topic: " # topic.id;
      };
      case (#err(error)) {
        Debug.print("Error: " # error);
        return "Error: " # error;
      };
    };
  };

  public func getTopics() : async Text {
    let adminCanister: AdminActor = actor("$ADMIN_CANISTER_ID");
    
    Debug.print("Calling getTopics...");
    let result = await adminCanister.getTopics();
    
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
    "add-topic": {
      "main": "add-topic.mo",
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
echo "Compiling add-topic canister..."
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
echo "Compiling add-topic canister..."
$MOC_PATH add-topic.mo -o add-topic.wasm --package base $BASE_PATH

# Check if compilation was successful
if [ ! -f "add-topic.wasm" ]; then
  echo "Error: Failed to compile add-topic canister"
  exit 1
fi

echo "Compilation successful! Wasm file created at: $TEMP_DIR/add-topic.wasm"

# Deploy the add-topic canister locally
echo "Deploying add-topic canister locally..."
dfx start --clean --background
dfx deploy add-topic

# Add a topic to the admin canister
echo "Adding a topic to the admin canister..."
dfx canister call add-topic addTopic

# Get topics from the admin canister
echo "Getting topics from the admin canister..."
dfx canister call add-topic getTopics

# Stop the local replica
dfx stop

# Clean up
cd /Users/ayanuali/development/rhinospider
rm -rf $TEMP_DIR

echo "Topic addition completed!"
