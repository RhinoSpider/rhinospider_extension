import Principal "mo:base/Principal";
import Result "mo:base/Result";
import SharedTypes "../shared/types";
import Buffer "mo:base/Buffer";
import Time "mo:base/Time";
import Text "mo:base/Text";
import HashMap "mo:base/HashMap";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import ExperimentalCycles "mo:base/ExperimentalCycles";
import Debug "mo:base/Debug";

actor class Storage() = this {
    // Constants
    private let CYCLES_PER_CALL = 100_000_000_000; // 100B cycles per call

    // Stable storage
    private stable var authorizedCanisterIds: [Principal] = [
        Principal.fromText("444wf-gyaaa-aaaaj-az5sq-cai"), // admin (corrected ID)
        Principal.fromText("tgyl5-yyaaa-aaaaj-az4wq-cai"),  // consumer
        Principal.fromText("t52au-jmmys-xpd7e-f2cc7-xgsya-2ajbl-22leo-e7hep-kclwp-kqzoq-jae") // user's principal
    ];
    private stable var stableTopics: [(Text, SharedTypes.ScrapingTopic)] = [];
    private stable var stableScrapedData: [(Text, SharedTypes.ScrapedData)] = [];
    private stable var stableAIConfig: SharedTypes.AIConfig = {
        apiKey = "";
        model = "gpt-4";
        costLimits = {
            maxDailyCost = 0.0;
            maxMonthlyCost = 0.0;
            maxConcurrent = 5;
        };
    };

    // Runtime storage
    private var topics = HashMap.HashMap<Text, SharedTypes.ScrapingTopic>(10, Text.equal, Text.hash);
    private var scrapedData = HashMap.HashMap<Text, SharedTypes.ScrapedData>(100, Text.equal, Text.hash);
    private var aiConfig = stableAIConfig;

    // System hooks
    system func preupgrade() {
        stableTopics := Iter.toArray(topics.entries());
        stableScrapedData := Iter.toArray(scrapedData.entries());
        stableAIConfig := aiConfig;
    };

    system func postupgrade() {
        topics := HashMap.fromIter<Text, SharedTypes.ScrapingTopic>(stableTopics.vals(), 10, Text.equal, Text.hash);
        scrapedData := HashMap.fromIter<Text, SharedTypes.ScrapedData>(stableScrapedData.vals(), 100, Text.equal, Text.hash);
        aiConfig := stableAIConfig;
    };

    // Access control
    private func isAuthorizedCaller(caller: Principal): Bool {
        // Allow self-calls
        if (Principal.equal(caller, Principal.fromActor(this))) {
            return true;
        };

        // Check if caller is an authorized canister
        for (id in authorizedCanisterIds.vals()) {
            if (Principal.equal(caller, id)) {
                return true;
            };
        };
        false
    };

    // Admin management
    public shared({ caller }) func addAuthorizedCanister(id: Principal): async Result.Result<(), SharedTypes.Error> {
        // Allow both the admin canister and the user's principal to add authorized canisters
        if (Principal.toText(caller) != "444wf-gyaaa-aaaaj-az5sq-cai" and 
            Principal.toText(caller) != "t52au-jmmys-xpd7e-f2cc7-xgsya-2ajbl-22leo-e7hep-kclwp-kqzoq-jae") {
            Debug.print("Unauthorized caller trying to add canister: " # Principal.toText(caller));
            return #err(#NotAuthorized);
        };
        Debug.print("Adding authorized canister: " # Principal.toText(id));
        authorizedCanisterIds := Array.append(authorizedCanisterIds, [id]);
        #ok()
    };

    public shared({ caller }) func removeAuthorizedCanister(id: Principal): async Result.Result<(), SharedTypes.Error> {
        // Allow both the admin canister and the user's principal to remove authorized canisters
        if (Principal.toText(caller) != "444wf-gyaaa-aaaaj-az5sq-cai" and 
            Principal.toText(caller) != "t52au-jmmys-xpd7e-f2cc7-xgsya-2ajbl-22leo-e7hep-kclwp-kqzoq-jae") {
            Debug.print("Unauthorized caller trying to remove canister: " # Principal.toText(caller));
            return #err(#NotAuthorized);
        };
        Debug.print("Removing authorized canister: " # Principal.toText(id));
        authorizedCanisterIds := Array.filter(authorizedCanisterIds, func(p: Principal): Bool { not Principal.equal(p, id) });
        #ok()
    };

    // Topic management
    public shared({ caller }) func updateTopic(topic: SharedTypes.ScrapingTopic): async Result.Result<(), SharedTypes.Error> {
        if (not isAuthorizedCaller(caller)) {
            return #err(#NotAuthorized);
        };
        topics.put(topic.id, topic);
        #ok()
    };

    public shared({ caller }) func updateAIConfig(config: SharedTypes.AIConfig): async Result.Result<(), SharedTypes.Error> {
        if (not isAuthorizedCaller(caller)) {
            return #err(#NotAuthorized);
        };
        aiConfig := config;
        #ok()
    };

    // Data access
    public query({ caller }) func getTopics(): async Result.Result<[SharedTypes.ScrapingTopic], SharedTypes.Error> {
        if (not isAuthorizedCaller(caller)) {
            return #err(#NotAuthorized);
        };
        let buffer = Buffer.Buffer<SharedTypes.ScrapingTopic>(0);
        for ((_, topic) in topics.entries()) {
            buffer.add(topic);
        };
        #ok(Buffer.toArray(buffer))
    };

    public query({ caller }) func getAIConfig(): async Result.Result<SharedTypes.AIConfig, SharedTypes.Error> {
        if (not isAuthorizedCaller(caller)) {
            return #err(#NotAuthorized);
        };
        #ok(aiConfig)
    };

    // Scraping data management
    public shared({ caller }) func submitScrapedData(data: SharedTypes.ScrapedData): async Result.Result<(), SharedTypes.Error> {
        // Detailed logging for debugging authorization issues
        Debug.print("submitScrapedData called by: " # Principal.toText(caller));
        
        // CRITICAL: Bypass authorization checks for submitScrapedData
        // This ensures all extension users can submit data regardless of their identity
        // Log caller information for debugging
        let isAnonymous = Principal.toText(caller) == "2vxsx-fae";
        let isConsumer = Principal.toText(caller) == "tgyl5-yyaaa-aaaaj-az4wq-cai";
        let isSelf = Principal.equal(caller, Principal.fromActor(this));
        
        Debug.print("BYPASSING AUTHORIZATION FOR DATA SUBMISSION");
        Debug.print("Caller details:");
        Debug.print(" - Principal: " # Principal.toText(caller));
        Debug.print(" - Is anonymous identity: " # debug_show(isAnonymous));
        Debug.print(" - Is consumer canister: " # debug_show(isConsumer));
        Debug.print(" - Is self call: " # debug_show(isSelf));
        
        // Add cycles for computation
        ExperimentalCycles.add(CYCLES_PER_CALL);
        
        // Store the data
        scrapedData.put(data.id, data);
        Debug.print("Data successfully stored with ID: " # data.id);
        
        // Return success
        return #ok();
    };

    // Alternative method for data submission (storeContent)
    public shared({ caller }) func storeContent(data: SharedTypes.ScrapedData): async Result.Result<(), SharedTypes.Error> {
        // Log the caller for debugging
        Debug.print("storeContent called by: " # Principal.toText(caller));
        
        // Bypass all authorization checks - allow any caller
        Debug.print("BYPASSING AUTHORIZATION FOR DATA SUBMISSION");
        Debug.print("Caller details: " # Principal.toText(caller));
        
        // Add cycles for computation
        ExperimentalCycles.add(CYCLES_PER_CALL);
        
        // Store the data
        scrapedData.put(data.id, data);
        Debug.print("Data successfully stored with ID: " # data.id);
        
        // Return success
        return #ok();
    };
    
    // Another alternative method for data submission (addScrapedData)
    public shared({ caller }) func addScrapedData(data: SharedTypes.ScrapedData): async Result.Result<(), SharedTypes.Error> {
        // Log the caller for debugging
        Debug.print("addScrapedData called by: " # Principal.toText(caller));
        
        // Bypass all authorization checks - allow any caller
        Debug.print("BYPASSING AUTHORIZATION FOR DATA SUBMISSION");
        Debug.print("Caller details: " # Principal.toText(caller));
        
        // Add cycles for computation
        ExperimentalCycles.add(CYCLES_PER_CALL);
        
        // Store the data
        scrapedData.put(data.id, data);
        Debug.print("Data successfully stored with ID: " # data.id);
        
        // Return success
        return #ok();
    };

    public query({ caller }) func getScrapedData(topicIds: [Text]): async Result.Result<[SharedTypes.ScrapedData], SharedTypes.Error> {
        if (not isAuthorizedCaller(caller)) {
            return #err(#NotAuthorized);
        };
        let buffer = Buffer.Buffer<SharedTypes.ScrapedData>(0);
        for ((_, data) in scrapedData.entries()) {
            if (topicIds.size() == 0 or Array.find<Text>(topicIds, func(id) = id == data.topic) != null) {
                buffer.add(data);
            };
        };
        #ok(Buffer.toArray(buffer))
    };
}
