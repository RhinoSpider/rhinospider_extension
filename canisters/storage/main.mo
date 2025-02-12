import Buffer "mo:base/Buffer";
import Result "mo:base/Result";
import Text "mo:base/Text";
import HashMap "mo:base/HashMap";
import Nat32 "mo:base/Nat32";
import Nat64 "mo:base/Nat64";
import Int "mo:base/Int";
import Types "./types";
import Nat8 "mo:base/Nat8";
import Float "mo:base/Float";
import Char "mo:base/Char";
import Principal "mo:base/Principal";
import Blob "mo:base/Blob";
import Error "mo:base/Error";
import AIHandler "./ai/handler";
import Nat "mo:base/Nat";
import Time "mo:base/Time";
import Debug "mo:base/Debug";
import Bool "mo:base/Bool";

actor class Storage() = this {
    type ICManagement = actor {
        http_request : {
            url : Text;
            max_response_bytes : ?Nat64;
            headers : [Types.HttpHeader];
            body : ?[Nat8];
            method : Types.HttpMethod;
            transform : ?Types.TransformContext;
        } -> async Types.HttpResponse;
        http_request_with_cycles : {
            url : Text;
            max_response_bytes : ?Nat64;
            headers : [Types.HttpHeader];
            body : ?[Nat8];
            method : Types.HttpMethod;
            transform : ?Types.TransformContext;
            cycles : Nat64;
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
    type ScrapingField = Types.ExtractionField;

    private let _admin : AdminCanister = actor "bkyz2-fmaaa-aaaaa-qaaaq-cai";

    // Helper function to convert Nat8 array to Text
    private func _nat8ArrayToText(arr: [Nat8]) : Text {
        let buffer = Buffer.Buffer<Char>(arr.size());
        for (byte in arr.vals()) {
            buffer.add(Char.fromNat32(Nat32.fromNat(Nat8.toNat(byte))));
        };
        Text.fromIter(buffer.vals());
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

    // Helper function to make HTTP request through proxy
    private func _makeHttpRequest(request: Types.HttpRequestArgs) : async Result.Result<Types.HttpResponse, Text> {
        try {
            let ic : ICManagement = actor("aaaaa-aa");
            
            // Use local proxy
            let requestBody = "{ \"url\": \"" # request.url # "\" }";
            let requestBodyBytes = Blob.toArray(Text.encodeUtf8(requestBody));
            
            let response = await ic.http_request({
                url = "http://127.0.0.1:3000/fetch";
                method = #post;
                body = ?requestBodyBytes;
                headers = [
                    { name = "Content-Type"; value = "application/json" }
                ];
                transform = null;
                max_response_bytes = null;
            });

            #ok({
                status = response.status;
                headers = response.headers;
                body = response.body;
            });
        } catch (e) {
            #err("HTTP request failed: " # Error.message(e));
        };
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
                            client_id = Principal.fromText("2vxsx-fae")
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
                    client_id = Principal.fromText("2vxsx-fae")
                });
            };
        };
        
        Buffer.toArray(buffer)
    };

    // Simple test endpoint that only tests extraction rules
    public shared({ caller = _ }) func testExtraction(request: {
        url: Text;
        extraction_rules: ExtractionRules;
    }) : async Result.Result<{data: [(Text, Text)]}, Text> {
        try {
            let mockData = Buffer.Buffer<(Text, Text)>(0);
            for (field in request.extraction_rules.fields.vals()) {
                let extractionResult = await AIHandler.extractField(request.url, field.aiPrompt);
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
            #err("Error during extraction: " # Error.message(e));
        };
    };

    public shared({ caller = _ }) func testExtractionLocal(request: {
        htmlContent: Text;
        extraction_rules: ExtractionRules;
    }) : async Result.Result<{data: [(Text, Text)]}, Text> {
        try {
            let mockData = Buffer.Buffer<(Text, Text)>(0);
            for (field in request.extraction_rules.fields.vals()) {
                let extractionResult = await AIHandler.extractField(request.htmlContent, field.aiPrompt);
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

    public query func getTopics() : async [Types.ScrapingTopic] {
        let buffer = Buffer.Buffer<Types.ScrapingTopic>(0);
        for ((_, topic) in topics.entries()) {
            buffer.add(topic);
        };
        Buffer.toArray(buffer);
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
}
