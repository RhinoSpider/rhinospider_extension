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
        geolocationFilter: ?Text;
        percentageNodes: ?Nat;
        randomizationMode: ?Text;
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
        url: Text;
        topic: Text;
        content: Text;
        source: Text;
        timestamp: Int;
        client_id: Principal;
        status: Text;
        scraping_time: Int;
    };

    public type Error = {
        #NotFound;
        #AlreadyExists;
        #NotAuthorized;
        #InvalidInput: Text;
        #SystemError: Text;
    };

    public type NodeCharacteristics = {
        ipAddress: Text;
        region: Text;
        percentageNodes: ?Nat;
        randomizationMode: ?Text;
    };

    // track when points were earned for fee calculation
    public type PointsRecord = {
        amount: Nat;
        earnedAt: Int; // timestamp
        source: Text; // "scraping" or "referral"
    };

    // token conversion request
    public type ConversionRequest = {
        id: Text;
        userId: Principal;
        pointsAmount: Nat;
        tokensGross: Nat;
        tokensFee: Nat;
        tokensNet: Nat;
        requestedAt: Int;
        status: Text; // "pending", "completed", "failed"
        walletAddress: Text;
    };
}
