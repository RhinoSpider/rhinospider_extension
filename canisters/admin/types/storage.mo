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
    };
};
