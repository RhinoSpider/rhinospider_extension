# Geo-Distribution & Node Routing Feature

## Overview

The geo-distribution feature enables administrators to control which nodes in the RhinoSpider network process specific scraping topics based on geographic location, node availability, and selection strategies. This creates a "router layer" that intelligently distributes tasks across the decentralized network.

## How It Works

### Architecture Flow

1. **Admin defines task** → Creates/edits topic with geo-distribution settings in admin panel
2. **Task uploaded** → Stored on-chain in admin canister (`wvset-niaaa-aaaao-a4osa-cai`)
3. **Nodes request tasks** → Extensions send their characteristics (IP, location, availability)
4. **IC proxy filters** → Routes topics based on geo-settings and node characteristics
5. **Nodes receive tasks** → Only get topics matching their location and selection criteria
6. **Data collection** → Nodes scrape data and submit to storage canister
7. **On-chain storage** → Results stored in storage canister (`hhaip-uiaaa-aaaao-a4khq-cai`)

### Key Components

- **Admin Panel UI** (`sxsvc-aqaaa-aaaaj-az4ta-cai`): Interface for configuring geo-distribution
- **Admin Backend** (`wvset-niaaa-aaaao-a4osa-cai`): Stores topic configurations on-chain
- **IC Proxy** (`ic-proxy.rhinospider.com`): Filters and routes topics to appropriate nodes
- **Extension/Nodes**: Send location data and receive filtered topics
- **Consumer Canister** (`t3pjp-kqaaa-aaaao-a4ooq-cai`): Manages node registration and metrics

## Configuration Options

### 1. Geolocation Filter

Specify which countries or regions can process a topic.

**Format**: Comma-separated ISO country codes or region names
- Country codes: `US,UK,DE,FR,JP`
- Regions: `North America`, `Europe`, `Asia`
- Mixed: `US,Canada,Europe`

**Examples**:
- `KZ,RU,UZ,KG,TJ` - Central Asia/Eurasia
- `AE,SA,QA,KW,BH,OM` - Gulf countries
- `CA,US` - North America
- Empty/null - Global (all nodes)

### 2. Percentage of Nodes

Control what percentage of matching nodes should process the topic.

**Range**: 1-100%
- `100%` - All matching nodes process the topic
- `50%` - Half of matching nodes (selected based on randomization mode)
- `10%` - Only 10% of available nodes

**Use Cases**:
- Reduce redundancy by limiting node participation
- Test features with subset of network
- Manage resource consumption

### 3. Randomization Mode

Determines how nodes are selected when percentage < 100%.

**Options**:
- `none` - All matching nodes participate (default)
- `random` - Randomly select nodes each time
- `round_robin` - Rotate between nodes systematically
- `weighted` - Select based on node performance metrics

## UI Location

In the Admin Panel (https://sxsvc-aqaaa-aaaaj-az4ta-cai.icp0.io/):

1. Navigate to **Topics** section
2. Click **Create New Topic** or edit existing topic
3. Find **"Geo-distribution & Node Routing"** section
4. Configure the three settings:
   - Geolocation Filter
   - Percentage of Nodes
   - Randomization Mode
5. View the **configuration summary** to verify settings

## Current Topic Assignments

### Production Topics

| Topic | Region | Countries | Percentage | Mode |
|-------|--------|-----------|------------|------|
| AI Agents Development | Eurasia | KZ,RU,UZ,KG,TJ | 80% | none |
| Web3 Security Exploits | Gulf | AE,SA,QA,KW,BH,OM | 100% | round_robin |
| DePIN Infrastructure News | North America | CA,US | 50% | random |
| Geo-Distributed Test Topic | US/UK | US,UK | 50% | random |

## Technical Implementation

### Data Types (Motoko)

```motoko
type ScrapingTopic = {
    // ... existing fields ...
    
    // Geo-distribution & Node Routing
    geolocationFilter: ?Text;    // Countries/regions
    percentageNodes: ?Nat;        // 1-100
    randomizationMode: ?Text;     // none|random|round_robin|weighted
};

type NodeCharacteristics = {
    ipAddress: Text;
    region: Text;
    percentageNodes: ?Nat;
    randomizationMode: ?Text;
};
```

### API Endpoints

#### POST /api/topics
Accepts node characteristics and returns filtered topics.

**Request**:
```json
{
  "nodeCharacteristics": {
    "ipAddress": "185.18.253.132",
    "region": "KZ",
    "percentageNodes": 100,
    "randomizationMode": "none"
  }
}
```

**Response**:
```json
{
  "success": true,
  "topics": [...],  // Only topics matching node's location
  "count": 1
}
```

### Extension Integration

The extension automatically:
1. Detects its IP address using `api.ipify.org`
2. Sends characteristics when fetching topics
3. Only receives topics matching its location
4. Processes assigned topics based on selection mode

## Benefits

1. **Optimized Network Usage**: Reduce redundant processing by geographic distribution
2. **Compliance**: Ensure data collection follows regional regulations
3. **Performance**: Route tasks to nodes with best connectivity to target sites
4. **Testing**: Deploy features to specific regions before global rollout
5. **Load Balancing**: Distribute work evenly across the network
6. **Cost Efficiency**: Minimize cross-region data transfer costs

## Future Enhancements

- [ ] Automatic geo-IP detection for accurate region mapping
- [ ] Performance-based weighted selection
- [ ] Dynamic rebalancing based on node availability
- [ ] Regional performance analytics dashboard
- [ ] Fallback regions for high availability
- [ ] Time-zone based scheduling
- [ ] Bandwidth and latency optimization

## Troubleshooting

### Node not receiving expected topics
1. Check node's IP address and detected region
2. Verify topic's geolocation filter includes the region
3. Confirm percentage and randomization settings
4. Check IC proxy logs for filtering decisions

### All nodes receiving same topics
1. Ensure geolocationFilter is set (not null)
2. Verify IC proxy is using POST /api/topics endpoint
3. Check extension is sending nodeCharacteristics
4. Confirm admin backend deployment has geo fields

### Testing geo-distribution locally
1. Use VPN to simulate different locations
2. Override IP detection in extension for testing
3. Create test topics with specific regions
4. Monitor IC proxy logs for routing decisions

## Security Considerations

- Node locations are self-reported (can be spoofed)
- Use additional verification for sensitive topics
- Consider combining with node reputation system
- Implement rate limiting per region
- Monitor for geographic anomalies

## Related Documentation

- [Admin Panel Guide](./README.md)
- [Extension Architecture](../extension/README.md)
- [IC Proxy Documentation](../../services/ic-proxy/README.md)
- [Consumer Canister API](../../canisters/consumer/README.md)