import Result "mo:base/Result";
import Time "mo:base/Time";

module {
    public type AIConfig = {
        apiKey: Text;
        model: Text;
        costLimits: CostLimits;
    };

    public type CostLimits = {
        dailyUSD: Nat;
        monthlyUSD: Nat;
        maxConcurrent: Nat;
    };

    public type ScrapingField = {
        name: Text;
        description: ?Text;
        aiPrompt: Text;
        required: Bool;
        fieldType: Text;
        example: ?Text;
    };

    public type ScrapingTopic = {
        id: Text;
        name: Text;
        description: Text;
        urlPatterns: [Text];
        active: Bool;
        extractionRules: {
            fields: [ScrapingField];
            customPrompt: ?Text;
        };
        validation: ?{
            rules: [Text];
            aiValidation: ?Text;
        };
        rateLimit: ?{
            requestsPerHour: Nat;
            maxConcurrent: Nat;
        };
        createdAt: Int;
    };

    public type ScrapedData = {
        id: Text;
        url: Text;
        topic: Text;
        source: Text;
        content: Text;
        timestamp: Int;
        client_id: Principal;
    };

    public type Storage = actor {
        storeRequest : shared ({
            id: Text;
            url: Text;
            topicId: Text;
            timestamp: Int;
        }) -> async Result.Result<Text, Text>;

        processWithAI : shared ({
            contentId: Text;
            topicId: Text;
            url: Text;
            extractionRules: {
                fields: [ScrapingField];
                customPrompt: ?Text;
            };
        }) -> async Result.Result<[(Text, Text)], Text>;

        getAIConfig : shared query () -> async Result.Result<AIConfig, Text>;
        updateAIConfig : shared (AIConfig) -> async Result.Result<(), Text>;
        getScrapedData: shared query (topicId: ?Text) -> async [ScrapedData];
    };
};
