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
import Bool "mo:base/Bool";
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
        topicId: Text;
        timestamp: Int;
        status: Text;
        assignedTo: ?Principal;
    };

    type TaskConfig = {
        maxRetries: Nat;
        retryDelaySeconds: Nat;
    };

    type AIConfig = StorageTypes.AIConfig;
    type CostLimits = StorageTypes.CostLimits;
    type ScrapingField = StorageTypes.ScrapingField;
    type ExtractionRules = StorageTypes.ExtractionRules;
    type Validation = StorageTypes.Validation;
    type RateLimit = StorageTypes.RateLimit;
    type ScrapingTopic = StorageTypes.ScrapingTopic;
    type CreateTopicRequest = StorageTypes.CreateTopicRequest;

    type StorageActor = actor {
        getScrapedData: shared query ([Text]) -> async [{
            topicId: Text;
            url: Text;
            timestamp: Int;
            data: [(Text, Text)];
        }];
        storeRequest: shared ({
            id: Text;
            url: Text;
            topicId: Text;
            timestamp: Int;
        }) -> async Result.Result<Text, Text>;
        deleteTopic: shared (Text) -> async Result.Result<(), Text>;
        setTopicActive: shared (Text, Bool) -> async Result.Result<(), Text>;
        testExtraction: shared ({
            url: Text;
            extraction_rules: {
                fields: [ScrapingField];
                custom_prompt: ?Text;
            };
        }) -> async Result.Result<{data: [(Text, Text)]}, Text>;
    };

    private var tasks: HashMap.HashMap<Text, Task> = HashMap.HashMap<Text, Task>(0, Text.equal, Text.hash);
    private var config: HashMap.HashMap<Text, TaskConfig> = HashMap.HashMap<Text, TaskConfig>(1, Text.equal, Text.hash);
    private var admins: HashMap.HashMap<Principal, Bool> = HashMap.HashMap<Principal, Bool>(0, Principal.equal, Principal.hash);
    private var users: HashMap.HashMap<Principal, User> = HashMap.HashMap<Principal, User>(10, Principal.equal, Principal.hash);
    private var topics: HashMap.HashMap<Text, ScrapingTopic> = HashMap.HashMap<Text, ScrapingTopic>(0, Text.equal, Text.hash);
    
    private stable var stableTopics: [(Text, ScrapingTopic)] = [];
    private stable var _users: [(Principal, User)] = [];
    private stable var _topics: [(Text, ScrapingTopic)] = [];
    private stable var _tasks: [(Text, Task)] = [];
    private stable var _config: [(Text, TaskConfig)] = [];
    private stable var _admins: [(Principal, Bool)] = [];
    private stable var _aiConfig: AIConfig = {
        apiKey = "";
        model = "gpt-3.5-turbo";
        costLimits = {
            dailyUSD = 10;
            monthlyUSD = 100;
            maxConcurrent = 5;
        };
    };

    private var _cachedAIConfig: ?AIConfig = null;
    private let STORAGE_CANISTER_ID: Text = "br5f7-7uaaa-aaaaa-qaaca-cai";
    private let storage: StorageActor = actor(STORAGE_CANISTER_ID);

    system func preupgrade() {
        stableTopics := Iter.toArray(topics.entries());
        _users := Iter.toArray(users.entries());
        _topics := Iter.toArray(topics.entries());
        _tasks := Iter.toArray(tasks.entries());
        _config := Iter.toArray(config.entries());
        _admins := Iter.toArray(admins.entries());
    };

    system func postupgrade() {
        for ((k, v) in _users.vals()) { users.put(k, v); };
        for ((k, v) in _topics.vals()) { topics.put(k, v); };
        for ((k, v) in _tasks.vals()) { tasks.put(k, v); };
        for ((k, v) in _config.vals()) { config.put(k, v); };
        for ((k, v) in _admins.vals()) { admins.put(k, v); };

        stableTopics := [];
        _users := [];
        _topics := [];
        _tasks := [];
        _config := [];
        _admins := [];
        
        // Initialize admin for local development
        let _INITIAL_ADMIN: Text = "ynyv4-or367-gln75-f3usn-xabzu-a4s2g-awpw2-mwyu3-f46dm-gd7jt-aqe";
        admins.put(Principal.fromText(_INITIAL_ADMIN), true);
        users.put(Principal.fromText(_INITIAL_ADMIN), {
            principal = Principal.fromText(_INITIAL_ADMIN);
            role = #SuperAdmin;
            addedBy = Principal.fromText(_INITIAL_ADMIN);
            addedAt = Time.now();
        });
    };

    private let _DEFAULT_CONFIG: TaskConfig = {
        maxRetries = 3;
        retryDelaySeconds = 300;
    };

    private func hasRole(caller: Principal, role: UserRole): Bool {
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

    private func _isAuthorized(caller: Principal): Bool {
        // For local development, allow anonymous access
        if (Principal.isAnonymous(caller)) {
            return true;
        };

        switch (users.get(caller)) {
            case (null) { false };
            case (?user) { true };
        }
    };

    // Simple XOR-based obfuscation for API key
    private func _obfuscateApiKey(key: Text): Text {
        let salt: Text = "RhinoSpider2024";
        var keyChars: Iter.Iter<Char> = Text.toIter(key);
        var saltChars: Iter.Iter<Char> = Text.toIter(salt);
        var result: Text = "";
        
        label l loop {
            switch (keyChars.next()) {
                case (null) { break l; };
                case (?k) {
                    let s: Char = switch (saltChars.next()) {
                        case (null) { 
                            saltChars := Text.toIter(salt);
                            switch (saltChars.next()) {
                                case (?firstChar) { firstChar };
                                case (null) { break l; };
                            };
                        };
                        case (?c) { c };
                    };
                    
                    let kNum: Nat = Nat32.toNat(Char.toNat32(k));
                    let sNum: Nat = Nat32.toNat(Char.toNat32(s));
                    let xored: Nat = (kNum + sNum) % 128;
                    result := result # Char.toText(Char.fromNat32(Nat32.fromNat(xored)));
                };
            };
        };
        
        result;
    };

    private func _deobfuscateApiKey(obfuscated: Text): Text {
        let salt: Text = "RhinoSpider2024";
        var obfChars: Iter.Iter<Char> = Text.toIter(obfuscated);
        var saltChars: Iter.Iter<Char> = Text.toIter(salt);
        var result: Text = "";
        
        label l loop {
            switch (obfChars.next()) {
                case (null) { break l; };
                case (?o) {
                    let s: Char = switch (saltChars.next()) {
                        case (null) { 
                            saltChars := Text.toIter(salt);
                            switch (saltChars.next()) {
                                case (?firstChar) { firstChar };
                                case (null) { break l; };
                            };
                        };
                        case (?c) { c };
                    };
                    
                    let oNum: Nat = Nat32.toNat(Char.toNat32(o));
                    let sNum: Nat = Nat32.toNat(Char.toNat32(s));
                    let xored: Nat = if (oNum >= sNum) {
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

    public shared({ caller }) func getAIConfig(): async Result.Result<AIConfig, Text> {
        if (not hasRole(caller, #Admin) and not hasRole(caller, #SuperAdmin)) {
            return #err("Unauthorized");
        };
        return #ok(_aiConfig)
    };

    public shared({ caller }) func updateAIConfig(config: AIConfig): async Result.Result<(), Text> {
        if (not hasRole(caller, #Admin) and not hasRole(caller, #SuperAdmin)) {
            return #err("Unauthorized");
        };

        _aiConfig := config;
        return #ok()
    };

    // For development only - clear all data
    public shared func clearAllData(): async Text {
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

    public query func getConfig(): async TaskConfig {
        switch (config.get("default")) {
            case (null) { _DEFAULT_CONFIG };
            case (?c) { c };
        }
    };

    public shared({ caller }) func getTasks(limit: Nat): async [Task] {
        if (not hasRole(caller, #Admin) and not hasRole(caller, #SuperAdmin)) {
            return [];
        };

        let buffer: Buffer.Buffer<Task> = Buffer.Buffer<Task>(0);
        var count: Nat = 0;

        label l for ((id, task) in tasks.entries()) {
            if (count >= limit) break l;
            if (task.status == "pending") {
                buffer.add(task);
                count += 1;
            };
        };

        return Buffer.toArray(buffer)
    };

    public shared({ caller }) func addTasks(newTasks: [Task]): async Result.Result<Nat, Text> {
        if (not hasRole(caller, #Admin) and not hasRole(caller, #SuperAdmin)) {
            return #err("Unauthorized");
        };

        var added: Nat = 0;
        for (task in Array.vals(newTasks)) {
            let newTask: Task = {
                id = task.id;
                url = task.url;
                topicId = task.topicId;
                timestamp = task.timestamp;
                status = task.status;
                assignedTo = task.assignedTo;
            };
            tasks.put(task.id, newTask);
            added += 1;
        };

        return #ok(added)
    };

    public shared({ caller }) func updateTaskStatus(taskId: Text, status: Text): async Result.Result<(), Text> {
        if (not hasRole(caller, #Admin) and not hasRole(caller, #SuperAdmin)) {
            return #err("Unauthorized");
        };

        switch (tasks.get(taskId)) {
            case (null) { return #err("Task not found") };
            case (?task) {
                if (task.assignedTo != ?caller and not hasRole(caller, #SuperAdmin)) {
                    return #err("Unauthorized");
                };
                
                let updatedTask: Task = {
                    id = task.id;
                    url = task.url;
                    topicId = task.topicId;
                    timestamp = task.timestamp;
                    status = status;
                    assignedTo = task.assignedTo;
                };
                tasks.put(taskId, updatedTask);
                return #ok(());
            };
        }
    };

    public shared({ caller }) func updateConfig(newConfig: TaskConfig): async Result.Result<(), Text> {
        if (not hasRole(caller, #SuperAdmin)) {
            return #err("Unauthorized");
        };

        config.put("default", newConfig);
        return #ok(())
    };

    public shared({ caller }) func addUser(principal: Principal, role: UserRole): async Result.Result<(), Text> {
        if (not hasRole(caller, #SuperAdmin)) {
            return #err("Only SuperAdmin can add users");
        };

        let _ = users.put(principal, {
            principal = principal;
            role = role;
            addedBy = caller;
            addedAt = Time.now();
        });

        return #ok()
    };

    public shared({ caller }) func removeUser(principal: Principal): async Result.Result<(), Text> {
        if (not hasRole(caller, #SuperAdmin)) {
            return #err("Only SuperAdmin can remove users");
        };

        switch (users.get(principal)) {
            case null return #err("User not found");
            case (?_) {
                users.delete(principal);
                return #ok()
            };
        }
    };

    public shared({ caller }) func getUsers(): async [User] {
        if (not hasRole(caller, #Admin) and not hasRole(caller, #SuperAdmin)) {
            return [];
        };

        let userArray: Buffer.Buffer<User> = Buffer.Buffer<User>(0);
        for ((_, user) in users.entries()) {
            userArray.add(user);
        };
        return Buffer.toArray(userArray)
    };

    // Get all topics
    public query func getTopics(): async [ScrapingTopic] {
        let buffer: Buffer.Buffer<ScrapingTopic> = Buffer.Buffer<ScrapingTopic>(0);
        for ((_, topic) in topics.entries()) {
            buffer.add(topic);
        };
        return Buffer.toArray(buffer)
    };

    // Helper function to check if a topic name exists
    private func _topicNameExists(name: Text, excludeId: ?Text): Bool {
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
    public shared({ caller }) func createTopic(topic: ScrapingTopic): async Result.Result<ScrapingTopic, Text> {
        if (not hasRole(caller, #Admin) and not hasRole(caller, #SuperAdmin)) {
            return #err("Unauthorized");
        };

        switch (topics.get(topic.id)) {
            case (?_) {
                return #err("Topic with this ID already exists");
            };
            case null {
                let newTopic: ScrapingTopic = {
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
    public shared({ caller }) func updateTopic(id: Text, topic: ScrapingTopic): async Result.Result<ScrapingTopic, Text> {
        if (not hasRole(caller, #Admin) and not hasRole(caller, #SuperAdmin)) {
            return #err("Unauthorized");
        };

        switch (topics.get(id)) {
            case (null) {
                return #err("Topic not found");
            };
            case (?existingTopic) {
                // Preserve optional fields if not provided
                let updatedTopic: ScrapingTopic = {
                    id = id;
                    name = topic.name;
                    description = topic.description;
                    urlPatterns = topic.urlPatterns;
                    active = topic.active;
                    extractionRules = {
                        fields = topic.extractionRules.fields;
                        customPrompt = topic.extractionRules.customPrompt;
                    };
                    validation = topic.validation;
                    rateLimit = topic.rateLimit;
                    createdAt = existingTopic.createdAt;  // Keep original creation time
                };
                topics.put(id, updatedTopic);
                return #ok(updatedTopic);
            };
        };
    };

    // Delete a topic
    public shared({ caller }) func deleteTopic(id: Text): async Result.Result<(), Text> {
        _Debug.print("Admin: Attempting to delete topic: " # id);
        if (not hasRole(caller, #Admin) and not hasRole(caller, #SuperAdmin)) {
            _Debug.print("Admin: Unauthorized caller: " # Principal.toText(caller));
            return #err("Unauthorized");
        };

        switch (topics.get(id)) {
            case (null) {
                _Debug.print("Admin: Topic not found: " # id);
                #err("Topic not found")
            };
            case (?topic) {
                _Debug.print("Admin: Deleting topic from admin canister...");
                topics.delete(id);

                // Also delete from storage canister
                try {
                    _Debug.print("Admin: Syncing delete to storage canister...");
                    let result = await storage.deleteTopic(id);
                    _Debug.print("Admin: Successfully synced delete to storage");
                    #ok(())
                } catch (e) {
                    _Debug.print("Admin: Error syncing delete to storage: " # Error.message(e));
                    #err("Failed to delete topic from storage: " # Error.message(e))
                }
            };
        };
    };

    // Get scraped data with optional topic filter
    public shared({ caller }) func getScrapedData(topicIds: [Text]): async Result.Result<[{
        topicId: Text;
        url: Text;
        timestamp: Int;
        data: [(Text, Text)];
    }], Text> {
        if (not hasRole(caller, #Admin) and not hasRole(caller, #SuperAdmin)) {
            return #err("Unauthorized");
        };

        try {
            let result = await storage.getScrapedData(topicIds);
            return #ok(result)
        } catch (err) {
            return #err("Failed to get scraped data: " # Error.message(err))
        }
    };

    // Extraction Testing
    public shared({ caller }) func testExtraction(request: {
        url: Text;
        extraction_rules: {
            fields: [ScrapingField];
            custom_prompt: ?Text;
        };
    }): async Result.Result<Text, Text> {
        if (not hasRole(caller, #Admin) and not hasRole(caller, #SuperAdmin)) {
            return #err("Unauthorized");
        };

        try {
            let _ = await storage.testExtraction({
                url = request.url;
                extraction_rules = {
                    fields = request.extraction_rules.fields;
                    custom_prompt = request.extraction_rules.custom_prompt;
                };
            });
            return #ok("Extraction test completed successfully");
        } catch (e) {
            return #err("Error testing extraction: " # Error.message(e));
        };
    };

    public shared({ caller }) func setTopicActive(id: Text, active: Bool): async Result.Result<(), Text> {
        if (not hasRole(caller, #Admin) and not hasRole(caller, #SuperAdmin)) {
            _Debug.print("Unauthorized caller: " # Principal.toText(caller));
            return #err("Unauthorized");
        };

        switch (topics.get(id)) {
            case (null) {
                _Debug.print("Topic not found: " # id);
                #err("Topic not found")
            };
            case (?topic) {
                _Debug.print("Updating topic " # id # " active state to: " # Bool.toText(active));
                let updatedTopic = {
                    topic with
                    active = active;
                    updatedAt = Int.abs(Time.now());
                };
                topics.put(id, updatedTopic);

                // Also update in storage canister
                try {
                    _Debug.print("Syncing to storage canister...");
                    ignore storage.setTopicActive(id, active);
                    _Debug.print("Successfully synced to storage");
                } catch (e) {
                    _Debug.print("Error syncing to storage: " # Error.message(e));
                };

                #ok(());
            };
        };
    };
}
