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

    public type HttpRequestArgs = {
        url : Text;
        max_response_bytes : ?Nat64;
        headers : [HttpHeader];
        body : ?[Nat8];
        method : HttpMethod;
        transform : ?TransformContext;
    };

    public type HttpResponse = {
        status : Nat;
        headers : [HttpHeader];
        body : [Nat8];
    };

    public type ExtractionField = {
        name: Text;
        description: ?Text;
        aiPrompt: Text;
        required: Bool;
        fieldType: Text;
        example: ?Text;
    };

    public type ExtractionRules = {
        fields: [ExtractionField];
        customPrompt: ?Text;
    };

    public type CostLimits = {
        dailyUSD: Nat;
        monthlyUSD: Nat;
        maxConcurrent: Nat;
    };

    public type AIConfig = {
        apiKey: Text;
        model: Text;
        costLimits: CostLimits;
    };

    public type ScrapingTopic = {
        id : Text;
        name : Text;
        description : ?Text;
        urlPatterns : [Text];
        extractionRules : ?ExtractionRules;
        createdAt : Int;
        updatedAt : Int;
    };

    public type Request = {
        id : Text;
        url : Text;
        contentId : Text;
        extractionRules : ExtractionRules;
        topicId : Text;
        timestamp : Int;
    };
}
