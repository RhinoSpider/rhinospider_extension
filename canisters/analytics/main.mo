import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";
import Array "mo:base/Array";
import Time "mo:base/Time";
import Buffer "mo:base/Buffer";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Int "mo:base/Int";

actor AnalyticsCanister {
    // Types
    type MetricType = {
        #Scraping;
        #UserEngagement;
        #SystemPerformance;
    };

    type Metric = {
        id: Text;
        type_: MetricType;
        value: Int;
        timestamp: Time.Time;
        metadata: ?Text;
    };

    type TimeRange = {
        start: Time.Time;
        end: Time.Time;
    };

    type AggregatedMetric = {
        type_: MetricType;
        total: Int;
        average: Float;
        count: Nat;
        timeRange: TimeRange;
    };

    // State
    private var metrics = HashMap.HashMap<Text, Metric>(10, Text.equal, Text.hash);
    private var dailyStats = HashMap.HashMap<Text, AggregatedMetric>(10, Text.equal, Text.hash);

    // Add a new metric
    public shared({ caller }) func addMetric(metric: Metric) : async () {
        metrics.put(metric.id, metric);
        await aggregateMetrics();
    };

    // Get metrics by type and time range
    public query func getMetrics(type_: MetricType, timeRange: TimeRange) : async [Metric] {
        let buffer = Buffer.Buffer<Metric>(0);
        for ((_, metric) in metrics.entries()) {
            if (metric.type_ == type_ and
                metric.timestamp >= timeRange.start and
                metric.timestamp <= timeRange.end) {
                buffer.add(metric);
            };
        };
        Buffer.toArray(buffer);
    };

    // Get aggregated metrics
    public query func getAggregatedMetrics(type_: MetricType, timeRange: TimeRange) : async ?AggregatedMetric {
        let key = getAggregationKey(type_, timeRange);
        dailyStats.get(key);
    };

    // Aggregate metrics (called internally)
    private func aggregateMetrics() : async () {
        let now = Time.now();
        let dayStart = now - (now % (24 * 3600 * 1_000_000_000));
        let timeRange = { start = dayStart; end = now };

        // Aggregate for each metric type
        for (type_ in [#Scraping, #UserEngagement, #SystemPerformance].vals()) {
            var total : Int = 0;
            var count : Nat = 0;

            for ((_, metric) in metrics.entries()) {
                if (metric.type_ == type_ and
                    metric.timestamp >= timeRange.start and
                    metric.timestamp <= timeRange.end) {
                    total += metric.value;
                    count += 1;
                };
            };

            if (count > 0) {
                let average : Float = Float.fromInt(total) / Float.fromInt(count);
                let aggregated : AggregatedMetric = {
                    type_ = type_;
                    total = total;
                    average = average;
                    count = count;
                    timeRange = timeRange;
                };
                let key = getAggregationKey(type_, timeRange);
                dailyStats.put(key, aggregated);
            };
        };
    };

    // Helper function to generate aggregation key
    private func getAggregationKey(type_: MetricType, timeRange: TimeRange) : Text {
        let typeStr = switch (type_) {
            case (#Scraping) "scraping";
            case (#UserEngagement) "engagement";
            case (#SystemPerformance) "performance";
        };
        typeStr # Int.toText(timeRange.start);
    };

    // System metrics
    public func recordScrapingMetric(contentId: Text, processingTime: Int) : async () {
        let metric : Metric = {
            id = contentId;
            type_ = #Scraping;
            value = processingTime;
            timestamp = Time.now();
            metadata = null;
        };
        await addMetric(metric);
    };

    public func recordUserEngagement(userId: Text, actionType: Text, value: Int) : async () {
        let metric : Metric = {
            id = userId # "_" # actionType;
            type_ = #UserEngagement;
            value = value;
            timestamp = Time.now();
            metadata = ?actionType;
        };
        await addMetric(metric);
    };

    public func recordSystemMetric(metricName: Text, value: Int) : async () {
        let metric : Metric = {
            id = metricName # "_" # Int.toText(Time.now());
            type_ = #SystemPerformance;
            value = value;
            timestamp = Time.now();
            metadata = ?metricName;
        };
        await addMetric(metric);
    };
};
