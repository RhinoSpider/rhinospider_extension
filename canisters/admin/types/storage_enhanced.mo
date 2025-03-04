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

    public type ContentIdentifiers = {
        selectors: [Text];
        keywords: [Text];
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
        // New URL generation fields
        articleUrlPatterns: ?[Text];
        siteTypeClassification: ?Text;
        contentIdentifiers: ?ContentIdentifiers;
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
        // New URL generation fields
        articleUrlPatterns: ?[Text];
        siteTypeClassification: ?Text;
        contentIdentifiers: ?ContentIdentifiers;
        paginationPatterns: ?[Text];
        sampleArticleUrls: ?[Text];
        urlGenerationStrategy: ?Text;
        excludePatterns: ?[Text];
    };

    public type ScrapedData = {
        id: Text;
        url: Text;
        topicId: Text;
        content: Text;
        metadata: ?{
            title: Text;
            description: Text;
            author: Text;
            publishedDate: Text;
            modifiedDate: Text;
            imageUrl: Text;
        };
        extractedData: ?{
            #Json: Text;
            #Text: Text;
        };
        status: Text;
        createdAt: Int;
    };

    public type Error = {
        #NotFound;
        #AlreadyExists;
        #NotAuthorized;
        #InvalidInput;
        #InternalError;
    };
}
