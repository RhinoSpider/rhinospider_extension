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
        createdAt: Int;
        lastScraped: Int;
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

    // Stable storage
    private stable var stableUsers : [(Principal, User)] = [];
    private stable var stableAdmins : [(Principal, Bool)] = [];
    private stable var stableTopics : [(Text, ScrapingTopic)] = [];
    private stable var stableAIConfig : ?AIConfig = null;

    // Runtime state
    private var users = HashMap.HashMap<Principal, User>(10, Principal.equal, Principal.hash);
    private var admins = HashMap.HashMap<Principal, Bool>(10, Principal.equal, Principal.hash);
    private var topics = HashMap.HashMap<Text, ScrapingTopic>(10, Text.equal, Text.hash);
    private var aiConfig : AIConfig = {
        apiKey = "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";
        model = "gpt-3.5-turbo";
        costLimits = {
            maxDailyCost = 10.0;
            maxMonthlyCost = 100.0;
            maxConcurrent = 5;
        };
        temperature = 0.7;
        maxTokens = 4000;
    };

    // Constants
    private let STORAGE_CANISTER_ID: Text = "hhaip-uiaaa-aaaao-a4khq-cai";
    private let CONSUMER_CANISTER_ID: Text = "tgyl5-yyaaa-aaaaj-az4wq-cai";
    private let USER_PRINCIPAL_ID: Text = "t52au-jmmys-xpd7e-f2cc7-xgsya-2ajbl-22leo-e7hep-kclwp-kqzoq-jae";

    // Canister references
    private let storage: StorageActor = actor(STORAGE_CANISTER_ID);

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

        // Ensure the user principal is always authorized
        let userPrincipal = Principal.fromText(USER_PRINCIPAL_ID);
        admins.put(userPrincipal, true);
    };

    // Authorization check
    private func _isAuthorized(caller: Principal) : Bool {
        let callerStr = Principal.toText(caller);
        Debug.print("Authorization check for caller: " # callerStr);
        
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
        
        if (Principal.isAnonymous(caller)) {
            Debug.print("Anonymous caller rejected");
            return false;
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
