import Result "mo:base/Result";
import Principal "mo:base/Principal";
import _Debug "mo:base/Debug";
import Buffer "mo:base/Buffer";
import Array "mo:base/Array";
import Time "mo:base/Time";
import Text "mo:base/Text";
import Int "mo:base/Int";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import _Float "mo:base/Float";
import _Hash "mo:base/Hash";
import Iter "mo:base/Iter";
import HashMap "mo:base/HashMap";
import Error "mo:base/Error";
import Char "mo:base/Char";
import Types "./types/storage";

// Import actor interfaces
import StorageTypes "./types/storage";

actor Admin {
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

    type Task = {
        id: Text;
        url: Text;
        topic: Text;
        priority: Nat;
        createdAt: Int;
        assignedTo: ?Principal;
        status: Text;
    };

    type TaskConfig = {
        topics: [Text];
        targetSites: [Text];
        scanInterval: Nat;
        maxBandwidthPerDay: Nat;
    };

    type CostLimits = {
        dailyUSD: Nat;
        monthlyUSD: Nat;
        maxConcurrent: Nat;
    };

    type AIConfig = Types.AIConfig;

    type ScrapingField = StorageTypes.ScrapingField;

    type ScrapingTopic = StorageTypes.ScrapingTopic;

    type CreateTopicRequest = {
        id: Text;
        name: Text;
        description: Text;
        urlPatterns: [Text];
        active: Bool;
        extractionRules: StorageTypes.ExtractionRules;
        validation: StorageTypes.Validation;
        rateLimit: StorageTypes.RateLimit;
    };

    private var tasks = HashMap.HashMap<Text, Task>(0, Text.equal, Text.hash);
    private var config = HashMap.HashMap<Text, TaskConfig>(1, Text.equal, Text.hash);
    private var admins = HashMap.HashMap<Principal, Bool>(0, Principal.equal, Principal.hash);
    private var users = HashMap.HashMap<Principal, User>(10, Principal.equal, Principal.hash);
    private var topics = HashMap.HashMap<Text, ScrapingTopic>(0, Text.equal, Text.hash);
    private stable var stableTopics : [(Text, ScrapingTopic)] = [];
    private stable var _users : [(Principal, User)] = [];
    private stable var _topics : [(Text, ScrapingTopic)] = [];

    // Default AI configuration
    private stable var _aiConfig : AIConfig = {
        apiKey = "";
        model = "gpt-3.5-turbo";
        costLimits = {
            dailyUSD = 10;
            monthlyUSD = 100;
            maxConcurrent = 5;
        };
    };

    private var _cachedAIConfig : ?AIConfig = null;
    private let STORAGE_CANISTER_ID = "br5f7-7uaaa-aaaaa-qaaca-cai";
    private let storage : StorageTypes.Storage = actor(STORAGE_CANISTER_ID);

    system func preupgrade() {
        stableTopics := Iter.toArray(topics.entries());
        _users := Iter.toArray(users.entries());
        _topics := Iter.toArray(topics.entries());
    };

    system func postupgrade() {
        topics := HashMap.fromIter<Text, ScrapingTopic>(stableTopics.vals(), 0, Text.equal, Text.hash);
        users := HashMap.fromIter<Principal, User>(_users.vals(), 10, Principal.equal, Principal.hash);
        _users := [];
        _topics := [];
        
        // Initialize admin for local development
        let _INITIAL_ADMIN = "ynyv4-or367-gln75-f3usn-xabzu-a4s2g-awpw2-mwyu3-f46dm-gd7jt-aqe";
        admins.put(Principal.fromText(_INITIAL_ADMIN), true);
        users.put(Principal.fromText(_INITIAL_ADMIN), {
            principal = Principal.fromText(_INITIAL_ADMIN);
            role = #SuperAdmin;
            addedBy = Principal.fromText(_INITIAL_ADMIN);
            addedAt = Time.now();
        });
    };

    private let _DEFAULT_CONFIG : TaskConfig = {
        topics = [];
        targetSites = ["github.com", "dev.to", "medium.com"];
        scanInterval = 1800000;
        maxBandwidthPerDay = 104857600;
    };

    private func hasRole(caller: Principal, role: UserRole) : Bool {
        // For local development, allow anonymous access
        if (Principal.isAnonymous(caller)) {
            return true;
        };

        switch (users.get(caller)) {
            case (?user) {
                switch (user.role) {
                    case (#SuperAdmin) { true };
                    case (#Admin) { role == #Admin or role == #Operator };
                    case (#Operator) { role == #Operator };
                };
            };
            case null { false };
        };
    };

    private func isAuthorized(caller: Principal) : Bool {
        // For local development, allow anonymous access
        if (Principal.isAnonymous(caller)) {
            return true;
        };

        switch (users.get(caller)) {
            case (?user) {
                switch (user.role) {
                    case (#SuperAdmin) { true };
                    case (#Admin) { true };
                    case (#Operator) { true };
                };
            };
            case null { false };
        };
    };

    // Simple XOR-based obfuscation for API key
    private func _obfuscateApiKey(key : Text) : Text {
        let salt = "RhinoSpider2024";
        var keyChars = Text.toIter(key);
        var saltChars = Text.toIter(salt);
        var result = "";
        
        label l loop {
            switch (keyChars.next()) {
                case (null) { break l; };
                case (?k) {
                    let s = switch (saltChars.next()) {
                        case (null) { 
                            saltChars := Text.toIter(salt);
                            switch (saltChars.next()) {
                                case (?firstChar) { firstChar };
                                case (null) { break l; };
                            };
                        };
                        case (?c) { c };
                    };
                    
                    let kNum = Nat32.toNat(Char.toNat32(k));
                    let sNum = Nat32.toNat(Char.toNat32(s));
                    let xored = (kNum + sNum) % 128;
                    result := result # Char.toText(Char.fromNat32(Nat32.fromNat(xored)));
                };
            };
        };
        
        result;
    };

    private func _deobfuscateApiKey(obfuscated : Text) : Text {
        let salt = "RhinoSpider2024";
        var obfChars = Text.toIter(obfuscated);
        var saltChars = Text.toIter(salt);
        var result = "";
        
        label l loop {
            switch (obfChars.next()) {
                case (null) { break l; };
                case (?o) {
                    let s = switch (saltChars.next()) {
                        case (null) { 
                            saltChars := Text.toIter(salt);
                            switch (saltChars.next()) {
                                case (?firstChar) { firstChar };
                                case (null) { break l; };
                            };
                        };
                        case (?c) { c };
                    };
                    
                    let oNum = Nat32.toNat(Char.toNat32(o));
                    let sNum = Nat32.toNat(Char.toNat32(s));
                    let xored : Nat = if (oNum >= sNum) {
                        oNum - sNum;
                    } else {
                        128 + oNum - sNum;
                    };
                    result := result # Char.toText(Char.fromNat32(Nat32.fromNat(xored)));
                };
            };
        };
        
        result;
    };

    public shared({ caller }) func getAIConfig() : async Result.Result<AIConfig, Text> {
        if (not hasRole(caller, #Admin) and not hasRole(caller, #SuperAdmin)) {
            return #err("Unauthorized");
        };
        #ok(_aiConfig)
    };

    public shared({ caller }) func updateAIConfig(config: AIConfig) : async Result.Result<(), Text> {
        if (not hasRole(caller, #Admin) and not hasRole(caller, #SuperAdmin)) {
            return #err("Unauthorized");
        };

        _aiConfig := config;
        #ok()
    };

    // For development only - clear all data
    public shared func clearAllData() : async Text {
        for (key in tasks.keys()) {
            ignore tasks.remove(key);
        };
        for (key in config.keys()) {
            ignore config.remove(key);
        };
        for (key in admins.keys()) {
            ignore admins.remove(key);
        };
        for (key in users.keys()) {
            ignore users.remove(key);
        };
        for (key in topics.keys()) {
            ignore topics.remove(key);
        };
        return "All data cleared";
    };

    public query func getConfig() : async TaskConfig {
        switch (config.get("default")) {
            case (null) { _DEFAULT_CONFIG };
            case (?c) { c };
        }
    };

    public shared({ caller }) func getTasks(limit: Nat) : async [Task] {
        if (not hasRole(caller, #Admin) and not hasRole(caller, #SuperAdmin)) {
            return [];
        };

        let buffer = Buffer.Buffer<Task>(0);
        var count = 0;

        label l for ((id, task) in tasks.entries()) {
            if (count >= limit) break l;
            if (task.status == "pending") {
                tasks.put(id, {
                    id = task.id;
                    url = task.url;
                    topic = task.topic;
                    priority = task.priority;
                    createdAt = task.createdAt;
                    assignedTo = ?caller;
                    status = "assigned";
                });
                buffer.add(task);
                count += 1;
            };
        };

        Buffer.toArray(buffer)
    };

    public shared({ caller }) func addTasks(newTasks: [Task]) : async Result.Result<Nat, Text> {
        if (not hasRole(caller, #Admin) and not hasRole(caller, #SuperAdmin)) {
            return #err("Unauthorized");
        };

        var added = 0;
        for (task in Array.vals(newTasks)) {
            tasks.put(task.id, task);
            added += 1;
        };

        #ok(added)
    };

    public shared({ caller }) func updateTaskStatus(taskId: Text, status: Text) : async Result.Result<(), Text> {
        if (not hasRole(caller, #Admin) and not hasRole(caller, #SuperAdmin)) {
            return #err("Unauthorized");
        };

        switch (tasks.get(taskId)) {
            case (null) { #err("Task not found") };
            case (?task) {
                if (task.assignedTo != ?caller and not hasRole(caller, #SuperAdmin)) {
                    return #err("Unauthorized");
                };

                tasks.put(taskId, {
                    id = task.id;
                    url = task.url;
                    topic = task.topic;
                    priority = task.priority;
                    createdAt = task.createdAt;
                    assignedTo = task.assignedTo;
                    status = status;
                });
                #ok(())
            };
        }
    };

    public shared({ caller }) func updateConfig(newConfig: TaskConfig) : async Result.Result<(), Text> {
        if (not hasRole(caller, #SuperAdmin)) {
            return #err("Unauthorized");
        };

        config.put("default", newConfig);
        #ok(())
    };

    public shared({ caller }) func addUser(principal: Principal, role: UserRole) : async Result.Result<(), Text> {
        if (not hasRole(caller, #SuperAdmin)) {
            return #err("Only SuperAdmin can add users");
        };

        let _ = users.put(principal, {
            principal = principal;
            role = role;
            addedBy = caller;
            addedAt = Time.now();
        });

        #ok()
    };

    public shared({ caller }) func removeUser(principal: Principal) : async Result.Result<(), Text> {
        if (not hasRole(caller, #SuperAdmin)) {
            return #err("Only SuperAdmin can remove users");
        };

        switch (users.get(principal)) {
            case null #err("User not found");
            case (?_) {
                users.delete(principal);
                #ok()
            };
        }
    };

    public shared({ caller }) func getUsers() : async [User] {
        if (not hasRole(caller, #Admin) and not hasRole(caller, #SuperAdmin)) {
            return [];
        };

        let userArray = Buffer.Buffer<User>(0);
        for ((_, user) in users.entries()) {
            userArray.add(user);
        };
        return Buffer.toArray(userArray)
    };

    // Get all topics
    public query func getTopics() : async [ScrapingTopic] {
        let buffer = Buffer.Buffer<ScrapingTopic>(0);
        for ((_, topic) in topics.entries()) {
            buffer.add(topic);
        };
        Buffer.toArray(buffer)
    };

    // Helper function to check if a topic name exists
    private func _topicNameExists(name: Text, excludeId: ?Text) : Bool {
        for ((id, topic) in topics.entries()) {
            if (topic.name == name and (
                switch (excludeId) {
                    case null true;
                    case (?excludeId) id != excludeId;
                }
            )) {
                return true;
            };
        };
        false
    };

    // Create a new topic
    public shared({ caller }) func createTopic(topic: ScrapingTopic) : async Result.Result<ScrapingTopic, Text> {
        if (not hasRole(caller, #Admin) and not hasRole(caller, #SuperAdmin)) {
            return #err("Unauthorized");
        };

        switch (topics.get(topic.id)) {
            case (?_) {
                return #err("Topic with this ID already exists");
            };
            case null {
                let newTopic : ScrapingTopic = {
                    id = topic.id;
                    name = topic.name;
                    description = topic.description;
                    urlPatterns = topic.urlPatterns;
                    active = topic.active;
                    extractionRules = topic.extractionRules;
                    validation = topic.validation;
                    rateLimit = topic.rateLimit;
                    createdAt = Time.now();
                };
                topics.put(topic.id, newTopic);
                return #ok(newTopic);
            };
        }
    };

    // Update an existing topic
    public shared({ caller }) func updateTopic(id: Text, topic: ScrapingTopic) : async Result.Result<(), Text> {
        if (not hasRole(caller, #Admin) and not hasRole(caller, #SuperAdmin)) {
            return #err("Unauthorized");
        };

        switch (topics.get(id)) {
            case null { #err("Topic not found") };
            case (?_) {
                if (_topicNameExists(topic.name, ?id)) {
                    return #err("Topic with this name already exists");
                };
                topics.put(id, topic);
                #ok()
            };
        }
    };

    // Delete a topic
    public shared({ caller }) func deleteTopic(id: Text) : async Result.Result<(), Text> {
        if (not hasRole(caller, #Admin) and not hasRole(caller, #SuperAdmin)) {
            return #err("Unauthorized");
        };

        switch (topics.get(id)) {
            case null {
                return #err("Topic not found");
            };
            case (?_) {
                topics.delete(id);
                return #ok();
            };
        }
    };

    // Get scraped data with optional topic filter
    public shared({ caller }) func getScrapedData(topicIds: [Text]) : async Result.Result<[StorageTypes.ScrapedData], Text> {
        if (not hasRole(caller, #Admin) and not hasRole(caller, #SuperAdmin)) {
            return #err("Unauthorized");
        };

        try {
            let result = await storage.getScrapedData(topicIds);
            #ok(result)
        } catch (err) {
            #err("Failed to get scraped data: " # Error.message(err))
        }
    };

    // Extraction Testing
    public shared({ caller }) func testExtraction(request: {
        url: Text;
        extraction_rules: {
            fields: [ScrapingField];
            custom_prompt: ?Text;
        };
    }) : async Result.Result<{data: [(Text, Text)]}, Text> {
        if (not hasRole(caller, #Admin) and not hasRole(caller, #SuperAdmin)) {
            return #err("Unauthorized");
        };

        try {
            let result = await storage.testExtraction({
                url = request.url;
                extraction_rules = {
                    fields = request.extraction_rules.fields;
                    custom_prompt = request.extraction_rules.custom_prompt;
                };
            });
            result
        } catch (e) {
            #err("Failed to test extraction: " # Error.message(e))
        }
    };
}
