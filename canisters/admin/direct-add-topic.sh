#!/bin/bash

# Script to directly add a topic to the admin canister using dfx

echo "DIRECTLY ADDING TOPIC TO ADMIN CANISTER"
echo "==================================="

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

# Create a temporary file for the argument
TEMP_FILE=$(mktemp)
echo "Created temporary file: $TEMP_FILE"

# Create the argument for the createTopic call
cat > $TEMP_FILE << EOL
(
  record {
    name = "Tech News";
    description = "Scrapes technology news articles from major tech websites";
    urlPatterns = vec { "https://techcrunch.com/*"; "https://www.theverge.com/*" };
    extractionRules = record {
      fields = vec {
        record {
          name = "Title";
          fieldType = "text";
          required = true;
          aiPrompt = opt "Extract the main headline or title of the article";
        };
        record {
          name = "Content";
          fieldType = "text";
          required = true;
          aiPrompt = opt "Extract the main body content of the article, excluding comments and advertisements";
        };
        record {
          name = "Author";
          fieldType = "text";
          required = false;
          aiPrompt = opt "Extract the name of the author of the article";
        };
        record {
          name = "Publication Date";
          fieldType = "text";
          required = false;
          aiPrompt = opt "Extract the date when the article was published";
        };
      };
      customPrompt = opt "Extract information from the webpage about Tech News";
    };
    scrapingInterval = 3600;
    activeHours = record {
      start = 0;
      end = 24;
    };
    maxRetries = 3;
    siteTypeClassification = opt "news";
    urlGenerationStrategy = opt "pattern_based";
    articleUrlPatterns = opt vec { "https://techcrunch.com/*/"; "https://www.theverge.com/*/*/*/" };
    contentIdentifiers = opt record {
      selectors = vec { ".article-content"; ".entry-content"; "article"; ".post-content" };
      keywords = vec { "technology"; "tech"; "software"; "hardware"; "AI" };
    };
    paginationPatterns = opt vec { "page=*"; "/page/*" };
    sampleArticleUrls = opt vec { "https://techcrunch.com/2023/05/18/example-article/" };
    excludePatterns = opt vec { "*/comments/*"; "*/author/*"; "*/tag/*"; "*/category/*" };
  }
)
EOL

# Call the createTopic method on the admin canister
echo "Calling createTopic on the admin canister..."
dfx canister --network $DFX_NETWORK call $ADMIN_CANISTER_ID createTopic "$(cat $TEMP_FILE)"

# Get topics from the admin canister to verify
echo "Getting topics from the admin canister to verify..."
dfx canister --network $DFX_NETWORK call $ADMIN_CANISTER_ID getTopics

# Clean up
rm $TEMP_FILE

echo "Topic addition completed!"
