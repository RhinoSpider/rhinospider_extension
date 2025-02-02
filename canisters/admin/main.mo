import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import HashMap "mo:base/HashMap";
import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import Time "mo:base/Time";
import Iter "mo:base/Iter";

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

    private var tasks = HashMap.HashMap<Text, Task>(0, Text.equal, Text.hash);
    private var config = HashMap.HashMap<Text, TaskConfig>(1, Text.equal, Text.hash);
    private var admins = HashMap.HashMap<Principal, Bool>(0, Principal.equal, Principal.hash);
    private var users = HashMap.HashMap<Principal, User>(10, Principal.equal, Principal.hash);

    private stable let INITIAL_ADMIN = "ynyv4-or367-gln75-f3usn-xabzu-a4s2g-awpw2-mwyu3-f46dm-gd7jt-aqe";
    private let DEFAULT_CONFIG : TaskConfig = {
        topics = ["AI", "Web3", "Blockchain"];
        targetSites = ["github.com", "dev.to", "medium.com"];
        scanInterval = 1800000;
        maxBandwidthPerDay = 104857600;
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

    private func hasRole(principal: Principal, requiredRole: UserRole) : Bool {
        switch (users.get(principal)) {
            case (?user) {
                switch (user.role, requiredRole) {
                    case (#SuperAdmin, _) true;
                    case (#Admin, #Admin) true;
                    case (#Admin, #Operator) true;
                    case (#Operator, #Operator) true;
                    case _ false;
                };
            };
            case null false;
        };
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
