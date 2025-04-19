// Add this method to your existing storage canister code
// This should be added inside the Storage actor class

// Clear all data - can only be called by admin
public shared({ caller }) func clearAllData() : async Result.Result<(), SharedTypes.Error> {
    // Detailed logging for debugging authorization issues
    Debug.print("clearAllData called by: " # Principal.toText(caller));
    
    // Check if caller is admin
    if (Principal.toText(caller) != "nqkf7-4psg2-xnfiu-ht7if-oghvx-m2gb5-e3ifk-pjtfq-o5wiu-scumu-dqe" && 
        not Principal.equal(caller, Principal.fromActor(this)) && 
        not isAdmin(caller)) {
        Debug.print("Unauthorized attempt to clear data by: " # Principal.toText(caller));
        return #err(#NotAuthorized);
    };
    
    Debug.print("Authorization successful for clearing data: " # Principal.toText(caller));
    
    // Clear all data stores
    scrapedData := HashMap.HashMap<Text, SharedTypes.ScrapedData>(100, Text.equal, Text.hash);
    urlCache := TrieMap.TrieMap<Text, CacheEntry>(Text.equal, Text.hash);
    _htmlContent := HashMap.HashMap<Text, Text>(0, Text.equal, Text.hash);
    _pendingUrls := Buffer.Buffer<(Text, Text)>(0);
    _content := HashMap.HashMap<Text, ScrapedContent>(0, Text.equal, Text.hash);
    _contentByTopic := HashMap.HashMap<Text, Buffer.Buffer<Text>>(0, Text.equal, Text.hash);
    _contentBySource := HashMap.HashMap<Text, Buffer.Buffer<Text>>(0, Text.equal, Text.hash);
    _requests := HashMap.HashMap<Text, Request>(0, Text.equal, Text.hash);
    
    // Reset stable variables for the next upgrade
    stableScrapedData := [];
    
    Debug.print("All data successfully cleared from storage canister");
    #ok()
};
