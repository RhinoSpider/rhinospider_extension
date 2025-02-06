import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Buffer "mo:base/Buffer";
import Char "mo:base/Char";
import Debug "mo:base/Debug";
import Hash "mo:base/Hash";
import HashMap "mo:base/HashMap";
import Int "mo:base/Int";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Time "mo:base/Time";

actor {
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

    type AIConfig = {
        apiKey: Text;
        model: Text;
        costLimits: CostLimits;
    };

    type ScrapingField = {
        name: Text;
        description: ?Text;
        aiPrompt: Text;
        required: Bool;
        fieldType: Text;
        example: ?Text;
    };

    type ScrapingTopic = {
        id: Text;
        name: Text;
        description: Text;
        urlPatterns: [Text];
        active: Bool;
        extractionRules: {
            fields: [ScrapingField];
            customPrompt: ?Text;
        };
        validation: ?{
            rules: [Text];
            aiValidation: ?Text;
        };
        rateLimit: ?{
            requestsPerHour: Nat;
            maxConcurrent: Nat;
        };
        createdAt: Int;
    };

    private var tasks = HashMap.HashMap<Text, Task>(0, Text.equal, Text.hash);
    private var config = HashMap.HashMap<Text, TaskConfig>(1, Text.equal, Text.hash);
    private var admins = HashMap.HashMap<Principal, Bool>(0, Principal.equal, Principal.hash);
    private var users = HashMap.HashMap<Principal, User>(10, Principal.equal, Principal.hash);
    private var topics = HashMap.HashMap<Text, ScrapingTopic>(0, Text.equal, Text.hash);
    private stable var stableTopics : [(Text, ScrapingTopic)] = [];

    // Default AI configuration
    private stable var aiConfig : AIConfig = {
        apiKey = "";
        model = "gpt-3.5-turbo";
        costLimits = {
            dailyUSD = 5;
            monthlyUSD = 100;
            maxConcurrent = 5;
        };
    };

    system func preupgrade() {
        stableTopics := Iter.toArray(topics.entries());
    };

    system func postupgrade() {
        topics := HashMap.fromIter<Text, ScrapingTopic>(stableTopics.vals(), 0, Text.equal, Text.hash);
        
        // Initialize admin for local development
        let INITIAL_ADMIN = "ynyv4-or367-gln75-f3usn-xabzu-a4s2g-awpw2-mwyu3-f46dm-gd7jt-aqe";
        admins.put(Principal.fromText(INITIAL_ADMIN), true);
        users.put(Principal.fromText(INITIAL_ADMIN), {
            principal = Principal.fromText(INITIAL_ADMIN);
            role = #SuperAdmin;
            addedBy = Principal.fromText(INITIAL_ADMIN);
            addedAt = Time.now();
        });
    };

    private let INITIAL_ADMIN = "ynyv4-or367-gln75-f3usn-xabzu-a4s2g-awpw2-mwyu3-f46dm-gd7jt-aqe";
    private let DEFAULT_CONFIG : TaskConfig = {
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

    // Simple XOR-based obfuscation for API key
    private func obfuscateApiKey(key : Text) : Text {
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

    private func deobfuscateApiKey(obfuscated : Text) : Text {
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
        // For local development, allow anonymous access
        if (Principal.isAnonymous(caller)) {
            // Return a copy with deobfuscated API key
            let config = {
                apiKey = deobfuscateApiKey(aiConfig.apiKey);
                model = aiConfig.model;
                costLimits = {
                    dailyUSD = aiConfig.costLimits.dailyUSD;
                    monthlyUSD = aiConfig.costLimits.monthlyUSD;
                    maxConcurrent = aiConfig.costLimits.maxConcurrent;
                };
            };
            return #ok(config);
        };

        if (not hasRole(caller, #Admin) and not hasRole(caller, #SuperAdmin)) {
            return #err("Unauthorized");
        };
        
        // Return a copy with deobfuscated API key
        let config = {
            apiKey = deobfuscateApiKey(aiConfig.apiKey);
            model = aiConfig.model;
            costLimits = {
                dailyUSD = aiConfig.costLimits.dailyUSD;
                monthlyUSD = aiConfig.costLimits.monthlyUSD;
                maxConcurrent = aiConfig.costLimits.maxConcurrent;
            };
        };

        #ok(config);
    };

    public shared({ caller }) func updateAIConfig(config: AIConfig) : async Result.Result<(), Text> {
        if (not hasRole(caller, #Admin) and not hasRole(caller, #SuperAdmin)) {
            return #err("Unauthorized");
        };
        
        // Only log non-sensitive data
        Debug.print("Updating AI config with model: " # config.model # ", limits: " # debug_show(config.costLimits));

        // Validate cost limits
        if (config.costLimits.maxConcurrent < 1 or config.costLimits.maxConcurrent > 10) {
            return #err("Max concurrent requests must be between 1 and 10");
        };

        // Store config with obfuscated API key
        aiConfig := {
            apiKey = obfuscateApiKey(config.apiKey);
            model = config.model;
            costLimits = {
                dailyUSD = config.costLimits.dailyUSD;
                monthlyUSD = config.costLimits.monthlyUSD;
                maxConcurrent = config.costLimits.maxConcurrent;
            };
        };

        // Only log non-sensitive data
        Debug.print("Updated AI config with model: " # aiConfig.model # ", limits: " # debug_show(aiConfig.costLimits));
        #ok(());
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
            case (null) { DEFAULT_CONFIG };
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

    public shared({ caller }) func addUser(newUserPrincipal: Principal, role: UserRole) : async Result.Result<(), Text> {
        if (not hasRole(caller, #SuperAdmin)) {
            return #err("Only SuperAdmin can add users");
        };

        users.put(newUserPrincipal, {
            principal = newUserPrincipal;
            role = role;
            addedBy = caller;
            addedAt = Time.now();
        });

        #ok();
    };

    public shared({ caller }) func removeUser(userPrincipal: Principal) : async Result.Result<(), Text> {
        if (not hasRole(caller, #SuperAdmin)) {
            return #err("Only SuperAdmin can remove users");
        };

        switch (users.get(userPrincipal)) {
            case (?user) {
                users.delete(userPrincipal);
                #ok();
            };
            case null #err("User not found");
        };
    };

    public shared({ caller }) func getUsers() : async [User] {
        if (not hasRole(caller, #Admin) and not hasRole(caller, #SuperAdmin)) {
            return [];
        };

        let userArray = Buffer.Buffer<User>(0);
        for ((_, user) in users.entries()) {
            userArray.add(user);
        };
        return Buffer.toArray(userArray);
    };

    // Get all topics
    public query func getTopics() : async [ScrapingTopic] {
        let buffer = Buffer.Buffer<ScrapingTopic>(0);
        for ((_, topic) in topics.entries()) {
            buffer.add(topic);
        };
        Buffer.toArray(buffer)
    };

    // Check if topic name exists
    private func topicNameExists(name: Text, excludeId: ?Text) : Bool {
        for ((_, topic) in topics.entries()) {
            if (Text.equal(topic.name, name)) {
                switch (excludeId) {
                    case (?id) {
                        if (not Text.equal(topic.id, id)) {
                            return true;
                        };
                    };
                    case null {
                        return true;
                    };
                };
            };
        };
        false
    };

    // Create a new topic
    public shared({ caller }) func createTopic(topic: ScrapingTopic) : async Result.Result<ScrapingTopic, Text> {
        if (not hasRole(caller, #Admin) and not hasRole(caller, #SuperAdmin)) {
            return #err("Unauthorized");
        };

        // Check for duplicate name
        if (topicNameExists(topic.name, null)) {
            return #err("A topic with this name already exists");
        };

        switch (topics.get(topic.id)) {
            case (?existing) {
                return #err("Topic with this ID already exists");
            };
            case null {
                topics.put(topic.id, topic);
                return #ok(topic);
            };
        }
    };

    // Update an existing topic
    public shared({ caller }) func updateTopic(id: Text, topic: ScrapingTopic) : async Result.Result<ScrapingTopic, Text> {
        if (not hasRole(caller, #Admin) and not hasRole(caller, #SuperAdmin)) {
            return #err("Unauthorized");
        };

        // Check for duplicate name
        if (topicNameExists(topic.name, ?id)) {
            return #err("A topic with this name already exists");
        };

        switch (topics.get(id)) {
            case null {
                return #err("Topic not found");
            };
            case (?_) {
                topics.put(id, topic);
                return #ok(topic);
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
}
