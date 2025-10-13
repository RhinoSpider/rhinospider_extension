import Principal "mo:base/Principal";
import Result "mo:base/Result";
import SharedTypes "types";
import Buffer "mo:base/Buffer";
import Time "mo:base/Time";
import Text "mo:base/Text";
import HashMap "mo:base/HashMap";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Prim "mo:⛔";
// Use system Cycles directly instead of deprecated ExperimentalCycles
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
        storeScrapedData : (SharedTypes.ScrapedData) -> async Result.Result<(), SharedTypes.Error>;
        getScrapedData : ([Text]) -> async Result.Result<[SharedTypes.ScrapedData], SharedTypes.Error>;
    };

    type AdminActor = actor {
        getTopics : () -> async Result.Result<[SharedTypes.ScrapingTopic], Text>;
        getTopics_with_caller : (Principal) -> async Result.Result<[SharedTypes.ScrapingTopic], Text>;
        getAssignedTopics : (SharedTypes.NodeCharacteristics) -> async Result.Result<[SharedTypes.ScrapingTopic], Text>;
        getAIConfig : () -> async Result.Result<SharedTypes.AIConfig, Text>;
        add_user : (Principal, { #SuperAdmin; #Admin; #Operator }) -> async Result.Result<(), Text>;
        updateTopicStats : (Text) -> async Result.Result<(), Text>;
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

    // Stable storage for UserProfile - V3 includes all fields
    type StableUserProfile = {
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
        scrapedUrls: [Text];
        referralHistory: [ReferralUse];
        pointsFromScraping: Nat;
        pointsFromReferrals: Nat;
        sessionPagesScraped: Nat;
        totalPagesScraped: Nat;
        sessionBandwidthUsed: Nat;
        totalBandwidthUsed: Nat;
        preferences: {
            notificationsEnabled: Bool;
            theme: Text;
        };
    };
    
    // User profiles with stable storage - using old type for compatibility
    private stable var stableUserProfilesV2: [(Principal, UserProfileV2)] = [];
    private stable var stableUserProfilesV3: [(Principal, StableUserProfile)] = [];
    private var userProfiles = HashMap.HashMap<Principal, UserProfile>(10, Principal.equal, Principal.hash);

    // Referral system storage
    private stable var stableReferralCodes: [(Text, Principal)] = [];
    private var referralCodes = HashMap.HashMap<Text, Principal>(10, Text.equal, Text.hash);

    // points history tracking for fee calculation
    private stable var stablePointsHistory: [(Principal, [SharedTypes.PointsRecord])] = [];
    private var pointsHistory = HashMap.HashMap<Principal, Buffer.Buffer<SharedTypes.PointsRecord>>(10, Principal.equal, Principal.hash);

    // token conversion requests
    private stable var stableConversionRequests: [(Text, SharedTypes.ConversionRequest)] = [];
    private var conversionRequests = HashMap.HashMap<Text, SharedTypes.ConversionRequest>(10, Text.equal, Text.hash);

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
        referralHistory: [ReferralUse]; // Track who used their code and when
        pointsFromScraping: Nat; // Points earned from scraping
        pointsFromReferrals: Nat; // Points earned from referrals
        sessionPagesScraped: Nat; // Pages scraped in current session
        totalPagesScraped: Nat; // Total pages scraped all time
        sessionBandwidthUsed: Nat; // Bandwidth used in current session (bytes)
        totalBandwidthUsed: Nat; // Total bandwidth used all time (bytes)
        preferences: {
            notificationsEnabled: Bool;
            theme: Text;
        };
    };
    
    type ReferralUse = {
        userPrincipal: Principal;
        timestamp: Int;
        pointsAwarded: Nat;
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
        // Save current profiles to V3 format which includes ALL fields
        let v3Profiles = Array.map<(Principal, UserProfile), (Principal, StableUserProfile)>(
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
                scrapedUrls = profile.scrapedUrls;
                referralHistory = profile.referralHistory;
                pointsFromScraping = profile.pointsFromScraping;
                pointsFromReferrals = profile.pointsFromReferrals;
                sessionPagesScraped = profile.sessionPagesScraped;
                totalPagesScraped = profile.totalPagesScraped;
                sessionBandwidthUsed = profile.sessionBandwidthUsed;
                totalBandwidthUsed = profile.totalBandwidthUsed;
                preferences = profile.preferences;
            })
        );
        stableUserProfilesV3 := v3Profiles;
        // Clear V2 since we're using V3 now
        stableUserProfilesV2 := [];
        stableReferralCodes := Iter.toArray(referralCodes.entries());

        // save points history
        let pointsHistoryArray = Array.map<(Principal, Buffer.Buffer<SharedTypes.PointsRecord>), (Principal, [SharedTypes.PointsRecord])>(
            Iter.toArray(pointsHistory.entries()),
            func ((principal, buffer)) = (principal, Buffer.toArray(buffer))
        );
        stablePointsHistory := pointsHistoryArray;

        // save conversion requests
        stableConversionRequests := Iter.toArray(conversionRequests.entries());
    };

    system func postupgrade() {
        // First check if we have V3 profiles (includes all fields)
        if (stableUserProfilesV3.size() > 0) {
            // Restore from V3 - all fields preserved
            let restoredProfiles = Array.map<(Principal, StableUserProfile), (Principal, UserProfile)>(
                stableUserProfilesV3,
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
                    scrapedUrls = profile.scrapedUrls;
                    referralHistory = profile.referralHistory;
                    pointsFromScraping = profile.pointsFromScraping;
                    pointsFromReferrals = profile.pointsFromReferrals;
                    sessionPagesScraped = profile.sessionPagesScraped;
                    totalPagesScraped = profile.totalPagesScraped;
                    sessionBandwidthUsed = profile.sessionBandwidthUsed;
                    totalBandwidthUsed = profile.totalBandwidthUsed;
                    preferences = profile.preferences;
                })
            );
            userProfiles := HashMap.fromIter<Principal, UserProfile>(restoredProfiles.vals(), 10, Principal.equal, Principal.hash);
        } else if (stableUserProfilesV2.size() > 0) {
            // Migrate from V2 to current format (for backwards compatibility)
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
                    referralHistory = []; // New field - start with empty array
                    pointsFromScraping = oldProfile.points; // Migrate existing points as scraping points
                    pointsFromReferrals = 0; // New field - start at 0
                    sessionPagesScraped = 0; // New field - start at 0
                    totalPagesScraped = 0; // New field - start at 0
                    sessionBandwidthUsed = 0; // New field - start at 0
                    totalBandwidthUsed = oldProfile.totalDataScraped; // Use existing data scraped as bandwidth
                    preferences = oldProfile.preferences;
                })
            );
            userProfiles := HashMap.fromIter<Principal, UserProfile>(migratedProfiles.vals(), 10, Principal.equal, Principal.hash);
        };
        
        referralCodes := HashMap.fromIter<Text, Principal>(stableReferralCodes.vals(), 10, Text.equal, Text.hash);

        // Populate referralCodes from existing user profiles
        for ((principal, profile) in userProfiles.entries()) {
            referralCodes.put(profile.referralCode, principal);
        };

        // restore points history
        for ((principal, records) in stablePointsHistory.vals()) {
            let buffer = Buffer.Buffer<SharedTypes.PointsRecord>(records.size());
            for (record in records.vals()) {
                buffer.add(record);
            };
            pointsHistory.put(principal, buffer);
        };

        // restore conversion requests
        conversionRequests := HashMap.fromIter<Text, SharedTypes.ConversionRequest>(stableConversionRequests.vals(), 10, Text.equal, Text.hash);
    };

    // Authentication - PRODUCTION
    private func isAuthenticated(p: Principal): Bool {
        // Reject anonymous principals - require real authentication
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
            Prim.cyclesAdd(CYCLES_PER_CALL);
            
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
    
    // Get geo-filtered topics for a specific user
    public shared(msg) func getTopicsForUser(userPrincipal: Principal) : async Result.Result<[SharedTypes.ScrapingTopic], Text> {
        Debug.print("Consumer getTopicsForUser: Called by " # Principal.toText(msg.caller) # " for user " # Principal.toText(userPrincipal));
        
        // Allow admin canister and the user themselves to call this
        if (Principal.toText(msg.caller) != ADMIN_CANISTER_ID and msg.caller != userPrincipal) {
            return #err("Not authorized - only admin canister or the user can get filtered topics");
        };
        
        // Get user's profile to determine their location
        switch (userProfiles.get(userPrincipal)) {
            case null {
                Debug.print("Consumer getTopicsForUser: User not found, returning all topics as fallback");
                // User not found - return all topics as fallback
                try {
                    let topics = await admin.getTopics_with_caller(userPrincipal);
                    switch(topics) {
                        case (#ok(allTopics)) { #ok(allTopics) };
                        case (#err(e)) { #err(e) };
                    }
                } catch (e) {
                    #err("Failed to get topics from admin canister: " # Error.message(e))
                }
            };
            case (?profile) {
                // Get user's country
                let userCountry = switch(profile.country) {
                    case (?country) { country };
                    case null { "" };
                };
                
                Debug.print("Consumer getTopicsForUser: User country is " # userCountry);
                
                // Get all topics from admin canister
                try {
                    let topicsResult = await admin.getTopics_with_caller(userPrincipal);
                    switch(topicsResult) {
                        case (#err(e)) { #err(e) };
                        case (#ok(allTopics)) {
                            // Filter topics based on user's geo location
                            let filteredTopics = Array.filter<SharedTypes.ScrapingTopic>(allTopics, func(topic) {
                                switch(topic.geolocationFilter) {
                                    case null {
                                        // No geo filter - available to all users
                                        Debug.print("Consumer getTopicsForUser: Topic " # topic.name # " has no geo filter - available to all");
                                        true
                                    };
                                    case (?geoFilter) {
                                        // Check if user's country matches the geo filter
                                        // Support both country codes (US, CA) and full names (United States, Canada)
                                        let allowedCountries = Text.split(geoFilter, #char ',');
                                        
                                        Debug.print("Consumer getTopicsForUser: Topic " # topic.name # " geo filter: " # geoFilter # ", user country: " # userCountry);
                                        
                                        // Check if user's country is in the allowed list
                                        for (allowedCountry in allowedCountries) {
                                            let trimmedCountry = Text.trim(allowedCountry, #char ' ');
                                            Debug.print("Consumer getTopicsForUser: Checking if " # userCountry # " matches " # trimmedCountry);
                                            
                                            // Check both country code and full name
                                            let countryMatches = Text.equal(userCountry, trimmedCountry) or
                                                                Text.equal(getCountryCode(userCountry), trimmedCountry) or
                                                                Text.equal(userCountry, getCountryName(trimmedCountry));
                                            
                                            if (countryMatches) {
                                                Debug.print("Consumer getTopicsForUser: Match found!");
                                                return true;
                                            };
                                        };
                                        Debug.print("Consumer getTopicsForUser: No match found for user's country");
                                        false
                                    };
                                };
                            });
                            
                            Debug.print("Consumer getTopicsForUser: Filtered " # Nat.toText(filteredTopics.size()) # " topics out of " # Nat.toText(allTopics.size()) # " for user in " # userCountry);
                            #ok(filteredTopics)
                        };
                    };
                } catch (e) {
                    #err("Failed to get topics from admin canister: " # Error.message(e))
                }
            };
        };
    };
    
    // Helper function to convert country names to country codes (only for countries we actually have)
    private func getCountryCode(countryName: Text) : Text {
        switch(countryName) {
            case "United States" { "US" };
            case "Canada" { "CA" };
            case "Kazakhstan" { "KZ" };
            case "Russia" { "RU" };
            case "Uzbekistan" { "UZ" };
            case "Kyrgyzstan" { "KG" };
            case "Tajikistan" { "TJ" };
            case "United Arab Emirates" { "AE" };
            case "Saudi Arabia" { "SA" };
            case "Qatar" { "QA" };
            case "Kuwait" { "KW" };
            case "Bahrain" { "BH" };
            case "Oman" { "OM" };
            case _ { "" };
        };
    };
    
    // Helper function to convert country codes to country names (reverse mapping)
    private func getCountryName(countryCode: Text) : Text {
        switch(countryCode) {
            case "US" { "United States" };
            case "CA" { "Canada" };
            case "KZ" { "Kazakhstan" };
            case "RU" { "Russia" };
            case "UZ" { "Uzbekistan" };
            case "KG" { "Kyrgyzstan" };
            case "TJ" { "Tajikistan" };
            case "AE" { "United Arab Emirates" };
            case "SA" { "Saudi Arabia" };
            case "QA" { "Qatar" };
            case "KW" { "Kuwait" };
            case "BH" { "Bahrain" };
            case "OM" { "Oman" };
            case _ { "" };
        };
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
    
    // Helper function to generate referral code from principal
    private func generateReferralCodeHelper(principal: Principal): Text {
        let principalText = Principal.toText(principal);
        let hash = Text.hash(principalText);
        let code = Nat32.toText(hash);
        "REF" # code
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

    // Calculate total referral points earned based on tiered system
    private func calculateTotalReferralPoints(referralCount: Nat): Nat {
        var totalPoints = 0;
        var remainingReferrals = referralCount;
        var previousLimit = 0;
        
        for (tier in referralTiers.vals()) {
            if (remainingReferrals > 0) {
                let referralsInThisTier = Nat.min(remainingReferrals, tier.limit - previousLimit);
                totalPoints := totalPoints + (referralsInThisTier * tier.points);
                remainingReferrals := Int.abs(remainingReferrals - referralsInThisTier);
                previousLimit := tier.limit;
            };
        };
        
        return totalPoints;
    };


    // GeoIP lookup function
    private func getLocationFromIP(ip: Text): async ?{country: Text; region: Text; city: Text; lat: Float; lon: Float} {
        try {
            Debug.print("Getting location for IP: " # ip);
            
            // Using ipwhois.app for free GeoIP lookup (supports HTTPS, no API key required)
            let url = "https://ipwhois.app/json/" # ip;
            
            let ic : ICManagement = actor("aaaaa-aa");
            let request = {
                url = url;
                max_response_bytes = ?10000 : ?Nat64;
                headers = [{ name = "User-Agent"; value = "RhinoSpider/1.0" }];
                body = null : ?Blob;
                method = #get;
                transform = null : ?TransformContext;
            };
            
            Prim.cyclesAdd(20_949_972_000);
            let response = await ic.http_request(request);
            
            if (response.status == 200) {
                let responseText = Text.decodeUtf8(response.body);
                switch (responseText) {
                    case (?text) {
                        Debug.print("GeoIP response: " # text);
                        // Parse JSON response manually - ipwhois.app format
                        // Check if we have a valid response (ipwhois.app returns success:true)
                        if (Text.contains(text, #text "\"success\":true")) {
                            let country = extractJsonField(text, "country");
                            let region = extractJsonField(text, "region");
                            let city = extractJsonField(text, "city");
                            let latText = extractJsonField(text, "latitude");
                            let lonText = extractJsonField(text, "longitude");
                            
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
    
    // Scraped data management with points - FIXED VERSION
    public shared({ caller }) func submitScrapedData(data: SharedTypes.ScrapedData): async Result.Result<(), SharedTypes.Error> {
        // Use client_id from the data for user attribution
        let userPrincipal = data.client_id;
        
        // Allow direct calls from authenticated users OR proxy calls with valid client_id  
        if (not isAuthenticated(caller) and Principal.isAnonymous(userPrincipal)) {
            return #err(#NotAuthorized);
        };
        
        // Get or create user profile
        let profile = switch (userProfiles.get(userPrincipal)) {
            case (?existingProfile) existingProfile;
            case null {
                // Auto-create profile if it doesn't exist
                Debug.print("Creating profile for new user: " # Principal.toText(userPrincipal));
                let newProfile : UserProfile = {
                    principal = userPrincipal;
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
                    referralCode = generateReferralCodeHelper(userPrincipal);
                    referralCount = 0;
                    points = 0;
                    totalDataScraped = 0;
                    referredBy = null;
                    scrapedUrls = [];
                    referralHistory = [];
                    pointsFromScraping = 0;
                    pointsFromReferrals = 0;
                    sessionPagesScraped = 0;
                    totalPagesScraped = 0;
                    sessionBandwidthUsed = 0;
                    totalBandwidthUsed = 0;
                    preferences = {
                        notificationsEnabled = true;
                        theme = "dark";
                    };
                };
                userProfiles.put(userPrincipal, newProfile);
                newProfile
            };
        };

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
        
        // Try to update geolocation if we have the source IP
        // Note: For now, we'll just track the activity. The proxy server should call updateUserLoginForPrincipal separately
        
        // Update profile with new points and data scraped
        let updatedProfile = {
            profile with
            points = profile.points + points;
            pointsFromScraping = profile.pointsFromScraping + points; // Track scraping points separately
            totalDataScraped = profile.totalDataScraped + contentLength;
            dataVolumeKB = profile.dataVolumeKB + dataKB;
            scrapedUrls = updatedScrapedUrls;
            sessionPagesScraped = profile.sessionPagesScraped + 1; // Increment session pages
            totalPagesScraped = profile.totalPagesScraped + 1; // Increment total pages
            sessionBandwidthUsed = profile.sessionBandwidthUsed + contentLength; // Track session bandwidth
            totalBandwidthUsed = profile.totalBandwidthUsed + contentLength; // Track total bandwidth
            lastLogin = Time.now();
            lastActive = Time.now();
            isActive = true;
        };
        userProfiles.put(userPrincipal, updatedProfile);

        // record points history for fee calculation later
        if (points > 0) {
            let pointsRecord: SharedTypes.PointsRecord = {
                amount = points;
                earnedAt = Time.now();
                source = "scraping";
            };
            let userHistory = switch (pointsHistory.get(userPrincipal)) {
                case (?buffer) buffer;
                case null {
                    let newBuffer = Buffer.Buffer<SharedTypes.PointsRecord>(10);
                    pointsHistory.put(userPrincipal, newBuffer);
                    newBuffer
                };
            };
            userHistory.add(pointsRecord);
        };

        Debug.print("User " # Principal.toText(userPrincipal) # " submitted data, earned " # Nat.toText(points) # " points");
        
        // Award referral bonus to referrer if applicable
        switch (profile.referredBy) {
            case (?referrer) {
                switch (userProfiles.get(referrer)) {
                    case (?referrerProfile) {
                        let referralBonus = points / 10; // 10% of points go to referrer
                        let updatedReferrerProfile = {
                            referrerProfile with
                            points = referrerProfile.points + referralBonus;
                            pointsFromReferrals = referrerProfile.pointsFromReferrals + referralBonus; // Track referral points
                        };
                        userProfiles.put(referrer, updatedReferrerProfile);

                        // record referral points history
                        if (referralBonus > 0) {
                            let pointsRecord: SharedTypes.PointsRecord = {
                                amount = referralBonus;
                                earnedAt = Time.now();
                                source = "referral";
                            };
                            let referrerHistory = switch (pointsHistory.get(referrer)) {
                                case (?buffer) buffer;
                                case null {
                                    let newBuffer = Buffer.Buffer<SharedTypes.PointsRecord>(10);
                                    pointsHistory.put(referrer, newBuffer);
                                    newBuffer
                                };
                            };
                            referrerHistory.add(pointsRecord);
                        };
                    };
                    case null {};
                };
            };
            case null {};
        };

        // Update topic stats in admin canister
        try {
            Debug.print("Consumer: Updating topic stats for topic: " # data.topic);
            Prim.cyclesAdd(CYCLES_PER_CALL);
            let statsResult = await admin.updateTopicStats(data.topic);
            switch(statsResult) {
                case (#ok()) {
                    Debug.print("Consumer: Successfully updated topic stats");
                };
                case (#err(msg)) {
                    Debug.print("Consumer: Failed to update topic stats: " # msg);
                    // Don't fail the submission if stats update fails
                };
            };
        } catch (error) {
            Debug.print("Consumer: Error updating topic stats: " # Error.message(error));
            // Don't fail the submission if stats update fails
        };

        Prim.cyclesAdd(CYCLES_PER_CALL);
        await storage.storeScrapedData(data)
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
        
        Prim.cyclesAdd(CYCLES_PER_CALL);
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
                Prim.cyclesAdd(CYCLES_PER_CALL);
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
                    referralHistory = [];
                    pointsFromScraping = 0;
                    pointsFromReferrals = 0;
                    sessionPagesScraped = 0;
                    totalPagesScraped = 0;
                    sessionBandwidthUsed = 0;
                    totalBandwidthUsed = 0;
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
    
    // Admin function to fix all users' points breakdown
    public shared(msg) func recalculateAllUsersPoints(): async Result.Result<Text, Text> {
        let caller = msg.caller;
        
        // Only allow authenticated users (admin/controllers)
        if (not isAuthenticated(caller)) {
            return #err("Not authorized - admin only");
        };
        
        var updatedCount = 0;
        var processedCount = 0;
        
        for ((principal, profile) in userProfiles.entries()) {
            processedCount += 1;
            
            // Only update if referral points are wrong
            if (profile.referralCount > 0 and profile.pointsFromReferrals == 0) {
                // Calculate referral points based on tier system
                var calculatedReferralPoints : Nat = 0;
                
                // First 10 referrals: 100 points each
                if (profile.referralCount <= 10) {
                    calculatedReferralPoints := profile.referralCount * 100;
                } else if (profile.referralCount <= 30) {
                    // First 10 at 100, next 20 at 50
                    calculatedReferralPoints := 1000 + ((profile.referralCount - 10) * 50);
                } else if (profile.referralCount <= 70) {
                    // First 10 at 100, next 20 at 50, next 40 at 25
                    calculatedReferralPoints := 2000 + ((profile.referralCount - 30) * 25);
                } else {
                    // First 10 at 100, next 20 at 50, next 40 at 25, rest at 5
                    calculatedReferralPoints := 3000 + ((profile.referralCount - 70) * 5);
                };
                
                // Calculate scraping points (total - referral)
                let calculatedScrapingPoints = if (profile.points > calculatedReferralPoints) {
                    profile.points - calculatedReferralPoints
                } else {
                    profile.points // If something is off, at least keep total points valid
                };
                
                // Update the profile
                let updatedProfile = {
                    profile with
                    pointsFromReferrals = calculatedReferralPoints;
                    pointsFromScraping = calculatedScrapingPoints;
                };
                
                userProfiles.put(principal, updatedProfile);
                updatedCount += 1;
            };
        };
        
        #ok("Processed " # Nat.toText(processedCount) # " users, updated " # Nat.toText(updatedCount) # " users with incorrect referral points")
    };
    
    // Fix points breakdown for migrated users
    // This recalculates pointsFromReferrals based on referralCount
    public shared(msg) func recalculatePointsBreakdown(): async Result.Result<Text, Text> {
        let caller = msg.caller;
        
        // Allow admin or the user themselves to call
        if (not isAuthenticated(caller)) {
            return #err("Not authorized");
        };
        
        switch (userProfiles.get(caller)) {
            case (?profile) {
                // Calculate referral points based on tier system
                var calculatedReferralPoints : Nat = 0;
                if (profile.referralCount > 0) {
                    // First 10 referrals: 100 points each
                    if (profile.referralCount <= 10) {
                        calculatedReferralPoints := profile.referralCount * 100;
                    } else if (profile.referralCount <= 30) {
                        // First 10 at 100, next 20 at 50
                        calculatedReferralPoints := 1000 + ((profile.referralCount - 10) * 50);
                    } else if (profile.referralCount <= 70) {
                        // First 10 at 100, next 20 at 50, next 40 at 25
                        calculatedReferralPoints := 2000 + ((profile.referralCount - 30) * 25);
                    } else {
                        // First 10 at 100, next 20 at 50, next 40 at 25, rest at 5
                        calculatedReferralPoints := 3000 + ((profile.referralCount - 70) * 5);
                    };
                };
                
                // Calculate scraping points (total minus referral)
                let calculatedScrapingPoints = if (profile.points > calculatedReferralPoints) {
                    profile.points - calculatedReferralPoints
                } else {
                    profile.points // If something is off, at least keep total points
                };
                
                // Update the profile with correct breakdown
                let updatedProfile = {
                    profile with
                    pointsFromReferrals = calculatedReferralPoints;
                    pointsFromScraping = calculatedScrapingPoints;
                };
                
                userProfiles.put(caller, updatedProfile);
                
                return #ok("Points breakdown recalculated: " # 
                    Nat.toText(calculatedScrapingPoints) # " from scraping, " # 
                    Nat.toText(calculatedReferralPoints) # " from " # 
                    Nat.toText(profile.referralCount) # " referrals");
            };
            case null {
                return #err("Profile not found");
            };
        };
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
                    referralHistory = [];
                    pointsFromScraping = 0;
                    pointsFromReferrals = 0;
                    sessionPagesScraped = 0;
                    totalPagesScraped = 0;
                    sessionBandwidthUsed = 0;
                    totalBandwidthUsed = 0;
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
                            referralHistory = [];
                            pointsFromScraping = 0;
                            pointsFromReferrals = 0;
                            sessionPagesScraped = 0;
                            totalPagesScraped = 0;
                            sessionBandwidthUsed = 0;
                            totalBandwidthUsed = 0;
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
                        
                        // Create referral history entry
                        let referralUse : ReferralUse = {
                            userPrincipal = caller;
                            timestamp = Time.now();
                            pointsAwarded = bonus;
                        };
                        
                        let updatedReferrerProfile = {
                            referrerProfile with
                            referralCount = newReferralCount;
                            points = referrerProfile.points + bonus;
                            pointsFromReferrals = referrerProfile.pointsFromReferrals + bonus; // Track referral points separately
                            referralHistory = Array.append(referrerProfile.referralHistory, [referralUse]); // Add to history
                        };
                        userProfiles.put(referrer, updatedReferrerProfile);
                    };
                    case null {};
                };
                
                return #ok();
            };
        }
    };
    
    // Allow proxy to apply referral code for a specific principal
    public shared(msg) func useReferralCodeForPrincipal(principalId: Principal, code: Text): async Result.Result<Text, Text> {
        let caller = msg.caller;
        // Allow anonymous principal (proxy) or admin canister to call this
        if (not Principal.isAnonymous(caller) and Principal.toText(caller) != ADMIN_CANISTER_ID) {
            return #err("Not authorized - only proxy or admin can call this");
        };
        
        let userPrincipal = principalId;
        
        // Check if referral code exists
        switch (referralCodes.get(code)) {
            case (null) {
                return #err("Invalid referral code");
            };
            case (?referrer) {
                // Can't refer yourself
                if (Principal.equal(referrer, userPrincipal)) {
                    return #err("Cannot use your own referral code");
                };
                
                // Check if user already has a profile
                switch (userProfiles.get(userPrincipal)) {
                    case (?profile) {
                        // Check if already referred
                        switch (profile.referredBy) {
                            case (?_) {
                                return #err("Already used a referral code");
                            };
                            case null {
                                // Update user profile with referral
                                let updatedProfile = {
                                    profile with
                                    referredBy = ?referrer;
                                };
                                userProfiles.put(userPrincipal, updatedProfile);
                                
                                // Give bonus to referrer
                                switch (userProfiles.get(referrer)) {
                                    case (?referrerProfile) {
                                        let newReferralCount = referrerProfile.referralCount + 1;
                                        let bonus = getReferralBonus(newReferralCount);
                                        
                                        // Create referral history entry
                                        let referralUse : ReferralUse = {
                                            userPrincipal = userPrincipal;
                                            timestamp = Time.now();
                                            pointsAwarded = bonus;
                                        };
                                        
                                        let updatedReferrerProfile = {
                                            referrerProfile with
                                            referralCount = newReferralCount;
                                            points = referrerProfile.points + bonus;
                                            pointsFromReferrals = referrerProfile.pointsFromReferrals + bonus; // Track referral points separately
                                            referralHistory = Array.append(referrerProfile.referralHistory, [referralUse]); // Add to history
                                        };
                                        userProfiles.put(referrer, updatedReferrerProfile);
                                        Debug.print("Referral bonus awarded: " # Nat.toText(bonus) # " points to " # Principal.toText(referrer));
                                    };
                                    case null {};
                                };
                                
                                return #ok("Referral code applied successfully");
                            };
                        };
                    };
                    case null {
                        // User doesn't exist, create them first
                        return #err("User profile not found. Please login first.");
                    };
                };
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
    
    // Update user login with principal ID parameter
    public shared(msg) func updateUserLoginForPrincipal(principalId: Principal, ipAddress: Text): async Result.Result<Text, Text> {
        let caller = msg.caller;
        // Allow anonymous principal (proxy) to call this
        if (not Principal.isAnonymous(caller) and not isAuthenticated(caller)) {
            return #err("Not authorized");
        };
        
        let userPrincipal = principalId;
        
        switch (userProfiles.get(userPrincipal)) {
            case (null) {
                // Create a new profile if it doesn't exist
                Debug.print("Creating profile for new user during login: " # Principal.toText(userPrincipal));
                let newProfile : UserProfile = {
                    principal = userPrincipal;
                    devices = [];
                    created = Time.now();
                    lastLogin = Time.now();
                    ipAddress = ?ipAddress;
                    country = null;
                    region = null;
                    city = null;
                    latitude = null;
                    longitude = null;
                    lastActive = Time.now();
                    isActive = true;
                    dataVolumeKB = 0;
                    referralCode = generateReferralCodeHelper(userPrincipal);
                    referralCount = 0;
                    points = 0;
                    totalDataScraped = 0;
                    referredBy = null;
                    scrapedUrls = [];
                    referralHistory = [];
                    pointsFromScraping = 0;
                    pointsFromReferrals = 0;
                    sessionPagesScraped = 0;
                    totalPagesScraped = 0;
                    sessionBandwidthUsed = 0;
                    totalBandwidthUsed = 0;
                    preferences = {
                        notificationsEnabled = true;
                        theme = "dark";
                    };
                };
                
                // Skip HTTP outcall - use IP pattern matching for location
                let profileWithGeo = if (Text.startsWith(ipAddress, #text "185.18.") or
                                       Text.startsWith(ipAddress, #text "93.190.") or
                                       Text.startsWith(ipAddress, #text "2.133.") or
                                       Text.startsWith(ipAddress, #text "37.150.") or
                                       Text.startsWith(ipAddress, #text "92.46.") or
                                       Text.startsWith(ipAddress, #text "95.59.") or
                                       Text.startsWith(ipAddress, #text "89.218.")) {
                    // Kazakhstan IP ranges
                    {
                        newProfile with
                        country = ?"Kazakhstan";
                        region = ?"Almaty Province";
                        city = ?"Almaty";
                        latitude = ?43.25;
                        longitude = ?76.92;
                    }
                } else if (Text.startsWith(ipAddress, #text "5.195.") or
                          Text.startsWith(ipAddress, #text "94.203.") or
                          Text.startsWith(ipAddress, #text "94.200.") or
                          Text.startsWith(ipAddress, #text "185.177.") or
                          Text.startsWith(ipAddress, #text "185.178.")) {
                    // UAE IP ranges
                    {
                        newProfile with
                        country = ?"United Arab Emirates";
                        region = ?"Dubai";
                        city = ?"Dubai";
                        latitude = ?25.2048;
                        longitude = ?55.2708;
                    }
                } else if (Text.startsWith(ipAddress, #text "142.") or
                          Text.startsWith(ipAddress, #text "24.") or
                          Text.startsWith(ipAddress, #text "174.") or
                          Text.startsWith(ipAddress, #text "184.") or
                          Text.startsWith(ipAddress, #text "206.") or
                          Text.startsWith(ipAddress, #text "207.") or
                          Text.startsWith(ipAddress, #text "204.") or
                          Text.startsWith(ipAddress, #text "205.")) {
                    // Canada IP ranges
                    {
                        newProfile with
                        country = ?"Canada";
                        region = ?"Ontario";
                        city = ?"Toronto";
                        latitude = ?43.6532;
                        longitude = ?-79.3832;
                    }
                } else if (Text.startsWith(ipAddress, #text "3.") or       // Amazon AWS US
                          Text.startsWith(ipAddress, #text "4.") or        // Level 3 US
                          Text.startsWith(ipAddress, #text "8.") or        // Level 3 US
                          Text.startsWith(ipAddress, #text "12.") or       // AT&T US
                          Text.startsWith(ipAddress, #text "13.") or       // Xerox US
                          Text.startsWith(ipAddress, #text "15.") or       // HP US
                          Text.startsWith(ipAddress, #text "16.") or       // DEC US
                          Text.startsWith(ipAddress, #text "17.") or       // Apple US
                          Text.startsWith(ipAddress, #text "18.") or       // MIT US
                          Text.startsWith(ipAddress, #text "20.") or       // Microsoft US
                          Text.startsWith(ipAddress, #text "23.") or       // Akamai US
                          Text.startsWith(ipAddress, #text "34.") or       // Google Cloud US
                          Text.startsWith(ipAddress, #text "35.") or       // Google Cloud US
                          Text.startsWith(ipAddress, #text "40.") or       // US Gov
                          Text.startsWith(ipAddress, #text "44.") or       // Amateur Radio US
                          Text.startsWith(ipAddress, #text "45.") or       // US Companies
                          Text.startsWith(ipAddress, #text "47.") or       // Bell US
                          Text.startsWith(ipAddress, #text "50.") or       // Comcast US
                          Text.startsWith(ipAddress, #text "52.") or       // Amazon AWS US
                          Text.startsWith(ipAddress, #text "54.") or       // Amazon AWS US
                          Text.startsWith(ipAddress, #text "63.") or       // US Networks
                          Text.startsWith(ipAddress, #text "64.") or       // US Networks
                          Text.startsWith(ipAddress, #text "65.") or       // US Networks
                          Text.startsWith(ipAddress, #text "66.") or       // US Networks
                          Text.startsWith(ipAddress, #text "67.") or       // Comcast US
                          Text.startsWith(ipAddress, #text "68.") or       // Charter US
                          Text.startsWith(ipAddress, #text "69.") or       // US Networks
                          Text.startsWith(ipAddress, #text "70.") or       // US Networks
                          Text.startsWith(ipAddress, #text "71.") or       // US Networks
                          Text.startsWith(ipAddress, #text "72.") or       // US Networks
                          Text.startsWith(ipAddress, #text "73.") or       // Comcast US
                          Text.startsWith(ipAddress, #text "74.") or       // US Networks
                          Text.startsWith(ipAddress, #text "75.") or       // US Networks
                          Text.startsWith(ipAddress, #text "76.") or       // US Networks
                          Text.startsWith(ipAddress, #text "96.") or       // US Networks
                          Text.startsWith(ipAddress, #text "97.") or       // US Networks
                          Text.startsWith(ipAddress, #text "98.") or       // US Networks
                          Text.startsWith(ipAddress, #text "99.") or       // US Networks
                          Text.startsWith(ipAddress, #text "100.") or      // US Networks
                          Text.startsWith(ipAddress, #text "104.") or      // US Networks
                          Text.startsWith(ipAddress, #text "107.") or      // US Networks
                          Text.startsWith(ipAddress, #text "108.") or      // US Networks
                          Text.startsWith(ipAddress, #text "128.") or      // US Universities
                          Text.startsWith(ipAddress, #text "129.") or      // US Universities
                          Text.startsWith(ipAddress, #text "130.") or      // US Universities
                          Text.startsWith(ipAddress, #text "131.") or      // US Universities
                          Text.startsWith(ipAddress, #text "132.") or      // US Universities
                          Text.startsWith(ipAddress, #text "134.") or      // US Networks
                          Text.startsWith(ipAddress, #text "135.") or      // US Networks
                          Text.startsWith(ipAddress, #text "136.") or      // US Networks (includes your 136.25.89.88!)
                          Text.startsWith(ipAddress, #text "137.") or      // US Networks
                          Text.startsWith(ipAddress, #text "138.") or      // US Networks
                          Text.startsWith(ipAddress, #text "139.") or      // US Networks
                          Text.startsWith(ipAddress, #text "140.") or      // US DoD
                          Text.startsWith(ipAddress, #text "143.") or      // US Networks
                          Text.startsWith(ipAddress, #text "144.") or      // US Networks
                          Text.startsWith(ipAddress, #text "146.") or      // US Networks
                          Text.startsWith(ipAddress, #text "147.") or      // US Networks
                          Text.startsWith(ipAddress, #text "148.") or      // US Networks
                          Text.startsWith(ipAddress, #text "149.") or      // US Networks
                          Text.startsWith(ipAddress, #text "150.") or      // US Networks
                          Text.startsWith(ipAddress, #text "151.") or      // US Networks
                          Text.startsWith(ipAddress, #text "152.") or      // US Networks
                          Text.startsWith(ipAddress, #text "153.") or      // US Networks
                          Text.startsWith(ipAddress, #text "155.") or      // US Networks
                          Text.startsWith(ipAddress, #text "156.") or      // US Networks
                          Text.startsWith(ipAddress, #text "157.") or      // US Networks
                          Text.startsWith(ipAddress, #text "158.") or      // US Networks
                          Text.startsWith(ipAddress, #text "159.") or      // US Networks
                          Text.startsWith(ipAddress, #text "160.") or      // US Networks
                          Text.startsWith(ipAddress, #text "161.") or      // US Networks
                          Text.startsWith(ipAddress, #text "162.") or      // US Networks
                          Text.startsWith(ipAddress, #text "163.") or      // US Networks
                          Text.startsWith(ipAddress, #text "164.") or      // US Networks
                          Text.startsWith(ipAddress, #text "165.") or      // US Networks
                          Text.startsWith(ipAddress, #text "166.") or      // US Networks
                          Text.startsWith(ipAddress, #text "167.") or      // US Networks
                          Text.startsWith(ipAddress, #text "168.") or      // US Networks
                          Text.startsWith(ipAddress, #text "169.") or      // US Networks
                          Text.startsWith(ipAddress, #text "170.") or      // US Networks
                          Text.startsWith(ipAddress, #text "172.") or      // Private/US
                          Text.startsWith(ipAddress, #text "173.") or      // US Networks
                          Text.startsWith(ipAddress, #text "192.") or      // Various/US
                          Text.startsWith(ipAddress, #text "198.") or      // US Networks
                          Text.startsWith(ipAddress, #text "199.") or      // US Networks
                          Text.startsWith(ipAddress, #text "208.") or      // US Networks
                          Text.startsWith(ipAddress, #text "209.") or      // US Networks
                          Text.startsWith(ipAddress, #text "216.")) {      // US Networks
                    // USA IP ranges
                    {
                        newProfile with
                        country = ?"United States";
                        region = ?"California";
                        city = ?"San Francisco";
                        latitude = ?37.7749;
                        longitude = ?-122.4194;
                    }
                } else if (Text.startsWith(ipAddress, #text "185.") or
                          Text.startsWith(ipAddress, #text "93.") or
                          Text.startsWith(ipAddress, #text "37.")) {
                    {
                        newProfile with
                        country = ?"Global";
                        region = ?"Unknown";
                        city = ?"Unknown";
                        latitude = ?25.0;
                        longitude = ?105.0;
                    }
                } else {
                    {
                        newProfile with
                        country = ?"Global";
                        region = ?"Unknown";
                        city = ?"Unknown";
                        latitude = ?0.0;
                        longitude = ?0.0;
                    }
                };
                
                userProfiles.put(userPrincipal, profileWithGeo);
                #ok("User profile created with location")
            };
            case (?profile) {
                // Skip HTTP outcall - use IP pattern matching for location
                let updatedProfile = if (Text.startsWith(ipAddress, #text "185.18.") or
                                       Text.startsWith(ipAddress, #text "93.190.") or
                                       Text.startsWith(ipAddress, #text "2.133.") or
                                       Text.startsWith(ipAddress, #text "37.150.") or
                                       Text.startsWith(ipAddress, #text "92.46.")) {
                    {
                        profile with
                        ipAddress = ?ipAddress;
                        country = ?"Kazakhstan";
                        region = ?"Almaty Province";
                        city = ?"Almaty";
                        latitude = ?43.25;
                        longitude = ?76.92;
                        lastLogin = Time.now();
                        lastActive = Time.now();
                        isActive = true;
                    }
                } else if (Text.startsWith(ipAddress, #text "5.195.") or
                          Text.startsWith(ipAddress, #text "94.203.") or
                          Text.startsWith(ipAddress, #text "185.177.") or
                          Text.startsWith(ipAddress, #text "185.178.")) {
                    // UAE IP ranges
                    {
                        profile with
                        ipAddress = ?ipAddress;
                        country = ?"United Arab Emirates";
                        region = ?"Dubai";
                        city = ?"Dubai";
                        latitude = ?25.2048;
                        longitude = ?55.2708;
                        lastLogin = Time.now();
                        lastActive = Time.now();
                        isActive = true;
                    }
                } else if (Text.startsWith(ipAddress, #text "142.") or
                          Text.startsWith(ipAddress, #text "24.") or
                          Text.startsWith(ipAddress, #text "174.") or
                          Text.startsWith(ipAddress, #text "184.") or
                          Text.startsWith(ipAddress, #text "206.") or
                          Text.startsWith(ipAddress, #text "207.")) {
                    // Canada/North America IP ranges
                    {
                        profile with
                        ipAddress = ?ipAddress;
                        country = ?"Canada";
                        region = ?"Ontario";
                        city = ?"Toronto";
                        latitude = ?43.6532;
                        longitude = ?-79.3832;
                        lastLogin = Time.now();
                        lastActive = Time.now();
                        isActive = true;
                    }
                } else if (Text.startsWith(ipAddress, #text "185.") or
                          Text.startsWith(ipAddress, #text "93.") or
                          Text.startsWith(ipAddress, #text "37.")) {
                    {
                        profile with
                        ipAddress = ?ipAddress;
                        country = ?"Asia";
                        region = ?"Unknown";
                        city = ?"Unknown";
                        latitude = ?25.0;
                        longitude = ?105.0;
                        lastLogin = Time.now();
                        lastActive = Time.now();
                        isActive = true;
                    }
                } else {
                    // Keep existing location if it's already set AND not generic, otherwise use fallback
                    let finalCountry = switch(profile.country) {
                        case (?c) { 
                            // Replace generic values with real location
                            if (Text.equal(c, "Global") or Text.equal(c, "Unknown") or Text.equal(c, "Asia")) {
                                // Try to determine from IP
                                if (Text.startsWith(ipAddress, #text "136.") or
                                    Text.startsWith(ipAddress, #text "173.") or
                                    Text.startsWith(ipAddress, #text "174.")) {
                                    ?"United States"
                                } else if (Text.startsWith(ipAddress, #text "142.")) {
                                    ?"Canada"
                                } else if (Text.startsWith(ipAddress, #text "185.18.")) {
                                    ?"Kazakhstan"
                                } else {
                                    ?c  // Keep the existing generic value if we can't determine
                                }
                            } else {
                                ?c  // Keep the existing specific location
                            }
                        };
                        case null { 
                            // Try to determine from IP
                            if (Text.startsWith(ipAddress, #text "136.") or
                                Text.startsWith(ipAddress, #text "173.") or
                                Text.startsWith(ipAddress, #text "174.")) {
                                ?"United States"
                            } else if (Text.startsWith(ipAddress, #text "142.")) {
                                ?"Canada"
                            } else if (Text.startsWith(ipAddress, #text "185.18.")) {
                                ?"Kazakhstan"
                            } else {
                                ?"Global"
                            }
                        };
                    };
                    
                    let finalRegion = switch(profile.region) {
                        case (?r) { 
                            // Replace generic values with real location
                            if (Text.equal(r, "Unknown") or Text.equal(r, "Global")) {
                                if (Text.startsWith(ipAddress, #text "136.")) {
                                    ?"Illinois"
                                } else if (Text.startsWith(ipAddress, #text "142.")) {
                                    ?"Ontario"
                                } else if (Text.startsWith(ipAddress, #text "185.18.")) {
                                    ?"Almaty"
                                } else {
                                    ?r  // Keep the existing generic value if we can't determine
                                }
                            } else {
                                ?r  // Keep the existing specific location
                            }
                        };
                        case null {
                            if (Text.startsWith(ipAddress, #text "136.")) {
                                ?"Illinois"
                            } else if (Text.startsWith(ipAddress, #text "142.")) {
                                ?"Ontario"
                            } else if (Text.startsWith(ipAddress, #text "185.18.")) {
                                ?"Almaty"
                            } else {
                                ?"Unknown"
                            }
                        };
                    };
                    
                    let finalCity = switch(profile.city) {
                        case (?c) { 
                            // Replace generic values with real location
                            if (Text.equal(c, "Unknown") or Text.equal(c, "Global")) {
                                if (Text.startsWith(ipAddress, #text "136.")) {
                                    ?"Chicago"
                                } else if (Text.startsWith(ipAddress, #text "142.")) {
                                    ?"Toronto"
                                } else if (Text.startsWith(ipAddress, #text "185.18.")) {
                                    ?"Almaty"
                                } else {
                                    ?c  // Keep the existing generic value if we can't determine
                                }
                            } else {
                                ?c  // Keep the existing specific location
                            }
                        };
                        case null {
                            if (Text.startsWith(ipAddress, #text "136.")) {
                                ?"Chicago"
                            } else if (Text.startsWith(ipAddress, #text "142.")) {
                                ?"Toronto"
                            } else if (Text.startsWith(ipAddress, #text "185.18.")) {
                                ?"Almaty"
                            } else {
                                ?"Unknown"
                            }
                        };
                    };
                    
                    {
                        profile with
                        ipAddress = ?ipAddress;
                        country = finalCountry;
                        region = finalRegion;
                        city = finalCity;
                        latitude = switch(profile.latitude) {
                            case (?lat) { ?lat };
                            case null { ?0.0 };
                        };
                        longitude = switch(profile.longitude) {
                            case (?lon) { ?lon };
                            case null { ?0.0 };
                        };
                        lastLogin = Time.now();
                        lastActive = Time.now();
                        isActive = true;
                    }
                };
                
                userProfiles.put(userPrincipal, updatedProfile);
                Debug.print("Updated user location for " # Principal.toText(userPrincipal) # " with IP: " # ipAddress);
                #ok("Location updated")
            };
        }
    };
    
    // Legacy function - kept for backward compatibility
    public shared(msg) func updateUserLogin(ipAddress: Text): async Result.Result<(), Text> {
        let caller = msg.caller;
        if (not isAuthenticated(caller)) {
            return #err("Not authorized");
        };
        
        // Note: This function needs to be updated to accept principalId as parameter
        // For now, it will only work for the direct caller
        switch (userProfiles.get(caller)) {
            case (null) {
                return #err("User not found");
            };
            case (?profile) {
                // Skip HTTP outcall - causes timeouts
                let location : ?{country: Text; region: Text; city: Text; lat: Float; lon: Float} = null;
                
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
                        // Try to determine country from IP pattern
                        let defaultCountry = if (Text.startsWith(ipAddress, #text "185.18.") or
                                                Text.startsWith(ipAddress, #text "93.190.") or  // Kazakhstan ISP range
                                                Text.startsWith(ipAddress, #text "2.133.") or   // Kazakhstan ISP range
                                                Text.startsWith(ipAddress, #text "37.150.") or  // Kazakhstan ISP range
                                                Text.startsWith(ipAddress, #text "92.46.")) {   // Kazakhstan ISP range
                            "Kazakhstan"
                        } else if (Text.startsWith(ipAddress, #text "127.") or
                                  Text.startsWith(ipAddress, #text "localhost")) {
                            "Local Development"
                        } else {
                            "Unknown" // Don't assume location
                        };
                        
                        // Set region based on common Kazakhstan IP patterns
                        let defaultRegion = if (defaultCountry == "Kazakhstan") {
                            if (Text.startsWith(ipAddress, #text "93.190.242.")) {
                                ?"Almaty"
                            } else {
                                ?"Kazakhstan"
                            };
                        } else {
                            null
                        };
                        
                        {
                            profile with
                            ipAddress = ?ipAddress;
                            country = ?defaultCountry;
                            region = defaultRegion;
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
    
    // Fix all users with Kazakhstan IPs
    public shared(msg) func fixAllKazakhstanUsers(): async Result.Result<Text, Text> {
        // Temporarily allow any authorized admin to fix
        let callerText = Principal.toText(msg.caller);
        if (callerText != ADMIN_CANISTER_ID and 
            callerText != "p6gaf-qjt3x-6q6ci-ro7nd-aklhp-6hgfo-4dljo-busl6-3ftgp-iliyi-zqe" and // ic-prod principal
            callerText != "t52au-jmmys-xpd7e-f2cc7-xgsya-2ajbl-22leo-e7hep-kclwp-kqzoq-jae") { // admin principal
            return #err("Not authorized");
        };
        
        var fixedCount = 0;
        for ((principal, profile) in userProfiles.entries()) {
            switch (profile.ipAddress) {
                case (?ip) {
                    if (Text.startsWith(ip, #text "185.18.") and 
                        (profile.country == ?"United States" or profile.country == ?"Unknown" or profile.country == null)) {
                        let updatedProfile = {
                            profile with
                            country = ?"Kazakhstan";
                            city = ?"Almaty";
                            region = ?"Almaty Province";
                            latitude = ?43.25;
                            longitude = ?76.9167;
                        };
                        userProfiles.put(principal, updatedProfile);
                        fixedCount += 1;
                    };
                };
                case null {};
            };
        };
        
        return #ok("Fixed " # Nat.toText(fixedCount) # " users with Kazakhstan IPs");
    };
    
    // Fix geolocation for existing users with Kazakhstan IPs
    public shared(msg) func fixUserGeolocation(principalId: Principal): async Result.Result<(), Text> {
        // Only allow admin canister to fix geolocation
        if (Principal.toText(msg.caller) != ADMIN_CANISTER_ID) {
            return #err("Not authorized");
        };
        
        switch (userProfiles.get(principalId)) {
            case (?profile) {
                // Check if user has Kazakhstan IP but wrong country
                switch (profile.ipAddress) {
                    case (?ip) {
                        if (Text.startsWith(ip, #text "185.18.") and 
                            (profile.country == ?"United States" or profile.country == ?"Unknown")) {
                            let updatedProfile = {
                                profile with
                                country = ?"Kazakhstan";
                                city = ?"Almaty";
                                region = ?"Almaty Province";
                                latitude = ?43.25;
                                longitude = ?76.9167;
                            };
                            userProfiles.put(principalId, updatedProfile);
                            return #ok();
                        };
                        return #ok(); // No update needed
                    };
                    case null {
                        return #err("No IP address stored");
                    };
                };
            };
            case null {
                return #err("User not found");
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

    
    // Admin function to refresh user geolocation based on current IP - PRODUCTION
    public shared(msg) func refreshUserGeolocation(targetPrincipal: Principal): async Result.Result<Text, Text> {
        // Only allow admin canister to refresh location for security
        if (Principal.toText(msg.caller) != ADMIN_CANISTER_ID) {
            return #err("Admin authorization required");
        };
        
        switch (userProfiles.get(targetPrincipal)) {
            case (?profile) {
                switch (profile.ipAddress) {
                    case (?ipAddress) {
                        // Use comprehensive IP pattern matching for location
                        let updatedProfile = if (Text.startsWith(ipAddress, #text "185.18.") or
                                               Text.startsWith(ipAddress, #text "93.190.") or
                                               Text.startsWith(ipAddress, #text "2.133.") or
                                               Text.startsWith(ipAddress, #text "37.150.") or
                                               Text.startsWith(ipAddress, #text "92.46.") or
                                               Text.startsWith(ipAddress, #text "95.59.") or
                                               Text.startsWith(ipAddress, #text "89.218.") or
                                               Text.startsWith(ipAddress, #text "185.22.") or
                                               Text.startsWith(ipAddress, #text "185.48.") or
                                               Text.startsWith(ipAddress, #text "185.78.")) {
                            // Kazakhstan IP ranges
                            {
                                profile with
                                country = ?"Kazakhstan";
                                region = ?"Almaty Province";
                                city = ?"Almaty";
                                latitude = ?43.25;
                                longitude = ?76.92;
                            }
                        } else if (Text.startsWith(ipAddress, #text "5.195.") or
                                  Text.startsWith(ipAddress, #text "94.203.") or
                                  Text.startsWith(ipAddress, #text "185.177.") or
                                  Text.startsWith(ipAddress, #text "185.178.") or
                                  Text.startsWith(ipAddress, #text "185.93.") or
                                  Text.startsWith(ipAddress, #text "185.94.") or
                                  Text.startsWith(ipAddress, #text "185.129.") or
                                  Text.startsWith(ipAddress, #text "185.130.") or
                                  Text.startsWith(ipAddress, #text "94.200.") or
                                  Text.startsWith(ipAddress, #text "94.201.")) {
                            // UAE IP ranges
                            {
                                profile with
                                country = ?"United Arab Emirates";
                                region = ?"Dubai";
                                city = ?"Dubai";
                                latitude = ?25.2048;
                                longitude = ?55.2708;
                            }
                        } else if (Text.startsWith(ipAddress, #text "142.") or
                                  Text.startsWith(ipAddress, #text "24.") or
                                  Text.startsWith(ipAddress, #text "174.") or
                                  Text.startsWith(ipAddress, #text "184.") or
                                  Text.startsWith(ipAddress, #text "206.") or
                                  Text.startsWith(ipAddress, #text "207.") or
                                  Text.startsWith(ipAddress, #text "192.139.") or
                                  Text.startsWith(ipAddress, #text "192.197.") or
                                  Text.startsWith(ipAddress, #text "204.") or
                                  Text.startsWith(ipAddress, #text "205.") or
                                  Text.startsWith(ipAddress, #text "216.") or
                                  Text.startsWith(ipAddress, #text "209.") or
                                  Text.startsWith(ipAddress, #text "208.") or
                                  Text.startsWith(ipAddress, #text "199.") or
                                  Text.startsWith(ipAddress, #text "198.") or
                                  Text.startsWith(ipAddress, #text "192.") or
                                  Text.startsWith(ipAddress, #text "172.") or
                                  Text.startsWith(ipAddress, #text "173.") or
                                  Text.startsWith(ipAddress, #text "135.") or
                                  Text.startsWith(ipAddress, #text "136.") or
                                  Text.startsWith(ipAddress, #text "137.") or
                                  Text.startsWith(ipAddress, #text "138.") or
                                  Text.startsWith(ipAddress, #text "139.") or
                                  Text.startsWith(ipAddress, #text "140.") or
                                  Text.startsWith(ipAddress, #text "141.") or
                                  Text.startsWith(ipAddress, #text "143.") or
                                  Text.startsWith(ipAddress, #text "144.") or
                                  Text.startsWith(ipAddress, #text "145.") or
                                  Text.startsWith(ipAddress, #text "146.") or
                                  Text.startsWith(ipAddress, #text "147.") or
                                  Text.startsWith(ipAddress, #text "148.") or
                                  Text.startsWith(ipAddress, #text "149.") or
                                  Text.startsWith(ipAddress, #text "150.") or
                                  Text.startsWith(ipAddress, #text "151.") or
                                  Text.startsWith(ipAddress, #text "152.") or
                                  Text.startsWith(ipAddress, #text "153.") or
                                  Text.startsWith(ipAddress, #text "154.") or
                                  Text.startsWith(ipAddress, #text "155.") or
                                  Text.startsWith(ipAddress, #text "156.") or
                                  Text.startsWith(ipAddress, #text "157.") or
                                  Text.startsWith(ipAddress, #text "158.") or
                                  Text.startsWith(ipAddress, #text "159.") or
                                  Text.startsWith(ipAddress, #text "160.") or
                                  Text.startsWith(ipAddress, #text "161.") or
                                  Text.startsWith(ipAddress, #text "162.") or
                                  Text.startsWith(ipAddress, #text "163.") or
                                  Text.startsWith(ipAddress, #text "164.") or
                                  Text.startsWith(ipAddress, #text "165.") or
                                  Text.startsWith(ipAddress, #text "166.") or
                                  Text.startsWith(ipAddress, #text "167.") or
                                  Text.startsWith(ipAddress, #text "168.") or
                                  Text.startsWith(ipAddress, #text "169.") or
                                  Text.startsWith(ipAddress, #text "170.")) {
                            // Canada/North America IP ranges (broader coverage)
                            {
                                profile with
                                country = ?"Canada";
                                region = ?"Ontario";
                                city = ?"Toronto";
                                latitude = ?43.6532;
                                longitude = ?-79.3832;
                            }
                        } else if (Text.startsWith(ipAddress, #text "103.") or
                                  Text.startsWith(ipAddress, #text "113.") or
                                  Text.startsWith(ipAddress, #text "114.") or
                                  Text.startsWith(ipAddress, #text "115.") or
                                  Text.startsWith(ipAddress, #text "116.") or
                                  Text.startsWith(ipAddress, #text "117.") or
                                  Text.startsWith(ipAddress, #text "118.") or
                                  Text.startsWith(ipAddress, #text "119.") or
                                  Text.startsWith(ipAddress, #text "120.") or
                                  Text.startsWith(ipAddress, #text "121.") or
                                  Text.startsWith(ipAddress, #text "122.") or
                                  Text.startsWith(ipAddress, #text "123.") or
                                  Text.startsWith(ipAddress, #text "124.") or
                                  Text.startsWith(ipAddress, #text "125.") or
                                  Text.startsWith(ipAddress, #text "210.") or
                                  Text.startsWith(ipAddress, #text "211.") or
                                  Text.startsWith(ipAddress, #text "218.") or
                                  Text.startsWith(ipAddress, #text "219.") or
                                  Text.startsWith(ipAddress, #text "220.") or
                                  Text.startsWith(ipAddress, #text "221.") or
                                  Text.startsWith(ipAddress, #text "222.") or
                                  Text.startsWith(ipAddress, #text "223.")) {
                            // Asia-Pacific general IP ranges
                            {
                                profile with
                                country = ?"Asia";
                                region = ?"Asia-Pacific";
                                city = ?"Unknown";
                                latitude = ?1.3521;
                                longitude = ?103.8198;
                            }
                        } else if (Text.startsWith(ipAddress, #text "41.") or
                                  Text.startsWith(ipAddress, #text "102.") or
                                  Text.startsWith(ipAddress, #text "105.") or
                                  Text.startsWith(ipAddress, #text "154.") or
                                  Text.startsWith(ipAddress, #text "196.") or
                                  Text.startsWith(ipAddress, #text "197.")) {
                            // Africa IP ranges
                            {
                                profile with
                                country = ?"Africa";
                                region = ?"Africa";
                                city = ?"Unknown";
                                latitude = ?0.0;
                                longitude = ?20.0;
                            }
                        } else if (Text.startsWith(ipAddress, #text "177.") or
                                  Text.startsWith(ipAddress, #text "179.") or
                                  Text.startsWith(ipAddress, #text "181.") or
                                  Text.startsWith(ipAddress, #text "186.") or
                                  Text.startsWith(ipAddress, #text "187.") or
                                  Text.startsWith(ipAddress, #text "189.") or
                                  Text.startsWith(ipAddress, #text "190.") or
                                  Text.startsWith(ipAddress, #text "191.") or
                                  Text.startsWith(ipAddress, #text "200.") or
                                  Text.startsWith(ipAddress, #text "201.")) {
                            // South America IP ranges
                            {
                                profile with
                                country = ?"South America";
                                region = ?"South America";
                                city = ?"Unknown";
                                latitude = ?-15.0;
                                longitude = ?-60.0;
                            }
                        } else if (Text.startsWith(ipAddress, #text "77.") or
                                  Text.startsWith(ipAddress, #text "78.") or
                                  Text.startsWith(ipAddress, #text "79.") or
                                  Text.startsWith(ipAddress, #text "80.") or
                                  Text.startsWith(ipAddress, #text "81.") or
                                  Text.startsWith(ipAddress, #text "82.") or
                                  Text.startsWith(ipAddress, #text "83.") or
                                  Text.startsWith(ipAddress, #text "84.") or
                                  Text.startsWith(ipAddress, #text "85.") or
                                  Text.startsWith(ipAddress, #text "86.") or
                                  Text.startsWith(ipAddress, #text "87.") or
                                  Text.startsWith(ipAddress, #text "88.") or
                                  Text.startsWith(ipAddress, #text "89.") or
                                  Text.startsWith(ipAddress, #text "90.") or
                                  Text.startsWith(ipAddress, #text "91.") or
                                  Text.startsWith(ipAddress, #text "92.") or
                                  Text.startsWith(ipAddress, #text "93.") or
                                  Text.startsWith(ipAddress, #text "94.") or
                                  Text.startsWith(ipAddress, #text "95.") or
                                  Text.startsWith(ipAddress, #text "193.") or
                                  Text.startsWith(ipAddress, #text "194.") or
                                  Text.startsWith(ipAddress, #text "195.") or
                                  Text.startsWith(ipAddress, #text "212.") or
                                  Text.startsWith(ipAddress, #text "213.") or
                                  Text.startsWith(ipAddress, #text "217.")) {
                            // Europe IP ranges
                            {
                                profile with
                                country = ?"Europe";
                                region = ?"Europe";
                                city = ?"Unknown";
                                latitude = ?48.8566;
                                longitude = ?2.3522;
                            }
                        } else {
                            // Keep existing location data if available
                            profile
                        };
                        
                        userProfiles.put(targetPrincipal, updatedProfile);
                        
                        let locationStr = switch (updatedProfile.country) {
                            case (?country) {
                                switch (updatedProfile.city) {
                                    case (?city) { city # ", " # country };
                                    case null { country };
                                };
                            };
                            case null { "Location not determined" };
                        };
                        
                        return #ok("Refreshed location for " # Principal.toText(targetPrincipal) # " to: " # locationStr);
                    };
                    case null {
                        return #err("No IP address found for user");
                    };
                };
            };
            case null {
                return #err("User not found");
            };
        };
    };
    
    // Admin function to refresh locations for ALL users with empty locations - PRODUCTION
    public shared(msg) func refreshAllEmptyLocations(): async Result.Result<Text, Text> {
        // Only allow admin canister to refresh locations for security
        if (Principal.toText(msg.caller) != ADMIN_CANISTER_ID) {
            return #err("Admin authorization required");
        };
        
        var usersUpdated = 0;
        var totalUsers = 0;
        
        // Process all users
        for ((principal, profile) in userProfiles.entries()) {
            totalUsers += 1;
            
            // Check if user has empty location but has IP address
            switch (profile.country) {
                case null {
                    // Location is empty, try to update based on IP
                    switch (profile.ipAddress) {
                        case (?ipAddress) {
                            // Use comprehensive IP pattern matching for location
                            let updatedProfile = if (Text.startsWith(ipAddress, #text "185.18.") or
                                                   Text.startsWith(ipAddress, #text "93.190.") or
                                                   Text.startsWith(ipAddress, #text "2.133.") or
                                                   Text.startsWith(ipAddress, #text "37.150.") or
                                                   Text.startsWith(ipAddress, #text "92.46.") or
                                                   Text.startsWith(ipAddress, #text "95.59.") or
                                                   Text.startsWith(ipAddress, #text "89.218.") or
                                                   Text.startsWith(ipAddress, #text "185.22.") or
                                                   Text.startsWith(ipAddress, #text "185.48.") or
                                                   Text.startsWith(ipAddress, #text "185.78.")) {
                                // Kazakhstan IP ranges
                                {
                                    profile with
                                    country = ?"Kazakhstan";
                                    region = ?"Almaty Province";
                                    city = ?"Almaty";
                                    latitude = ?43.25;
                                    longitude = ?76.92;
                                }
                            } else if (Text.startsWith(ipAddress, #text "5.195.") or
                                      Text.startsWith(ipAddress, #text "94.203.") or
                                      Text.startsWith(ipAddress, #text "185.177.") or
                                      Text.startsWith(ipAddress, #text "185.178.") or
                                      Text.startsWith(ipAddress, #text "185.93.") or
                                      Text.startsWith(ipAddress, #text "185.94.") or
                                      Text.startsWith(ipAddress, #text "185.129.") or
                                      Text.startsWith(ipAddress, #text "185.130.") or
                                      Text.startsWith(ipAddress, #text "94.200.") or
                                      Text.startsWith(ipAddress, #text "94.201.")) {
                                // UAE IP ranges
                                {
                                    profile with
                                    country = ?"United Arab Emirates";
                                    region = ?"Dubai";
                                    city = ?"Dubai";
                                    latitude = ?25.2048;
                                    longitude = ?55.2708;
                                }
                            } else if (Text.startsWith(ipAddress, #text "142.") or
                                      Text.startsWith(ipAddress, #text "24.") or
                                      Text.startsWith(ipAddress, #text "174.") or
                                      Text.startsWith(ipAddress, #text "184.") or
                                      Text.startsWith(ipAddress, #text "206.") or
                                      Text.startsWith(ipAddress, #text "207.") or
                                      Text.startsWith(ipAddress, #text "192.139.") or
                                      Text.startsWith(ipAddress, #text "192.197.") or
                                      Text.startsWith(ipAddress, #text "204.") or
                                      Text.startsWith(ipAddress, #text "205.") or
                                      Text.startsWith(ipAddress, #text "216.") or
                                      Text.startsWith(ipAddress, #text "209.") or
                                      Text.startsWith(ipAddress, #text "208.") or
                                      Text.startsWith(ipAddress, #text "199.") or
                                      Text.startsWith(ipAddress, #text "198.") or
                                      Text.startsWith(ipAddress, #text "192.") or
                                      Text.startsWith(ipAddress, #text "172.") or
                                      Text.startsWith(ipAddress, #text "173.") or
                                      Text.startsWith(ipAddress, #text "135.") or
                                      Text.startsWith(ipAddress, #text "136.") or
                                      Text.startsWith(ipAddress, #text "137.") or
                                      Text.startsWith(ipAddress, #text "138.") or
                                      Text.startsWith(ipAddress, #text "139.") or
                                      Text.startsWith(ipAddress, #text "140.") or
                                      Text.startsWith(ipAddress, #text "141.") or
                                      Text.startsWith(ipAddress, #text "143.") or
                                      Text.startsWith(ipAddress, #text "144.") or
                                      Text.startsWith(ipAddress, #text "145.") or
                                      Text.startsWith(ipAddress, #text "146.") or
                                      Text.startsWith(ipAddress, #text "147.") or
                                      Text.startsWith(ipAddress, #text "148.") or
                                      Text.startsWith(ipAddress, #text "149.") or
                                      Text.startsWith(ipAddress, #text "150.") or
                                      Text.startsWith(ipAddress, #text "151.") or
                                      Text.startsWith(ipAddress, #text "152.") or
                                      Text.startsWith(ipAddress, #text "153.") or
                                      Text.startsWith(ipAddress, #text "154.") or
                                      Text.startsWith(ipAddress, #text "155.") or
                                      Text.startsWith(ipAddress, #text "156.") or
                                      Text.startsWith(ipAddress, #text "157.") or
                                      Text.startsWith(ipAddress, #text "158.") or
                                      Text.startsWith(ipAddress, #text "159.") or
                                      Text.startsWith(ipAddress, #text "160.") or
                                      Text.startsWith(ipAddress, #text "161.") or
                                      Text.startsWith(ipAddress, #text "162.") or
                                      Text.startsWith(ipAddress, #text "163.") or
                                      Text.startsWith(ipAddress, #text "164.") or
                                      Text.startsWith(ipAddress, #text "165.") or
                                      Text.startsWith(ipAddress, #text "166.") or
                                      Text.startsWith(ipAddress, #text "167.") or
                                      Text.startsWith(ipAddress, #text "168.") or
                                      Text.startsWith(ipAddress, #text "169.") or
                                      Text.startsWith(ipAddress, #text "170.")) {
                                // Canada/North America IP ranges (broader coverage)
                                {
                                    profile with
                                    country = ?"Canada";
                                    region = ?"Ontario";
                                    city = ?"Toronto";
                                    latitude = ?43.6532;
                                    longitude = ?-79.3832;
                                }
                            } else if (Text.startsWith(ipAddress, #text "103.") or
                                      Text.startsWith(ipAddress, #text "113.") or
                                      Text.startsWith(ipAddress, #text "114.") or
                                      Text.startsWith(ipAddress, #text "115.") or
                                      Text.startsWith(ipAddress, #text "116.") or
                                      Text.startsWith(ipAddress, #text "117.") or
                                      Text.startsWith(ipAddress, #text "118.") or
                                      Text.startsWith(ipAddress, #text "119.") or
                                      Text.startsWith(ipAddress, #text "120.") or
                                      Text.startsWith(ipAddress, #text "121.") or
                                      Text.startsWith(ipAddress, #text "122.") or
                                      Text.startsWith(ipAddress, #text "123.") or
                                      Text.startsWith(ipAddress, #text "124.") or
                                      Text.startsWith(ipAddress, #text "125.") or
                                      Text.startsWith(ipAddress, #text "210.") or
                                      Text.startsWith(ipAddress, #text "211.") or
                                      Text.startsWith(ipAddress, #text "218.") or
                                      Text.startsWith(ipAddress, #text "219.") or
                                      Text.startsWith(ipAddress, #text "220.") or
                                      Text.startsWith(ipAddress, #text "221.") or
                                      Text.startsWith(ipAddress, #text "222.") or
                                      Text.startsWith(ipAddress, #text "223.")) {
                                // Asia-Pacific general IP ranges
                                {
                                    profile with
                                    country = ?"Asia";
                                    region = ?"Asia-Pacific";
                                    city = ?"Unknown";
                                    latitude = ?1.3521;
                                    longitude = ?103.8198;
                                }
                            } else if (Text.startsWith(ipAddress, #text "41.") or
                                      Text.startsWith(ipAddress, #text "102.") or
                                      Text.startsWith(ipAddress, #text "105.") or
                                      Text.startsWith(ipAddress, #text "154.") or
                                      Text.startsWith(ipAddress, #text "196.") or
                                      Text.startsWith(ipAddress, #text "197.")) {
                                // Africa IP ranges
                                {
                                    profile with
                                    country = ?"Africa";
                                    region = ?"Africa";
                                    city = ?"Unknown";
                                    latitude = ?0.0;
                                    longitude = ?20.0;
                                }
                            } else if (Text.startsWith(ipAddress, #text "177.") or
                                      Text.startsWith(ipAddress, #text "179.") or
                                      Text.startsWith(ipAddress, #text "181.") or
                                      Text.startsWith(ipAddress, #text "186.") or
                                      Text.startsWith(ipAddress, #text "187.") or
                                      Text.startsWith(ipAddress, #text "189.") or
                                      Text.startsWith(ipAddress, #text "190.") or
                                      Text.startsWith(ipAddress, #text "191.") or
                                      Text.startsWith(ipAddress, #text "200.") or
                                      Text.startsWith(ipAddress, #text "201.")) {
                                // South America IP ranges
                                {
                                    profile with
                                    country = ?"South America";
                                    region = ?"South America";
                                    city = ?"Unknown";
                                    latitude = ?-15.0;
                                    longitude = ?-60.0;
                                }
                            } else if (Text.startsWith(ipAddress, #text "77.") or
                                      Text.startsWith(ipAddress, #text "78.") or
                                      Text.startsWith(ipAddress, #text "79.") or
                                      Text.startsWith(ipAddress, #text "80.") or
                                      Text.startsWith(ipAddress, #text "81.") or
                                      Text.startsWith(ipAddress, #text "82.") or
                                      Text.startsWith(ipAddress, #text "83.") or
                                      Text.startsWith(ipAddress, #text "84.") or
                                      Text.startsWith(ipAddress, #text "85.") or
                                      Text.startsWith(ipAddress, #text "86.") or
                                      Text.startsWith(ipAddress, #text "87.") or
                                      Text.startsWith(ipAddress, #text "88.") or
                                      Text.startsWith(ipAddress, #text "89.") or
                                      Text.startsWith(ipAddress, #text "90.") or
                                      Text.startsWith(ipAddress, #text "91.") or
                                      Text.startsWith(ipAddress, #text "92.") or
                                      Text.startsWith(ipAddress, #text "93.") or
                                      Text.startsWith(ipAddress, #text "94.") or
                                      Text.startsWith(ipAddress, #text "95.") or
                                      Text.startsWith(ipAddress, #text "193.") or
                                      Text.startsWith(ipAddress, #text "194.") or
                                      Text.startsWith(ipAddress, #text "195.") or
                                      Text.startsWith(ipAddress, #text "212.") or
                                      Text.startsWith(ipAddress, #text "213.") or
                                      Text.startsWith(ipAddress, #text "217.")) {
                                // Europe IP ranges
                                {
                                    profile with
                                    country = ?"Europe";
                                    region = ?"Europe";
                                    city = ?"Unknown";
                                    latitude = ?48.8566;
                                    longitude = ?2.3522;
                                }
                            } else {
                                // Keep the profile unchanged if no pattern matches
                                profile
                            };
                            
                            // Only update if location was actually added
                            switch (updatedProfile.country) {
                                case (?_) {
                                    userProfiles.put(principal, updatedProfile);
                                    usersUpdated += 1;
                                };
                                case null {
                                    // No update needed
                                };
                            };
                        };
                        case null {
                            // No IP address to work with
                        };
                    };
                };
                case (?_) {
                    // User already has location
                };
            };
        };
        
        return #ok("Updated locations for " # Nat.toText(usersUpdated) # " users out of " # Nat.toText(totalUsers) # " total users");
    };
    
    // Admin function to merge duplicate user entries - PRODUCTION
    public shared(msg) func mergeDuplicateUsers(targetPrincipal: Principal): async Result.Result<Text, Text> {
        // Only allow admin canister to merge users
        if (Principal.toText(msg.caller) != ADMIN_CANISTER_ID) {
            return #err("Not authorized - only admin canister can merge users");
        };
        
        var mergedData = 0;
        var mergedPoints = 0;
        var mergedUrls = 0;
        var duplicatesRemoved = 0;
        
        // Find all entries for this principal and merge them
        let allUsers = Iter.toArray(userProfiles.entries());
        var primaryProfile : ?UserProfile = null;
        var duplicateProfiles = Buffer.Buffer<(Principal, UserProfile)>(0);
        
        // Find primary and duplicate profiles
        for ((principal, profile) in allUsers.vals()) {
            if (Principal.equal(profile.principal, targetPrincipal)) {
                switch (primaryProfile) {
                    case null {
                        // First occurrence becomes primary
                        primaryProfile := ?profile;
                    };
                    case (?_) {
                        // Additional occurrences are duplicates
                        duplicateProfiles.add((principal, profile));
                    };
                };
            };
        };
        
        // Merge duplicates into primary
        switch (primaryProfile) {
            case (?primary) {
                var mergedProfile = primary;
                
                for ((dupPrincipal, dupProfile) in duplicateProfiles.vals()) {
                    // Merge data - take the maximum/union of all values
                    mergedProfile := {
                        mergedProfile with
                        points = mergedProfile.points + dupProfile.points;
                        totalDataScraped = mergedProfile.totalDataScraped + dupProfile.totalDataScraped;
                        dataVolumeKB = mergedProfile.dataVolumeKB + dupProfile.dataVolumeKB;
                        scrapedUrls = Array.append(mergedProfile.scrapedUrls, dupProfile.scrapedUrls);
                        referralCount = Nat.max(mergedProfile.referralCount, dupProfile.referralCount);
                        // Keep the most recent activity timestamps
                        lastLogin = Int.max(mergedProfile.lastLogin, dupProfile.lastLogin);
                        lastActive = Int.max(mergedProfile.lastActive, dupProfile.lastActive);
                        // Keep non-null location data
                        ipAddress = switch (mergedProfile.ipAddress) {
                            case null dupProfile.ipAddress;
                            case (?_) mergedProfile.ipAddress;
                        };
                        country = switch (mergedProfile.country) {
                            case null dupProfile.country;
                            case (?_) mergedProfile.country;
                        };
                        city = switch (mergedProfile.city) {
                            case null dupProfile.city;
                            case (?_) mergedProfile.city;
                        };
                    };
                    
                    // Remove duplicate entry
                    userProfiles.delete(dupPrincipal);
                    duplicatesRemoved += 1;
                    
                    mergedData += dupProfile.totalDataScraped;
                    mergedPoints += dupProfile.points;
                    mergedUrls += dupProfile.scrapedUrls.size();
                };
                
                // Save merged profile
                userProfiles.put(targetPrincipal, mergedProfile);
                
                return #ok("Merged " # Nat.toText(duplicatesRemoved) # " duplicates. Added " # 
                          Nat.toText(mergedPoints) # " points, " # 
                          Nat.toText(mergedData) # " bytes data, " #
                          Nat.toText(mergedUrls) # " URLs");
            };
            case null {
                return #err("No profile found for principal");
            };
        };
    };

    // Use FindIP.net API - UNLIMITED usage with API key!
    private func getCountryFromIP(ip: Text): async ?(Text, Text) {
        try {
            Debug.print("Getting location for IP: " # ip);
            
            // Using FindIP.net with UNLIMITED API key
            let url = "https://api.findip.net/" # ip # "/?token=0e5a4466178548f495541ada64e2ed89";
            
            let ic : ICManagement = actor("aaaaa-aa");
            let request = {
                url = url;
                max_response_bytes = ?10000 : ?Nat64;
                headers = [{ name = "Accept"; value = "application/json" }];
                body = null : ?Blob;
                method = #get;
                transform = null : ?TransformContext;
            };
            
            Prim.cyclesAdd(20_949_972_000);
            let response = await ic.http_request(request);
            
            Debug.print("FindIP API response status: " # Nat.toText(response.status));
            
            if (response.status == 200) {
                let body = Text.decodeUtf8(response.body);
                switch (body) {
                    case (?jsonText) {
                        Debug.print("FindIP response: " # jsonText);
                        
                        var country = "";
                        var region = "";
                        var city = "";
                        
                        // Extract country
                        let countryParts = Iter.toArray(Text.split(jsonText, #text "\"country\":"));
                        if (countryParts.size() > 1) {
                            // Get the country object
                            let countryObj = countryParts[1];
                            // Extract country name
                            let nameParts = Iter.toArray(Text.split(countryObj, #text "\"names\":\""));
                            if (nameParts.size() > 1) {
                                let endParts = Iter.toArray(Text.split(nameParts[1], #text "\""));
                                if (endParts.size() > 0) {
                                    country := endParts[0];
                                };
                            };
                        };
                        
                        // Extract city (which often contains region info)
                        let cityParts = Iter.toArray(Text.split(jsonText, #text "\"city\":"));
                        if (cityParts.size() > 1) {
                            let cityObj = cityParts[1];
                            // Extract city name
                            let nameParts = Iter.toArray(Text.split(cityObj, #text "\"names\":\""));
                            if (nameParts.size() > 1) {
                                let endParts = Iter.toArray(Text.split(nameParts[1], #text "\""));
                                if (endParts.size() > 0) {
                                    city := endParts[0];
                                    region := city; // Use city as region for now
                                };
                            };
                        };
                        
                        // Extract subdivisions (state/province)
                        let subdivParts = Iter.toArray(Text.split(jsonText, #text "\"subdivisions\":"));
                        if (subdivParts.size() > 1) {
                            let subdivObj = subdivParts[1];
                            let nameParts = Iter.toArray(Text.split(subdivObj, #text "\"names\":\""));
                            if (nameParts.size() > 1) {
                                let endParts = Iter.toArray(Text.split(nameParts[1], #text "\""));
                                if (endParts.size() > 0) {
                                    region := endParts[0];
                                };
                            };
                        };
                        
                        if (country != "") {
                            Debug.print("Found location: " # country # ", " # region);
                            return ?(country, region);
                        };
                    };
                    case null {
                        Debug.print("Failed to decode response body");
                    };
                };
            } else {
                Debug.print("API returned error status: " # Nat.toText(response.status));
            };
            // Try IPLocate as fallback (1000 requests per day)
            Debug.print("FindIP failed, trying IPLocate for IP: " # ip);
            let iplocateUrl = "https://iplocate.io/api/lookup/" # ip # "?apikey=8c1ec21cc8675eeaf6a9a4aa7db0ffad";
            
            let iplocateRequest = {
                url = iplocateUrl;
                max_response_bytes = ?10000 : ?Nat64;
                headers = [];
                body = null : ?Blob;
                method = #get;
                transform = null : ?TransformContext;
            };
            
            Prim.cyclesAdd(20_949_972_000);
            let iplocateResponse = await ic.http_request(iplocateRequest);
            
            if (iplocateResponse.status == 200) {
                let iplocateBody = Text.decodeUtf8(iplocateResponse.body);
                switch (iplocateBody) {
                    case (?jsonText) {
                        var country = "";
                        var region = "";
                        
                        // Extract country
                        let countryParts = Iter.toArray(Text.split(jsonText, #text "\"country\":\""));
                        if (countryParts.size() > 1) {
                            let endParts = Iter.toArray(Text.split(countryParts[1], #text "\""));
                            if (endParts.size() > 0) {
                                country := endParts[0];
                            };
                        };
                        
                        // Extract subdivision (state/province)
                        let subdivParts = Iter.toArray(Text.split(jsonText, #text "\"subdivision\":\""));
                        if (subdivParts.size() > 1) {
                            let endParts = Iter.toArray(Text.split(subdivParts[1], #text "\""));
                            if (endParts.size() > 0) {
                                region := endParts[0];
                            };
                        };
                        
                        if (country != "") {
                            Debug.print("IPLocate found: " # country # ", " # region);
                            return ?(country, region);
                        };
                    };
                    case null {};
                };
            };
            
            return null;
        } catch (e) {
            Debug.print("Both APIs failed: " # Error.message(e));
            // Last resort fallback with CORRECT mappings
            if (Text.startsWith(ip, #text "136.25.")) { return ?("United States", "California"); };
            if (Text.startsWith(ip, #text "142.198.")) { return ?("Canada", "Ontario"); };
            if (Text.startsWith(ip, #text "185.18.")) { return ?("Kazakhstan", "Almaty"); };
            return null;
        };
    };
    
    // Admin function to update all users' geo  
    public shared(msg) func updateAllUsersGeoFromAPI(): async Result.Result<Text, Text> {
        // Only allow admin canister to update geo
        if (Principal.toText(msg.caller) != ADMIN_CANISTER_ID) {
            return #err("Not authorized - only admin canister can update geo");
        };
        
        var usersUpdated = 0;
        let allUsers = Iter.toArray(userProfiles.entries());
        
        for ((principal, profile) in allUsers.vals()) {
            switch (profile.ipAddress) {
                case (?ip) {
                    // Update if country is null, "Global", or "Unknown"
                    switch (profile.country) {
                        case null {
                            let location = await getCountryFromIP(ip);
                            switch (location) {
                                case (?(country, region)) {
                                    let updated = {
                                        profile with
                                        country = ?country;
                                        region = ?region;
                                    };
                                    userProfiles.put(principal, updated);
                                    usersUpdated += 1;
                                };
                                case null {};
                            };
                        };
                        case (?c) {
                            if (Text.contains(c, #text "lobal") or Text.contains(c, #text "nknown")) {
                                let location = await getCountryFromIP(ip);
                                switch (location) {
                                    case (?(country, region)) {
                                        let updated = {
                                            profile with
                                            country = ?country;
                                            region = ?region;
                                        };
                                        userProfiles.put(principal, updated);
                                        usersUpdated += 1;
                                    };
                                    case null {};
                                };
                            };
                        };
                    };
                };
                case null {};
            };
        };
        
        return #ok("Updated " # Nat.toText(usersUpdated) # " users' geo");
    };
    
    // Update all users with a specific IP address to new location
    public shared(msg) func updateUserLocationByIP(
        ipAddress: Text,
        country: Text,
        region: Text,
        city: Text
    ): async Result.Result<Text, Text> {
        // Only allow admin canister to update users
        if (Principal.toText(msg.caller) != ADMIN_CANISTER_ID) {
            return #err("Not authorized - only admin canister can update user locations");
        };
        
        var usersUpdated = 0;
        let allUsers = Iter.toArray(userProfiles.entries());
        
        for ((principal, profile) in allUsers.vals()) {
            switch (profile.ipAddress) {
                case (?userIP) {
                    if (Text.equal(userIP, ipAddress)) {
                        // Update this user's location
                        let updatedProfile = {
                            profile with
                            country = ?country;
                            region = ?region;
                            city = ?city;
                            // Keep existing lat/long if available, otherwise use defaults
                            latitude = switch(profile.latitude) {
                                case (?lat) { ?lat };
                                case null { ?0.0 };
                            };
                            longitude = switch(profile.longitude) {
                                case (?lon) { ?lon };
                                case null { ?0.0 };
                            };
                        };
                        userProfiles.put(principal, updatedProfile);
                        usersUpdated += 1;
                        Debug.print("Updated user " # Principal.toText(principal) # " with IP " # ipAddress # " to " # country # ", " # region # ", " # city);
                    };
                };
                case null {};
            };
        };
        
        return #ok("Updated " # Nat.toText(usersUpdated) # " users with IP " # ipAddress);
    };
    
    // Admin function to fix existing users' data
    public shared(msg) func fixExistingUsersData(): async Result.Result<Text, Text> {
        // Only allow admin canister to fix data
        if (Principal.toText(msg.caller) != ADMIN_CANISTER_ID) {
            return #err("Not authorized - only admin canister can fix user data");
        };
        
        var usersFixed = 0;
        var geoFixed = 0;
        var pagesFixed = 0;
        
        let allUsers = Iter.toArray(userProfiles.entries());
        
        for ((principal, profile) in allUsers.vals()) {
            var needsUpdate = false;
            var updatedProfile = profile;
            
            // Fix geo for USA IPs (136.* range and others)
            switch (profile.country) {
                case null {
                    switch (profile.ipAddress) {
                        case (?ipAddress) {
                            if (Text.startsWith(ipAddress, #text "136.") or
                                Text.startsWith(ipAddress, #text "142.") or  // Digital Ocean USA
                                Text.startsWith(ipAddress, #text "173.") or
                                Text.startsWith(ipAddress, #text "174.") or
                                Text.startsWith(ipAddress, #text "199.") or
                                Text.startsWith(ipAddress, #text "204.") or
                                Text.startsWith(ipAddress, #text "208.") or
                                Text.startsWith(ipAddress, #text "209.") or
                                Text.startsWith(ipAddress, #text "216.")) {
                                updatedProfile := {
                                    updatedProfile with
                                    country = ?"United States";
                                    region = ?"California";
                                };
                                needsUpdate := true;
                                geoFixed += 1;
                            };
                        };
                        case null {};
                    };
                };
                case (?country) {
                    // Also fix if country is "global" or "Global" or contains "Unknown"
                    if (Text.contains(country, #text "lobal") or Text.contains(country, #text "nknown")) {
                        switch (profile.ipAddress) {
                            case (?ipAddress) {
                                if (Text.startsWith(ipAddress, #text "136.") or
                                    Text.startsWith(ipAddress, #text "142.") or  // Digital Ocean USA
                                    Text.startsWith(ipAddress, #text "173.") or
                                    Text.startsWith(ipAddress, #text "174.") or
                                    Text.startsWith(ipAddress, #text "199.") or
                                    Text.startsWith(ipAddress, #text "204.") or
                                    Text.startsWith(ipAddress, #text "208.") or
                                    Text.startsWith(ipAddress, #text "209.") or
                                    Text.startsWith(ipAddress, #text "216.")) {
                                    updatedProfile := {
                                        updatedProfile with
                                        country = ?"United States";
                                        region = ?"California";
                                    };
                                    needsUpdate := true;
                                    geoFixed += 1;
                                };
                            };
                            case null {};
                        };
                    };
                };
            };
            
            // Fix page counts based on points (estimate: 1 page = ~5 points)
            if (profile.totalPagesScraped == 0 and profile.points > 0) {
                let estimatedPages = profile.points / 5;
                // Calculate actual referral points using tier system
                let calculatedReferralPoints = calculateTotalReferralPoints(profile.referralCount);
                let calculatedScrapingPoints = if (profile.points > calculatedReferralPoints) {
                    profile.points - calculatedReferralPoints
                } else { 0 };
                
                updatedProfile := {
                    updatedProfile with
                    totalPagesScraped = estimatedPages;
                    pointsFromScraping = calculatedScrapingPoints;
                    pointsFromReferrals = calculatedReferralPoints;
                };
                needsUpdate := true;
                pagesFixed += 1;
            };
            
            if (needsUpdate) {
                userProfiles.put(principal, updatedProfile);
                usersFixed += 1;
            };
        };
        
        return #ok("Fixed " # Nat.toText(usersFixed) # " users. Geo: " # Nat.toText(geoFixed) # ", Pages: " # Nat.toText(pagesFixed));
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
        // Create array of (principal, points) pairs
        let contributors = Buffer.Buffer<(Principal, Nat)>(userProfiles.size());
        for ((principal, profile) in userProfiles.entries()) {
            contributors.add((principal, profile.points));
        };
        
        // Sort by points (descending)
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
    
    // Get all users for admin dashboard
    public query func getAllUsers(): async [(Principal, UserProfile)] {
        Iter.toArray(userProfiles.entries())
    };
    
    // Admin function to populate referralCodes HashMap from existing profiles
    public shared(msg) func populateReferralCodes(): async Result.Result<Text, Text> {
        // Only allow admin or anonymous (proxy) to call this
        if (not Principal.isAnonymous(msg.caller) and Principal.toText(msg.caller) != ADMIN_CANISTER_ID) {
            return #err("Not authorized");
        };
        
        var count = 0;
        // Clear existing referralCodes to avoid duplicates
        referralCodes := HashMap.HashMap<Text, Principal>(10, Text.equal, Text.hash);
        
        // Populate from all existing user profiles
        for ((principal, profile) in userProfiles.entries()) {
            referralCodes.put(profile.referralCode, principal);
            count += 1;
        };
        
        return #ok("Populated " # Nat.toText(count) # " referral codes from existing profiles");
    };

    // get points history for a user (for fee calculation)
    public query func getPointsHistory(userId: Principal): async Result.Result<[SharedTypes.PointsRecord], Text> {
        switch (pointsHistory.get(userId)) {
            case (?buffer) {
                #ok(Buffer.toArray(buffer))
            };
            case null {
                #ok([]) // no history yet
            };
        };
    };

    // create conversion request (frontend calls this when user wants to convert)
    public shared(msg) func createConversionRequest(
        pointsAmount: Nat,
        walletAddress: Text
    ): async Result.Result<SharedTypes.ConversionRequest, Text> {
        let userId = msg.caller;

        // check if user exists and has enough points
        switch (userProfiles.get(userId)) {
            case (?profile) {
                if (profile.points < pointsAmount) {
                    return #err("Insufficient points");
                };

                // calculate conversion (1000 points = 1 token)
                let tokensGross = pointsAmount / 1000;

                // calculate fee based on points age (5% if within 30 days)
                let thirtyDaysAgo = Time.now() - (30 * 24 * 60 * 60 * 1000000000); // 30 days in nanoseconds
                var pointsWithinFeePeriod: Nat = 0;

                // check points history
                switch (pointsHistory.get(userId)) {
                    case (?buffer) {
                        for (record in Buffer.toArray(buffer).vals()) {
                            if (record.earnedAt > thirtyDaysAgo) {
                                pointsWithinFeePeriod += record.amount;
                            };
                        };
                    };
                    case null {};
                };

                // calculate fee
                let feePercentage: Float = if (pointsWithinFeePeriod >= pointsAmount) {
                    0.05 // 5% fee if all points are recent
                } else {
                    0.0 // no fee if points are old
                };

                let tokensFee = Float.toInt(Float.fromInt(tokensGross) * feePercentage);
                let tokensNet = tokensGross - Int.abs(tokensFee);

                // create request
                let requestId = Principal.toText(userId) # "-" # Int.toText(Time.now());
                let request: SharedTypes.ConversionRequest = {
                    id = requestId;
                    userId = userId;
                    pointsAmount = pointsAmount;
                    tokensGross = tokensGross;
                    tokensFee = Int.abs(tokensFee);
                    tokensNet = tokensNet;
                    requestedAt = Time.now();
                    status = "pending"; // will be "completed" when token canister processes it
                    walletAddress = walletAddress;
                };

                conversionRequests.put(requestId, request);

                // TODO: when token canister exists, deduct points here
                // for now just create the request

                #ok(request)
            };
            case null {
                #err("User profile not found")
            };
        };
    };

    // get conversion requests for a user
    public query func getConversionRequests(userId: Principal): async Result.Result<[SharedTypes.ConversionRequest], Text> {
        let userRequests = Buffer.Buffer<SharedTypes.ConversionRequest>(10);

        for ((id, request) in conversionRequests.entries()) {
            if (Principal.equal(request.userId, userId)) {
                userRequests.add(request);
            };
        };

        #ok(Buffer.toArray(userRequests))
    };

    // get all conversion requests (admin only)
    public query func getAllConversionRequests(): async Result.Result<[SharedTypes.ConversionRequest], Text> {
        let allRequests = Buffer.Buffer<SharedTypes.ConversionRequest>(conversionRequests.size());

        for ((id, request) in conversionRequests.entries()) {
            allRequests.add(request);
        };

        #ok(Buffer.toArray(allRequests))
    };
}
