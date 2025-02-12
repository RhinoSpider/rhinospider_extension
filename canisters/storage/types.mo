module {
    public type HttpHeader = {
        name : Text;
        value : Text;
    };

    public type HttpMethod = {
        #get;
        #post;
        #head;
    };

    public type TransformContext = {
        function : [Nat8];
        context : [Nat8];
    };

    public type HttpResponse = {
        status : Nat;
        headers : [HttpHeader];
        body : [Nat8];
    };

    public type TransformArgs = {
        response : HttpResponse;
        context : [Nat8];
    };

    public type HttpRequestArgs = {
        url : Text;
        max_response_bytes : ?Nat64;
        headers : [HttpHeader];
        body : ?[Nat8];
        method : HttpMethod;
        transform : ?TransformContext;
    };

    public type ScrapingField = {
        name: Text;
        fieldType: Text;  // text, number, date, etc.
        required: Bool;   // If true, extraction must succeed
        aiPrompt: Text;   // Used for both extraction guidance and validation
    };

    public type ExtractionRules = {
        fields: [ScrapingField];
        customPrompt: ?Text;  // Provides context about the website/data structure
    };

    public type ExtractionResult = {
        url: Text;
        data: [(Text, Text)];
        timestamp: Int;
    };

    public type ExtractionRequest = {
        url: Text;
        extractionRules: ExtractionRules;
    };

    public type LocalExtractionRequest = {
        htmlContent: Text;
        extractionRules: ExtractionRules;
    };

    public type ScrapingTopic = {
        id: Text;
        name: Text;
        description: Text;
        urlPatterns: [Text];
        active: Bool;
        extractionRules: ExtractionRules;
        rateLimit: ?{
            requestsPerHour: Nat;  // Limit requests to target website
            maxConcurrent: Nat;    // Max concurrent requests to website
        };
        createdAt: Int;
    };

    public type Request = {
        id: Text;
        url: Text;
        topicId: Text;
        contentId: Text;
        timestamp: Int;
        extractionRules: ExtractionRules;
    };

    // AI configuration focuses on OpenAI API limits
    public type AIConfig = {
        apiKey: Text;
        model: Text;
        costLimits: {
            dailyUSD: Float;      // Maximum daily cost in USD
            monthlyUSD: Float;    // Maximum monthly cost in USD
            maxConcurrent: Nat;   // Maximum concurrent AI API calls
        };
    };
}
