import Time "mo:base/Time";

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

    public type ProvenanceRecord = {
        node_principal: Principal;
        timestamp: Time.Time;
        chunk_hash: Text;
    };
}
