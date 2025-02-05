import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import HashMap "mo:base/HashMap";
import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import Time "mo:base/Time";
import Iter "mo:base/Iter";
import Nat8 "mo:base/Nat8";
import Nat32 "mo:base/Nat32";
import Char "mo:base/Char";

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

    private var tasks = HashMap.HashMap<Text, Task>(0, Text.equal, Text.hash);
    private var config = HashMap.HashMap<Text, TaskConfig>(1, Text.equal, Text.hash);
    private var admins = HashMap.HashMap<Principal, Bool>(0, Principal.equal, Principal.hash);
    private var users = HashMap.HashMap<Principal, User>(10, Principal.equal, Principal.hash);

    private stable let INITIAL_ADMIN = "ynyv4-or367-gln75-f3usn-xabzu-a4s2g-awpw2-mwyu3-f46dm-gd7jt-aqe";
    private let DEFAULT_CONFIG : TaskConfig = {
        topics = [];
        targetSites = ["github.com", "dev.to", "medium.com"];
        scanInterval = 1800000;
        maxBandwidthPerDay = 104857600;
    };

    // Default AI configuration
    let DEFAULT_AI_CONFIG : AIConfig = {
        apiKey = "";
        model = "gpt-3.5-turbo";
        costLimits = {
            dailyUSD = 5;
            monthlyUSD = 100;
            maxConcurrent = 5;
        };
    };

    // AI Configuration with basic obfuscation
    private stable var aiConfig : AIConfig = DEFAULT_AI_CONFIG;

    // Simple obfuscation for API key (ROT13-like)
    private func obfuscateApiKey(apiKey: Text) : Text {
        var result = "";
        for (c in Text.toIter(apiKey)) {
            let n = Nat32.toNat(Char.toNat32(c));
            let shifted = (n + 13) % 128;  // Simple shift by 13 positions
            result := result # Text.fromChar(Char.fromNat32(Nat32.fromNat(shifted)));
        };
        result;
    };

    private func deobfuscateApiKey(obfuscated: Text) : Text {
        var result = "";
        for (c in Text.toIter(obfuscated)) {
            let n = Nat32.toNat(Char.toNat32(c));
            let shifted = (n + 115) % 128;  // Shift back by adding (128-13)
            result := result # Text.fromChar(Char.fromNat32(Nat32.fromNat(shifted)));
        };
        result;
    };

    public shared func init() : async () {
        config.put("default", DEFAULT_CONFIG);
        admins.put(Principal.fromText(INITIAL_ADMIN), true);
        users.put(Principal.fromText(INITIAL_ADMIN), {
            principal = Principal.fromText(INITIAL_ADMIN);
            role = #SuperAdmin;
            addedBy = Principal.fromText(INITIAL_ADMIN);
            addedAt = Time.now();
        });
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

    // AI Configuration
    public shared({ caller }) func getAIConfig() : async Result.Result<AIConfig, Text> {
        if (not hasRole(caller, #Admin) and not hasRole(caller, #SuperAdmin)) {
            return #err("Unauthorized");
        };
        
        // Deobfuscate API key before returning
        #ok({
            apiKey = deobfuscateApiKey(aiConfig.apiKey);
            model = aiConfig.model;
            costLimits = aiConfig.costLimits;
        });
    };

    public shared({ caller }) func updateAIConfig(config: AIConfig) : async Result.Result<(), Text> {
        if (not hasRole(caller, #Admin) and not hasRole(caller, #SuperAdmin)) {
            return #err("Unauthorized");
        };
        
        // Obfuscate API key before storing
        aiConfig := {
            apiKey = obfuscateApiKey(config.apiKey);
            model = config.model;
            costLimits = config.costLimits;
        };
        #ok();
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
}
