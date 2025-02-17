import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import Debug "mo:base/Debug";
import Error "mo:base/Error";
import HashMap "mo:base/HashMap";
import Hash "mo:base/Hash";
import Iter "mo:base/Iter";
import Int "mo:base/Int";
import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Nat32 "mo:base/Nat32";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Char "mo:base/Char";
import Float "mo:base/Float";
import Blob "mo:base/Blob";
import Bool "mo:base/Bool";
import AIHandler "./ai/handler";
import Types "./types";
import ExperimentalCycles "mo:base/ExperimentalCycles";
import TrieMap "mo:base/TrieMap";
import SharedTypes "../shared/types";

actor class Storage() = this {
    type ICManagement = actor {
        http_request : shared {
            url : Text;
            max_response_bytes : ?Nat64;
            headers : [Types.HttpHeader];
            body : ?[Nat8];
            method : Types.HttpMethod;
            transform : ?Types.TransformContext;
        } -> async Types.HttpResponse;
    };

    type AdminCanister = actor {
        getAIConfiguration : () -> async {
            api_key: Text;
            model: Text;
            temperature: Float;
            max_tokens: Nat;
            top_p: Float;
            frequency_penalty: Float;
            presence_penalty: Float;
        };
    };

    type HttpHeader = Types.HttpHeader;
    type HttpMethod = Types.HttpMethod;
    type TransformContext = Types.TransformContext;
    type HttpRequestArgs = Types.HttpRequestArgs;
    type HttpResponse = Types.HttpResponse;

    // New enhanced type
    type ScrapedContent = {
        id: Text;
        source: Text;  // "github", "devto", "medium"
        url: Text;
        title: Text;
        author: Text;
        publish_date: Int;
        update_date: Int;
        content: Text;
        summary: Text;
        topics: [Text];
        engagement: {
            stars: ?Nat;
            reactions: ?Nat;
            claps: ?Nat;
            comments: Nat;
        };
        metadata: {
            reading_time: ?Nat;
            language: ?Text;
            license: ?Text;
            tech_stack: [Text];
        };
        ai_analysis: {
            relevance_score: Nat;
            key_points: [Text];
            code_snippets: [{
                language: Text;
                code: Text;
            }];
        };
    };

    // Legacy type for compatibility
    type ScrapedData = {
        id: Text;
        url: Text;
        topic: Text;
        content: Text;
        source: Text;
        timestamp: Int;
        client_id: Principal;
        status: Text;
        scraping_time: Int;
    };

    // Request type for storing URLs
    type Request = {
        id: Text;
        url: Text;
        topic_id: Text;
        timestamp: Int;
        content_id: Text;
        extraction_rules: Types.ExtractionRules;
    };

    // Extraction rules type
    type ExtractionRules = Types.ExtractionRules;
    type ScrapingField = Types.ScrapingField;

    private let _admin : AdminCanister = actor "bkyz2-fmaaa-aaaaa-qaaaq-cai";

    // Helper function to convert Nat8 array to Text
    private func _nat8ArrayToText(arr: [Nat8]) : Text {
        let buffer = Buffer.Buffer<Char>(arr.size());
        for (byte in arr.vals()) {
            buffer.add(Char.fromNat32(Nat32.fromNat(Nat8.toNat(byte))));
        };
        Text.fromIter(buffer.vals())
    };

    // Helper function to encode URL
    private func _encodeUrl(text: Text) : Text {
        let chars = text.chars();
        var encoded = "";
        for (c in chars) {
            let char = switch (c) {
                case ' ' { "%20" };
                case '!' { "%21" };
                case '#' { "%23" };
                case '$' { "%24" };
                case '&' { "%26" };
                case '\'' { "%27" };
                case '(' { "%28" };
                case ')' { "%29" };
                case '*' { "%2A" };
                case '+' { "%2B" };
                case ',' { "%2C" };
                case '/' { "%2F" };
                case ':' { "%3A" };
                case ';' { "%3B" };
                case '=' { "%3D" };
                case '?' { "%3F" };
                case '@' { "%40" };
                case '[' { "%5B" };
                case ']' { "%5D" };
                case _ { Char.toText(c) };
            };
            encoded := encoded # char;
        };
        encoded
    };

    // Cache entry type
    type CacheEntry = {
        content: Text;
        timestamp: Int;
        headers: [Types.HttpHeader];
    };

    // Cache duration in nanoseconds (1 hour)
    private let CACHE_DURATION_NS = 3_600_000_000_000;
    
    // URL content cache
    private var urlCache = TrieMap.TrieMap<Text, CacheEntry>(Text.equal, Text.hash);

    // Transform function to normalize HTML
    private func transform_html(raw: Types.TransformArgs) : Types.HttpResponse {
        let transformed = {
            status = raw.response.status;
            body = raw.response.body;
            headers = Array.filter<Types.HttpHeader>(raw.response.headers, func(h) {
                // Only keep essential headers
                switch(h.name) {
                    case("content-type") true;
                    case("content-length") true;
                    case _ false;
                }
            });
        };
        transformed
    };

    // Helper function to make HTTP request through proxy
    private func _makeHttpRequest(request: Types.HttpRequestArgs) : async Result.Result<Types.HttpResponse, Text> {
        try {
            // Check cache first
            switch (urlCache.get(request.url)) {
                case (?entry) {
                    let currentTime = Time.now();
                    if (currentTime - entry.timestamp < CACHE_DURATION_NS) {
                        // Cache hit - return cached content
                        let bodyBlob = Text.encodeUtf8(entry.content);
                        let bodyArray = Blob.toArray(bodyBlob);
                        return #ok({
                            status = 200;
                            headers = entry.headers;
                            body = bodyArray;
                        });
                    };
                    // Cache expired - remove it
                    urlCache.delete(request.url);
                };
                case null {};
            };

            let ic : ICManagement = actor("aaaaa-aa");
            
            // Add cycles for HTTP outcall
            let cycles = 200_000_000_000;
            ExperimentalCycles.add(cycles);
            
            // Make request with minimal headers
            let response = await ic.http_request({
                url = request.url;
                max_response_bytes = ?500_000;
                headers = [
                    { name = "User-Agent"; value = "Mozilla/5.0 (compatible; RhinoSpider/1.0)" }
                ];
                body = null;
                method = #get;
                transform = null;
            });

            // Cache successful responses with normalized headers
            switch (response) {
                case ({ status; headers; body }) {
                    if (status == 200) {
                        let bodyBlob = Blob.fromArray(body);
                        let content = switch (Text.decodeUtf8(bodyBlob)) {
                            case (?text) text;
                            case null return #err("Failed to decode response body");
                        };
                        
                        // Only cache essential headers
                        let essentialHeaders = Array.filter<Types.HttpHeader>(headers, func(h) {
                            switch(h.name) {
                                case("content-type") true;
                                case("content-length") true;
                                case _ false;
                            }
                        });
                        
                        urlCache.put(request.url, {
                            content = content;
                            timestamp = Time.now();
                            headers = essentialHeaders;
                        });
                    };
                };
            };

            #ok(response)
        } catch (e) {
            #err(Error.message(e))
        };
    };

    // Function to convert bytes to text
    private func bytesToText(bytes: [Nat8]) : Text {
        let chars = Array.map<Nat8, Char>(
            bytes,
            func(n) { Char.fromNat32(Nat32.fromNat(Nat8.toNat(n))) }
        );
        Text.fromIter(chars.vals())
    };

    // Queue for URLs to be processed
    private stable var _nextId : Nat = 0;
    private var _pendingUrls = Buffer.Buffer<(Text, Text)>(0); // (id, url)
    private var _htmlContent = HashMap.HashMap<Text, Text>(0, Text.equal, Text.hash);

    // Get next URL to process (for external service)
    public func getNextPendingUrl() : async ?{id: Text; url: Text} {
        if (_pendingUrls.size() == 0) {
            return null;
        };
        let url = _pendingUrls.get(0);
        ignore _pendingUrls.removeLast();
        ?{id = url.0; url = url.1}
    };

    // Store HTML content (called by external service)
    public shared({ caller = _ }) func storeHtmlContent(id: Text, content: Text) : async () {
        _htmlContent.put(id, content);
    };

    // Process URL with AI
    public shared({ caller = _ }) func processWithAI(request: Request) : async Result.Result<[(Text, Text)], Text> {
        if (request.content_id == "") {
            return #err("Content ID is required");
        };

        // Get the stored HTML content
        switch (_htmlContent.get(request.content_id)) {
            case (null) { return #err("Content not found for ID: " # request.content_id) };
            case (?content) {
                // For testing, just extract a small sample to demonstrate
                return #ok([("sample", content)]);
            };
        };
    };

    // Add URL to processing queue
    public shared({ caller = _ }) func queueUrlForProcessing(id: Text, url: Text) : async Result.Result<(), Text> {
        if (not isAuthorized(Principal.fromActor(this))) {
            return #err("Unauthorized");
        };

        _pendingUrls.add((id, url));
        #ok(())
    };

    // Store a request for processing
    public shared({ caller = _ }) func storeRequest(request: Request) : async Result.Result<(), Text> {
        if (not isAuthorized(Principal.fromActor(this))) {
            return #err("Unauthorized");
        };

        _requests.put(request.id, request);
        #ok()
    };

    // Store scraped content
    public shared({ caller = _ }) func storeContent(data: ScrapedContent) : async Result.Result<(), Text> {
        if (not isAuthorized(Principal.fromActor(this))) {
            return #err("Unauthorized");
        };

        _content.put(data.id, data);

        // Add to topic index
        switch (_contentByTopic.get(data.topics[0])) {
            case (null) {
                let buffer = Buffer.Buffer<Text>(1);
                buffer.add(data.id);
                _contentByTopic.put(data.topics[0], buffer);
            };
            case (?buffer) {
                buffer.add(data.id);
            };
        };

        // Add to source index
        let sourceUrl = data.url;
        switch (_contentBySource.get(sourceUrl)) {
            case (null) {
                let buffer = Buffer.Buffer<Text>(1);
                buffer.add(data.id);
                _contentBySource.put(sourceUrl, buffer);
            };
            case (?buffer) {
                buffer.add(data.id);
            };
        };

        #ok()
    };

    // New method for enhanced content
    public query func getContentBySource(source: Text) : async Result.Result<[ScrapedContent], Text> {
        if (not isAuthorized(Principal.fromActor(this))) {
            return #err("Unauthorized");
        };

        switch (_contentBySource.get(source)) {
            case (null) { return #ok([]) };
            case (?buffer) {
                let result = Buffer.Buffer<ScrapedContent>(buffer.size());
                for (id in buffer.vals()) {
                    switch (_content.get(id)) {
                        case (?item) { result.add(item) };
                        case (null) {};
                    };
                };
                #ok(Buffer.toArray(result))
            };
        };
    };

    // Legacy method for compatibility
    public query func getBySource(source: Text) : async [ScrapedData] {
        let buffer = Buffer.Buffer<ScrapedData>(0);
        
        switch (_contentBySource.get(source)) {
            case null { [] };
            case (?ids) {
                for (id in ids.vals()) {
                    switch (_content.get(id)) {
                        case null {};
                        case (?content) {
                            let legacyItem : ScrapedData = {
                                id = content.id;
                                url = content.url;
                                topic = if (content.topics.size() > 0) content.topics[0] else "";
                                source = content.source;
                                content = content.content;
                                timestamp = content.publish_date;
                                client_id = Principal.fromText("2vxsx-fae"); // Default system principal
                                status = "success"; // Default to success for existing data
                                scraping_time = 0;  // Default to 0 for existing data
                            };
                            buffer.add(legacyItem);
                        };
                    };
                };
                Buffer.toArray(buffer)
            };
        }
    };

    // Query content by topic
    public query func getContentByTopic(topic: Text, limit: Nat) : async Result.Result<[ScrapedContent], Text> {
        if (not isAuthorized(Principal.fromActor(this))) {
            return #err("Unauthorized");
        };

        switch (_contentByTopic.get(topic)) {
            case null { return #ok([]) };
            case (?buffer) {
                let result = Buffer.Buffer<ScrapedContent>(buffer.size());
                var count = 0;
                label l for (id in buffer.vals()) {
                    if (count >= limit) break l;
                    switch (_content.get(id)) {
                        case null {};
                        case (?item) { result.add(item) };
                    };
                    count += 1;
                };
                #ok(Buffer.toArray(result))
            };
        }
    };

    public query func getContent(id: Text) : async Result.Result<ScrapedContent, Text> {
        if (not isAuthorized(Principal.fromActor(this))) {
            return #err("Unauthorized");
        };

        switch (_content.get(id)) {
            case null { #err("Content not found") };
            case (?item) { #ok(item) };
        }
    };

    // Get scraped data with optional topic filter
    public query func getScrapedData(topicIds: [Text]) : async [ScrapedData] {
        let buffer = Buffer.Buffer<ScrapedData>(0);
        
        for ((id, content) in _content.entries()) {
            if (topicIds.size() > 0) {
                label topicLoop for (topicId in topicIds.vals()) {
                    if (content.topics.size() > 0 and content.topics[0] == topicId) {
                        buffer.add({
                            id = id;
                            url = content.url;
                            topic = if (content.topics.size() > 0) content.topics[0] else "";
                            content = content.content;
                            source = content.source;
                            timestamp = content.publish_date;
                            client_id = Principal.fromText("2vxsx-fae");
                            status = "success"; // Default to success for existing data
                            scraping_time = 0;  // Default to 0 for existing data
                        });
                        break topicLoop;
                    }
                }
            } else {
                buffer.add({
                    id = id;
                    url = content.url;
                    topic = if (content.topics.size() > 0) content.topics[0] else "";
                    content = content.content;
                    source = content.source;
                    timestamp = content.publish_date;
                    client_id = Principal.fromText("2vxsx-fae");
                    status = "success"; // Default to success for existing data
                    scraping_time = 0;  // Default to 0 for existing data
                });
            };
        };
        
        Buffer.toArray(buffer)
    };

    // Function to handle extraction
    private func handleExtraction(content: Text, rules: Types.ExtractionRules) : async Result.Result<[(Text, Text)], Text> {
        let buffer = Buffer.Buffer<(Text, Text)>(0);
        
        for (field in rules.fields.vals()) {
            switch (await AIHandler.extractField(content, field, rules.customPrompt)) {
                case (#ok(value)) {
                    buffer.add((field.name, value));
                };
                case (#err(e)) {
                    return #err("Failed to extract field '" # field.name # "': " # e);
                };
            };
        };

        #ok(Buffer.toArray(buffer))
    };

    // Simple test endpoint that only tests extraction rules
    public shared({ caller }) func testExtraction(request: Types.ExtractionRequest) : async Result.Result<Types.ExtractionResult, Text> {
        if (not isAuthorized(caller)) {
            return #err("Unauthorized");
        };

        try {
            switch (await handleExtraction("Mock content for testing", request.extractionRules)) {
                case (#ok(data)) {
                    #ok({
                        url = request.url;
                        data = data;
                        timestamp = Time.now();
                    })
                };
                case (#err(e)) { #err(e) };
            };
        } catch (e) {
            #err("Error during extraction: " # Error.message(e))
        };
    };

    public shared({ caller }) func extract(request: Types.ExtractionRequest) : async Result.Result<Types.ExtractionResult, Text> {
        if (not isAuthorized(caller)) {
            return #err("Unauthorized");
        };

        try {
            let response = await _makeHttpRequest({
                url = request.url;
                method = #get;
                headers = [];
                body = null;
                max_response_bytes = null;
                transform = null;
            });

            switch (response) {
                case (#ok(httpResponse)) {
                    let content = bytesToText(httpResponse.body);
                    switch (await handleExtraction(content, request.extractionRules)) {
                        case (#ok(data)) {
                            #ok({
                                url = request.url;
                                data = data;
                                timestamp = Time.now();
                            })
                        };
                        case (#err(e)) { #err(e) };
                    };
                };
                case (#err(e)) {
                    #err("Failed to fetch URL: " # e)
                };
            };
        } catch (e) {
            #err("Error during extraction: " # Error.message(e))
        };
    };

    public shared({ caller = _ }) func testLocalExtraction(request: {
        htmlContent: Text;
        extraction_rules: Types.ExtractionRules;
    }) : async Result.Result<{data: [(Text, Text)]}, Text> {
        try {
            let mockData = Buffer.Buffer<(Text, Text)>(0);
            for (field in request.extraction_rules.fields.vals()) {
                let extractionResult = await AIHandler.extractField(request.htmlContent, field, request.extraction_rules.customPrompt);
                switch (extractionResult) {
                    case (#ok(value)) {
                        mockData.add((field.name, value));
                    };
                    case (#err(e)) {
                        if (field.required) {
                            return #err("Failed to extract required field '" # field.name # "': " # e);
                        };
                    };
                };
            };
            #ok({ data = Buffer.toArray(mockData) });
        } catch (e) {
            #err("Error during local extraction: " # Error.message(e));
        };
    };

    public shared({ caller = _ }) func testExtractionLocal(request: {
        htmlContent: Text;
        extraction_rules: Types.ExtractionRules;
    }) : async Result.Result<{data: [(Text, Text)]}, Text> {
        try {
            let mockData = Buffer.Buffer<(Text, Text)>(0);
            for (field in request.extraction_rules.fields.vals()) {
                let extractionResult = await AIHandler.extractField(request.htmlContent, field, request.extraction_rules.customPrompt);
                switch (extractionResult) {
                    case (#ok(value)) {
                        mockData.add((field.name, value));
                    };
                    case (#err(e)) {
                        if (field.required) {
                            return #err("Failed to extract required field '" # field.name # "': " # e);
                        };
                    };
                };
            };
            #ok({ data = Buffer.toArray(mockData) });
        } catch (e) {
            #err("Error during local extraction: " # Error.message(e));
        };
    };

    // Topic management
    private stable var _topics : [(Text, Types.ScrapingTopic)] = [];
    private var topics = HashMap.fromIter<Text, Types.ScrapingTopic>(_topics.vals(), 0, Text.equal, Text.hash);

    public shared({ caller = _ }) func createTopic(topic : Types.ScrapingTopic) : async Result.Result<(), Text> {
        topics.put(topic.id, { topic with active = true }); // New topics are active by default
        #ok(());
    };

    public shared({ caller = _ }) func deleteTopic(id : Text) : async Result.Result<(), Text> {
        Debug.print("Storage: Attempting to delete topic: " # id);
        switch (topics.get(id)) {
            case (null) { 
                Debug.print("Storage: Topic not found: " # id);
                #err("Topic not found") 
            };
            case (?_topic) {
                Debug.print("Storage: Deleting topic...");
                topics.delete(id);
                Debug.print("Storage: Topic deleted successfully");
                #ok(());
            };
        };
    };

    public shared({ caller = _ }) func setTopicActive(id : Text, active : Bool) : async Result.Result<(), Text> {
        Debug.print("Storage: Setting topic " # id # " active state to: " # Bool.toText(active));
        switch (topics.get(id)) {
            case (null) { 
                Debug.print("Storage: Topic not found: " # id);
                #err("Topic not found") 
            };
            case (?_topic) {
                let updatedTopic = {
                    _topic with
                    active = active;
                    updatedAt = Int.abs(Time.now());
                };
                Debug.print("Storage: Updating topic...");
                topics.put(id, updatedTopic);
                Debug.print("Storage: Topic updated successfully");
                #ok(());
            };
        };
    };

    public query func getTopics() : async Result.Result<[SharedTypes.ScrapingTopic], SharedTypes.Error> {
        if (not isAuthorizedCaller(Principal.fromActor(this))) {
            return #err(#NotAuthorized);
        };
        let buffer = Buffer.Buffer<SharedTypes.ScrapingTopic>(0);
        for ((_, topic) in topics.entries()) {
            buffer.add(topic);
        };
        #ok(Buffer.toArray(buffer))
    };

    public query func getTopic(id : Text) : async ?Types.ScrapingTopic {
        topics.get(id);
    };

    // Update the scraping process to only use active topics
    private func _isTopicActive(topicId : Text) : Bool {
        switch (topics.get(topicId)) {
            case (null) { false };
            case (?topic) { topic.active };
        };
    };

    // Function to validate extraction rules
    private func validateExtractionRules(rules: Types.ExtractionRules) : Bool {
        if (rules.fields.size() == 0) {
            return false;
        };

        for (field in rules.fields.vals()) {
            if (Text.size(field.name) == 0 or Text.size(field.aiPrompt) == 0) {
                return false;
            };
        };

        true
    };

    // Function to validate topic
    private func validateTopic(topic: Types.ScrapingTopic) : Bool {
        if (Text.size(topic.name) == 0 or Text.size(topic.description) == 0) {
            return false;
        };

        if (topic.urlPatterns.size() == 0) {
            return false;
        };

        validateExtractionRules(topic.extractionRules)
    };

    // State
    private var _content = HashMap.HashMap<Text, ScrapedContent>(0, Text.equal, Text.hash);
    private var _contentByTopic = HashMap.HashMap<Text, Buffer.Buffer<Text>>(0, Text.equal, Text.hash);
    private var _contentBySource = HashMap.HashMap<Text, Buffer.Buffer<Text>>(0, Text.equal, Text.hash);
    private var _requests = HashMap.HashMap<Text, Request>(0, Text.equal, Text.hash);

    // Helper function to check if caller is authorized
    private func isAuthorized(caller: Principal): Bool {
        // For local development, allow anonymous access
        if (Principal.isAnonymous(caller)) {
            return true;
        };
        
        // TODO: Implement proper authorization
        // For now, accept all calls
        true
    };

    // Admin-only methods
    public shared({ caller }) func updateTopic(topic: SharedTypes.ScrapingTopic): async Result.Result<(), SharedTypes.Error> {
        if (not isAdmin(caller)) {
            return #err(#NotAuthorized);
        };
        topics.put(topic.id, topic);
        #ok()
    };

    public shared({ caller }) func updateAIConfig(config: SharedTypes.AIConfig): async Result.Result<(), SharedTypes.Error> {
        if (not isAdmin(caller)) {
            return #err(#NotAuthorized);
        };
        aiConfig := config;
        #ok()
    };

    public query({ caller }) func getAIConfig(): async Result.Result<SharedTypes.AIConfig, SharedTypes.Error> {
        if (not isAuthorizedCaller(caller)) {
            return #err(#NotAuthorized);
        };
        #ok(aiConfig)
    };

    // Consumer methods for scraping
    public shared({ caller }) func submitScrapedData(data: SharedTypes.ScrapedData): async Result.Result<(), SharedTypes.Error> {
        if (not isAuthorizedCaller(caller)) {
            return #err(#NotAuthorized);
        };
        scrapedData.put(data.id, data);
        #ok()
    };

    public query({ caller }) func getScrapedData(topicIds: [Text]): async Result.Result<[SharedTypes.ScrapedData], SharedTypes.Error> {
        if (not isAuthorizedCaller(caller)) {
            return #err(#NotAuthorized);
        };
        let buffer = Buffer.Buffer<SharedTypes.ScrapedData>(0);
        for ((_, data) in scrapedData.entries()) {
            if (topicIds.size() == 0 or Array.find<Text>(topicIds, func(id) = id == data.topicId) != null) {
                buffer.add(data);
            };
        };
        #ok(Buffer.toArray(buffer))
    };

    private let adminCanisterId: Text = "s6r66-wyaaa-aaaaj-az4sq-cai";
    private let consumerCanisterId: Text = ""; // Will be set during deployment

    private func isAdmin(caller: Principal): Bool {
        Principal.toText(caller) == adminCanisterId
    };

    private func isConsumer(caller: Principal): Bool {
        Principal.toText(caller) == consumerCanisterId
    };

    private var aiConfig: SharedTypes.AIConfig = {
        apiKey = "";
        model = "gpt-4";
        costLimits = {
            maxDailyCost = 0.0;
            maxMonthlyCost = 0.0;
            maxConcurrent = 5;
        };
    };

    private var scrapedData = HashMap.HashMap<Text, SharedTypes.ScrapedData>(100, Text.equal, Text.hash);

    // Stable storage for canister IDs
    private stable var authorizedCanisterIds: [Principal] = [];
    
    // System canister for IC management
    private let ic: IC = actor "aaaaa-aa";
    private let CYCLES_PER_CALL = 100_000_000_000; // 100B cycles per call

    // Initialize authorized canisters
    system func init() {
        // Add admin and consumer canisters during deployment
        authorizedCanisterIds := [
            Principal.fromText("s6r66-wyaaa-aaaaj-az4sq-cai"), // admin
            Principal.fromText("") // consumer - to be set during deployment
        ];
    };

    // Access control
    private func isAuthorizedCaller(caller: Principal): Bool {
        // Allow self-calls
        if (Principal.equal(caller, Principal.fromActor(this))) {
            return true;
        };

        // Check if caller is an authorized canister
        for (id in authorizedCanisterIds.vals()) {
            if (Principal.equal(caller, id)) {
                return true;
            };
        };
        false
    };

    // Admin management
    public shared({ caller }) func addAuthorizedCanister(id: Principal): async Result.Result<(), SharedTypes.Error> {
        // Only the admin canister can add new authorized canisters
        if (Principal.toText(caller) != "s6r66-wyaaa-aaaaj-az4sq-cai") {
            return #err(#NotAuthorized);
        };
        authorizedCanisterIds := Array.append(authorizedCanisterIds, [id]);
        #ok()
    };

    public shared({ caller }) func removeAuthorizedCanister(id: Principal): async Result.Result<(), SharedTypes.Error> {
        // Only the admin canister can remove authorized canisters
        if (Principal.toText(caller) != "s6r66-wyaaa-aaaaj-az4sq-cai") {
            return #err(#NotAuthorized);
        };
        authorizedCanisterIds := Array.filter(authorizedCanisterIds, func(p: Principal): Bool { not Principal.equal(p, id) });
        #ok()
    };

    // Data stores with stable storage
    private stable var stableTopics: [(Text, SharedTypes.ScrapingTopic)] = [];
    private stable var stableScrapedData: [(Text, SharedTypes.ScrapedData)] = [];
    private stable var stableAIConfig: SharedTypes.AIConfig = {
        apiKey = "";
        model = "gpt-4";
        costLimits = {
            maxDailyCost = 0.0;
            maxMonthlyCost = 0.0;
            maxConcurrent = 5;
        };
    };

    private var topics = HashMap.HashMap<Text, SharedTypes.ScrapingTopic>(10, Text.equal, Text.hash);
    private var scrapedData = HashMap.HashMap<Text, SharedTypes.ScrapedData>(100, Text.equal, Text.hash);
    private var aiConfig = stableAIConfig;

    // Upgrade hooks
    system func preupgrade() {
        stableTopics := Iter.toArray(topics.entries());
        stableScrapedData := Iter.toArray(scrapedData.entries());
        stableAIConfig := aiConfig;
    };

    system func postupgrade() {
        topics := HashMap.fromIter<Text, SharedTypes.ScrapingTopic>(stableTopics.vals(), 10, Text.equal, Text.hash);
        scrapedData := HashMap.fromIter<Text, SharedTypes.ScrapedData>(stableScrapedData.vals(), 100, Text.equal, Text.hash);
        aiConfig := stableAIConfig;
    };

    // Public methods with access control
    public shared({ caller }) func updateTopic(topic: SharedTypes.ScrapingTopic): async Result.Result<(), SharedTypes.Error> {
        if (not isAuthorizedCaller(caller)) {
            return #err(#NotAuthorized);
        };
        topics.put(topic.id, topic);
        #ok()
    };

    public shared({ caller }) func updateAIConfig(config: SharedTypes.AIConfig): async Result.Result<(), SharedTypes.Error> {
        if (not isAuthorizedCaller(caller)) {
            return #err(#NotAuthorized);
        };
        aiConfig := config;
        #ok()
    };

    public query({ caller }) func getTopics(): async Result.Result<[SharedTypes.ScrapingTopic], SharedTypes.Error> {
        if (not isAuthorizedCaller(caller)) {
            return #err(#NotAuthorized);
        };
        let buffer = Buffer.Buffer<SharedTypes.ScrapingTopic>(0);
        for ((_, topic) in topics.entries()) {
            buffer.add(topic);
        };
        #ok(Buffer.toArray(buffer))
    };

    public query({ caller }) func getAIConfig(): async Result.Result<SharedTypes.AIConfig, SharedTypes.Error> {
        if (not isAuthorizedCaller(caller)) {
            return #err(#NotAuthorized);
        };
        #ok(aiConfig)
    };

    public shared({ caller }) func submitScrapedData(data: SharedTypes.ScrapedData): async Result.Result<(), SharedTypes.Error> {
        if (not isAuthorizedCaller(caller)) {
            return #err(#NotAuthorized);
        };
        
        // Add cycles for computation
        ExperimentalCycles.add(CYCLES_PER_CALL);
        
        scrapedData.put(data.id, data);
        #ok()
    };

    public query({ caller }) func getScrapedData(topicIds: [Text]): async Result.Result<[SharedTypes.ScrapedData], SharedTypes.Error> {
        if (not isAuthorizedCaller(caller)) {
            return #err(#NotAuthorized);
        };
        let buffer = Buffer.Buffer<SharedTypes.ScrapedData>(0);
        for ((_, data) in scrapedData.entries()) {
            if (topicIds.size() == 0 or Array.find<Text>(topicIds, func(id) = id == data.topicId) != null) {
                buffer.add(data);
            };
        };
        #ok(Buffer.toArray(buffer))
    };
}
