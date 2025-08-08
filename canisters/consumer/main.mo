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
import Int "mo:base/Int";
import Random "mo:base/Random";
import Nat8 "mo:base/Nat8";
import Nat32 "mo:base/Nat32";
import Char "mo:base/Char";

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
    
    // Referral system storage
    private stable var stableReferralCodes: [(Text, Principal)] = [];
    private var referralCodes = HashMap.HashMap<Text, Principal>(10, Text.equal, Text.hash);

    type UserProfile = {
        principal: Principal;
        devices: [Text];
        created: Int;
        lastLogin: Int;
        ipAddress: ?Text;
        referralCode: Text;
        referralCount: Nat;
        points: Nat;
        totalDataScraped: Nat;
        referredBy: ?Principal;
        preferences: {
            notificationsEnabled: Bool;
            theme: Text;
        };
    };
    
    type ReferralTier = {
        limit: Nat;
        points: Nat;
    };
    
    // Referral reward tiers
    private let referralTiers: [ReferralTier] = [
        { limit = 10; points = 100 },
        { limit = 30; points = 50 },
        { limit = 70; points = 25 },
        { limit = 1000; points = 5 },
    ];
    
    // Points configuration
    private let POINTS_PER_KB = 10;
    private let DAILY_BONUS_POINTS = 50;
    private let QUALITY_MULTIPLIER = 2;

    // Upgrade hooks
    system func preupgrade() {
        stableUserProfiles := Iter.toArray(userProfiles.entries());
        stableReferralCodes := Iter.toArray(referralCodes.entries());
    };

    system func postupgrade() {
        userProfiles := HashMap.fromIter<Principal, UserProfile>(stableUserProfiles.vals(), 10, Principal.equal, Principal.hash);
        referralCodes := HashMap.fromIter<Text, Principal>(stableReferralCodes.vals(), 10, Text.equal, Text.hash);
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

    // Helper function to generate referral code
    private func generateCode(): async Text {
        let randomBytes = await Random.blob();
        let timestamp_int = Time.now();
        let timestamp_nat = Int.abs(timestamp_int);
        let timestamp_text = Nat.toText(timestamp_nat);
        
        // Convert random bytes to hex string for uniqueness
        var hex_part = "";
        var byte_count = 0;
        for (byte in randomBytes.vals()) {
            if (byte_count < 4) { // Use only first 4 bytes
                let nat_byte = Nat8.toNat(byte);
                let hex_digit1 = nat_byte / 16;
                let hex_digit2 = nat_byte % 16;
                hex_part #= Text.fromChar(Char.fromNat32(Nat32.fromNat(if (hex_digit1 < 10) { 48 + hex_digit1 } else { 87 + hex_digit1 })));
                hex_part #= Text.fromChar(Char.fromNat32(Nat32.fromNat(if (hex_digit2 < 10) { 48 + hex_digit2 } else { 87 + hex_digit2 })));
                byte_count += 1;
            };
        };
        
        // Take last 4 chars from timestamp
        let ts_len = Text.size(timestamp_text);
        var timestamp_part = "";
        if (ts_len >= 4) {
            var j = 0;
            for (char in timestamp_text.chars()) {
                if (j >= ts_len - 4) {
                    timestamp_part #= Text.fromChar(char);
                };
                j += 1;
            };
        } else {
            timestamp_part := timestamp_text;
        };

        return hex_part # timestamp_part;
    };
    
    // Calculate points based on data contribution
    private func calculatePoints(contentLength: Nat): Nat {
        let sizeInKB = contentLength / 1024;
        return sizeInKB * POINTS_PER_KB;
    };
    
    // Get referral bonus points based on tier
    private func getReferralBonus(referralCount: Nat): Nat {
        var bonus = 0;
        for (tier in referralTiers.vals()) {
            if (referralCount <= tier.limit) {
                return tier.points;
            };
        };
        return 5; // Default minimum bonus
    };

    // Scraped data management with points
    public shared({ caller }) func submitScrapedData(data: SharedTypes.ScrapedData): async Result.Result<(), SharedTypes.Error> {
        if (not isAuthenticated(caller)) {
            return #err(#NotAuthorized);
        };

        // Verify the user has a profile and award points
        switch (userProfiles.get(caller)) {
            case null return #err(#NotAuthorized);
            case (?profile) {
                // Calculate points for this submission
                let contentLength = Text.size(data.content);
                let points = calculatePoints(contentLength);
                
                // Update profile with new points and data scraped
                let updatedProfile = {
                    profile with
                    points = profile.points + points;
                    totalDataScraped = profile.totalDataScraped + contentLength;
                    lastLogin = Time.now();
                };
                userProfiles.put(caller, updatedProfile);
                
                // Award referral bonus to referrer if applicable
                switch (profile.referredBy) {
                    case (?referrer) {
                        switch (userProfiles.get(referrer)) {
                            case (?referrerProfile) {
                                let referralBonus = points / 10; // 10% of points go to referrer
                                let updatedReferrerProfile = {
                                    referrerProfile with
                                    points = referrerProfile.points + referralBonus;
                                };
                                userProfiles.put(referrer, updatedReferrerProfile);
                            };
                            case null {};
                        };
                    };
                    case null {};
                };
            };
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

                // Generate referral code
                var newCode = await generateCode();
                while (referralCodes.get(newCode) != null) {
                    newCode := await generateCode();
                };
                
                // Create local profile
                let profile: UserProfile = {
                    principal = caller;
                    devices = [deviceId];
                    created = Time.now();
                    lastLogin = Time.now();
                    ipAddress = null;
                    referralCode = newCode;
                    referralCount = 0;
                    points = 0;
                    totalDataScraped = 0;
                    referredBy = null;
                    preferences = {
                        notificationsEnabled = true;
                        theme = "dark";
                    };
                };
                userProfiles.put(caller, profile);
                referralCodes.put(newCode, caller);
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
                    profile with
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
    
    // Referral system functions
    public shared(msg) func getReferralCode(): async Result.Result<Text, Text> {
        let caller = msg.caller;
        if (not isAuthenticated(caller)) {
            return #err("Not authorized");
        };
        
        switch (userProfiles.get(caller)) {
            case (null) {
                // Create new user profile with referral code
                var newCode = await generateCode();
                while (referralCodes.get(newCode) != null) {
                    newCode := await generateCode();
                };
                
                let profile: UserProfile = {
                    principal = caller;
                    devices = [];
                    created = Time.now();
                    lastLogin = Time.now();
                    ipAddress = null;
                    referralCode = newCode;
                    referralCount = 0;
                    points = 0;
                    totalDataScraped = 0;
                    referredBy = null;
                    preferences = {
                        notificationsEnabled = true;
                        theme = "dark";
                    };
                };
                
                userProfiles.put(caller, profile);
                referralCodes.put(newCode, caller);
                return #ok(newCode);
            };
            case (?profile) {
                return #ok(profile.referralCode);
            };
        }
    };
    
    public shared(msg) func useReferralCode(code: Text): async Result.Result<(), Text> {
        let caller = msg.caller;
        if (not isAuthenticated(caller)) {
            return #err("Not authorized");
        };
        
        // Check if referral code exists
        switch (referralCodes.get(code)) {
            case (null) {
                return #err("Invalid referral code");
            };
            case (?referrer) {
                // Can't refer yourself
                if (Principal.equal(referrer, caller)) {
                    return #err("Cannot use your own referral code");
                };
                
                // Check if user already has a profile
                switch (userProfiles.get(caller)) {
                    case (?profile) {
                        // Check if already referred
                        switch (profile.referredBy) {
                            case (?_) {
                                return #err("Already used a referral code");
                            };
                            case null {
                                // Update user profile
                                let updatedProfile = {
                                    profile with
                                    referredBy = ?referrer;
                                };
                                userProfiles.put(caller, updatedProfile);
                            };
                        };
                    };
                    case null {
                        // Create new profile with referral
                        var newCode = await generateCode();
                        while (referralCodes.get(newCode) != null) {
                            newCode := await generateCode();
                        };
                        
                        let profile: UserProfile = {
                            principal = caller;
                            devices = [];
                            created = Time.now();
                            lastLogin = Time.now();
                            ipAddress = null;
                            referralCode = newCode;
                            referralCount = 0;
                            points = 0;
                            totalDataScraped = 0;
                            referredBy = ?referrer;
                            preferences = {
                                notificationsEnabled = true;
                                theme = "dark";
                            };
                        };
                        
                        userProfiles.put(caller, profile);
                        referralCodes.put(newCode, caller);
                    };
                };
                
                // Update referrer's count and award bonus
                switch (userProfiles.get(referrer)) {
                    case (?referrerProfile) {
                        let newReferralCount = referrerProfile.referralCount + 1;
                        let bonus = getReferralBonus(newReferralCount);
                        let updatedReferrerProfile = {
                            referrerProfile with
                            referralCount = newReferralCount;
                            points = referrerProfile.points + bonus;
                        };
                        userProfiles.put(referrer, updatedReferrerProfile);
                    };
                    case null {};
                };
                
                return #ok();
            };
        }
    };
    
    public shared(msg) func getUserData(): async Result.Result<UserProfile, Text> {
        let caller = msg.caller;
        if (not isAuthenticated(caller)) {
            return #err("Not authorized");
        };
        
        switch (userProfiles.get(caller)) {
            case (?profile) {
                return #ok(profile);
            };
            case null {
                return #err("User not found");
            };
        }
    };
    
    public shared(msg) func updateUserLogin(ipAddress: Text): async Result.Result<(), Text> {
        let caller = msg.caller;
        if (not isAuthenticated(caller)) {
            return #err("Not authorized");
        };
        
        switch (userProfiles.get(caller)) {
            case (null) {
                return #err("User not found");
            };
            case (?profile) {
                let updatedProfile = {
                    profile with
                    ipAddress = ?ipAddress;
                    lastLogin = Time.now();
                };
                userProfiles.put(caller, updatedProfile);
                return #ok();
            };
        }
    };
    
    // Award bonus points (can be called by admin for special events)
    public shared(msg) func awardPoints(principalId: Principal, points: Nat): async Result.Result<(), Text> {
        // Only allow admin canister to award points
        if (Principal.toText(msg.caller) != ADMIN_CANISTER_ID) {
            return #err("Not authorized");
        };
        
        switch (userProfiles.get(principalId)) {
            case (?profile) {
                let updatedProfile = {
                    profile with
                    points = profile.points + points;
                };
                userProfiles.put(principalId, updatedProfile);
                return #ok();
            };
            case null {
                return #err("User not found");
            };
        }
    };
}
