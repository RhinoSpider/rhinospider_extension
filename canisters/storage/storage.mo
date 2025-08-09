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
        Principal.fromText("s6r66-wyaaa-aaaaj-az4sq-cai"), // admin
        Principal.fromText("t3pjp-kqaaa-aaaao-a4ooq-cai")  // consumer
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
        if (Principal.toText(caller) != "s6r66-wyaaa-aaaaj-az4sq-cai") {
            return #err(#NotAuthorized);
        };
        authorizedCanisterIds := Array.append(authorizedCanisterIds, [id]);
        #ok()
    };

    public shared({ caller }) func removeAuthorizedCanister(id: Principal): async Result.Result<(), SharedTypes.Error> {
        if (Principal.toText(caller) != "s6r66-wyaaa-aaaaj-az4sq-cai") {
            return #err(#NotAuthorized);
        };
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
        if (not isAuthorizedCaller(caller)) {
            return #err(#NotAuthorized);
        };
        
        // Add cycles for computation
        ExperimentalCycles.add(CYCLES_PER_CALL);
        
        scrapedData.put(data.id, data);
        #ok()
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
