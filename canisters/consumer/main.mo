import Principal "mo:base/Principal";
import Result "mo:base/Result";
import SharedTypes "../shared/types";
import Buffer "mo:base/Buffer";
import Time "mo:base/Time";
import Text "mo:base/Text";
import HashMap "mo:base/HashMap";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import ExperimentalCycles "mo:base/ExperimentalCycles";
import Error "mo:base/Error";
import Debug "mo:base/Debug";
import Nat "mo:base/Nat";

actor ConsumerBackend {
    // Types
    type StorageActor = actor {
        submitScrapedData : (SharedTypes.ScrapedData) -> async Result.Result<(), SharedTypes.Error>;
        getScrapedData : ([Text]) -> async Result.Result<[SharedTypes.ScrapedData], SharedTypes.Error>;
    };

    type AdminActor = actor {
        getTopics : () -> async Result.Result<[SharedTypes.ScrapingTopic], Text>;
        getTopics_with_caller : (Principal) -> async Result.Result<[SharedTypes.ScrapingTopic], Text>;
        getAssignedTopics : (SharedTypes.NodeCharacteristics) -> async Result.Result<[SharedTypes.ScrapingTopic], Text>;
        getAIConfig : () -> async Result.Result<SharedTypes.AIConfig, Text>;
        add_user : (Principal, { #SuperAdmin; #Admin; #Operator }) -> async Result.Result<(), Text>;
    };

    // Constants
    private let STORAGE_CANISTER_ID = "hhaip-uiaaa-aaaao-a4khq-cai"; // Updated to the latest storage canister ID
    private let ADMIN_CANISTER_ID = "444wf-gyaaa-aaaaj-az5sq-cai";  // Updated to match extension's .env file
    private let CYCLES_PER_CALL = 100_000_000_000; // 100B cycles per call

    // Canister references
    private let storage: StorageActor = actor(STORAGE_CANISTER_ID);
    private let admin: AdminActor = actor(ADMIN_CANISTER_ID);

    // User profiles with stable storage
    private stable var stableUserProfiles: [(Principal, UserProfile)] = [];
    private var userProfiles = HashMap.HashMap<Principal, UserProfile>(10, Principal.equal, Principal.hash);

    type UserProfile = {
        principal: Principal;
        devices: [Text];
        created: Int;
        lastLogin: Int;
        preferences: {
            notificationsEnabled: Bool;
            theme: Text;
        };
    };

    // Upgrade hooks
    system func preupgrade() {
        stableUserProfiles := Iter.toArray(userProfiles.entries());
    };

    system func postupgrade() {
        userProfiles := HashMap.fromIter<Principal, UserProfile>(stableUserProfiles.vals(), 10, Principal.equal, Principal.hash);
    };

    // Authentication
    private func isAuthenticated(p: Principal): Bool {
        // Allow the anonymous identity (2vxsx-fae) used by the proxy server
        if (Principal.toText(p) == "2vxsx-fae") {
            return true;
        };
        
        // Otherwise, require a non-anonymous principal
        not Principal.isAnonymous(p)
    };

    // Topic management
    public shared({ caller }) func getTopics(): async Result.Result<[SharedTypes.ScrapingTopic], SharedTypes.Error> {
        Debug.print("Consumer getTopics: Called by principal: " # Principal.toText(caller));
        
        if (not isAuthenticated(caller)) {
            Debug.print("Consumer getTopics: Caller not authenticated");
            return #err(#NotAuthorized);
        };

        try {
            Debug.print("Consumer getTopics: Adding cycles for inter-canister call");
            ExperimentalCycles.add(CYCLES_PER_CALL);
            
            Debug.print("Consumer getTopics: Calling admin canister at " # ADMIN_CANISTER_ID);
            
            // Get our own principal - this is the correct way to identify ourselves
            let selfPrincipal = Principal.fromActor(ConsumerBackend);
            Debug.print("Consumer getTopics: Self principal: " # Principal.toText(selfPrincipal));
            
            // Define node characteristics (placeholder values for now).
            // In a real-world scenario, these values (ipAddress, region, etc.)
            // would be dynamically determined by the consumer node itself.
            let consumerNodeCharacteristics : SharedTypes.NodeCharacteristics = {
                ipAddress = "127.0.0.1"; // Placeholder: Replace with dynamic IP detection
                region = "us-east-1"; // Placeholder: Replace with dynamic region detection
                percentageNodes = ?100; // Placeholder: This might be configurable by the node operator
                randomizationMode = ?"none"; // Placeholder: This might be configurable by the node operator
            };

            Debug.print("Consumer getTopics: Calling admin.getAssignedTopics");
            let result = await admin.getAssignedTopics(consumerNodeCharacteristics);
            
            switch(result) {
                case (#ok(topics)) {
                    Debug.print("Consumer getTopics: Successfully got " # Nat.toText(topics.size()) # " topics via getAssignedTopics");
                    for (topic in topics.vals()) {
                        Debug.print("Consumer getTopics: Topic ID: " # topic.id # ", Name: " # topic.name);
                    };
                    #ok(topics)
                };
                case (#err(msg)) {
                    Debug.print("Consumer getTopics: Failed to get assigned topics: " # msg);
                    #err(#SystemError("Failed to get assigned topics from admin canister."))
                };
            }
        } catch (error) {
            let errorMsg = Error.message(error);
            Debug.print("Consumer getTopics: Caught error: " # errorMsg);
            #err(#SystemError(errorMsg))
        }
    };

    // Scraped data management
    public shared({ caller }) func submitScrapedData(data: SharedTypes.ScrapedData): async Result.Result<(), SharedTypes.Error> {
        if (not isAuthenticated(caller)) {
            return #err(#NotAuthorized);
        };

        // Verify the user has a profile
        switch (userProfiles.get(caller)) {
            case null return #err(#NotAuthorized);
            case (?_) {};
        };

        ExperimentalCycles.add(CYCLES_PER_CALL);
        await storage.submitScrapedData(data)
    };
    
    // Fetch scraped data from storage canister
    public shared({ caller }) func getScrapedData(topicIds: [Text]): async Result.Result<[SharedTypes.ScrapedData], SharedTypes.Error> {
        if (not isAuthenticated(caller)) {
            return #err(#NotAuthorized);
        };

        // Verify the user has a profile
        switch (userProfiles.get(caller)) {
            case null return #err(#NotAuthorized);
            case (?_) {};
        };

        Debug.print("Consumer: Fetching scraped data for topics: " # debug_show(topicIds));
        
        ExperimentalCycles.add(CYCLES_PER_CALL);
        await storage.getScrapedData(topicIds)
    };

    // User profile management
    public shared({ caller }) func registerDevice(deviceId: Text): async Result.Result<(), SharedTypes.Error> {
        if (not isAuthenticated(caller)) {
            return #err(#NotAuthorized);
        };

        // Create profile if it doesn't exist
        switch (userProfiles.get(caller)) {
            case null {
                // Register with admin canister first
                ExperimentalCycles.add(CYCLES_PER_CALL);
                let adminResult = await admin.add_user(caller, #Operator);
                switch (adminResult) {
                    case (#err(msg)) {
                        if (msg == "User already exists") {
                            // User already registered, proceed
                        } else {
                            return #err(#SystemError(msg));
                        }
                    };
                    case (#ok(_)) {};
                };

                // Create local profile
                let profile: UserProfile = {
                    principal = caller;
                    devices = [deviceId];
                    created = Time.now();
                    lastLogin = Time.now();
                    preferences = {
                        notificationsEnabled = true;
                        theme = "dark";
                    };
                };
                userProfiles.put(caller, profile);
                return #ok();
            };
            case (?profile) {
                // Update existing profile
                let deviceExists = switch (Array.find<Text>(profile.devices, func(d) = d == deviceId)) {
                    case null false;
                    case (?_) true;
                };
                if (not deviceExists) {
                    let updatedDevices = Array.append(profile.devices, [deviceId]);
                    let updatedProfile = {
                        profile with
                        devices = updatedDevices;
                        lastLogin = Time.now();
                    };
                    userProfiles.put(caller, updatedProfile);
                };
                #ok()
            };
        }
    };

    public shared({ caller }) func updatePreferences(notificationsEnabled: Bool, theme: Text): async Result.Result<(), SharedTypes.Error> {
        if (not isAuthenticated(caller)) {
            return #err(#NotAuthorized);
        };

        switch (userProfiles.get(caller)) {
            case (?profile) {
                let updated = {
                    principal = profile.principal;
                    devices = profile.devices;
                    created = profile.created;
                    lastLogin = Time.now();
                    preferences = {
                        notificationsEnabled = notificationsEnabled;
                        theme = theme;
                    };
                };
                userProfiles.put(caller, updated);
                #ok()
            };
            case null #err(#NotFound);
        }
    };

    public shared({ caller }) func getProfile(): async Result.Result<UserProfile, SharedTypes.Error> {
        if (not isAuthenticated(caller)) {
            Debug.print("Consumer getProfile: Caller not authenticated");
            return #err(#NotAuthorized);
        };

        switch (userProfiles.get(caller)) {
            case (?profile) {
                Debug.print("Consumer getProfile: Found profile for " # Principal.toText(caller));
                #ok(profile)
            };
            case null {
                Debug.print("Consumer getProfile: No profile found for " # Principal.toText(caller));
                #err(#NotFound)
            };
        }
    };
}
