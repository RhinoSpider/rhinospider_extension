import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Time "mo:base/Time";
import HashMap "mo:base/HashMap";
import Buffer "mo:base/Buffer";

actor Storage {
    // Legacy type for compatibility
    type ScrapedData = {
        id: Text;
        url: Text;
        topic: Text;
        source: Text;
        content: Text;
        timestamp: Int;
        clientId: Principal;
    };

    // New enhanced type
    type ScrapedContent = {
        id: Text;
        source: Text;  // "github", "devto", "medium"
        url: Text;
        title: Text;
        author: Text;
        publishDate: Int;
        updateDate: Int;
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
            readingTime: ?Nat;
            language: ?Text;
            license: ?Text;
            techStack: [Text];
        };
        aiAnalysis: {
            relevanceScore: Nat;
            keyPoints: [Text];
            codeSnippets: [{
                language: Text;
                code: Text;
            }];
        };
    };

    // State
    private var content = HashMap.HashMap<Text, ScrapedContent>(0, Text.equal, Text.hash);
    private var contentByTopic = HashMap.HashMap<Text, Buffer.Buffer<Text>>(0, Text.equal, Text.hash);
    private var contentBySource = HashMap.HashMap<Text, Buffer.Buffer<Text>>(0, Text.equal, Text.hash);

    // Store scraped content
    public shared({ caller }) func storeContent(data: ScrapedContent) : async Result.Result<(), Text> {
        // Verify caller is authorized
        if (not isAuthorized(caller)) {
            return #err("Unauthorized");
        };

        content.put(data.id, data);
        
        // Index by topics
        for (topic in data.topics.vals()) {
            switch (contentByTopic.get(topic)) {
                case (null) {
                    let buffer = Buffer.Buffer<Text>(1);
                    buffer.add(data.id);
                    contentByTopic.put(topic, buffer);
                };
                case (?buffer) {
                    buffer.add(data.id);
                };
            };
        };

        // Index by source
        switch (contentBySource.get(data.source)) {
            case (null) {
                let buffer = Buffer.Buffer<Text>(1);
                buffer.add(data.id);
                contentBySource.put(data.source, buffer);
            };
            case (?buffer) {
                buffer.add(data.id);
            };
        };
        
        #ok(())
    };

    // Legacy method for compatibility
    public query func getBySource(source: Text) : async [ScrapedData] {
        let buffer = Buffer.Buffer<ScrapedData>(0);
        
        switch (contentBySource.get(source)) {
            case (null) { [] };
            case (?ids) {
                for (id in ids.vals()) {
                    switch (content.get(id)) {
                        case (?item) {
                            // Convert new type to legacy type
                            let legacyItem : ScrapedData = {
                                id = item.id;
                                url = item.url;
                                topic = if (item.topics.size() > 0) item.topics[0] else "";
                                source = item.source;
                                content = item.content;
                                timestamp = item.publishDate;
                                clientId = Principal.fromText("2vxsx-fae"); // Default system principal
                            };
                            buffer.add(legacyItem);
                        };
                        case (null) {};
                    };
                };
                Buffer.toArray(buffer)
            };
        }
    };

    // New method for enhanced content
    public query func getContentBySource(source: Text) : async [ScrapedContent] {
        let buffer = Buffer.Buffer<ScrapedContent>(0);
        
        switch (contentBySource.get(source)) {
            case (null) { [] };
            case (?ids) {
                for (id in ids.vals()) {
                    switch (content.get(id)) {
                        case (?item) {
                            buffer.add(item);
                        };
                        case (null) {};
                    };
                };
                Buffer.toArray(buffer)
            };
        }
    };

    // Query content by topic
    public query func getContentByTopic(topic: Text, limit: Nat) : async [ScrapedContent] {
        let buffer = Buffer.Buffer<ScrapedContent>(0);
        
        switch (contentByTopic.get(topic)) {
            case (null) { [] };
            case (?ids) {
                var count = 0;
                label l for (id in ids.vals()) {
                    if (count >= limit) break l;
                    switch (content.get(id)) {
                        case (?item) {
                            buffer.add(item);
                            count += 1;
                        };
                        case (null) {};
                    };
                };
                Buffer.toArray(buffer)
            };
        }
    };

    public query func getContent(id: Text) : async ?ScrapedContent {
        content.get(id)
    };

    // Helper function to check if caller is authorized
    private func isAuthorized(caller: Principal): Bool {
        // TODO: Implement proper authorization
        // For now, accept all calls
        true
    };
}
