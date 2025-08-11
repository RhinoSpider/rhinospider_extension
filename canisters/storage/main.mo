import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import Debug "mo:base/Debug";
import Error "mo:base/Error";
import HashMap "mo:base/HashMap";
import Hash "mo:base/Hash";
import Iter "mo:base/Iter";
import Int "mo:base/Int";
import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Nat32 "mo:base/Nat32";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Char "mo:base/Char";
import Float "mo:base/Float";
import Blob "mo:base/Blob";
import Bool "mo:base/Bool";
import AIHandler "./ai/handler";
import Types "./types";
import ExperimentalCycles "mo:base/ExperimentalCycles";
import TrieMap "mo:base/TrieMap";
import SharedTypes "../shared/types";

actor class Storage() = this {
    type ICManagement = actor {
        http_request : shared {
            url : Text;
            max_response_bytes : ?Nat64;
            headers : [Types.HttpHeader];
            body : [Nat8];
            method : Types.HttpMethod;
            transform : ?Types.TransformContext;
        } -> async Types.HttpResponse;
    };

    // Stable variables for upgrades
    private stable var stableTopicsV2 : [(Text, SharedTypes.ScrapingTopic)] = [];
    private stable var stableScrapedData : [(Text, SharedTypes.ScrapedData)] = [];
    private stable var stableAIConfig : SharedTypes.AIConfig = {
        costLimits = {
            maxConcurrent = 5;
            maxDailyCost = 0.0;
            maxMonthlyCost = 0.0;
        };
        apiKey = "";
        model = "gpt-4";
    };
    private stable var authorizedCanisterIds : [Principal] = [];

    // In-memory data structures
    private var topics = HashMap.HashMap<Text, SharedTypes.ScrapingTopic>(10, Text.equal, Text.hash);
    private var scrapedData = HashMap.HashMap<Text, SharedTypes.ScrapedData>(100, Text.equal, Text.hash);
    private var aiConfig = stableAIConfig;

    // Constants
    private let CYCLES_PER_CALL = 100_000_000_000; // 100B cycles per call

    // Access control - IMPROVED: More permissive authorization function
    private func isAuthorizedCaller(caller: Principal): Bool {
        // Debug logging for authorization
        Debug.print("Authorization check for: " # Principal.toText(caller));
        
        // Allow self-calls
        if (Principal.equal(caller, Principal.fromActor(this))) {
            Debug.print("Self-call authorized");
            return true;
        };

        // FIXED: Allow the anonymous identity (2vxsx-fae) used by the proxy server
        if (Principal.toText(caller) == "2vxsx-fae") {
            Debug.print("Anonymous identity authorized");
            return true;
        };

        // FIXED: Explicitly allow the consumer canister
        if (Principal.toText(caller) == consumerCanisterId) {
            Debug.print("Consumer canister explicitly authorized");
            return true;
        };
        
        // Check if caller is an authorized canister
        for (id in authorizedCanisterIds.vals()) {
            if (Principal.equal(caller, id)) {
                Debug.print("Authorized from list: " # Principal.toText(id));
                return true;
            };
        };
        
        Debug.print("Authorization failed for: " # Principal.toText(caller));
        false
    };

    private let adminCanisterId: Text = "wvset-niaaa-aaaao-a4osa-cai"; // New admin backend canister
    private let consumerCanisterId: Text = "t3pjp-kqaaa-aaaao-a4ooq-cai"; // Consumer canister ID
    
    // Admin principals
    private let adminPrincipal1: Text = "b6ra7-utydr-wzyka-ifr5h-jndpw-ugopd-q2qkc-oq4ju-7rbey-prkus-mqe"; // Your principal
    private let adminPrincipal2: Text = "m2x6b-rijrs-nmddl-i4o4z-x2ymi-5equa-cgtmd-y5pag-6f6p4-plfjj-vae"; // Atharva's principal

    private func isAdmin(caller: Principal): Bool {
        let callerText = Principal.toText(caller);
        callerText == adminCanisterId or 
        callerText == adminPrincipal1 or 
        callerText == adminPrincipal2
    };

    // Initialize authorized canisters
    private func initAuthorizedCanisters() {
        // IMPROVED: Add admin, consumer canisters, and anonymous principal during deployment
        authorizedCanisterIds := [
            Principal.fromText(adminCanisterId), // admin
            Principal.fromText(consumerCanisterId), // consumer canister ID
            Principal.fromText("2vxsx-fae") // anonymous principal used by proxy
        ];
        Debug.print("Initialized authorized canisters list with " # Nat.toText(authorizedCanisterIds.size()) # " entries");
    };
    
    // Call initialization during actor creation
    initAuthorizedCanisters();

    // Upgrade hooks
    system func preupgrade() {
        stableTopicsV2 := Iter.toArray(topics.entries());
        stableScrapedData := Iter.toArray(scrapedData.entries());
        stableAIConfig := aiConfig;
    };

    system func postupgrade() {
        topics := HashMap.fromIter<Text, SharedTypes.ScrapingTopic>(stableTopicsV2.vals(), 10, Text.equal, Text.hash);
        scrapedData := HashMap.fromIter<Text, SharedTypes.ScrapedData>(stableScrapedData.vals(), 100, Text.equal, Text.hash);
        aiConfig := stableAIConfig;
    };

    // Public methods with access control
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

    public query({ caller }) func getScrapedData(topicIds: [Text]): async [SharedTypes.ScrapedData] {
        // Still check authorization, but return empty array instead of error
        if (not isAuthorizedCaller(caller)) {
            return [];
        };
        
        let buffer = Buffer.Buffer<SharedTypes.ScrapedData>(0);
        for ((_, data) in scrapedData.entries()) {
            if (topicIds.size() == 0 or Array.find<Text>(topicIds, func(id) = id == data.topic) != null) {
                buffer.add(data);
            };
        };
        
        Buffer.toArray(buffer)
    };

    // Get all scraped data for admin overview
    public query({ caller }) func getAllData(): async [(Text, SharedTypes.ScrapedData)] {
        // TEMPORARY: Allow all callers to read data
        Iter.toArray(scrapedData.entries())
    };
    
    // Public method to get data count
    public query func getDataCount(): async Nat {
        scrapedData.size()
    };

    // Add a new method to store scraped data with improved logging
    public shared({ caller }) func storeScrapedData(data: SharedTypes.ScrapedData): async Result.Result<(), SharedTypes.Error> {
        Debug.print("storeScrapedData called by: " # Principal.toText(caller));
        
        // More detailed authorization check
        if (not isAuthorizedCaller(caller)) {
            Debug.print("NOT AUTHORIZED: " # Principal.toText(caller));
            return #err(#NotAuthorized);
        };
        
        Debug.print("Storing data with ID: " # data.id);
        scrapedData.put(data.id, data);
        #ok()
    };

    // Add a method to delete scraped data
    public shared({ caller }) func deleteScrapedData(id: Text): async Result.Result<(), SharedTypes.Error> {
        if (not isAuthorizedCaller(caller)) {
            return #err(#NotAuthorized);
        };
        scrapedData.delete(id);
        #ok()
    };

    // Add a method to delete a topic
    public shared({ caller }) func deleteTopic(id: Text): async Result.Result<(), SharedTypes.Error> {
        if (not isAuthorizedCaller(caller)) {
            return #err(#NotAuthorized);
        };
        topics.delete(id);
        #ok()
    };

    // Add a method to clear all data (for testing)
    public shared({ caller }) func clearAllData(): async Result.Result<(), SharedTypes.Error> {
        if (not isAdmin(caller)) {
            return #err(#NotAuthorized);
        };
        topics := HashMap.HashMap<Text, SharedTypes.ScrapingTopic>(10, Text.equal, Text.hash);
        scrapedData := HashMap.HashMap<Text, SharedTypes.ScrapedData>(100, Text.equal, Text.hash);
        #ok()
    };

    // Add a method to add a new authorized canister
    public shared({ caller }) func addAuthorizedCanister(id: Principal): async Result.Result<(), SharedTypes.Error> {
        if (not isAdmin(caller)) {
            return #err(#NotAuthorized);
        };
        // Check if already authorized
        for (existingId in authorizedCanisterIds.vals()) {
            if (Principal.equal(existingId, id)) {
                return #ok(); // Already authorized, nothing to do
            };
        };
        authorizedCanisterIds := Array.append(authorizedCanisterIds, [id]);
        #ok()
    };

    // Add a method to remove an authorized canister
    public shared({ caller }) func removeAuthorizedCanister(id: Principal): async Result.Result<(), SharedTypes.Error> {
        if (not isAdmin(caller)) {
            return #err(#NotAuthorized);
        };
        authorizedCanisterIds := Array.filter(authorizedCanisterIds, func(p: Principal): Bool { not Principal.equal(p, id) });
        #ok()
    };

    // Add a method to get all authorized canisters
    public query({ caller }) func getAuthorizedCanisters(): async Result.Result<[Principal], SharedTypes.Error> {
        if (not isAdmin(caller)) {
            return #err(#NotAuthorized);
        };
        #ok(authorizedCanisterIds)
    };

    // Add a method to forward cycles to another canister
    public shared({ caller }) func forwardCycles(target: Principal, amount: Nat): async Result.Result<(), SharedTypes.Error> {
        if (not isAdmin(caller)) {
            return #err(#NotAuthorized);
        };
        let targetCanister = actor (Principal.toText(target)) : actor {
            wallet_receive : () -> async ();
        };
        ExperimentalCycles.add(amount);
        await targetCanister.wallet_receive();
        #ok()
    };

    // Add a method to get the current cycle balance
    public query func getCycleBalance(): async Nat {
        ExperimentalCycles.balance()
    };

    // Add a method to accept cycles
    public func wallet_receive(): async () {
        let amount = ExperimentalCycles.available();
        let accepted = ExperimentalCycles.accept(amount);
    };
}
