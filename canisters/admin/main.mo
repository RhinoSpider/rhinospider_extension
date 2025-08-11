import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Float "mo:base/Float";
import HashMap "mo:base/HashMap";
import Buffer "mo:base/Buffer";
import Iter "mo:base/Iter";
import Option "mo:base/Option";
import Debug "mo:base/Debug";
import Array "mo:base/Array";
import Bool "mo:base/Bool";
import Error "mo:base/Error";

actor Admin {
    // Types exactly matching the admin app's expectations
    type UserRole = {
        #SuperAdmin;
        #Admin;
        #Operator;
    };

    type User = {
        principal: Principal;
        role: UserRole;
        addedBy: Principal;
        addedAt: Time.Time;
    };

    // Simplified types for search-based scraping
    type GlobalAIConfig = {
        enabled: Bool;
        provider: Text; // "openai" | "anthropic" | "mock"
        apiKey: ?Text;
        model: Text; // "gpt-3.5-turbo" for cheapest
        maxTokensPerRequest: Nat;
        features: {
            summarization: Bool;
            categorization: Bool;
            sentimentAnalysis: Bool;
            keywordExtraction: Bool;
        };
    };

    type ScrapingTopic = {
        id: Text;
        name: Text;
        description: Text;
        status: Text; // "active" | "inactive"
        
        // Search Configuration
        searchQueries: [Text]; // What to search for
        preferredDomains: ?[Text]; // Optional preferred domains
        excludeDomains: ?[Text]; // Domains to never scrape
        requiredKeywords: [Text]; // Must contain these
        excludeKeywords: ?[Text]; // Skip if contains these
        
        // Extraction Configuration
        contentSelectors: [Text]; // CSS selectors for content
        titleSelectors: ?[Text]; // CSS selectors for title
        excludeSelectors: [Text]; // CSS selectors to exclude
        minContentLength: Nat; // Minimum content length
        maxContentLength: Nat; // Maximum content length
        
        // Operational Settings
        maxUrlsPerBatch: Nat; // URLs per search batch
        scrapingInterval: Nat; // Seconds between scrapes
        priority: Nat; // 1-10 priority level
        
        // Geo-distribution & Node Routing
        geolocationFilter: ?Text; // Countries/regions (e.g., "US,UK,DE")
        percentageNodes: ?Nat; // Percentage of nodes to use (1-100)
        randomizationMode: ?Text; // How to select nodes ("none", "random", "round_robin", "weighted")
        
        // Tracking
        createdAt: Int;
        lastScraped: Int;
        totalUrlsScraped: Nat;
    };

    type NodeCharacteristics = {
        ipAddress: Text;
        region: Text;
        percentageNodes: ?Nat;
        randomizationMode: ?Text;
    };

    private var registeredNodes : HashMap.HashMap<Principal, NodeCharacteristics> = HashMap.HashMap<Principal, NodeCharacteristics>(0, Principal.equal, Principal.hash);

    public shared({ caller }) func registerNode(nodePrincipal: Principal, characteristics: NodeCharacteristics) : async Result.Result<(), Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        registeredNodes.put(nodePrincipal, characteristics);
        #ok();
    };

    public query({ caller }) func getRegisteredNodes() : async Result.Result<[(Principal, NodeCharacteristics)], Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        #ok(Iter.toArray(registeredNodes.entries()))
    };

    type ScrapedData = {
        id: Text;
        url: Text;
        topic: Text;
        content: Text;
        source: Text;
        timestamp: Int;
        client_id: Principal;
        status: Text;
        scraping_time: Int;
    };

    type StorageActor = actor {
        submitScrapedData : (ScrapedData) -> async Result.Result<(), Text>;
        getScrapedData : ([Text]) -> async Result.Result<[ScrapedData], Text>;
    };

    // Constants
    private let STORAGE_CANISTER_ID: Text = "hhaip-uiaaa-aaaao-a4khq-cai";
    private let CONSUMER_CANISTER_ID: Text = "t3pjp-kqaaa-aaaao-a4ooq-cai";
    private let USER_PRINCIPAL_ID: Text = "p6gaf-qjt3x-6q6ci-ro7nd-aklhp-6hgfo-4dljo-busl6-3ftgp-iliyi-zqe";
    
    // Admin principals
    private let ADMIN_PRINCIPAL_1: Text = "t52au-jmmys-xpd7e-f2cc7-xgsya-2ajbl-22leo-e7hep-kclwp-kqzoq-jae"; // Your actual principal
    private let ADMIN_PRINCIPAL_2: Text = "b6ra7-utydr-wzyka-ifr5h-jndpw-ugopd-q2qkc-oq4ju-7rbey-prkus-mqe"; // Backup admin
    private let ADMIN_PRINCIPAL_3: Text = "m2x6b-rijrs-nmddl-i4o4z-x2ymi-5equa-cgtmd-y5pag-6f6p4-plfjj-vae"; // Atharva's principal
    private let ADMIN_PRINCIPAL_4: Text = "vnsgt-djy2g-igpvh-sevfi-ota4n-dtquw-nz7i6-4glkr-ijmrd-5w3uh-gae"; // New admin 1
    private let ADMIN_PRINCIPAL_5: Text = "a4kj7-zxayv-chbcy-xugju-sv5ct-qvah7-6qcet-zkoz2-ehngi-bcg5c-eqe"; // New admin 2
    

    // Stable storage
    private stable var stableUsers : [(Principal, User)] = [];
    private stable var stableAdmins : [(Principal, Bool)] = [];
    private stable var stableTopics : [(Text, ScrapingTopic)] = [];
    private stable var globalAIConfig : ?GlobalAIConfig = null;
    private stable var initialized : Bool = false;

    // Runtime state
    private var users = HashMap.HashMap<Principal, User>(10, Principal.equal, Principal.hash);
    private var admins = HashMap.HashMap<Principal, Bool>(10, Principal.equal, Principal.hash);
    private var topics = HashMap.HashMap<Text, ScrapingTopic>(10, Text.equal, Text.hash);

    // Canister references
    private let storage: StorageActor = actor(STORAGE_CANISTER_ID);

    // Initialize admin
    private func initializeAdmin() {
        Debug.print("Initializing admin canister");
        
        // Add the user principal to admins
        let userPrincipal = Principal.fromText(USER_PRINCIPAL_ID);
        admins.put(userPrincipal, true);
        
        // Add admin principal 1
        let adminPrincipal1 = Principal.fromText(ADMIN_PRINCIPAL_1);
        admins.put(adminPrincipal1, true);
        
        // Add admin principal 2
        let adminPrincipal2 = Principal.fromText(ADMIN_PRINCIPAL_2);
        admins.put(adminPrincipal2, true);
        
        // Add admin principal 3
        let adminPrincipal3 = Principal.fromText(ADMIN_PRINCIPAL_3);
        admins.put(adminPrincipal3, true);
        
        // Add admin principal 4
        let adminPrincipal4 = Principal.fromText(ADMIN_PRINCIPAL_4);
        admins.put(adminPrincipal4, true);
        
        // Add admin principal 5
        let adminPrincipal5 = Principal.fromText(ADMIN_PRINCIPAL_5);
        admins.put(adminPrincipal5, true);
        
        // Also add to users collection as SuperAdmins
        users.put(userPrincipal, {
            principal = userPrincipal;
            role = #SuperAdmin;
            addedBy = userPrincipal;
            addedAt = Time.now();
        });
        
        users.put(adminPrincipal1, {
            principal = adminPrincipal1;
            role = #SuperAdmin;
            addedBy = adminPrincipal1;
            addedAt = Time.now();
        });
        
        users.put(adminPrincipal2, {
            principal = adminPrincipal2;
            role = #SuperAdmin;
            addedBy = adminPrincipal2;
            addedAt = Time.now();
        });
        
        users.put(adminPrincipal3, {
            principal = adminPrincipal3;
            role = #SuperAdmin;
            addedBy = adminPrincipal3;
            addedAt = Time.now();
        });
        
        users.put(adminPrincipal4, {
            principal = adminPrincipal4;
            role = #SuperAdmin;
            addedBy = adminPrincipal4;
            addedAt = Time.now();
        });
        
        users.put(adminPrincipal5, {
            principal = adminPrincipal5;
            role = #SuperAdmin;
            addedBy = adminPrincipal5;
            addedAt = Time.now();
        });
        
        initialized := true;
        Debug.print("Admin canister initialized with default admins");
    };

    // System functions
    system func preupgrade() {
        stableUsers := Iter.toArray(users.entries());
        stableAdmins := Iter.toArray(admins.entries());
        stableTopics := Iter.toArray(topics.entries());
    };

    system func postupgrade() {
        users := HashMap.fromIter(stableUsers.vals(), stableUsers.size(), Principal.equal, Principal.hash);
        admins := HashMap.fromIter(stableAdmins.vals(), stableAdmins.size(), Principal.equal, Principal.hash);
        topics := HashMap.fromIter(stableTopics.vals(), stableTopics.size(), Text.equal, Text.hash);
        
        // Ensure initialization after upgrade
        if (not initialized) {
            initializeAdmin();
        };
    };

    // Authorization check
    private func _isAuthorized(caller: Principal) : Bool {
        let callerStr = Principal.toText(caller);
        Debug.print("Authorization check for caller: " # callerStr);
        
        // Always initialize if not already done
        if (not initialized) {
            initializeAdmin();
        };
        
        // Allow consumer canister - using Text.equal for reliable comparison
        if (Text.equal(callerStr, CONSUMER_CANISTER_ID)) {
            Debug.print("Consumer canister authorized via Text.equal");
            return true;
        };
        
        // Explicitly allow the user principal
        if (Text.equal(callerStr, USER_PRINCIPAL_ID)) {
            Debug.print("User principal authorized via Text.equal");
            return true;
        };
        
        // Explicitly allow admin principal 1
        if (Text.equal(callerStr, ADMIN_PRINCIPAL_1)) {
            Debug.print("Admin principal 1 authorized via Text.equal");
            return true;
        };
        
        // Explicitly allow admin principal 2
        if (Text.equal(callerStr, ADMIN_PRINCIPAL_2)) {
            Debug.print("Admin principal 2 authorized via Text.equal");
            return true;
        };
        
        // Explicitly allow admin principal 3
        if (Text.equal(callerStr, ADMIN_PRINCIPAL_3)) {
            Debug.print("Admin principal 3 authorized via Text.equal");
            return true;
        };
        
        // Explicitly allow admin principal 4
        if (Text.equal(callerStr, ADMIN_PRINCIPAL_4)) {
            Debug.print("Admin principal 4 authorized via Text.equal");
            return true;
        };
        
        // Explicitly allow admin principal 5
        if (Text.equal(callerStr, ADMIN_PRINCIPAL_5)) {
            Debug.print("Admin principal 5 authorized via Text.equal");
            return true;
        };
        
        // Check in the admins map
        switch (admins.get(caller)) {
            case (?isAdmin) {
                Debug.print("Caller found in admins map: " # Bool.toText(isAdmin));
                return isAdmin;
            };
            case null {
                // Check in users collection
                switch (users.get(caller)) {
                    case (?user) {
                        let authorized = user.role == #SuperAdmin or user.role == #Admin;
                        Debug.print("Caller found in users map with role, authorized: " # Bool.toText(authorized));
                        return authorized;
                    };
                    case null {
                        Debug.print("Caller not found in admins or users map");
                        return false;
                    };
                };
            };
        };
    };

    // Consumer canister check
    private func _isConsumerCanister(caller: Principal): Bool {
        let callerStr = Principal.toText(caller);
        let isConsumer = Text.equal(callerStr, CONSUMER_CANISTER_ID);
        Debug.print("Admin _isConsumerCanister: Caller: " # callerStr # ", Expected: " # CONSUMER_CANISTER_ID # ", Match: " # Bool.toText(isConsumer));
        isConsumer
    };

    // Public query to check if caller is admin
    public query({ caller }) func checkIsAdmin() : async Bool {
        _isAuthorized(caller)
    };

    // User management
    public shared({ caller }) func add_user(p: Principal, role: UserRole) : async Result.Result<(), Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        
        users.put(p, {
            principal = p;
            role = role;
            addedBy = caller;
            addedAt = Time.now();
        });
        
        // If SuperAdmin or Admin, also add to admins map
        if (role == #SuperAdmin or role == #Admin) {
            admins.put(p, true);
        };
        
        #ok()
    };

    public query({ caller }) func get_users() : async Result.Result<[User], Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        #ok(Iter.toArray(users.vals()))
    };

    public shared({ caller }) func remove_user(p: Principal) : async Result.Result<(), Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        
        users.delete(p);
        admins.delete(p);
        #ok()
    };

    // Public method to get topics (no authorization check for query)
    public query func getTopics() : async Result.Result<[ScrapingTopic], Text> {
        Debug.print("getTopics: Returning " # Nat.toText(topics.size()) # " topics");
        #ok(Iter.toArray(topics.vals()))
    };
    
    public query func getAllTopics() : async [ScrapingTopic] {
        Iter.toArray(topics.vals())
    };

    public shared({ caller }) func getTopics_with_caller(user_principal: Principal) : async Result.Result<[ScrapingTopic], Text> {
        Debug.print("Admin getTopics_with_caller: Called by " # Principal.toText(caller));
        Debug.print("Admin getTopics_with_caller: User principal: " # Principal.toText(user_principal));
        
        // Only allow consumer canister to call this method
        if (not _isConsumerCanister(caller)) {
            Debug.print("Admin getTopics_with_caller: Unauthorized - caller is not consumer canister");
            return #err("Unauthorized: Only consumer canister can call this method");
        };

        Debug.print("Admin getTopics_with_caller: Authorization successful");
        Debug.print("Admin getTopics_with_caller: Returning " # Nat.toText(topics.size()) # " topics");
        #ok(Iter.toArray(topics.vals()))
    };

    public shared({ caller }) func createTopic(topic: ScrapingTopic) : async Result.Result<ScrapingTopic, Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        
        // Validate topic
        if (topic.searchQueries.size() == 0) {
            return #err("At least one search query is required");
        };
        
        if (topic.contentSelectors.size() == 0) {
            return #err("At least one content selector is required");
        };
        
        topics.put(topic.id, topic);
        #ok(topic)
    };

    public shared({ caller }) func updateTopic(id: Text, updates: {
        name: ?Text;
        description: ?Text;
        status: ?Text;
        searchQueries: ?[Text];
        preferredDomains: ?[Text];
        excludeDomains: ?[Text];
        requiredKeywords: ?[Text];
        excludeKeywords: ?[Text];
        contentSelectors: ?[Text];
        titleSelectors: ?[Text];
        excludeSelectors: ?[Text];
        minContentLength: ?Nat;
        maxContentLength: ?Nat;
        maxUrlsPerBatch: ?Nat;
        scrapingInterval: ?Nat;
        priority: ?Nat;
        geolocationFilter: ?Text;
        percentageNodes: ?Nat;
        randomizationMode: ?Text;
    }) : async Result.Result<ScrapingTopic, Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        
        switch (topics.get(id)) {
            case null { #err("Topic not found") };
            case (?topic) {
                let updatedTopic : ScrapingTopic = {
                    id = topic.id;
                    name = Option.get(updates.name, topic.name);
                    description = Option.get(updates.description, topic.description);
                    status = Option.get(updates.status, topic.status);
                    searchQueries = Option.get(updates.searchQueries, topic.searchQueries);
                    preferredDomains = updates.preferredDomains;
                    excludeDomains = updates.excludeDomains;
                    requiredKeywords = Option.get(updates.requiredKeywords, topic.requiredKeywords);
                    excludeKeywords = updates.excludeKeywords;
                    contentSelectors = Option.get(updates.contentSelectors, topic.contentSelectors);
                    titleSelectors = updates.titleSelectors;
                    excludeSelectors = Option.get(updates.excludeSelectors, topic.excludeSelectors);
                    minContentLength = Option.get(updates.minContentLength, topic.minContentLength);
                    maxContentLength = Option.get(updates.maxContentLength, topic.maxContentLength);
                    maxUrlsPerBatch = Option.get(updates.maxUrlsPerBatch, topic.maxUrlsPerBatch);
                    scrapingInterval = Option.get(updates.scrapingInterval, topic.scrapingInterval);
                    priority = Option.get(updates.priority, topic.priority);
                    geolocationFilter = updates.geolocationFilter;
                    percentageNodes = updates.percentageNodes;
                    randomizationMode = updates.randomizationMode;
                    createdAt = topic.createdAt;
                    lastScraped = topic.lastScraped;
                    totalUrlsScraped = topic.totalUrlsScraped;
                };
                topics.put(id, updatedTopic);
                #ok(updatedTopic)
            };
        };
    };

    public shared({ caller }) func deleteTopic(id: Text) : async Result.Result<(), Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        
        switch (topics.get(id)) {
            case null { #err("Topic not found") };
            case (?_) {
                topics.delete(id);
                #ok()
            };
        };
    };

    public shared({ caller }) func setTopicActive(id: Text, active: Bool) : async Result.Result<(), Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        
        switch (topics.get(id)) {
            case null { #err("Topic not found") };
            case (?topic) {
                let updatedTopic = {
                    topic with
                    status = if (active) "active" else "inactive";
                };
                topics.put(id, updatedTopic);
                #ok()
            };
        };
    };

    // Global AI Configuration
    public shared({ caller }) func setGlobalAIConfig(config: ?GlobalAIConfig) : async Result.Result<(), Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        globalAIConfig := config;
        #ok()
    };

    public query func getGlobalAIConfig() : async Result.Result<?GlobalAIConfig, Text> {
        #ok(globalAIConfig)
    };
    
    // Deprecated - for backwards compatibility
    public query func getAIConfig() : async Result.Result<?GlobalAIConfig, Text> {
        #ok(globalAIConfig)
    };

    // Get scraped data from storage
    public shared({ caller }) func getScrapedData(ids: [Text]) : async Result.Result<[ScrapedData], Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        
        try {
            let result = await storage.getScrapedData(ids);
            switch (result) {
                case (#ok(data)) { #ok(data) };
                case (#err(e)) { #err(e) };
            };
        } catch (e) {
            #err("Failed to fetch data from storage: " # Error.message(e))
        };
    };

    // Test extraction (mock implementation for now)
    public shared({ caller }) func testExtraction(url: Text, topicId: Text) : async Result.Result<Text, Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        
        #ok("Test extraction for " # url # " with topic " # topicId # " would be performed here")
    };

    // Get assigned topics based on node characteristics
    public query({ caller }) func getAssignedTopics(characteristics: NodeCharacteristics) : async Result.Result<[ScrapingTopic], Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        
        // For now, return all active topics
        // In the future, this could filter based on node characteristics
        let activeTopics = Array.filter<ScrapingTopic>(
            Iter.toArray(topics.vals()),
            func(t) = t.status == "active"
        );
        
        #ok(activeTopics)
    };

    // Award points to a user
    public shared({ caller }) func awardUserPoints(userPrincipal: Principal, points: Nat) : async Result.Result<Text, Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        
        // This should actually call the consumer canister to award points
        // For now, we'll create a stub that forwards to consumer canister
        #ok("Points awarding needs to be implemented through consumer canister")
    };

    // Manually assign points to a user (admin function)
    public shared({ caller }) func manuallyAssignPoints(userPrincipal: Principal, points: Nat, reason: Text) : async Result.Result<Text, Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        
        // This should call the consumer canister to update points
        // For now, return a stub response
        #ok("Manual points assignment needs to be implemented through consumer canister")
    };
}