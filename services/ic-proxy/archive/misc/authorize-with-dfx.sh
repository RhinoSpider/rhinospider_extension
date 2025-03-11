#!/bin/bash
# Script to authorize the consumer canister using dfx

# Define variables
STORAGE_CANISTER_ID="i2gk7-oyaaa-aaaao-a37cq-cai"
CONSUMER_CANISTER_ID="tgyl5-yyaaa-aaaaj-az4wq-cai"

echo "=== Authorizing Consumer Canister with dfx ==="
echo "Storage Canister ID: $STORAGE_CANISTER_ID"
echo "Consumer Canister ID: $CONSUMER_CANISTER_ID"

# Check if dfx is installed
if ! command -v dfx &> /dev/null; then
    echo "Error: dfx is not installed"
    exit 1
fi

# Check current identity
echo "Current dfx identity:"
dfx identity whoami

# Create a temporary Candid file for the storage canister
cat > storage.did << 'EOF'
service : {
  addAuthorizedCanister: (principal) -> (variant {ok; err: variant {NotFound; NotAuthorized; AlreadyExists; InvalidInput}});
  removeAuthorizedCanister: (principal) -> (variant {ok; err: variant {NotFound; NotAuthorized; AlreadyExists; InvalidInput}});
  submitScrapedData: (record {id:text; url:text; topic:text; source:text; content:text; timestamp:int; client_id:principal; status:text; scraping_time:int}) -> (variant {ok; err: variant {NotFound; NotAuthorized; AlreadyExists; InvalidInput}});
}
EOF

# Call the addAuthorizedCanister method
echo "Calling addAuthorizedCanister..."
dfx canister --network ic call $STORAGE_CANISTER_ID addAuthorizedCanister "(principal \"$CONSUMER_CANISTER_ID\")"

# Clean up
rm storage.did

echo "=== Authorization completed ==="
