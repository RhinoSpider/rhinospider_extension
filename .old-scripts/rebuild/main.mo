import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Buffer "mo:base/Buffer";
import HashMap "mo:base/HashMap";
import Text "mo:base/Text";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Time "mo:base/Time";
import Bool "mo:base/Bool";
import Debug "mo:base/Debug";
import Nat "mo:base/Nat";
import Int "mo:base/Int";

actor AdminBackend {
    // Types
    type UserRole = {
        #SuperAdmin;
        #Admin;
        #Operator;
    };

    type User = {
        principal: Principal;
        role: UserRole;
        addedBy: Principal;
        addedAt: Int;
    };

    type AIConfig = {
        apiKey: Text;
        model: Text;
        costLimits: {
            maxDailyCost: Float;
            maxMonthlyCost: Float;
            maxConcurrent: Nat;
        };
    };

    type ContentIdentifiers = {
        titleSelector: Text;
        contentSelector: Text;
        dateSelector: Text;
        authorSelector: Text;
    };

    type ScrapingTopic = {
        id: Text;
        name: Text;
        description: Text;
        urlPatterns: [Text];
        aiConfig: AIConfig;
        status: Text;
        extractionRules: {
            title: Text;
            content: Text;
            date: Text;
            author: Text;
        };
        scrapingInterval: Nat;
        lastScraped: Int;
        activeHours: {
            start: Nat;
            end: Nat;
        };
        maxRetries: Nat;
        createdAt: Int;
        siteTypeClassification: Text;
        urlGenerationStrategy: Text;
        articleUrlPatterns: ?[Text];
        contentIdentifiers: ?ContentIdentifiers;
        paginationPatterns: ?[Text];
        excludePatterns: ?[Text];
    };

    type StorageActor = actor {
        submitScrapedData : (ScrapedData) -> async Result.Result<(), Text>;
        getScrapedData : ([Text]) -> async Result.Result<[ScrapedData], Text>;
    };

    type ScrapedData = {
        id: Text;
        topicId: Text;
        url: Text;
        title: Text;
        content: Text;
        author: ?Text;
        publishDate: ?Int;
        scrapedAt: Int;
        status: Text;
        metadata: ?{
            #Json: Text;
            #Cbor: [Nat8];
        };
    };

    // State variables with stable storage
    private stable var stableUsers: [(Principal, User)] = [];
    private var users = HashMap.HashMap<Principal, User>(10, Principal.equal, Principal.hash);

    private stable var stableAdmins: [(Principal, Bool)] = [];
    private var admins = HashMap.HashMap<Principal, Bool>(10, Principal.equal, Principal.hash);

    private stable var stableTopics: [(Text, ScrapingTopic)] = [];
    private var topics = HashMap.HashMap<Text, ScrapingTopic>(10, Text.equal, Text.hash);

    private stable var stableAIConfig: ?AIConfig = null;
    private var aiConfig: AIConfig = {
        apiKey = "default-api-key";
        model = "gpt-3.5-turbo";
        costLimits = {
            maxDailyCost = 10.0;
            maxMonthlyCost = 100.0;
            maxConcurrent = 5;
        };
    };

    // Upgrade hooks
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
        
        if (topics.size() > 0) {
            let firstTopic = topics.entries().next();
            Debug.print("Postupgrade - First topic: " # firstTopic.0);
            let topic = firstTopic.1;
            Debug.print("Postupgrade - First topic excludePatterns: " # debug_show(topic.excludePatterns));
        };
    };

    // Initialize admin
    private func initializeAdmin() {
        let adminPrincipal = Principal.fromText("t52au-jmmys-xpd7e-f2cc7-xgsya-2ajbl-22leo-e7hep-kclwp-kqzoq-jae");
        let admin : User = {
            principal = adminPrincipal;
            role = #SuperAdmin;
            addedBy = adminPrincipal;
            addedAt = Time.now();
        };
        users.put(adminPrincipal, admin);
        admins.put(adminPrincipal, true);
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
        
        // Fallback check using == operator
        if (callerStr == CONSUMER_CANISTER_ID) {
            Debug.print("Consumer canister authorized via == operator");
            return true;
        };
        
        // Explicitly allow the user's principal
        if (callerStr == "t52au-jmmys-xpd7e-f2cc7-xgsya-2ajbl-22leo-e7hep-kclwp-kqzoq-jae") {
            Debug.print("User principal explicitly authorized");
            return true;
        };
        
        if (Principal.isAnonymous(caller)) {
            Debug.print("Anonymous caller rejected");
            return false; // Never allow anonymous access in production
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

    // Constants
    private let STORAGE_CANISTER_ID: Text = "hhaip-uiaaa-aaaao-a4khq-cai"; // Updated to the latest storage canister ID
    private let CONSUMER_CANISTER_ID: Text = "tgyl5-yyaaa-aaaaj-az4wq-cai";

    // Canister references
    private let storage: StorageActor = actor(STORAGE_CANISTER_ID);

    // Authorization checks
    private func _isConsumerCanister(caller: Principal): Bool {
        // Use Text.equal for reliable string comparison
        let callerStr = Principal.toText(caller);
        let isConsumer = Text.equal(callerStr, CONSUMER_CANISTER_ID);
        Debug.print("Admin _isConsumerCanister: Caller: " # callerStr # ", Expected: " # CONSUMER_CANISTER_ID # ", Match: " # Bool.toText(isConsumer));
        
        // Double check with both methods for debugging
        let isConsumerDirect = callerStr == CONSUMER_CANISTER_ID;
        if (isConsumer != isConsumerDirect) {
            Debug.print("WARNING: String comparison mismatch! Text.equal: " # Bool.toText(isConsumer) # ", == operator: " # Bool.toText(isConsumerDirect));
        };
        
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

    // Topic management for admin portal
    public query({ caller }) func getTopics() : async Result.Result<[ScrapingTopic], Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        
        let topicsArray = Iter.toArray(topics.vals());
        
        // Debug print to check if contentIdentifiers is being included in the returned topics
        if (topicsArray.size() > 0) {
            Debug.print("First topic contentIdentifiers: " # debug_show(topicsArray[0].contentIdentifiers));
        };
        
        #ok(topicsArray)
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
        
        // Return topics since consumer canister is authorized
        let result = Buffer.Buffer<ScrapingTopic>(0);
        for ((_, topic) in topics.entries()) {
            result.add(topic);
        };
        
        let topicsArray = Buffer.toArray(result);
        Debug.print("Admin getTopics_with_caller: Returning " # Nat.toText(topicsArray.size()) # " topics");
        #ok(topicsArray)
    };

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

    // Initialize with some sample data
    public shared({ caller }) func initializeSampleData() : async Result.Result<(), Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        
        // Initialize admin if not already done
        initializeAdmin();
        
        // Add a sample topic
        let sampleTopic: ScrapingTopic = {
            id = "sample-topic-1";
            name = "Sample Topic";
            description = "This is a sample topic for testing";
            urlPatterns = ["https://example.com/*"];
            aiConfig = {
                apiKey = "sample-api-key";
                model = "gpt-3.5-turbo";
                costLimits = {
                    maxDailyCost = 5.0;
                    maxMonthlyCost = 50.0;
                    maxConcurrent = 3;
                };
            };
            status = "active";
            extractionRules = {
                title = "h1";
                content = "article";
                date = ".date";
                author = ".author";
            };
            scrapingInterval = 3600;
            lastScraped = Time.now();
            activeHours = {
                start = 0;
                end = 24;
            };
            maxRetries = 3;
            createdAt = Time.now();
            siteTypeClassification = "blog";
            urlGenerationStrategy = "sitemap";
            articleUrlPatterns = ?["https://example.com/blog/*"];
            contentIdentifiers = ?{
                titleSelector = "h1";
                contentSelector = "article";
                dateSelector = ".date";
                authorSelector = ".author";
            };
            paginationPatterns = ?["https://example.com/blog/page/*"];
            excludePatterns = ?["https://example.com/blog/category/*"];
        };
        
        topics.put(sampleTopic.id, sampleTopic);
        
        #ok()
    };

    // System management
    public shared({ caller }) func clearAllData() : async Result.Result<(), Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        
        users := HashMap.HashMap<Principal, User>(10, Principal.equal, Principal.hash);
        admins := HashMap.HashMap<Principal, Bool>(10, Principal.equal, Principal.hash);
        topics := HashMap.HashMap<Text, ScrapingTopic>(10, Text.equal, Text.hash);
        
        // Re-initialize admin
        initializeAdmin();
        
        #ok()
    };
}
