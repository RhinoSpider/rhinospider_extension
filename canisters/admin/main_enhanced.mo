import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Float "mo:base/Float";
import HashMap "mo:base/HashMap";
import Buffer "mo:base/Buffer";
import StorageTypes "./types/storage_enhanced";
import Iter "mo:base/Iter";
import Option "mo:base/Option";
import Debug "mo:base/Debug";
import Array "mo:base/Array";
import Bool "mo:base/Bool";
import Error "mo:base/Error";

actor Admin {
    // Types
    type UserRole = {
        #SuperAdmin;
        #Admin;
        #User;
    };

    type AIConfig = StorageTypes.AIConfig;
    type ScrapingTopic = StorageTypes.ScrapingTopic;
    type ContentIdentifiers = StorageTypes.ContentIdentifiers;
    type StorageActor = actor {
        getScrapedData: shared ([Text]) -> async Result.Result<[StorageTypes.ScrapedData], Text>;
        setTopicActive: shared (Text, Bool) -> async Result.Result<(), Text>;
    };

    // State
    private stable var usersEntries : [(Principal, UserRole)] = [];
    private var users = HashMap.HashMap<Principal, UserRole>(10, Principal.equal, Principal.hash);

    private stable var topicsEntries : [(Text, ScrapingTopic)] = [];
    private var topics = HashMap.HashMap<Text, ScrapingTopic>(10, Text.equal, Text.hash);

    private let storage : StorageActor = actor("be2us-64aaa-aaaaa-qaabq-cai"); // Replace with actual canister ID

    // Init
    private func _isAuthorized(caller : Principal) : Bool {
        switch (users.get(caller)) {
            case (?role) {
                switch (role) {
                    case (#SuperAdmin) { true };
                    case (#Admin) { true };
                    case (_) { false };
                };
            };
            case (null) { false };
        };
    };

    system func preupgrade() {
        usersEntries := Iter.toArray(users.entries());
        
        topicsEntries := Iter.toArray(
            Iter.map<(Text, ScrapingTopic), (Text, ScrapingTopic)>(
                topics.entries(),
                func ((id, topic)) {
                    let migratedFields = Array.map<StorageTypes.ScrapingField, StorageTypes.ScrapingField>(
                        topic.extractionRules.fields,
                        func (field) {
                            {
                                name = field.name;
                                fieldType = field.fieldType;
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
                        articleUrlPatterns = topic.articleUrlPatterns;
                        siteTypeClassification = topic.siteTypeClassification;
                        contentIdentifiers = topic.contentIdentifiers;
                        paginationPatterns = topic.paginationPatterns;
                        sampleArticleUrls = topic.sampleArticleUrls;
                        urlGenerationStrategy = topic.urlGenerationStrategy;
                        excludePatterns = topic.excludePatterns;
                    })
                }
            )
        );
    };

    system func postupgrade() {
        users := HashMap.fromIter<Principal, UserRole>(usersEntries.vals(), 10, Principal.equal, Principal.hash);
        usersEntries := [];

        topics := HashMap.fromIter<Text, ScrapingTopic>(topicsEntries.vals(), 10, Text.equal, Text.hash);
        topicsEntries := [];

        // Add default admin user if none exists
        if (users.size() == 0) {
            users.put(Principal.fromText("2vxsx-fae"), #SuperAdmin); // Replace with actual admin principal
        };
    };

    // User management
    public shared({ caller }) func addUser(principal: Principal, role: UserRole) : async Result.Result<(), Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        
        users.put(principal, role);
        #ok()
    };

    public shared({ caller }) func removeUser(principal: Principal) : async Result.Result<(), Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        
        users.delete(principal);
        #ok()
    };

    public shared({ caller }) func getUsers() : async Result.Result<[(Principal, UserRole)], Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        
        #ok(Iter.toArray(users.entries()))
    };

    // Topic management
    public shared({ caller }) func getTopics() : async Result.Result<[ScrapingTopic], Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        
        #ok(Iter.toArray(Iter.map<(Text, ScrapingTopic), ScrapingTopic>(topics.entries(), func ((_, v)) { v })))
    };

    public shared({ caller }) func getTopic(id: Text) : async Result.Result<ScrapingTopic, Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        
        switch (topics.get(id)) {
            case (null) { #err("Topic not found") };
            case (?topic) { #ok(topic) };
        }
    };

    type CreateTopicRequest = {
        id: Text;
        name: Text;
        description: Text;
        urlPatterns: [Text];
        status: Text;
        extractionRules: StorageTypes.ExtractionRules;
        articleUrlPatterns: ?[Text];
        siteTypeClassification: ?Text;
        contentIdentifiers: ?ContentIdentifiers;
        paginationPatterns: ?[Text];
        sampleArticleUrls: ?[Text];
        urlGenerationStrategy: ?Text;
        excludePatterns: ?[Text];
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
            articleUrlPatterns = request.articleUrlPatterns;
            siteTypeClassification = request.siteTypeClassification;
            contentIdentifiers = request.contentIdentifiers;
            paginationPatterns = request.paginationPatterns;
            sampleArticleUrls = request.sampleArticleUrls;
            urlGenerationStrategy = request.urlGenerationStrategy;
            excludePatterns = request.excludePatterns;
        };

        topics.put(topic.id, topic);
        #ok(topic);
    };

    public shared({ caller }) func updateTopic(id: Text, request: { 
        name: ?Text; 
        description: ?Text; 
        urlPatterns: ?[Text]; 
        status: ?Text; 
        extractionRules: ?StorageTypes.ExtractionRules;
        articleUrlPatterns: ?[Text];
        siteTypeClassification: ?Text;
        contentIdentifiers: ?ContentIdentifiers;
        paginationPatterns: ?[Text];
        sampleArticleUrls: ?[Text];
        urlGenerationStrategy: ?Text;
        excludePatterns: ?[Text];
    }) : async Result.Result<Text, Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        
        switch (topics.get(id)) {
            case (null) { #err("Topic not found") };
            case (?topic) {
                let updatedTopic = {
                    id = topic.id;
                    name = Option.get(request.name, topic.name);
                    description = Option.get(request.description, topic.description);
                    urlPatterns = Option.get(request.urlPatterns, topic.urlPatterns);
                    aiConfig = topic.aiConfig;
                    status = Option.get(request.status, topic.status);
                    extractionRules = Option.get(request.extractionRules, topic.extractionRules);
                    scrapingInterval = topic.scrapingInterval;
                    lastScraped = topic.lastScraped;
                    activeHours = topic.activeHours;
                    maxRetries = topic.maxRetries;
                    createdAt = topic.createdAt;
                    articleUrlPatterns = Option.get(request.articleUrlPatterns, topic.articleUrlPatterns);
                    siteTypeClassification = Option.get(request.siteTypeClassification, topic.siteTypeClassification);
                    contentIdentifiers = Option.get(request.contentIdentifiers, topic.contentIdentifiers);
                    paginationPatterns = Option.get(request.paginationPatterns, topic.paginationPatterns);
                    sampleArticleUrls = Option.get(request.sampleArticleUrls, topic.sampleArticleUrls);
                    urlGenerationStrategy = Option.get(request.urlGenerationStrategy, topic.urlGenerationStrategy);
                    excludePatterns = Option.get(request.excludePatterns, topic.excludePatterns);
                };
                topics.put(id, updatedTopic);
                #ok("Topic updated successfully")
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
                    articleUrlPatterns = topic.articleUrlPatterns;
                    siteTypeClassification = topic.siteTypeClassification;
                    contentIdentifiers = topic.contentIdentifiers;
                    paginationPatterns = topic.paginationPatterns;
                    sampleArticleUrls = topic.sampleArticleUrls;
                    urlGenerationStrategy = topic.urlGenerationStrategy;
                    excludePatterns = topic.excludePatterns;
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
        
        #ok(config)
    };

    public shared({ caller }) func updateLastScraped(id: Text, timestamp: Int) : async Result.Result<Text, Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        
        switch (topics.get(id)) {
            case (null) { #err("Topic not found") };
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
                    lastScraped = timestamp;
                    activeHours = topic.activeHours;
                    maxRetries = topic.maxRetries;
                    createdAt = topic.createdAt;
                    articleUrlPatterns = topic.articleUrlPatterns;
                    siteTypeClassification = topic.siteTypeClassification;
                    contentIdentifiers = topic.contentIdentifiers;
                    paginationPatterns = topic.paginationPatterns;
                    sampleArticleUrls = topic.sampleArticleUrls;
                    urlGenerationStrategy = topic.urlGenerationStrategy;
                    excludePatterns = topic.excludePatterns;
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
        
        // This would call an external service to test extraction
        // For now, just return a mock result
        #ok("{\"title\": \"Test Title\", \"content\": \"Test Content\"}")
    };

    public shared({ caller }) func getScrapedData(topicIds: [Text]) : async Result.Result<[StorageTypes.ScrapedData], Text> {
        if (not _isAuthorized(caller)) {
            return #err("Unauthorized");
        };
        
        try {
            await storage.getScrapedData(topicIds)
        } catch (e) {
            #err("Failed to get scraped data: " # Debug.trap(Error.message(e)))
        }
    };

    // Public methods (no auth required)
    public query func whoami() : async Principal {
        return Principal.fromActor(Admin);
    };

    public query func getCanisterInfo() : async Text {
        return "Admin Canister";
    };
}
