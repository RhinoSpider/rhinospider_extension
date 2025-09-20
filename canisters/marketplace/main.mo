import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";
import Text "mo:base/Text";
import Result "mo:base/Result";
import Time "mo:base/Time";
import Buffer "mo:base/Buffer";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Float "mo:base/Float";
import Random "mo:base/Random";
import Blob "mo:base/Blob";
import Nat8 "mo:base/Nat8";
import Nat32 "mo:base/Nat32";
import Char "mo:base/Char";
import SharedTypes "../shared/types";

actor Marketplace {
    // Admin canister interface
    private let adminCanisterId = "wvset-niaaa-aaaao-a4osa-cai";
    private let storageCanisterId = "hhaip-uiaaa-aaaao-a4khq-cai";

    // Define the actual ScrapingTopic type from admin canister
    type AdminScrapingTopic = {
        id: Text;
        name: Text;
        description: Text;
        status: Text;
        scrapingInterval: Nat;
        totalUrlsScraped: Nat;
        lastScraped: Int;
        priority: Nat;
        searchQueries: [Text];
        requiredKeywords: [Text];
        geolocationFilter: ?Text;
        // Other fields we don't need
        contentSelectors: [Text];
        excludeSelectors: [Text];
        titleSelectors: ?[Text];
        preferredDomains: ?[Text];
        excludeDomains: ?[Text];
        excludeKeywords: ?[Text];
        maxUrlsPerBatch: Nat;
        maxContentLength: Nat;
        minContentLength: Nat;
        percentageNodes: ?Nat;
        randomizationMode: ?Text;
        createdAt: Int;
    };

    type AdminActor = actor {
        getTopics : query () -> async Result.Result<[AdminScrapingTopic], SharedTypes.Error>;
    };

    type StorageActor = actor {
        getScrapedData : query ([Text]) -> async [SharedTypes.ScrapedData];
        getAllData : query () -> async [(Text, SharedTypes.ScrapedData)];
    };
    // Enhanced Types based on PRD
    type Dataset = {
        dataset_id: Text;
        name: Text;
        description: Text;
        region: Text;
        category: Text;
        file_url: Text;
        sample_rows: [Text];
        price_bulk: Float;
        price_api: Float;
        size_gb: Float;
        row_count: Nat;
        last_update: Int;
        on_chain_hash: Text;
        data_source: Text;
        update_frequency: Text;
        format: Text;
        tags: [Text];
        provider: Text;
        status: Text; // "active", "archived"
        preview_available: Bool;
        api_endpoint: ?Text;
    };

    type Purchase = {
        purchase_id: Text;
        user_principal: Principal;
        dataset_id: Text;
        purchase_type: Text; // "BULK" or "API"
        amount: Float;
        currency: Text;
        payment_tx_id: Text;
        created_at: Int;
        expires_at: ?Int;
        download_url: ?Text;
        download_count: Nat;
        status: Text; // "active", "expired", "cancelled"
    };

    type ApiKey = {
        key_id: Text;
        api_key: Text;
        user_principal: Principal;
        dataset_id: Text;
        created_at: Int;
        last_used: ?Int;
        expires_at: ?Int;
        request_count: Nat;
        daily_limit: Nat;
        rate_limit_per_minute: Nat;
        is_active: Bool;
        allowed_ips: [Text];
        usage_today: Nat;
        last_reset: Int;
    };

    type User = {
        principal: Principal;
        email: ?Text;
        company: ?Text;
        company_size: ?Text;
        industry: ?Text;
        use_case: ?Text;
        registered_at: Int;
        last_login: Int;
        total_spent: Float;
        purchase_count: Nat;
        api_calls_total: Nat;
        preferred_payment: Text;
        kyc_verified: Bool;
        account_tier: Text; // "free", "starter", "enterprise"
    };

    type UsageMetrics = {
        user_principal: Principal;
        dataset_id: Text;
        api_calls_today: Nat;
        api_calls_month: Nat;
        downloads_count: Nat;
        last_access: Int;
        data_transferred_gb: Float;
    };

    type DatasetStats = {
        dataset_id: Text;
        total_purchases: Nat;
        total_revenue: Float;
        unique_buyers: Nat;
        api_subscriptions: Nat;
        bulk_downloads: Nat;
        avg_rating: Float;
        total_api_calls: Nat;
    };

    // State Management
    private stable var stableDatasets : [(Text, Dataset)] = [];
    private stable var stablePurchases : [(Text, Purchase)] = [];
    private stable var stableApiKeys : [(Text, ApiKey)] = [];
    private stable var stableUsers : [(Principal, User)] = [];
    private stable var stableUsageMetrics : [(Text, UsageMetrics)] = [];
    private stable var stableDatasetStats : [(Text, DatasetStats)] = [];

    private var datasets = HashMap.HashMap<Text, Dataset>(0, Text.equal, Text.hash);
    private var purchases = HashMap.HashMap<Text, Purchase>(0, Text.equal, Text.hash);
    private var apiKeys = HashMap.HashMap<Text, ApiKey>(0, Text.equal, Text.hash);
    private var users = HashMap.HashMap<Principal, User>(0, Principal.equal, Principal.hash);
    private var usageMetrics = HashMap.HashMap<Text, UsageMetrics>(0, Text.equal, Text.hash);
    private var datasetStats = HashMap.HashMap<Text, DatasetStats>(0, Text.equal, Text.hash);

    // Admin Management
    private stable var admins : [Principal] = [];
    private let INITIAL_ADMIN = "vnsgt-djy2g-igpvh-sevfi-ota4n-dtquw-nz7i6-4glkr-ijmrd-5w3uh-gae";

    // Constants
    private let DEFAULT_API_DAILY_LIMIT : Nat = 1000;
    private let DEFAULT_API_RATE_LIMIT : Nat = 60; // per minute
    private let DOWNLOAD_URL_EXPIRY : Int = 24 * 60 * 60 * 1000000000; // 24 hours in nanoseconds
    private let API_SUBSCRIPTION_DAYS : Int = 30;

    // Initialize
    public shared(msg) func init() : async () {
        admins := Array.append(admins, [Principal.fromText(INITIAL_ADMIN)]);
        admins := Array.append(admins, [msg.caller]);

        // Initialize with sample datasets
        await initializeSampleDatasets();
    };

    // Helper Functions
    private func isAdmin(principal: Principal) : Bool {
        Array.find<Principal>(admins, func(p) = p == principal) != null
    };

    private func generateId(prefix: Text) : Text {
        let timestamp = Int.toText(Time.now());
        prefix # "_" # timestamp
    };

    private func generateApiKey() : Text {
        let timestamp = Int.toText(Time.now());
        let random = Nat.toText(Nat32.toNat(Nat32.fromIntWrap(Time.now())));
        "sk_live_" # timestamp # "_" # random
    };

    private func generateDownloadUrl(datasetId: Text, purchaseId: Text) : Text {
        let timestamp = Int.toText(Time.now());
        let token = Nat.toText(Nat32.toNat(Nat32.fromIntWrap(Time.now() + 12345)));
        "https://download.rhinospider.io/v1/dataset/" # datasetId # "/" # purchaseId # "?token=" # token # "&expires=" # Int.toText(Time.now() + DOWNLOAD_URL_EXPIRY)
    };

    // Sync with admin canister to get real topics and their data
    public func syncWithAdmin() : async Text {
        let adminActor : AdminActor = actor(adminCanisterId);

        try {
            // Get all topics from admin canister
            let topicsResult = await adminActor.getTopics();

            switch(topicsResult) {
                case (#ok(topics)) {
                    // Convert topics to marketplace datasets
                    for (topic in topics.vals()) {
                        // REAL DATA ONLY - Use topic info directly
                        let sampleRows = [
                            "{\"topic\":\"" # topic.name # "\",\"source\":\"web\",\"scraped_count\":" # Nat.toText(topic.totalUrlsScraped) # "}",
                            "{\"search_query\":\"" # (if (topic.searchQueries.size() > 0) { topic.searchQueries[0] } else { "" }) # "\",\"status\":\"" # topic.status # "\"}",
                            "{\"last_scraped\":\"" # Int.toText(topic.lastScraped) # "\",\"priority\":" # Nat.toText(topic.priority) # "}"
                        ];

                        let dataset : Dataset = {
                            dataset_id = "ds_" # topic.id;
                            name = topic.name;
                            description = topic.description # " - Scraped from " # Nat.toText(topic.totalUrlsScraped) # " sources.";
                            region = switch(topic.geolocationFilter) {
                                case (?geo) { geo };
                                case null { "Global" };
                            };
                            category = determineCategory(topic.name);
                            file_url = "storage://scraped_" # topic.id # ".json";
                            sample_rows = sampleRows;
                            price_bulk = Float.fromInt(topic.totalUrlsScraped) * 0.1; // Price based on data volume
                            price_api = Float.fromInt(topic.totalUrlsScraped) * 0.02; // API price
                            size_gb = Float.fromInt(topic.totalUrlsScraped) * 0.001; // Estimate size
                            row_count = topic.totalUrlsScraped * 10; // Estimate rows
                            last_update = topic.lastScraped;
                            on_chain_hash = "0x" # topic.id;
                            data_source = "Web scraping - " # Nat.toText(topic.searchQueries.size()) # " search queries";
                            update_frequency = "Every " # Nat.toText(topic.scrapingInterval) # " seconds";
                            format = "JSON";
                            tags = Array.append(topic.requiredKeywords, ["scraped", "real-time"]);
                            provider = INITIAL_ADMIN;
                            status = topic.status;
                            preview_available = true;
                            api_endpoint = ?("https://api.rhinospider.io/v1/datasets/" # topic.id);
                        };

                        datasets.put(dataset.dataset_id, dataset);
                    };
                    return "Synced " # Nat.toText(topics.size()) # " topics from admin canister";
                };
                case (#err(error)) {
                    // NO SAMPLE DATA - REAL DATA ONLY
                    return "Failed to sync from admin canister - NO DATA";
                };
            };
        } catch (e) {
            // NO SAMPLE DATA - REAL DATA ONLY
            return "Error during sync - NO DATA AVAILABLE";
        };
    };

    private func determineCategory(name: Text) : Text {
        if (Text.contains(name, #text "AI") or Text.contains(name, #text "agent")) { "AI & Machine Learning" }
        else if (Text.contains(name, #text "DePIN") or Text.contains(name, #text "infrastructure")) { "Blockchain" }
        else if (Text.contains(name, #text "DeFi") or Text.contains(name, #text "protocol")) { "Finance" }
        else if (Text.contains(name, #text "social") or Text.contains(name, #text "media")) { "Social Analytics" }
        else if (Text.contains(name, #text "weather") or Text.contains(name, #text "climate")) { "Weather" }
        else if (Text.contains(name, #text "supply") or Text.contains(name, #text "chain")) { "Logistics" }
        else { "General" }
    };

    // Initialize Sample Datasets (fallback)
    private func initializeSampleDatasets() : async () {
        let sampleDatasets : [Dataset] = [
            {
                dataset_id = "ds_ecom_global_001";
                name = "Global E-commerce Transaction Feed";
                description = "Real-time transaction data from 50+ e-commerce platforms worldwide. Includes product categories, payment methods, customer demographics, and seasonal trends.";
                region = "Global";
                category = "E-commerce";
                file_url = "storage://ecom-global-2024-q4.parquet";
                sample_rows = [
                    "{\"tx_id\":\"TX2024001\",\"timestamp\":\"2024-01-15T10:30:00Z\",\"amount\":299.99,\"currency\":\"USD\",\"product\":\"Electronics\",\"platform\":\"Amazon\",\"country\":\"US\",\"payment\":\"credit_card\",\"customer_age\":34,\"customer_gender\":\"M\"}",
                    "{\"tx_id\":\"TX2024002\",\"timestamp\":\"2024-01-15T10:31:00Z\",\"amount\":89.50,\"currency\":\"EUR\",\"product\":\"Fashion\",\"platform\":\"Zalando\",\"country\":\"DE\",\"payment\":\"paypal\",\"customer_age\":28,\"customer_gender\":\"F\"}",
                    "{\"tx_id\":\"TX2024003\",\"timestamp\":\"2024-01-15T10:32:00Z\",\"amount\":1250.00,\"currency\":\"GBP\",\"product\":\"Luxury\",\"platform\":\"Harrods\",\"country\":\"UK\",\"payment\":\"amex\",\"customer_age\":45,\"customer_gender\":\"F\"}"
                ];
                price_bulk = 2500.0;
                price_api = 500.0;
                size_gb = 125.5;
                row_count = 50000000;
                last_update = Time.now();
                on_chain_hash = "0x7f3a8b5c9d2e4f6a8b9c0d1e2f3a4b5c6d7e8f9a";
                data_source = "Multi-platform API aggregation";
                update_frequency = "Real-time (5-min intervals)";
                format = "JSON, CSV, Parquet";
                tags = ["transactions", "e-commerce", "payments", "global", "real-time"];
                provider = INITIAL_ADMIN;
                status = "active";
                preview_available = true;
                api_endpoint = ?"https://api.rhinospider.io/v1/ecommerce";
            },
            {
                dataset_id = "ds_crypto_defi_002";
                name = "DeFi Protocol Analytics";
                description = "Comprehensive DeFi metrics across Ethereum, BSC, Polygon. TVL, yield rates, liquidations, governance votes, and whale movements.";
                region = "Global";
                category = "Blockchain";
                file_url = "storage://defi-analytics-2024.parquet";
                sample_rows = [
                    "{\"protocol\":\"Uniswap\",\"chain\":\"Ethereum\",\"tvl\":5890000000,\"24h_volume\":1250000000,\"apr\":12.5,\"unique_users\":450000,\"timestamp\":\"2024-01-15T12:00:00Z\"}",
                    "{\"protocol\":\"Aave\",\"chain\":\"Polygon\",\"tvl\":3200000000,\"24h_volume\":890000000,\"apr\":8.3,\"unique_users\":125000,\"timestamp\":\"2024-01-15T12:00:00Z\"}",
                    "{\"protocol\":\"PancakeSwap\",\"chain\":\"BSC\",\"tvl\":2100000000,\"24h_volume\":560000000,\"apr\":15.7,\"unique_users\":890000,\"timestamp\":\"2024-01-15T12:00:00Z\"}"
                ];
                price_bulk = 5000.0;
                price_api = 1000.0;
                size_gb = 85.3;
                row_count = 25000000;
                last_update = Time.now();
                on_chain_hash = "0x8a4b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b";
                data_source = "On-chain data indexing";
                update_frequency = "Every block (~12 seconds)";
                format = "JSON, CSV";
                tags = ["defi", "blockchain", "tvl", "yield", "liquidity"];
                provider = INITIAL_ADMIN;
                status = "active";
                preview_available = true;
                api_endpoint = ?"https://api.rhinospider.io/v1/defi";
            },
            {
                dataset_id = "ds_social_sentiment_003";
                name = "Social Media Sentiment Analysis";
                description = "Real-time sentiment analysis from Twitter, Reddit, Discord. Tracks brands, crypto projects, stocks with NLP-processed insights.";
                region = "Global";
                category = "Social Analytics";
                file_url = "storage://social-sentiment-2024.json";
                sample_rows = [
                    "{\"platform\":\"Twitter\",\"keyword\":\"Bitcoin\",\"sentiment_score\":0.72,\"volume\":125000,\"positive\":89000,\"negative\":12000,\"neutral\":24000,\"timestamp\":\"2024-01-15T14:00:00Z\"}",
                    "{\"platform\":\"Reddit\",\"keyword\":\"Tesla\",\"sentiment_score\":0.65,\"volume\":45000,\"positive\":28000,\"negative\":8000,\"neutral\":9000,\"timestamp\":\"2024-01-15T14:00:00Z\"}",
                    "{\"platform\":\"Discord\",\"keyword\":\"NFT\",\"sentiment_score\":0.45,\"volume\":35000,\"positive\":15000,\"negative\":12000,\"neutral\":8000,\"timestamp\":\"2024-01-15T14:00:00Z\"}"
                ];
                price_bulk = 1500.0;
                price_api = 300.0;
                size_gb = 45.8;
                row_count = 100000000;
                last_update = Time.now();
                on_chain_hash = "0x9b5c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c";
                data_source = "Social media APIs + web scraping";
                update_frequency = "Real-time streaming";
                format = "JSON, CSV";
                tags = ["sentiment", "social", "nlp", "twitter", "reddit"];
                provider = INITIAL_ADMIN;
                status = "active";
                preview_available = true;
                api_endpoint = ?"https://api.rhinospider.io/v1/sentiment";
            },
            {
                dataset_id = "ds_supply_chain_004";
                name = "Global Supply Chain Intelligence";
                description = "Shipping routes, port congestion, freight rates, customs data. Covers 200+ ports and 10000+ shipping routes.";
                region = "Global";
                category = "Logistics";
                file_url = "storage://supply-chain-global.parquet";
                sample_rows = [
                    "{\"route\":\"Shanghai-Los Angeles\",\"vessel_count\":45,\"avg_transit_days\":18,\"freight_rate_teu\":3500,\"congestion_index\":7.2,\"timestamp\":\"2024-01-15T00:00:00Z\"}",
                    "{\"route\":\"Rotterdam-New York\",\"vessel_count\":32,\"avg_transit_days\":12,\"freight_rate_teu\":2800,\"congestion_index\":4.5,\"timestamp\":\"2024-01-15T00:00:00Z\"}",
                    "{\"route\":\"Singapore-Dubai\",\"vessel_count\":28,\"avg_transit_days\":7,\"freight_rate_teu\":1200,\"congestion_index\":3.1,\"timestamp\":\"2024-01-15T00:00:00Z\"}"
                ];
                price_bulk = 3500.0;
                price_api = 750.0;
                size_gb = 68.2;
                row_count = 15000000;
                last_update = Time.now();
                on_chain_hash = "0xac6d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d";
                data_source = "Port authorities + Shipping APIs";
                update_frequency = "Hourly updates";
                format = "JSON, CSV, Parquet";
                tags = ["logistics", "shipping", "supply-chain", "freight", "ports"];
                provider = INITIAL_ADMIN;
                status = "active";
                preview_available = true;
                api_endpoint = ?"https://api.rhinospider.io/v1/logistics";
            },
            {
                dataset_id = "ds_weather_climate_005";
                name = "Weather & Climate Patterns";
                description = "Historical and predictive weather data. Temperature, precipitation, extreme events, agricultural impact zones.";
                region = "North America";
                category = "Weather";
                file_url = "storage://weather-na-2024.nc";
                sample_rows = [
                    "{\"location\":\"New York\",\"date\":\"2024-01-15\",\"temp_high\":5,\"temp_low\":-2,\"precipitation\":12,\"humidity\":65,\"wind_speed\":15,\"conditions\":\"cloudy\"}",
                    "{\"location\":\"Los Angeles\",\"date\":\"2024-01-15\",\"temp_high\":22,\"temp_low\":14,\"precipitation\":0,\"humidity\":45,\"wind_speed\":8,\"conditions\":\"sunny\"}",
                    "{\"location\":\"Chicago\",\"date\":\"2024-01-15\",\"temp_high\":-5,\"temp_low\":-12,\"precipitation\":25,\"humidity\":78,\"wind_speed\":25,\"conditions\":\"snow\"}"
                ];
                price_bulk = 800.0;
                price_api = 150.0;
                size_gb = 125.0;
                row_count = 500000000;
                last_update = Time.now();
                on_chain_hash = "0xbd7e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e";
                data_source = "NOAA + Weather stations network";
                update_frequency = "Every 6 hours";
                format = "NetCDF, JSON, CSV";
                tags = ["weather", "climate", "temperature", "forecast", "agriculture"];
                provider = INITIAL_ADMIN;
                status = "active";
                preview_available = true;
                api_endpoint = ?"https://api.rhinospider.io/v1/weather";
            }
        ];

        for (dataset in sampleDatasets.vals()) {
            datasets.put(dataset.dataset_id, dataset);

            // Initialize stats
            let stats : DatasetStats = {
                dataset_id = dataset.dataset_id;
                total_purchases = 0;
                total_revenue = 0.0;
                unique_buyers = 0;
                api_subscriptions = 0;
                bulk_downloads = 0;
                avg_rating = 4.5;
                total_api_calls = 0;
            };
            datasetStats.put(dataset.dataset_id, stats);
        };
    };

    // Dataset Management
    public shared(msg) func createDataset(dataset: Dataset) : async Result.Result<Text, Text> {
        if (not isAdmin(msg.caller)) {
            return #err("Unauthorized: Only admins can create datasets");
        };

        datasets.put(dataset.dataset_id, dataset);

        // Initialize stats for new dataset
        let stats : DatasetStats = {
            dataset_id = dataset.dataset_id;
            total_purchases = 0;
            total_revenue = 0.0;
            unique_buyers = 0;
            api_subscriptions = 0;
            bulk_downloads = 0;
            avg_rating = 0.0;
            total_api_calls = 0;
        };
        datasetStats.put(dataset.dataset_id, stats);

        #ok(dataset.dataset_id)
    };

    public query func getAllDatasets() : async [Dataset] {
        Array.filter(Iter.toArray(datasets.vals()), func(d: Dataset) : Bool {
            d.status == "active"
        })
    };

    public query func getDataset(id: Text) : async Result.Result<Dataset, Text> {
        switch (datasets.get(id)) {
            case (null) { #err("Dataset not found") };
            case (?dataset) {
                if (dataset.status == "active") {
                    #ok(dataset)
                } else {
                    #err("Dataset is archived")
                }
            };
        }
    };

    // Public function to sync datasets from admin canister
    public func syncDatasets() : async Result.Result<Text, Text> {
        let result = await syncWithAdmin();
        #ok(result # " - Total datasets: " # Nat.toText(datasets.size()));
    };

    public query func searchDatasets(
        keyword: ?Text,
        category: ?Text,
        region: ?Text,
        minPrice: ?Float,
        maxPrice: ?Float
    ) : async [Dataset] {
        let allDatasets = Iter.toArray(datasets.vals());

        Array.filter(allDatasets, func(d: Dataset) : Bool {
            var matches = d.status == "active";

            switch (keyword) {
                case (null) {};
                case (?kw) {
                    let lowerKw = Text.toLowercase(kw);
                    matches := matches and (
                        Text.contains(Text.toLowercase(d.name), #text lowerKw) or
                        Text.contains(Text.toLowercase(d.description), #text lowerKw) or
                        Array.find<Text>(d.tags, func(tag) = Text.contains(Text.toLowercase(tag), #text lowerKw)) != null
                    );
                };
            };

            switch (category) {
                case (null) {};
                case (?cat) { matches := matches and d.category == cat };
            };

            switch (region) {
                case (null) {};
                case (?reg) { matches := matches and d.region == reg };
            };

            switch (minPrice) {
                case (null) {};
                case (?min) { matches := matches and d.price_api >= min };
            };

            switch (maxPrice) {
                case (null) {};
                case (?max) { matches := matches and d.price_api <= max };
            };

            matches
        })
    };

    // Purchase Management
    public shared(msg) func purchaseDataset(
        dataset_id: Text,
        purchase_type: Text, // "BULK" or "API"
        payment_tx_id: Text,
        amount: Float,
        currency: Text
    ) : async Result.Result<Purchase, Text> {
        // Validate dataset
        let dataset = switch (datasets.get(dataset_id)) {
            case (null) { return #err("Dataset not found") };
            case (?d) {
                if (d.status != "active") {
                    return #err("Dataset is not available for purchase");
                };
                d
            };
        };

        // Validate price
        let expected_price = if (purchase_type == "BULK") {
            dataset.price_bulk
        } else if (purchase_type == "API") {
            dataset.price_api
        } else {
            return #err("Invalid purchase type");
        };

        if (amount < expected_price) {
            return #err("Insufficient payment amount");
        };

        // Generate purchase record
        let purchase_id = generateId("PUR");
        let expires_at = if (purchase_type == "API") {
            ?(Time.now() + (API_SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000000000))
        } else {
            null
        };

        let download_url = if (purchase_type == "BULK") {
            ?generateDownloadUrl(dataset_id, purchase_id)
        } else {
            null
        };

        let purchase : Purchase = {
            purchase_id = purchase_id;
            user_principal = msg.caller;
            dataset_id = dataset_id;
            purchase_type = purchase_type;
            amount = amount;
            currency = currency;
            payment_tx_id = payment_tx_id;
            created_at = Time.now();
            expires_at = expires_at;
            download_url = download_url;
            download_count = 0;
            status = "active";
        };

        purchases.put(purchase_id, purchase);

        // Update user profile
        updateUserProfile(msg.caller, amount, purchase_type);

        // Update dataset stats
        updateDatasetStats(dataset_id, purchase_type, amount);

        // Generate API key if API subscription
        if (purchase_type == "API") {
            let api_key = await generateApiKeyForUser(msg.caller, dataset_id, expires_at);
            // API key is generated and stored
        };

        #ok(purchase)
    };

    // API Key Management
    private func generateApiKeyForUser(
        user: Principal,
        dataset_id: Text,
        expires_at: ?Int
    ) : async Text {
        let key_id = generateId("KEY");
        let api_key_value = generateApiKey();

        let api_key : ApiKey = {
            key_id = key_id;
            api_key = api_key_value;
            user_principal = user;
            dataset_id = dataset_id;
            created_at = Time.now();
            last_used = null;
            expires_at = expires_at;
            request_count = 0;
            daily_limit = DEFAULT_API_DAILY_LIMIT;
            rate_limit_per_minute = DEFAULT_API_RATE_LIMIT;
            is_active = true;
            allowed_ips = [];
            usage_today = 0;
            last_reset = Time.now();
        };

        apiKeys.put(key_id, api_key);
        api_key_value
    };

    public shared(msg) func getUserApiKeys() : async [ApiKey] {
        let userKeys = Buffer.Buffer<ApiKey>(0);
        for ((id, key) in apiKeys.entries()) {
            if (key.user_principal == msg.caller and key.is_active) {
                userKeys.add(key);
            };
        };
        Buffer.toArray(userKeys)
    };

    public shared(msg) func regenerateApiKey(key_id: Text) : async Result.Result<Text, Text> {
        switch (apiKeys.get(key_id)) {
            case (null) { #err("API key not found") };
            case (?key) {
                if (key.user_principal != msg.caller) {
                    return #err("Unauthorized");
                };

                let new_api_key = generateApiKey();
                let updated_key : ApiKey = {
                    key_id = key.key_id;
                    api_key = new_api_key;
                    user_principal = key.user_principal;
                    dataset_id = key.dataset_id;
                    created_at = Time.now();
                    last_used = null;
                    expires_at = key.expires_at;
                    request_count = 0;
                    daily_limit = key.daily_limit;
                    rate_limit_per_minute = key.rate_limit_per_minute;
                    is_active = true;
                    allowed_ips = key.allowed_ips;
                    usage_today = 0;
                    last_reset = Time.now();
                };

                apiKeys.put(key_id, updated_key);
                #ok(new_api_key)
            };
        }
    };

    // API Data Access
    public shared(msg) func getDatasetData(
        dataset_id: Text,
        api_key: Text,
        offset: Nat,
        limit: Nat
    ) : async Result.Result<[Text], Text> {
        // Find and validate API key
        var validKey : ?ApiKey = null;
        for ((id, key) in apiKeys.entries()) {
            if (key.api_key == api_key) {
                validKey := ?key;
            };
        };

        switch (validKey) {
            case (null) { #err("Invalid API key") };
            case (?key) {
                // Check if key is active and not expired
                if (not key.is_active) {
                    return #err("API key is inactive");
                };

                switch (key.expires_at) {
                    case (?exp) {
                        if (Time.now() > exp) {
                            return #err("API key has expired");
                        };
                    };
                    case (null) {};
                };

                // Check rate limits
                if (key.usage_today >= key.daily_limit) {
                    return #err("Daily rate limit exceeded");
                };

                // Get dataset
                switch (datasets.get(dataset_id)) {
                    case (null) { #err("Dataset not found") };
                    case (?dataset) {
                        // Update usage metrics
                        updateApiUsage(key.key_id);

                        // Return sample data (in production, this would fetch from storage)
                        let endIndex = Nat.min(offset + limit, dataset.sample_rows.size());
                        let startIndex = Nat.min(offset, endIndex);

                        #ok(Array.subArray<Text>(dataset.sample_rows, startIndex, endIndex - startIndex))
                    };
                }
            };
        }
    };

    // User Management
    public shared(msg) func registerUser(
        email: ?Text,
        company: ?Text,
        company_size: ?Text,
        industry: ?Text,
        use_case: ?Text
    ) : async Result.Result<User, Text> {
        switch (users.get(msg.caller)) {
            case (?user) { #err("User already registered") };
            case (null) {
                let user : User = {
                    principal = msg.caller;
                    email = email;
                    company = company;
                    company_size = company_size;
                    industry = industry;
                    use_case = use_case;
                    registered_at = Time.now();
                    last_login = Time.now();
                    total_spent = 0.0;
                    purchase_count = 0;
                    api_calls_total = 0;
                    preferred_payment = "ICP";
                    kyc_verified = false;
                    account_tier = "starter";
                };

                users.put(msg.caller, user);
                #ok(user)
            };
        }
    };

    public shared(msg) func getUserProfile() : async Result.Result<User, Text> {
        switch (users.get(msg.caller)) {
            case (null) { #err("User not found. Please register first.") };
            case (?user) { #ok(user) };
        }
    };

    public shared(msg) func getUserPurchases() : async [Purchase] {
        let userPurchases = Buffer.Buffer<Purchase>(0);
        for ((id, purchase) in purchases.entries()) {
            if (purchase.user_principal == msg.caller) {
                userPurchases.add(purchase);
            };
        };
        Buffer.toArray(userPurchases)
    };

    // Usage Metrics
    public shared(msg) func getUserUsageMetrics(dataset_id: Text) : async Result.Result<UsageMetrics, Text> {
        let key = Principal.toText(msg.caller) # "_" # dataset_id;
        switch (usageMetrics.get(key)) {
            case (null) { #err("No usage metrics found") };
            case (?metrics) { #ok(metrics) };
        }
    };

    // Stats and Analytics
    public query func getDatasetStats(dataset_id: Text) : async Result.Result<DatasetStats, Text> {
        switch (datasetStats.get(dataset_id)) {
            case (null) { #err("Stats not found") };
            case (?stats) { #ok(stats) };
        }
    };

    public query func getTopDatasets(limit: Nat) : async [Dataset] {
        let datasetsArray = Iter.toArray(datasets.vals());
        let statsArray = Iter.toArray(datasetStats.vals());

        // Sort by total purchases
        let sorted = Array.sort<Dataset>(datasetsArray, func(a: Dataset, b: Dataset) : {#less; #equal; #greater} {
            let aStats = Array.find<DatasetStats>(statsArray, func(s) = s.dataset_id == a.dataset_id);
            let bStats = Array.find<DatasetStats>(statsArray, func(s) = s.dataset_id == b.dataset_id);

            switch (aStats, bStats) {
                case (?as, ?bs) {
                    if (as.total_purchases > bs.total_purchases) { #greater }
                    else if (as.total_purchases < bs.total_purchases) { #less }
                    else { #equal }
                };
                case _ { #equal };
            }
        });

        Array.subArray<Dataset>(sorted, 0, Nat.min(limit, sorted.size()))
    };

    // Helper functions to update state
    private func updateUserProfile(principal: Principal, amount: Float, purchase_type: Text) {
        switch (users.get(principal)) {
            case (null) {
                // Auto-create user
                let user : User = {
                    principal = principal;
                    email = null;
                    company = null;
                    company_size = null;
                    industry = null;
                    use_case = null;
                    registered_at = Time.now();
                    last_login = Time.now();
                    total_spent = amount;
                    purchase_count = 1;
                    api_calls_total = 0;
                    preferred_payment = "ICP";
                    kyc_verified = false;
                    account_tier = "starter";
                };
                users.put(principal, user);
            };
            case (?user) {
                let updated : User = {
                    principal = user.principal;
                    email = user.email;
                    company = user.company;
                    company_size = user.company_size;
                    industry = user.industry;
                    use_case = user.use_case;
                    registered_at = user.registered_at;
                    last_login = Time.now();
                    total_spent = user.total_spent + amount;
                    purchase_count = user.purchase_count + 1;
                    api_calls_total = user.api_calls_total;
                    preferred_payment = user.preferred_payment;
                    kyc_verified = user.kyc_verified;
                    account_tier = if (user.total_spent + amount > 10000.0) { "enterprise" } else { user.account_tier };
                };
                users.put(principal, updated);
            };
        };
    };

    private func updateDatasetStats(dataset_id: Text, purchase_type: Text, amount: Float) {
        switch (datasetStats.get(dataset_id)) {
            case (?stats) {
                let updated : DatasetStats = {
                    dataset_id = stats.dataset_id;
                    total_purchases = stats.total_purchases + 1;
                    total_revenue = stats.total_revenue + amount;
                    unique_buyers = stats.unique_buyers + 1; // Simplified
                    api_subscriptions = if (purchase_type == "API") { stats.api_subscriptions + 1 } else { stats.api_subscriptions };
                    bulk_downloads = if (purchase_type == "BULK") { stats.bulk_downloads + 1 } else { stats.bulk_downloads };
                    avg_rating = stats.avg_rating;
                    total_api_calls = stats.total_api_calls;
                };
                datasetStats.put(dataset_id, updated);
            };
            case (null) {};
        };
    };

    private func updateApiUsage(key_id: Text) {
        switch (apiKeys.get(key_id)) {
            case (?key) {
                let updated : ApiKey = {
                    key_id = key.key_id;
                    api_key = key.api_key;
                    user_principal = key.user_principal;
                    dataset_id = key.dataset_id;
                    created_at = key.created_at;
                    last_used = ?Time.now();
                    expires_at = key.expires_at;
                    request_count = key.request_count + 1;
                    daily_limit = key.daily_limit;
                    rate_limit_per_minute = key.rate_limit_per_minute;
                    is_active = key.is_active;
                    allowed_ips = key.allowed_ips;
                    usage_today = key.usage_today + 1;
                    last_reset = key.last_reset;
                };
                apiKeys.put(key_id, updated);
            };
            case (null) {};
        };
    };

    // Admin Functions
    public shared(msg) func addAdmin(principal: Principal) : async Result.Result<(), Text> {
        if (not isAdmin(msg.caller)) {
            return #err("Unauthorized");
        };
        admins := Array.append(admins, [principal]);
        #ok()
    };

    public query func getAdmins() : async [Principal] {
        admins
    };

    // System Functions
    system func preupgrade() {
        stableDatasets := Iter.toArray(datasets.entries());
        stablePurchases := Iter.toArray(purchases.entries());
        stableApiKeys := Iter.toArray(apiKeys.entries());
        stableUsers := Iter.toArray(users.entries());
        stableUsageMetrics := Iter.toArray(usageMetrics.entries());
        stableDatasetStats := Iter.toArray(datasetStats.entries());
    };

    system func postupgrade() {
        datasets := HashMap.fromIter<Text, Dataset>(stableDatasets.vals(), stableDatasets.size(), Text.equal, Text.hash);
        purchases := HashMap.fromIter<Text, Purchase>(stablePurchases.vals(), stablePurchases.size(), Text.equal, Text.hash);
        apiKeys := HashMap.fromIter<Text, ApiKey>(stableApiKeys.vals(), stableApiKeys.size(), Text.equal, Text.hash);
        users := HashMap.fromIter<Principal, User>(stableUsers.vals(), stableUsers.size(), Principal.equal, Principal.hash);
        usageMetrics := HashMap.fromIter<Text, UsageMetrics>(stableUsageMetrics.vals(), stableUsageMetrics.size(), Text.equal, Text.hash);
        datasetStats := HashMap.fromIter<Text, DatasetStats>(stableDatasetStats.vals(), stableDatasetStats.size(), Text.equal, Text.hash);

        stableDatasets := [];
        stablePurchases := [];
        stableApiKeys := [];
        stableUsers := [];
        stableUsageMetrics := [];
        stableDatasetStats := [];
    };
}