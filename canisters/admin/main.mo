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
        geolocationFilter: ?Text; // New field
        percentageNodes: ?Nat; // New field
        randomizationMode: ?Text; // New field
        createdAt: Int;
        lastScraped: Int;
    };

    

    type NodeCharacteristics = {
        ipAddress: Text;
        region: Text;
        percentageNodes: ?Nat;
        randomizationMode: ?Text;
    };

    private stable var registeredNodes : HashMap.HashMap<Principal, NodeCharacteristics> = HashMap.HashMap<Principal, NodeCharacteristics>(0, Principal.equal, Principal.hash);

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
    private let CONSUMER_CANISTER_ID: Text = "tgyl5-yyaaa-aaaaj-az4wq-cai";
    private let USER_PRINCIPAL_ID: Text = "p6gaf-qjt3x-6q6ci-ro7nd-aklhp-6hgfo-4dljo-busl6-3ftgp-iliyi-zqe";
    

    // Stable storage
    private stable var stableUsers : [(Principal, User)] = [];
    private stable var stableAdmins : [(Principal, Bool)] = [];
    private stable var stableTopics : [(Text, ScrapingTopic)] = [];
    private stable var stableAIConfig : ?AIConfig = null;
    private stable var initialized : Bool = false;

    // Runtime state
    private var users = HashMap.HashMap<Principal, User>(10, Principal.equal, Principal.hash);
    private var admins = HashMap.HashMap<Principal, Bool>(10, Principal.equal, Principal.hash);
    private var topics = HashMap.HashMap<Text, ScrapingTopic>(10, Text.equal, Text.hash);
    private var aiConfig : AIConfig = {
        apiKey = ""; // API key should be set via updateAIConfig, not hardcoded
        model = "gpt-3.5-turbo";
        costLimits = {
            maxDailyCost = 10.0;
            maxMonthlyCost = 100.0;
            maxConcurrent = 5;
        };
        temperature = 0.7;
        maxTokens = 4000;
    };

    // Canister references
    private let storage: StorageActor = actor(STORAGE_CANISTER_ID);

    // Initialize admin
    private func initializeAdmin() {
        Debug.print("Initializing admin canister");
        
        // Add the user principal to admins
        let userPrincipal = Principal.fromText(USER_PRINCIPAL_ID);
        admins.put(userPrincipal, true);
        
        
        
        // Add the user as a SuperAdmin
        let user : User = {
            principal = userPrincipal;
            role = #SuperAdmin;
            addedBy = userPrincipal;
            addedAt = Time.now();
        };
        users.put(userPrincipal, user);
        
        
        
        Debug.print("Added user principal to admins: " # USER_PRINCIPAL_ID);
        
        initialized := true;
    };

    // Lifecycle hooks
    system func preupgrade() {
        stableUsers := Iter.toArray(users.entries());
        stableAdmins := Iter.toArray(admins.entries());
        stableTopics := Iter.toArray(topics.entries());
        stableAIConfig := ?aiConfig;
    };

    system func postupgrade() {
        users := HashMap.fromIter<Principal, User>(stableUsers.vals(), 10, Principal.equal, Principal.hash);
        admins := HashMap.fromIter<Principal, Bool>(stableAdmins.vals(), 10, Principal.equal, Principal.hash);
        topics := HashMap.fromIter<Text, ScrapingTopic>(stableTopics.vals(), 10, Text.equal, Text.hash);
        
        switch (stableAIConfig) {
            case (?config) { aiConfig := config; };
            case (null) {};
        };

        // Always initialize admin on postupgrade
        initializeAdmin();
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
            Debug.print("User principal explicitly authorized");
            return true;
        };
        
        
        
        // Allow anonymous principal for testing
        if (Principal.isAnonymous(caller)) {
            Debug.print("Anonymous principal authorized for testing");
            return true;
        };
        
        switch (users.get(caller)) {
            case (?user) {
                Debug.print("User found: " # Principal.toText(user.principal));
                switch (user.role) {
                    case (#SuperAdmin) { true };
                    case (#Admin) { true };
                    case (#Operator) { false };
                }
            };
            case null { 
                Debug.print("User not found: " # callerStr);
                admins.get(caller) == ?true 
            };
        }
    };

    // Consumer canister check
    private func _isConsumerCanister(caller: Principal): Bool {
        let callerStr = Principal.toText(caller);
        let isConsumer = Text.equal(callerStr, CONSUMER_CANISTER_ID);
        Debug.print("Admin _isConsumerCanister: Caller: " # callerStr # ", Expected: " # CONSUMER_CANISTER_ID # ", Match: " # Bool.toText(isConsumer));
        isConsumer
    };

    // User management
    public shared({ caller }) func add_user(p: Principal, role: UserRole) : async Result.Result<(), Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        
        let user : User = {
            principal = p;
            role = role;
            addedBy = caller;
            addedAt = Time.now();
        };
        users.put(p, user);
        #ok()
    };

    public shared({ caller }) func remove_user(p: Principal) : async Result.Result<(), Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        users.delete(p);
        #ok()
    };

    public shared({ caller }) func get_users() : async Result.Result<[User], Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        let result = Buffer.Buffer<User>(0);
        for ((_, user) in users.entries()) {
            result.add(user);
        };
        #ok(Buffer.toArray(result))
    };

    // Topic management
    public query({ caller }) func getTopics() : async Result.Result<[ScrapingTopic], Text> {
        if (not _isAuthorized(caller)) {
            Debug.print("getTopics: Unauthorized");
            return #err("Unauthorized");
        };
        
        Debug.print("getTopics: Authorized, returning topics");
        #ok(Iter.toArray(topics.vals()))
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
        #ok(Iter.toArray(topics.vals()))
    };

    public shared({ caller }) func getAssignedTopics(nodeCharacteristics: NodeCharacteristics) : async Result.Result<[ScrapingTopic], Text> {
        if (not _isAuthorized(caller)) { // Assuming nodes will be authorized
            return #err("Unauthorized");
        };

        let filteredTopics = Buffer.Buffer<ScrapingTopic>(0);
        for ((_, topic) in topics.entries()) {
            var includeTopic = true;

            // Geolocation filtering
            switch (topic.geolocationFilter) {
                case (?filterRegion) {
                    if (not Text.equal(filterRegion, nodeCharacteristics.region)) {
                        includeTopic := false;
                    };
                };
                case (null) {}; // No geolocation filter, so include by default
            };

            if (includeTopic) {
                filteredTopics.add(topic);
            };
        };

        var finalTopics = Iter.toArray(filteredTopics.vals());

        // Percentage Nodes filtering
        switch (nodeCharacteristics.percentageNodes) { // Assuming nodeCharacteristics can also have percentageNodes
            case (?percentage) {
                if (percentage >= 0 and percentage <= 100) {
                    let numTopics = Array.size(finalTopics);
                    let topicsToSelect = Nat.toNat(Float.round(Float.fromNat(numTopics) * (Float.fromNat(percentage) / 100.0)));
                    
                    // Simple pseudo-random selection for percentage
                    // NOTE: This is a very basic PRNG. For production environments requiring
                    // strong randomness or cryptographic security, a more robust solution
                    // (e.g., integration with a randomness oracle or a more sophisticated
                    // state-based PRNG) would be necessary.
                    var seed = Time.now();
                    let nextRandom = func() : Nat {
                        seed := (seed * 1103515245 + 12345) % 2147483647;
                        return Nat.abs(seed);
                    };

                    let selectedTopics = Buffer.Buffer<ScrapingTopic>(0);
                    var indices = Buffer.Buffer<Nat>(0);
                    for (i in Iter.range(0, numTopics - 1)) {
                        indices.add(i);
                    };
                    
                    // Shuffle indices (Fisher-Yates-like)
                    for (i in Iter.range(numTopics - 1, 1)) {
                        let j = nextRandom() % (i + 1);
                        let temp = indices.get(i);
                        indices.set(i, indices.get(j));
                        indices.set(j, temp);
                    };

                    for (i in Iter.range(0, topicsToSelect - 1)) {
                        if (i < Array.size(Iter.toArray(indices.vals()))) { // Ensure index is within bounds
                            selectedTopics.add(finalTopics[indices.get(i)]);
                        };
                    };
                    finalTopics := Iter.toArray(selectedTopics.vals());
                };
            };
            case (null) {};
        };

        // Randomization Mode
        switch (nodeCharacteristics.randomizationMode) { // Assuming nodeCharacteristics can also have randomizationMode
            case (?mode) {
                if (Text.equal(mode, "shuffle")) {
                    // Re-shuffle the finalTopics array
                    var seed = Time.now();
                    let nextRandom = func() : Nat {
                        seed := (seed * 1103515245 + 12345) % 2147483647;
                        return Nat.abs(seed);
                    };

                    let numTopics = Array.size(finalTopics);
                    for (i in Iter.range(numTopics - 1, 1)) {
                        let j = nextRandom() % (i + 1);
                        let temp = finalTopics[i];
                        finalTopics[i] := finalTopics[j];
                        finalTopics[j] := temp;
                    };
                };
            };
            case (null) {};
        };

        #ok(finalTopics)
    };

    public shared({ caller }) func addTopic(topic: ScrapingTopic) : async Result.Result<(), Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        topics.put(topic.id, topic);
        #ok()
    };

    public shared({ caller }) func updateTopic(topic: ScrapingTopic) : async Result.Result<(), Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        topics.put(topic.id, topic);
        #ok()
    };

    public shared({ caller }) func deleteTopic(id: Text) : async Result.Result<(), Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        topics.delete(id);
        #ok()
    };

    // AI Config management
    public shared({ caller }) func getAIConfig() : async Result.Result<AIConfig, Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        #ok(aiConfig)
    };

    public shared({ caller }) func updateAIConfig(config: AIConfig) : async Result.Result<(), Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        aiConfig := config;
        #ok()
    };

    // Topic status management
    public shared({ caller }) func setTopicActive(id: Text, active: Bool): async Result.Result<(), Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        
        switch (topics.get(id)) {
            case (?topic) {
                let updatedTopic = {
                    id = topic.id;
                    name = topic.name;
                    description = topic.description;
                    urlPatterns = topic.urlPatterns;
                    aiConfig = topic.aiConfig;
                    status = if (active) "active" else "inactive";
                    extractionRules = topic.extractionRules;
                    scrapingInterval = topic.scrapingInterval;
                    lastScraped = topic.lastScraped;
                    activeHours = topic.activeHours;
                    maxRetries = topic.maxRetries;
                    createdAt = topic.createdAt;
                    siteTypeClassification = topic.siteTypeClassification;
                    urlGenerationStrategy = topic.urlGenerationStrategy;
                    articleUrlPatterns = topic.articleUrlPatterns;
                    contentIdentifiers = topic.contentIdentifiers;
                    paginationPatterns = topic.paginationPatterns;
                    sampleArticleUrls = topic.sampleArticleUrls;
                    excludePatterns = topic.excludePatterns;
                    geolocationFilter = topic.geolocationFilter;
                    percentageNodes = topic.percentageNodes;
                    randomizationMode = topic.randomizationMode;
                };
                topics.put(id, updatedTopic);
                #ok()
            };
            case (null) {
                #err("Topic not found")
            };
        }
    };

    // Update last scraped time
    public shared({ caller }) func updateLastScraped(id: Text): async Result.Result<(), Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        
        switch (topics.get(id)) {
            case (?topic) {
                let updatedTopic = {
                    id = topic.id;
                    name = topic.name;
                    description = topic.description;
                    urlPatterns = topic.urlPatterns;
                    aiConfig = topic.aiConfig;
                    status = topic.status;
                    extractionRules = topic.extractionRules;
                    scrapingInterval = topic.scrapingInterval;
                    lastScraped = Time.now();
                    activeHours = topic.activeHours;
                    maxRetries = topic.maxRetries;
                    createdAt = topic.createdAt;
                    siteTypeClassification = topic.siteTypeClassification;
                    urlGenerationStrategy = topic.urlGenerationStrategy;
                    articleUrlPatterns = topic.articleUrlPatterns;
                    contentIdentifiers = topic.contentIdentifiers;
                    paginationPatterns = topic.paginationPatterns;
                    sampleArticleUrls = topic.sampleArticleUrls;
                    excludePatterns = topic.excludePatterns;
                    geolocationFilter = topic.geolocationFilter;
                    percentageNodes = topic.percentageNodes;
                    randomizationMode = topic.randomizationMode;
                };
                topics.put(id, updatedTopic);
                #ok()
            };
            case (null) {
                #err("Topic not found")
            };
        }
    };

    // Get scraped data
    public shared({ caller }) func getScrapedData(topicIds: [Text]): async Result.Result<[ScrapedData], Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        
        try {
            let result = await storage.getScrapedData(topicIds);
            return result;
        } catch (e) {
            return #err("Error calling storage canister: " # Error.message(e));
        };
    };

    // Test extraction
    public shared({ caller }) func testExtraction(url: Text, topic: ScrapingTopic): async Result.Result<Text, Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        
        // This is just a placeholder - in a real implementation, this would
        // actually test the extraction rules on the given URL
        #ok("Extraction test successful. URL: " # url # ", Topic: " # topic.name)
    };

    // Create topic with request
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
        geolocationFilter: ?Text;
        percentageNodes: ?Nat;
        randomizationMode: ?Text;
    };

    public shared({ caller }) func createTopic(request: CreateTopicRequest): async Result.Result<ScrapingTopic, Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        
        let id = Text.concat(request.name, "-" # Int.toText(Time.now()));
        
        let topic: ScrapingTopic = {
            id = id;
            name = request.name;
            description = request.description;
            urlPatterns = request.urlPatterns;
            aiConfig = aiConfig;
            status = "active";
            extractionRules = request.extractionRules;
            scrapingInterval = request.scrapingInterval;
            lastScraped = Time.now();
            activeHours = request.activeHours;
            maxRetries = request.maxRetries;
            createdAt = Time.now();
            siteTypeClassification = request.siteTypeClassification;
            urlGenerationStrategy = request.urlGenerationStrategy;
            articleUrlPatterns = request.articleUrlPatterns;
            contentIdentifiers = request.contentIdentifiers;
            paginationPatterns = request.paginationPatterns;
            sampleArticleUrls = request.sampleArticleUrls;
            excludePatterns = request.excludePatterns;
            geolocationFilter = request.geolocationFilter;
            percentageNodes = request.percentageNodes;
            randomizationMode = request.randomizationMode;
        };
        
        topics.put(id, topic);
        #ok(topic)
    };

    // Utility methods
    public query({ caller }) func isAuthorized() : async Bool {
        Debug.print("isAuthorized check for: " # Principal.toText(caller));
        _isAuthorized(caller)
    };
}
