import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import Debug "mo:base/Debug";
import HashMap "mo:base/HashMap";
import Hash "mo:base/Hash";
import Iter "mo:base/Iter";
import Int "mo:base/Int";
import Nat "mo:base/Nat";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Error "mo:base/Error";

actor ConsumerCanister {
    // Type definitions based on the Candid interface
    type UserProfile = {
        created : Int;
        devices : [Text];
        lastLogin : Int;
        preferences : {
            notificationsEnabled : Bool;
            theme : Text;
        };
        principal : Principal;
    };

    type ScrapingTopic = {
        activeHours : {
            end : Nat;
            start : Nat;
        };
        aiConfig : AIConfig;
        createdAt : Int;
        description : Text;
        extractionRules : ExtractionRules;
        id : Text;
        maxRetries : Nat;
        name : Text;
        scrapingInterval : Nat;
        status : Text;
        urlPatterns : [Text];
    };

    type ScrapingField = {
        aiPrompt : ?Text;
        fieldType : Text;
        name : Text;
        required : Bool;
    };

    type ScrapedData = {
        client_id : Principal;
        content : Text;
        id : Text;
        scraping_time : Nat;
        source : Text;
        status : Text;
        timestamp : Nat;
        topic : Text;
        url : Text;
    };

    type Error = {
        #AlreadyExists;
        #InvalidInput : Text;
        #NotAuthorized;
        #NotFound;
        #SystemError : Text;
    };

    type Result<T> = {
        #ok : T;
        #err : Error;
    };

    type ExtractionRules = {
        customPrompt : ?Text;
        fields : [ScrapingField];
    };

    type CostLimits = {
        maxConcurrent : Nat;
        maxDailyCost : Float;
        maxMonthlyCost : Float;
    };

    type AIConfig = {
        apiKey : Text;
        costLimits : CostLimits;
        model : Text;
    };

    // Storage canister interface
    type StorageCanister = actor {
        storeBatch : (DataBatch) -> async Result<Nat>;
        storeScrapedData : (ScrapedData) -> async Result<Nat>;
        getScrapedData : ([Text]) -> async [ScrapedData];
    };

    type DataBatch = {
        items : [ScrapedData];
        clientId : Principal;
        batchId : Text;
    };

    // Storage for user profiles
    private var profiles = HashMap.HashMap<Principal, UserProfile>(0, Principal.equal, Principal.hash);

    // Storage for topics
    private var topics = HashMap.HashMap<Text, ScrapingTopic>(0, Text.equal, Text.hash);

    // Storage for devices
    private var devices = HashMap.HashMap<Text, Principal>(0, Text.equal, Text.hash);

    // Local cache for scraped data (in case storage canister is unavailable)
    private var scrapedDataCache = Buffer.Buffer<ScrapedData>(0);

    // Storage canister ID
    private let storageCanisterId = "hhaip-uiaaa-aaaao-a4khq-cai";
    private let storageCanister : StorageCanister = actor(storageCanisterId);

    // Helper function to check if a principal is authorized
    private func isAuthorized(caller : Principal) : Bool {
        // Temporarily allow all callers for testing
        return true;
        // Original authorization logic:
        // switch (profiles.get(caller)) {
        //     case null { false };
        //     case (?_) { true };
        // };
    };

    // Helper function to convert Error to Text
    private func errorToText(err : Error) : Text {
        switch (err) {
            case (#AlreadyExists) { "Already exists" };
            case (#InvalidInput(msg)) { "Invalid input: " # msg };
            case (#NotAuthorized) { "Not authorized" };
            case (#NotFound) { "Not found" };
            case (#SystemError(msg)) { "System error: " # msg };
        };
    };

    // Initialize with sample topics
    private func initTopics() {
        let techCrunchTopic : ScrapingTopic = {
            id = "topic_swsi3j4lj";
            name = "TechCrunch News Articles";
            description = "Scrapes the latest technology news, startup information, and funding announcements from TechCrunch";
            scrapingInterval = 3600;
            maxRetries = 3;
            activeHours = {
                start = 0;
                end = 24;
            };
            urlPatterns = ["https://techcrunch.com/*"];
            extractionRules = {
                fields = [
                    {
                        name = "title";
                        aiPrompt = ?"Extract the complete article title without any truncation or modification";
                        required = true;
                        fieldType = "text";
                    },
                    {
                        name = "Author";
                        aiPrompt = ?"Extract the author's full name, removing any titles or additional text";
                        required = true;
                        fieldType = "text";
                    },
                    {
                        name = "PublishDate";
                        aiPrompt = ?"Convert the publication date to ISO format (YYYY-MM-DD)";
                        required = true;
                        fieldType = "date";
                    },
                    {
                        name = "Content";
                        aiPrompt = ?"Extract the full article text, removing any ads, related content, or navigation elements";
                        required = true;
                        fieldType = "text";
                    }
                ];
                customPrompt = ?"Extract the core technology news content from this TechCrunch article, focusing on factual information about companies, products, funding, and technology trends. Ignore promotional content, opinions, and advertisements.";
            };
            aiConfig = {
                model = "gpt-3.5-turbo";
                apiKey = "";
                costLimits = {
                    maxConcurrent = 5;
                    maxDailyCost = 1.0;
                    maxMonthlyCost = 10.0;
                }
            };
            createdAt = 1741191494445463672;
            status = "active";
        };
        
        let ecommerceTopic : ScrapingTopic = {
            id = "topic_t7wkl7zyb";
            name = "E-commerce Product Monitor";
            description = "Tracks product information, pricing, and availability from major e-commerce websites";
            scrapingInterval = 3600;
            maxRetries = 3;
            activeHours = {
                start = 0;
                end = 24;
            };
            urlPatterns = ["https://www.amazon.com/*/dp/*", "https://www.bestbuy.com/site/*/", "https://www.walmart.com/ip/*"];
            extractionRules = {
                fields = [
                    {
                        name = "Product Name";
                        aiPrompt = ?"Extract the full product name or title";
                        required = true;
                        fieldType = "text";
                    },
                    {
                        name = "Price";
                        aiPrompt = ?"Extract the current price of the product, including currency symbol";
                        required = true;
                        fieldType = "text";
                    },
                    {
                        name = "Availability";
                        aiPrompt = ?"Determine if the product is in stock, out of stock, or has limited availability";
                        required = true;
                        fieldType = "text";
                    },
                    {
                        name = "Rating";
                        aiPrompt = ?"Extract the product rating (e.g., 4.5 out of 5 stars)";
                        required = false;
                        fieldType = "text";
                    }
                ];
                customPrompt = ?"Extract information from the webpage";
            };
            aiConfig = {
                model = "gpt-3.5-turbo";
                apiKey = "";
                costLimits = {
                    maxConcurrent = 5;
                    maxDailyCost = 1.0;
                    maxMonthlyCost = 10.0;
                }
            };
            createdAt = 1741239962379386497;
            status = "active";
        };
        
        topics.put(techCrunchTopic.id, techCrunchTopic);
        topics.put(ecommerceTopic.id, ecommerceTopic);
    };

    // Initialize the canister
    initTopics();

    // Get user profile
    public shared({ caller }) func getProfile() : async Result<UserProfile> {
        switch (profiles.get(caller)) {
            case null { #err(#NotFound) };
            case (?profile) { #ok(profile) };
        };
    };

    // Get topics
    public shared({ caller }) func getTopics() : async Result<[ScrapingTopic]> {
        if (not isAuthorized(caller)) {
            return #err(#NotAuthorized);
        };
        
        let topicsArray = Buffer.Buffer<ScrapingTopic>(topics.size());
        for ((_, topic) in topics.entries()) {
            topicsArray.add(topic);
        };
        
        #ok(Buffer.toArray(topicsArray))
    };

    // Register device
    public shared({ caller }) func registerDevice(deviceId : Text) : async Result<()> {
        devices.put(deviceId, caller);
        
        // Create profile if it doesn't exist
        switch (profiles.get(caller)) {
            case null {
                let newProfile : UserProfile = {
                    principal = caller;
                    created = Time.now();
                    lastLogin = Time.now();
                    devices = [deviceId];
                    preferences = {
                        notificationsEnabled = true;
                        theme = "light";
                    }
                };
                profiles.put(caller, newProfile);
            };
            case (?profile) {
                let updatedDevices = Buffer.Buffer<Text>(profile.devices.size() + 1);
                for (device in profile.devices.vals()) {
                    updatedDevices.add(device);
                };
                updatedDevices.add(deviceId);
                
                let updatedProfile : UserProfile = {
                    principal = profile.principal;
                    created = profile.created;
                    lastLogin = Time.now();
                    devices = Buffer.toArray(updatedDevices);
                    preferences = profile.preferences;
                };
                profiles.put(caller, updatedProfile);
            };
        };
        
        #ok()
    };

    // Update preferences
    public shared({ caller }) func updatePreferences(notificationsEnabled : Bool, theme : Text) : async Result<()> {
        switch (profiles.get(caller)) {
            case null { #err(#NotFound) };
            case (?profile) {
                let updatedProfile : UserProfile = {
                    principal = profile.principal;
                    created = profile.created;
                    lastLogin = profile.lastLogin;
                    devices = profile.devices;
                    preferences = {
                        notificationsEnabled = notificationsEnabled;
                        theme = theme;
                    }
                };
                profiles.put(caller, updatedProfile);
                #ok()
            };
        };
    };

    // Submit scraped data
    public shared({ caller }) func submitScrapedData(data : ScrapedData) : async Result<()> {
        Debug.print("Consumer: Received scraped data submission for URL: " # data.url);
        
        // Add to local cache
        scrapedDataCache.add(data);
        
        // Forward to storage canister
        try {
            Debug.print("Consumer: Forwarding data to storage canister...");
            let result = await storageCanister.storeScrapedData(data);
            
            switch (result) {
                case (#ok(count)) {
                    Debug.print("Consumer: Successfully forwarded data to storage canister. Items stored: " # Nat.toText(count));
                    #ok()
                };
                case (#err(message)) {
                    Debug.print("Consumer: Error forwarding data to storage canister: " # errorToText(message));
                    // Still return ok to the client since we've cached the data locally
                    #ok()
                };
            };
        } catch (error) {
            Debug.print("Consumer: Exception when forwarding data to storage canister: " # Error.message(error));
            // Still return ok to the client since we've cached the data locally
            #ok()
        };
    };

    // Helper function to check if data is related to any of the topics
    private func isDataRelatedToTopics(data : ScrapedData, topicIds : [Text]) : Bool {
        for (topicId in topicIds.vals()) {
            if (data.topic == topicId) {
                return true;
            };
        };
        return false;
    };

    // Get scraped data
    public shared({ caller }) func getScrapedData(topicIds : [Text]) : async Result<[ScrapedData]> {
        Debug.print("Consumer: Getting scraped data for topics: " # debug_show(topicIds));
        
        try {
            Debug.print("Consumer: Retrieving data from storage canister...");
            let data = await storageCanister.getScrapedData(topicIds);
            
            if (data.size() > 0) {
                Debug.print("Consumer: Successfully retrieved " # Nat.toText(data.size()) # " items from storage canister");
                #ok(data)
            } else {
                Debug.print("Consumer: No data found in storage canister, checking local cache...");
                
                // If storage canister returned no data, use local cache
                let filteredData = Buffer.Buffer<ScrapedData>(0);
                
                if (topicIds.size() > 0) {
                    // Filter data based on topic IDs
                    for (data in scrapedDataCache.vals()) {
                        if (isDataRelatedToTopics(data, topicIds)) {
                            filteredData.add(data);
                        };
                    };
                } else {
                    // Return all data
                    for (data in scrapedDataCache.vals()) {
                        filteredData.add(data);
                    };
                };
                
                Debug.print("Consumer: Found " # Nat.toText(filteredData.size()) # " items in local cache");
                #ok(Buffer.toArray(filteredData))
            };
        } catch (error) {
            Debug.print("Consumer: Error retrieving data from storage canister: " # Error.message(error));
            
            // Use local cache as fallback
            let filteredData = Buffer.Buffer<ScrapedData>(0);
            
            if (topicIds.size() > 0) {
                // Filter data based on topic IDs
                for (data in scrapedDataCache.vals()) {
                    if (isDataRelatedToTopics(data, topicIds)) {
                        filteredData.add(data);
                    };
                };
            } else {
                // Return all data
                for (data in scrapedDataCache.vals()) {
                    filteredData.add(data);
                };
            };
            
            Debug.print("Consumer: Using local cache as fallback, found " # Nat.toText(filteredData.size()) # " items");
            #ok(Buffer.toArray(filteredData))
        };
    };
}