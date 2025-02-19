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

actor ConsumerBackend {
    // Types
    type StorageActor = actor {
        submitScrapedData : (SharedTypes.ScrapedData) -> async Result.Result<(), SharedTypes.Error>;
        getScrapedData : ([Text]) -> async Result.Result<[SharedTypes.ScrapedData], SharedTypes.Error>;
    };

    type AdminActor = actor {
        getTopics : () -> async Result.Result<[SharedTypes.ScrapingTopic], SharedTypes.Error>;
        getAIConfig : () -> async Result.Result<SharedTypes.AIConfig, SharedTypes.Error>;
    };

    // Constants
    private let STORAGE_CANISTER_ID = "smxjh-2iaaa-aaaaj-az4rq-cai";
    private let ADMIN_CANISTER_ID = "tgyl5-yyaaa-aaaaj-az4wq-cai";
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

    // Authorization check
    private func isAuthenticated(caller: Principal): Bool {
        not Principal.isAnonymous(caller)
    };

    // Get topics from admin canister
    public shared({ caller }) func getTopics() : async Result.Result<[SharedTypes.ScrapingTopic], SharedTypes.Error> {
        if (not isAuthenticated(caller)) {
            return #err(#NotAuthorized);
        };

        // Forward cycles for inter-canister call
        ExperimentalCycles.add(CYCLES_PER_CALL);
        try {
            let result = await admin.getTopics();
            return result;
        } catch (err) {
            return #err(#SystemError("Failed to fetch topics from admin: " # Error.message(err)));
        };
    };

    // Get AI config from admin canister
    public shared({ caller }) func getAIConfig() : async Result.Result<SharedTypes.AIConfig, SharedTypes.Error> {
        if (not isAuthenticated(caller)) {
            return #err(#NotAuthorized);
        };

        // Forward cycles for inter-canister call
        ExperimentalCycles.add(CYCLES_PER_CALL);
        try {
            let result = await admin.getAIConfig();
            return result;
        } catch (err) {
            return #err(#SystemError("Failed to fetch AI config from admin: " # Error.message(err)));
        };
    };

    // Public methods for extension
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

    // User profile management
    public shared({ caller }) func registerDevice(deviceId: Text): async Result.Result<(), SharedTypes.Error> {
        if (not isAuthenticated(caller)) {
            return #err(#NotAuthorized);
        };

        let profile = switch (userProfiles.get(caller)) {
            case (?existing) {
                {
                    principal = caller;
                    devices = Array.append<Text>(existing.devices, [deviceId]);
                    created = existing.created;
                    lastLogin = Time.now();
                    preferences = existing.preferences;
                }
            };
            case null {
                {
                    principal = caller;
                    devices = [deviceId];
                    created = Time.now();
                    lastLogin = Time.now();
                    preferences = {
                        notificationsEnabled = true;
                        theme = "light";
                    };
                }
            };
        };

        userProfiles.put(caller, profile);
        #ok()
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

    public query({ caller }) func getProfile(): async Result.Result<UserProfile, SharedTypes.Error> {
        if (not isAuthenticated(caller)) {
            return #err(#NotAuthorized);
        };

        switch (userProfiles.get(caller)) {
            case (?profile) #ok(profile);
            case null #err(#NotFound);
        }
    };
}
