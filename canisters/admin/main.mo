import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Float "mo:base/Float";
import HashMap "mo:base/HashMap";
import Buffer "mo:base/Buffer";
import StorageTypes "./types/storage";
import Iter "mo:base/Iter";
import Option "mo:base/Option";
import Debug "mo:base/Debug";
import Array "mo:base/Array";

actor Admin {
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
        addedAt: Time.Time;
    };

    type AIConfig = StorageTypes.AIConfig;
    type ScrapingTopic = StorageTypes.ScrapingTopic;
    type StorageActor = actor {
        getScrapedData: shared ([Text]) -> async [StorageTypes.ScrapedData];
        setTopicActive: shared (Text, Bool) -> async Result.Result<(), Text>;
    };

    // Stable storage
    private stable var stableUsers : [(Principal, User)] = [];
    private stable var stableAdmins : [(Principal, Bool)] = [];
    private stable var stableTopics : [(Text, ScrapingTopic)] = [];
    private stable var stableAIConfig : AIConfig = {
        apiKey = "";
        model = "gpt-4";
        costLimits = {
            maxDailyCost = 0.0;
            maxMonthlyCost = 0.0;
            maxConcurrent = 5;
        };
    };

    // Runtime state
    private var users = HashMap.HashMap<Principal, User>(1, Principal.equal, Principal.hash);
    private var admins = HashMap.HashMap<Principal, Bool>(1, Principal.equal, Principal.hash);
    private var topics = HashMap.HashMap<Text, ScrapingTopic>(1, Text.equal, Text.hash);
    private var _aiConfig : AIConfig = stableAIConfig;

    system func preupgrade() {
        stableAdmins := Iter.toArray(admins.entries());
        stableTopics := Iter.toArray(topics.entries());
        stableAIConfig := _aiConfig;
        // Migrate old topics to new format if needed
        stableTopics := Array.map<(Text, ScrapingTopic), (Text, ScrapingTopic)>(
            stableTopics,
            func((id, topic)) {
                let migratedFields = Array.map<StorageTypes.ScrapingField, StorageTypes.ScrapingField>(
                    topic.extractionRules.fields,
                    func(field) {
                        {
                            name = field.name;
                            fieldType = "text"; // Default to text for existing fields
                            required = field.required;
                            aiPrompt = field.aiPrompt;
                        }
                    }
                );
                (id, {
                    id = topic.id;
                    name = topic.name;
                    description = topic.description;
                    urlPatterns = topic.urlPatterns;
                    aiConfig = topic.aiConfig;
                    status = topic.status;
                    extractionRules = {
                        fields = migratedFields;
                        customPrompt = topic.extractionRules.customPrompt;
                    };
                    scrapingInterval = topic.scrapingInterval;
                    lastScraped = topic.lastScraped;
                    activeHours = topic.activeHours;
                    maxRetries = topic.maxRetries;
                    createdAt = topic.createdAt;
                })
            }
        );
    };

    system func postupgrade() {
        users := HashMap.fromIter<Principal, User>(stableUsers.vals(), 1, Principal.equal, Principal.hash);
        admins := HashMap.fromIter<Principal, Bool>(stableAdmins.vals(), 1, Principal.equal, Principal.hash);
        topics := HashMap.fromIter<Text, ScrapingTopic>(stableTopics.vals(), 1, Text.equal, Text.hash);
        _aiConfig := stableAIConfig;
        
        // Always initialize admin
        initializeAdmin();
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
        if (Principal.isAnonymous(caller)) {
            return true; // Allow anonymous access for local development
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

    private let STORAGE_CANISTER_ID: Text = "smxjh-2iaaa-aaaaj-az4rq-cai";
    private let storage: StorageActor = actor(STORAGE_CANISTER_ID);

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

    public shared({ caller }) func getTopics() : async Result.Result<[ScrapingTopic], Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        let result = Buffer.Buffer<ScrapingTopic>(0);
        for ((_, topic) in topics.entries()) {
            result.add(topic);
        };
        #ok(Buffer.toArray(result))
    };

    public shared({ caller }) func getAIConfig() : async Result.Result<AIConfig, Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        #ok(_aiConfig)
    };

    public shared({ caller }) func getScrapedData(topicIds: [Text]): async Result.Result<[StorageTypes.ScrapedData], Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        let result = await storage.getScrapedData(topicIds);
        #ok(result)
    };

    type CreateTopicRequest = {
        id: Text;
        name: Text;
        description: Text;
        urlPatterns: [Text];
        status: Text;
        extractionRules: StorageTypes.ExtractionRules;
    };

    public shared({ caller }) func createTopic(request: CreateTopicRequest) : async Result.Result<ScrapingTopic, Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };

        let topic: ScrapingTopic = {
            id = request.id;
            name = request.name;
            description = request.description;
            urlPatterns = request.urlPatterns;
            aiConfig = {
                apiKey = "";
                model = "gpt-3.5-turbo";
                costLimits = {
                    maxDailyCost = 1.0;
                    maxMonthlyCost = 10.0;
                    maxConcurrent = 5;
                };
            };
            status = request.status;
            extractionRules = request.extractionRules;
            scrapingInterval = 3600;
            lastScraped = 0;
            activeHours = {
                start = 0;
                end = 24;
            };
            maxRetries = 3;
            createdAt = Time.now();
        };

        topics.put(topic.id, topic);
        #ok(topic);
    };

    public shared({ caller }) func updateTopic(id: Text, request: { name: ?Text; description: ?Text; urlPatterns: ?[Text]; status: ?Text; extractionRules: ?StorageTypes.ExtractionRules }) : async Result.Result<ScrapingTopic, Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        
        switch (topics.get(id)) {
            case (null) { #err("Topic not found") };
            case (?topic) {
                let updatedTopic = {
                    topic with
                    name = Option.get(request.name, topic.name);
                    description = Option.get(request.description, topic.description);
                    urlPatterns = Option.get(request.urlPatterns, topic.urlPatterns);
                    status = Option.get(request.status, topic.status);
                    extractionRules = Option.get(request.extractionRules, topic.extractionRules);
                };
                topics.put(id, updatedTopic);
                #ok(updatedTopic)
            };
        }
    };

    public shared({ caller }) func setTopicActive(id: Text, active: Bool): async Result.Result<(), Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        switch (topics.get(id)) {
            case (null) { #err("Topic not found") };
            case (?topic) {
                let updatedTopic = {
                    topic with
                    status = if (active) "active" else "inactive";
                };
                topics.put(id, updatedTopic);
                ignore storage.setTopicActive(id, active);
                #ok(())
            };
        }
    };

    public shared({ caller }) func deleteTopic(id: Text) : async Result.Result<(), Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        
        switch (topics.get(id)) {
            case (null) { #err("Topic not found") };
            case (?_) {
                topics.delete(id);
                #ok()
            };
        }
    };

    public shared({ caller }) func updateAIConfig(config: AIConfig) : async Result.Result<AIConfig, Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        _aiConfig := config;
        #ok(_aiConfig)
    };

    public shared({ caller }) func updateLastScraped(id: Text, timestamp: Int) : async Result.Result<Text, Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        
        switch (topics.get(id)) {
            case (null) { #err("Topic not found") };
            case (?topic) {
                let updatedTopic = {
                    topic with
                    lastScraped = timestamp;
                };
                topics.put(id, updatedTopic);
                #ok("Updated successfully")
            };
        }
    };

    public shared({ caller }) func testExtraction(request: { url: Text; extraction_rules: { fields: [StorageTypes.ScrapingField]; customPrompt: ?Text } }) : async Result.Result<Text, Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        // TODO: Implement actual extraction test
        #ok("Test successful")
    };
}
