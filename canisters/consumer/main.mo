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
import Float "mo:base/Float";
import Blob "mo:base/Blob";
import Nat64 "mo:base/Nat64";

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

    // HTTP outcall types for GeoIP
    type HttpMethod = { #get; #post; #head };
    type HttpHeader = { name: Text; value: Text };
    type HttpResponse = {
        status: Nat;
        headers: [HttpHeader];
        body: Blob;
    };
    type TransformContext = {
        function: shared query TransformArgs -> async HttpResponse;
        context: Blob;
    };
    type TransformArgs = {
        response: HttpResponse;
        context: Blob;
    };
    type ICManagement = actor {
        http_request: shared {
            url: Text;
            max_response_bytes: ?Nat64;
            headers: [HttpHeader];
            body: ?Blob;
            method: HttpMethod;
            transform: ?TransformContext;
        } -> async HttpResponse;
    };

    // Constants
    private let STORAGE_CANISTER_ID = "hhaip-uiaaa-aaaao-a4khq-cai"; // EXISTING production storage canister
    private let ADMIN_CANISTER_ID = "wvset-niaaa-aaaao-a4osa-cai";  // EXISTING production admin backend canister
    private let CYCLES_PER_CALL = 100_000_000_000; // 100B cycles per call

    // Canister references
    private let storage: StorageActor = actor(STORAGE_CANISTER_ID);
    private let admin: AdminActor = actor(ADMIN_CANISTER_ID);

    // Define old type for migration
    type UserProfileV2 = {
        principal: Principal;
        devices: [Text];
        created: Int;
        lastLogin: Int;
        ipAddress: ?Text;
        country: ?Text;
        region: ?Text;
        city: ?Text;
        latitude: ?Float;
        longitude: ?Float;
        lastActive: Int;
        isActive: Bool;
        dataVolumeKB: Nat;
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

    // User profiles with stable storage - using old type for compatibility
    private stable var stableUserProfilesV2: [(Principal, UserProfileV2)] = [];
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
        country: ?Text;
        region: ?Text;
        city: ?Text;
        latitude: ?Float;
        longitude: ?Float;
        lastActive: Int;
        isActive: Bool;
        dataVolumeKB: Nat;
        referralCode: Text;
        referralCount: Nat;
        points: Nat;
        totalDataScraped: Nat;
        referredBy: ?Principal;
        scrapedUrls: [Text]; // Track URLs already scraped by this user
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
        // Convert current profiles to V2 format for stable storage
        let v2Profiles = Array.map<(Principal, UserProfile), (Principal, UserProfileV2)>(
            Iter.toArray(userProfiles.entries()),
            func ((principal, profile)) = (principal, {
                principal = profile.principal;
                devices = profile.devices;
                created = profile.created;
                lastLogin = profile.lastLogin;
                ipAddress = profile.ipAddress;
                country = profile.country;
                region = profile.region;
                city = profile.city;
                latitude = profile.latitude;
                longitude = profile.longitude;
                lastActive = profile.lastActive;
                isActive = profile.isActive;
                dataVolumeKB = profile.dataVolumeKB;
                referralCode = profile.referralCode;
                referralCount = profile.referralCount;
                points = profile.points;
                totalDataScraped = profile.totalDataScraped;
                referredBy = profile.referredBy;
                preferences = profile.preferences;
                // Note: scrapedUrls is not saved in V2 format
            })
        );
        stableUserProfilesV2 := v2Profiles;
        stableReferralCodes := Iter.toArray(referralCodes.entries());
    };

    system func postupgrade() {
        // Migrate from V2 to current format
        if (stableUserProfilesV2.size() > 0) {
            let migratedProfiles = Array.map<(Principal, UserProfileV2), (Principal, UserProfile)>(
                stableUserProfilesV2,
                func ((principal, oldProfile)) = (principal, {
                    principal = oldProfile.principal;
                    devices = oldProfile.devices;
                    created = oldProfile.created;
                    lastLogin = oldProfile.lastLogin;
                    ipAddress = oldProfile.ipAddress;
                    country = oldProfile.country;
                    region = oldProfile.region;
                    city = oldProfile.city;
                    latitude = oldProfile.latitude;
                    longitude = oldProfile.longitude;
                    lastActive = oldProfile.lastActive;
                    isActive = oldProfile.isActive;
                    dataVolumeKB = oldProfile.dataVolumeKB;
                    referralCode = oldProfile.referralCode;
                    referralCount = oldProfile.referralCount;
                    points = oldProfile.points;
                    totalDataScraped = oldProfile.totalDataScraped;
                    referredBy = oldProfile.referredBy;
                    scrapedUrls = []; // New field - start with empty array
                    preferences = oldProfile.preferences;
                })
            );
            userProfiles := HashMap.fromIter<Principal, UserProfile>(migratedProfiles.vals(), 10, Principal.equal, Principal.hash);
        };
        
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

    // GeoIP lookup function
    private func getLocationFromIP(ip: Text): async ?{country: Text; region: Text; city: Text; lat: Float; lon: Float} {
        try {
            Debug.print("Getting location for IP: " # ip);
            
            // Using ip-api.com for free GeoIP lookup (no API key required)
            let url = "http://ip-api.com/json/" # ip # "?fields=status,country,regionName,city,lat,lon,countryCode";
            
            let ic : ICManagement = actor("aaaaa-aa");
            let request = {
                url = url;
                max_response_bytes = ?10000 : ?Nat64;
                headers = [{ name = "User-Agent"; value = "RhinoSpider/1.0" }];
                body = null : ?Blob;
                method = #get;
                transform = null : ?TransformContext;
            };
            
            ExperimentalCycles.add(20_949_972_000);
            let response = await ic.http_request(request);
            
            if (response.status == 200) {
                let responseText = Text.decodeUtf8(response.body);
                switch (responseText) {
                    case (?text) {
                        Debug.print("GeoIP response: " # text);
                        // Parse JSON response manually
                        if (Text.contains(text, #text "\"status\":\"success\"")) {
                            let country = extractJsonField(text, "country");
                            let region = extractJsonField(text, "regionName");
                            let city = extractJsonField(text, "city");
                            let latText = extractJsonField(text, "lat");
                            let lonText = extractJsonField(text, "lon");
                            
                            switch (country, region, city, latText, lonText) {
                                case (?c, ?r, ?ct, ?la, ?lo) {
                                    let lat = textToFloat(la);
                                    let lon = textToFloat(lo);
                                    switch (lat, lon) {
                                        case (?latitude, ?longitude) {
                                            return ?{
                                                country = c;
                                                region = r;
                                                city = ct;
                                                lat = latitude;
                                                lon = longitude;
                                            };
                                        };
                                        case _ return null;
                                    };
                                };
                                case _ return null;
                            };
                        };
                    };
                    case null {};
                };
            };
            
            return null;
        } catch (e) {
            Debug.print("GeoIP lookup failed: " # Error.message(e));
            return null;
        };
    };

    // Helper function to extract field from JSON string
    private func extractJsonField(json: Text, field: Text): ?Text {
        let pattern = "\"" # field # "\":";
        let parts = Iter.toArray(Text.split(json, #text pattern));
        
        if (parts.size() > 1) {
            let valuePart = parts[1];
            // Handle string values
            if (Text.startsWith(valuePart, #text "\"")) {
                let trimmed = Text.trimStart(valuePart, #text "\"");
                let valueParts = Iter.toArray(Text.split(trimmed, #text "\""));
                if (valueParts.size() > 0) {
                    return ?valueParts[0];
                };
            } else {
                // Handle numeric values
                let valueParts = Iter.toArray(Text.split(valuePart, #text ","));
                if (valueParts.size() > 0) {
                    let value = Text.trim(valueParts[0], #text " ");
                    let cleaned = Text.trim(value, #text "}");
                    return ?cleaned;
                };
            };
        };
        
        return null;
    };

    // Convert text to float
    private func textToFloat(t: Text): ?Float {
        // Simple float parsing - handle negative numbers
        var isNegative = false;
        var text = t;
        if (Text.startsWith(t, #text "-")) {
            isNegative := true;
            text := Text.trimStart(t, #text "-");
        };
        
        let parts = Iter.toArray(Text.split(text, #text "."));
        
        if (parts.size() == 2) {
            switch (Nat.fromText(parts[0]), Nat.fromText(parts[1])) {
                case (?intPart, ?decPart) {
                    let decDigits = Text.size(parts[1]);
                    var divisor = 1.0;
                    var i = 0;
                    while (i < decDigits) {
                        divisor := divisor * 10.0;
                        i += 1;
                    };
                    let result = Float.fromInt(intPart) + (Float.fromInt(decPart) / divisor);
                    return if (isNegative) ?(-result) else ?result;
                };
                case _ return null;
            };
        } else if (parts.size() == 1) {
            switch (Nat.fromText(parts[0])) {
                case (?intPart) {
                    let result = Float.fromInt(intPart);
                    return if (isNegative) ?(-result) else ?result;
                };
                case null return null;
            };
        } else {
            return null;
        };
    };

    // URL deduplication functions
    public shared({ caller }) func hasUserScrapedUrl(url: Text): async Bool {
        if (not isAuthenticated(caller)) {
            return false;
        };
        
        switch (userProfiles.get(caller)) {
            case (?profile) {
                switch (Array.find<Text>(profile.scrapedUrls, func(u) = u == url)) {
                    case (?_) true;
                    case null false;
                };
            };
            case null false;
        };
    };
    
    public shared({ caller }) func getUserScrapedUrls(): async [Text] {
        if (not isAuthenticated(caller)) {
            return [];
        };
        
        switch (userProfiles.get(caller)) {
            case (?profile) profile.scrapedUrls;
            case null [];
        };
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
                // Check if URL was already scraped by this user
                let urlAlreadyScraped = switch (Array.find<Text>(profile.scrapedUrls, func(u) = u == data.url)) {
                    case (?_) true;
                    case null false;
                };
                
                // Calculate points for this submission
                let contentLength = Text.size(data.content);
                let points = if (urlAlreadyScraped) 0 else calculatePoints(contentLength); // No points for duplicate URLs
                let dataKB = contentLength / 1024;
                
                // Add URL to scraped list if new
                let updatedScrapedUrls = if (urlAlreadyScraped) {
                    profile.scrapedUrls
                } else {
                    Array.append(profile.scrapedUrls, [data.url])
                };
                
                // Update profile with new points and data scraped
                let updatedProfile = {
                    profile with
                    points = profile.points + points;
                    totalDataScraped = profile.totalDataScraped + contentLength;
                    dataVolumeKB = profile.dataVolumeKB + dataKB;
                    scrapedUrls = updatedScrapedUrls;
                    lastLogin = Time.now();
                    lastActive = Time.now();
                    isActive = true;
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
                    country = null;
                    region = null;
                    city = null;
                    latitude = null;
                    longitude = null;
                    lastActive = Time.now();
                    isActive = true;
                    dataVolumeKB = 0;
                    referralCode = newCode;
                    referralCount = 0;
                    points = 0;
                    totalDataScraped = 0;
                    referredBy = null;
                    scrapedUrls = [];
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
                    country = null;
                    region = null;
                    city = null;
                    latitude = null;
                    longitude = null;
                    lastActive = Time.now();
                    isActive = true;
                    dataVolumeKB = 0;
                    referralCode = newCode;
                    referralCount = 0;
                    points = 0;
                    totalDataScraped = 0;
                    referredBy = null;
                    scrapedUrls = [];
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
                            country = null;
                            region = null;
                            city = null;
                            latitude = null;
                            longitude = null;
                            lastActive = Time.now();
                            isActive = true;
                            dataVolumeKB = 0;
                            referralCode = newCode;
                            referralCount = 0;
                            points = 0;
                            totalDataScraped = 0;
                            referredBy = ?referrer;
                            scrapedUrls = [];
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
                // Perform GeoIP lookup
                let location = await getLocationFromIP(ipAddress);
                
                let updatedProfile = switch (location) {
                    case (?loc) {
                        {
                            profile with
                            ipAddress = ?ipAddress;
                            country = ?loc.country;
                            region = ?loc.region;
                            city = ?loc.city;
                            latitude = ?loc.lat;
                            longitude = ?loc.lon;
                            lastLogin = Time.now();
                            lastActive = Time.now();
                            isActive = true;
                        }
                    };
                    case null {
                        {
                            profile with
                            ipAddress = ?ipAddress;
                            country = ?"United States"; // Default to USA if lookup fails
                            lastLogin = Time.now();
                            lastActive = Time.now();
                            isActive = true;
                        }
                    };
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

    // RhinoScan Statistics APIs
    
    // Type definitions for RhinoScan
    type NodeActivity = {
        principal: Principal;
        country: ?Text;
        region: ?Text;
        city: ?Text;
        lastActive: Int;
        dataVolumeKB: Nat;
    };
    
    type RhinoScanStats = {
        totalNodes: Nat;
        activeNodes: Nat;
        totalDataVolumeKB: Nat;
        countriesCount: Nat;
        nodesByCountry: [(Text, Nat)];
        recentActivity: [NodeActivity];
    };
    
    type GeographicDistribution = {
        country: Text;
        region: ?Text;
        nodeCount: Nat;
        dataVolumeKB: Nat;
        coordinates: ?{lat: Float; lng: Float};
    };
    
    // Get aggregated RhinoScan statistics
    public query func getRhinoScanStats(): async RhinoScanStats {
        var totalNodes = 0;
        var activeNodes = 0;
        var totalDataVolumeKB : Nat = 0;
        var countriesMap = HashMap.HashMap<Text, Nat>(10, Text.equal, Text.hash);
        var recentActivityBuffer = Buffer.Buffer<NodeActivity>(20);
        
        let now = Time.now();
        let dayInNanos = 86_400_000_000_000; // 24 hours in nanoseconds
        
        for ((principal, profile) in userProfiles.entries()) {
            totalNodes += 1;
            totalDataVolumeKB += profile.dataVolumeKB;
            
            // Check if node is active (active in last 24 hours)
            if ((now - profile.lastActive) < dayInNanos) {
                activeNodes += 1;
            };
            
            // Count nodes by country
            switch (profile.country) {
                case (?country) {
                    switch (countriesMap.get(country)) {
                        case (?count) countriesMap.put(country, count + 1);
                        case null countriesMap.put(country, 1);
                    };
                };
                case null {};
            };
            
            // Add to recent activity (last 20 active nodes)
            if (recentActivityBuffer.size() < 20) {
                recentActivityBuffer.add({
                    principal = principal;
                    country = profile.country;
                    region = profile.region;
                    city = profile.city;
                    lastActive = profile.lastActive;
                    dataVolumeKB = profile.dataVolumeKB;
                });
            };
        };
        
        // Convert countries map to array
        let nodesByCountry = Iter.toArray(
            Iter.map<(Text, Nat), (Text, Nat)>(
                countriesMap.entries(),
                func ((country, count)) = (country, count)
            )
        );
        
        {
            totalNodes = totalNodes;
            activeNodes = activeNodes;
            totalDataVolumeKB = totalDataVolumeKB;
            countriesCount = countriesMap.size();
            nodesByCountry = nodesByCountry;
            recentActivity = Buffer.toArray(recentActivityBuffer);
        }
    };
    
    // Get geographic distribution of nodes
    public query func getNodeGeography(): async [GeographicDistribution] {
        var geoMap = HashMap.HashMap<Text, {
            var nodeCount: Nat;
            var dataVolumeKB: Nat;
            region: ?Text;
            lat: ?Float;
            lng: ?Float;
        }>(10, Text.equal, Text.hash);
        
        // Aggregate data by country
        for ((_, profile) in userProfiles.entries()) {
            switch (profile.country) {
                case (?country) {
                    switch (geoMap.get(country)) {
                        case (?existing) {
                            existing.nodeCount += 1;
                            existing.dataVolumeKB += profile.dataVolumeKB;
                        };
                        case null {
                            geoMap.put(country, {
                                var nodeCount = 1;
                                var dataVolumeKB = profile.dataVolumeKB;
                                region = profile.region;
                                lat = profile.latitude;
                                lng = profile.longitude;
                            });
                        };
                    };
                };
                case null {};
            };
        };
        
        // Convert to output format
        let buffer = Buffer.Buffer<GeographicDistribution>(geoMap.size());
        for ((country, data) in geoMap.entries()) {
            let coords = switch (data.lat, data.lng) {
                case (?lat, ?lng) ?{lat = lat; lng = lng};
                case _ null;
            };
            
            buffer.add({
                country = country;
                region = data.region;
                nodeCount = data.nodeCount;
                dataVolumeKB = data.dataVolumeKB;
                coordinates = coords;
            });
        };
        
        Buffer.toArray(buffer)
    };
    
    // Get top contributing nodes
    public query func getTopContributors(limit: Nat): async [(Principal, Nat)] {
        // Create array of (principal, dataVolume) pairs
        let contributors = Buffer.Buffer<(Principal, Nat)>(userProfiles.size());
        for ((principal, profile) in userProfiles.entries()) {
            contributors.add((principal, profile.dataVolumeKB));
        };
        
        // Sort by data volume (descending)
        let sorted = Array.sort<(Principal, Nat)>(
            Buffer.toArray(contributors),
            func (a, b) = Nat.compare(b.1, a.1)
        );
        
        // Return top N contributors
        let resultSize = Nat.min(limit, sorted.size());
        Array.tabulate<(Principal, Nat)>(resultSize, func(i) = sorted[i])
    };
    
    // Get node status by principal
    public query func getNodeStatus(principal: Principal): async ?{
        isActive: Bool;
        country: ?Text;
        dataVolumeKB: Nat;
        lastActive: Int;
        points: Nat;
    } {
        switch (userProfiles.get(principal)) {
            case (?profile) {
                let now = Time.now();
                let dayInNanos = 86_400_000_000_000;
                let isActive = (now - profile.lastActive) < dayInNanos;
                
                ?{
                    isActive = isActive;
                    country = profile.country;
                    dataVolumeKB = profile.dataVolumeKB;
                    lastActive = profile.lastActive;
                    points = profile.points;
                }
            };
            case null null;
        }
    };
}
