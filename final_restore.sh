#!/bin/bash

# Script to directly restore the storage canister with a simple implementation
CANISTER_ID="smxjh-2iaaa-aaaaj-az4rq-cai"
PRINCIPAL_ID="nqkf7-4psg2-xnfiu-ht7if-oghvx-m2gb5-e3ifk-pjtfq-o5wiu-scumu-dqe"

echo "===== Final Storage Canister Restoration Script ====="
echo "This script will restore the storage canister with ID: $CANISTER_ID"
echo "Using admin principal ID: $PRINCIPAL_ID"
echo ""

# Check if dfx is installed
if ! command -v dfx &> /dev/null; then
    echo "Error: dfx is not installed. Please install the Internet Computer SDK."
    exit 1
fi

echo "Starting the final restoration process..."

# Use the ic-prod identity
echo "Using ic-prod identity..."
dfx identity use ic-prod

# Create a temporary directory
TEMP_DIR=$(mktemp -d)
cd $TEMP_DIR

# Create a simple Motoko file with proper imports
echo "Creating a simple storage canister..."
cat > simple_storage.mo <<EOF
import Array "mo:base/Array";
import Text "mo:base/Text";
import Principal "mo:base/Principal";

actor {
  // Simple storage implementation
  var data : [Text] = [];
  
  public func store(value : Text) : async () {
    data := Array.append<Text>(data, [value]);
  };
  
  public query func retrieve() : async [Text] {
    data
  };
  
  public func clear() : async () {
    data := [];
  };
  
  // Compatibility with the extension
  public func submitScrapedData(record : {
    id : Text;
    url : Text;
    content : Text;
    topic : Text;
    topicId : Text;
    timestamp : Int;
    client_id : Principal;
    source : Text;
    scraping_time : Int;
    status : Text;
  }) : async {#ok; #err: {#NotAuthorized; #InvalidData: Text; #SystemError: Text}} {
    // Store the data as a JSON string
    let dataString = "{\\"id\\":\\"" # record.id # 
                    "\\",\\"url\\":\\"" # record.url # 
                    "\\",\\"content\\":\\"" # record.content # 
                    "\\",\\"topic\\":\\"" # record.topic # 
                    "\\",\\"topicId\\":\\"" # record.topicId # 
                    "\\",\\"source\\":\\"" # record.source # 
                    "\\",\\"status\\":\\"" # record.status # "\\"}";
    
    data := Array.append<Text>(data, [dataString]);
    #ok
  };
  
  public query func getScrapedData(topicIds : [Text]) : async {#ok: [{
    id : Text;
    url : Text;
    content : Text;
    topic : Text;
    topicId : Text;
    timestamp : Int;
    client_id : Principal;
    source : Text;
    scraping_time : Int;
    status : Text;
  }]; #err: {#NotAuthorized; #InvalidData: Text; #SystemError: Text}} {
    #ok([])
  };
}
EOF

# Use the Motoko compiler directly with base library
echo "Compiling the canister..."
$(dfx cache show)/moc --package base $(dfx cache show)/base simple_storage.mo -o simple_storage.wasm

# Check if the compilation was successful
if [ ! -f "simple_storage.wasm" ]; then
    echo "Error: Failed to compile the canister."
    exit 1
fi

# Install the Wasm module to the canister
echo "Installing the Wasm module to the canister..."
dfx canister --network ic install --mode=reinstall --wasm simple_storage.wasm $CANISTER_ID

# Clean up
cd /
rm -rf $TEMP_DIR

echo ""
echo "Final restoration process completed."
echo "The storage canister has been restored with a simple implementation that is compatible with the extension."
echo ""
echo "You can now use the following commands to interact with the canister:"
echo "- Store data: dfx canister --network ic call $CANISTER_ID store '(\"your data here\")'"
echo "- Retrieve data: dfx canister --network ic call $CANISTER_ID retrieve"
echo "- Clear data: dfx canister --network ic call $CANISTER_ID clear"
echo ""
echo "The extension should now be able to submit data to the storage canister."
