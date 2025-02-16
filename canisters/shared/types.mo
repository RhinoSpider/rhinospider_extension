module {
    // Shared types between all canisters
    public type ScrapingTopic = {
        id: Text;
        status: Text;
        name: Text;
        description: Text;
        scrapingInterval: Nat;
        maxRetries: Nat;
        activeHours: {
            start: Nat;
            end: Nat;
        };
        urlPatterns: [Text];
        extractionRules: ExtractionRules;
        aiConfig: AIConfig;
        createdAt: Int;
    };

    public type ExtractionRules = {
        fields: [ScrapingField];
        customPrompt: ?Text;
    };

    public type ScrapingField = {
        name: Text;
        fieldType: Text;
        required: Bool;
        aiPrompt: ?Text;
    };

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

    public type ScrapedData = {
        id: Text;
        topicId: Text;
        url: Text;
        timestamp: Int;
        content: {
            raw: Text;
            extracted: [(Text, Text)];
        };
        status: Text;
        retries: Nat;
        error: ?Text;
    };

    public type Error = {
        #NotFound;
        #AlreadyExists;
        #NotAuthorized;
        #InvalidInput: Text;
        #SystemError: Text;
    };
}
