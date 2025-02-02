import Principal "mo:base/Principal";
import Time "mo:base/Time";
import HashMap "mo:base/HashMap";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Option "mo:base/Option";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Nat64 "mo:base/Nat64";
import Buffer "mo:base/Buffer";

actor UserProfile {
    // Types
    type Profile = {
        principal: Principal;
        devices: [Text];
        created: Nat64;
        lastLogin: Nat64;
        displayName: ?Text;
        email: ?Text;
        preferences: {
            notificationsEnabled: Bool;
            theme: Text;
        };
        stats: {
            totalScrapes: Nat64;
            totalDataContributed: Nat64;
            reputation: Nat64;
        };
    };

    type ProfileUpdate = {
        displayName: ?Text;
        email: ?Text;
        preferences: ?{
            notificationsEnabled: Bool;
            theme: Text;
        };
    };

    type Error = {
        #NotFound;
        #AlreadyExists;
        #NotAuthorized;
        #InvalidInput: Text;
    };

    type Stats = {
        totalUsers: Nat64;
        activeUsers: Nat64;
        totalDataContributed: Nat64;
    };

    // State
    private stable var profiles : [(Principal, Profile)] = [];
    private var profileMap = HashMap.HashMap<Principal, Profile>(0, Principal.equal, Principal.hash);
    private stable var adminPrincipal : Principal = Principal.fromText("aaaaa-aa"); // Replace with actual admin principal

    // System functions
    system func preupgrade() {
        profiles := Iter.toArray(profileMap.entries());
    };

    system func postupgrade() {
        profileMap := HashMap.fromIter<Principal, Profile>(profiles.vals(), profiles.size(), Principal.equal, Principal.hash);
        profiles := [];
    };

    // Helper functions
    private func isAdmin(caller: Principal) : Bool {
        Principal.equal(caller, adminPrincipal)
    };

    private func defaultProfile(caller: Principal) : Profile {
        {
            principal = caller;
            devices = [];
            created = Nat64.fromNat(Int.abs(Time.now()));
            lastLogin = Nat64.fromNat(Int.abs(Time.now()));
            displayName = null;
            email = null;
            preferences = {
                notificationsEnabled = true;
                theme = "light"
            };
            stats = {
                totalScrapes = 0;
                totalDataContributed = 0;
                reputation = 0;
            };
        }
    };

    // Profile management
    public shared({ caller }) func createProfile() : async Result.Result<Profile, Error> {
        if (Principal.isAnonymous(caller)) {
            return #err(#NotAuthorized);
        };

        switch (profileMap.get(caller)) {
            case (?_) { #err(#AlreadyExists) };
            case null {
                let profile = defaultProfile(caller);
                profileMap.put(caller, profile);
                #ok(profile)
            };
        }
    };

    public shared({ caller }) func getProfile() : async Result.Result<Profile, Error> {
        if (Principal.isAnonymous(caller)) {
            return #err(#NotAuthorized);
        };

        switch (profileMap.get(caller)) {
            case (?profile) { #ok(profile) };
            case null { #err(#NotFound) };
        }
    };

    public shared({ caller }) func updateProfile(update: ProfileUpdate) : async Result.Result<Profile, Error> {
        if (Principal.isAnonymous(caller)) {
            return #err(#NotAuthorized);
        };

        switch (profileMap.get(caller)) {
            case (?profile) {
                let updatedProfile = {
                    principal = profile.principal;
                    devices = profile.devices;
                    created = profile.created;
                    lastLogin = Nat64.fromNat(Int.abs(Time.now()));
                    displayName = Option.get(update.displayName, profile.displayName);
                    email = Option.get(update.email, profile.email);
                    preferences = Option.get(update.preferences, profile.preferences);
                    stats = profile.stats;
                };
                profileMap.put(caller, updatedProfile);
                #ok(updatedProfile)
            };
            case null { #err(#NotFound) };
        }
    };

    public shared({ caller }) func deleteProfile() : async Result.Result<Profile, Error> {
        if (Principal.isAnonymous(caller)) {
            return #err(#NotAuthorized);
        };

        switch (profileMap.get(caller)) {
            case (?profile) {
                profileMap.delete(caller);
                #ok(profile)
            };
            case null { #err(#NotFound) };
        }
    };

    // Device management
    public shared({ caller }) func addDevice(deviceId: Text) : async Result.Result<Profile, Error> {
        if (Principal.isAnonymous(caller)) {
            return #err(#NotAuthorized);
        };

        switch (profileMap.get(caller)) {
            case (?profile) {
                if (Array.find<Text>(profile.devices, func(d) { d == deviceId }) != null) {
                    return #err(#AlreadyExists);
                };

                let updatedProfile = {
                    principal = profile.principal;
                    devices = Array.append<Text>(profile.devices, [deviceId]);
                    created = profile.created;
                    lastLogin = Nat64.fromNat(Int.abs(Time.now()));
                    displayName = profile.displayName;
                    email = profile.email;
                    preferences = profile.preferences;
                    stats = profile.stats;
                };
                profileMap.put(caller, updatedProfile);
                #ok(updatedProfile)
            };
            case null { #err(#NotFound) };
        }
    };

    public shared({ caller }) func removeDevice(deviceId: Text) : async Result.Result<Profile, Error> {
        if (Principal.isAnonymous(caller)) {
            return #err(#NotAuthorized);
        };

        switch (profileMap.get(caller)) {
            case (?profile) {
                let updatedDevices = Array.filter<Text>(profile.devices, func(d) { d != deviceId });
                if (updatedDevices.size() == profile.devices.size()) {
                    return #err(#NotFound);
                };

                let updatedProfile = {
                    principal = profile.principal;
                    devices = updatedDevices;
                    created = profile.created;
                    lastLogin = Nat64.fromNat(Int.abs(Time.now()));
                    displayName = profile.displayName;
                    email = profile.email;
                    preferences = profile.preferences;
                    stats = profile.stats;
                };
                profileMap.put(caller, updatedProfile);
                #ok(updatedProfile)
            };
            case null { #err(#NotFound) };
        }
    };

    public query({ caller }) func listDevices() : async [Text] {
        switch (profileMap.get(caller)) {
            case (?profile) { profile.devices };
            case null { [] };
        }
    };

    // Stats
    public query func getStats() : async Stats {
        let profiles = Iter.toArray(profileMap.vals());
        let now = Nat64.fromNat(Int.abs(Time.now()));
        let dayInNanos : Nat64 = 86_400_000_000_000;

        let activeUsers = Array.filter<Profile>(profiles, func(p) { (now - p.lastLogin) < dayInNanos }).size();
        let totalDataContributed = Array.foldLeft<Profile, Nat64>(profiles, 0, func(acc, p) { acc + p.stats.totalDataContributed });

        {
            totalUsers = Nat64.fromNat(profiles.size());
            activeUsers = Nat64.fromNat(activeUsers);
            totalDataContributed = totalDataContributed;
        }
    };

    public shared({ caller }) func updateStats(update: { dataContributed: Nat64 }) : async Result.Result<Profile, Error> {
        if (Principal.isAnonymous(caller)) {
            return #err(#NotAuthorized);
        };

        switch (profileMap.get(caller)) {
            case (?profile) {
                let updatedStats = {
                    totalScrapes = profile.stats.totalScrapes + 1;
                    totalDataContributed = profile.stats.totalDataContributed + update.dataContributed;
                    reputation = profile.stats.reputation + 1;
                };

                let updatedProfile = {
                    principal = profile.principal;
                    devices = profile.devices;
                    created = profile.created;
                    lastLogin = Nat64.fromNat(Int.abs(Time.now()));
                    displayName = profile.displayName;
                    email = profile.email;
                    preferences = profile.preferences;
                    stats = updatedStats;
                };
                profileMap.put(caller, updatedProfile);
                #ok(updatedProfile)
            };
            case null { #err(#NotFound) };
        }
    };

    // Admin functions
    public shared({ caller }) func getUsers() : async [Profile] {
        if (not isAdmin(caller)) {
            return [];
        };
        Iter.toArray(profileMap.vals())
    };

    public shared({ caller }) func clearInactiveUsers(threshold: Nat64) : async () {
        if (not isAdmin(caller)) {
            return;
        };

        let now = Nat64.fromNat(Int.abs(Time.now()));
        for ((principal, profile) in profileMap.entries()) {
            if ((now - profile.lastLogin) > threshold) {
                profileMap.delete(principal);
            };
        };
    };
};
