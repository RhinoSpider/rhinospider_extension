import Result "mo:base/Result";
import Time "mo:base/Time";

module {
    public type AIConfig = {
        apiKey: Text;
        model: Text;
        costLimits: CostLimits;
    };

    public type CostLimits = {
        maxDailyCost: Float;
        maxMonthlyCost: Float;
        maxConcurrent: Nat;
    };

    public type ScrapingField = {
        name: Text;
        fieldType: Text;
        required: Bool;
        aiPrompt: ?Text;
    };

    public type ExtractionRules = {
        fields: [ScrapingField];
        customPrompt: ?Text;
    };

    public type ScrapingTopic = {
        id: Text;
        name: Text;
        description: Text;
        urlPatterns: [Text];
        aiConfig: AIConfig;
        status: Text;
        extractionRules: ExtractionRules;
        scrapingInterval: Nat;  // In seconds
        lastScraped: Int;      // Timestamp
        activeHours: {
            start: Nat;        // Hour in UTC (0-23)
            end: Nat;          // Hour in UTC (0-23)
        };
        maxRetries: Nat;       // Max retries per URL
        createdAt: Int;
        articleUrlPatterns: ?[Text];
        siteTypeClassification: ?Text;
        contentIdentifiers: ?{
            selectors: [Text];
            keywords: [Text];
        };
        paginationPatterns: ?[Text];
        sampleArticleUrls: ?[Text];
        urlGenerationStrategy: ?Text;
        excludePatterns: ?[Text];
    };

    public type CreateTopicRequest = {
        id: Text;
        name: Text;
        description: Text;
        urlPatterns: [Text];
        aiConfig: AIConfig;
        status: Text;
        extractionRules: ExtractionRules;
        scrapingInterval: Nat;
        activeHours: {
            start: Nat;
            end: Nat;
        };
        maxRetries: Nat;
        articleUrlPatterns: ?[Text];
        siteTypeClassification: ?Text;
        contentIdentifiers: ?{
            selectors: [Text];
            keywords: [Text];
        };
        paginationPatterns: ?[Text];
        sampleArticleUrls: ?[Text];
        urlGenerationStrategy: ?Text;
        excludePatterns: ?[Text];
    };

    public type ScrapedData = {
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

    public type Storage = actor {
        getScrapedData : shared ([Text]) -> async [ScrapedData];
        testExtraction : shared ({
            url: Text;
            extraction_rules: {
                fields: [ScrapingField];
                custom_prompt: ?Text;
            };
        }) -> async Result.Result<{data: [(Text, Text)]}, Text>;
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
        setTopicActive : shared (Text, Bool) -> async Result.Result<(), Text>;
    };
};
