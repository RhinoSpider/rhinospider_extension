# Business Logic Documentation

## Bandwidth Reward System

### Current Implementation

#### Point Calculation
1. Base Rate: 1 point per MB of bandwidth used
2. Bonuses:
   - Session Length: +10% points for sessions > 1 hour
   - Peak Hours: +20% points during high-demand times
   - Data Quality: +5% for successful scrapes

#### Reward Tiers
```javascript
const REWARD_TIERS = {
  BRONZE: {
    threshold: 1000,
    multiplier: 1.0
  },
  SILVER: {
    threshold: 5000,
    multiplier: 1.2
  },
  GOLD: {
    threshold: 10000,
    multiplier: 1.5
  }
};
```

### Bandwidth Analytics

#### Current Session Metrics
- Download/Upload speeds
- Total data transferred
- Session duration
- Success rate of scrapes
- Points earned

#### Historical Metrics
- Daily/Weekly/Monthly usage
- Peak usage times
- Average session length
- Total points earned
- Tier progression

#### Performance Metrics
- Network latency
- Error rates
- Bandwidth efficiency
- Cache hit rates

### Future Considerations

1. Dynamic Reward Rates
   - Adjust based on network demand
   - Special event multipliers
   - Geographic bonuses

2. Additional Reward Factors
   - Data uniqueness
   - Network reliability
   - User reputation
   - Task complexity

3. Monetization Options
   - Convert points to cryptocurrency
   - Gift card redemption
   - Service credits
   - Premium features unlock

4. User Tiers
   - Requirements for advancement
   - Tier-specific benefits
   - Loyalty rewards

### Implementation Notes

1. Store metrics in IndexedDB:
```javascript
interface BandwidthMetrics {
  timestamp: number;
  bytesUp: number;
  bytesDown: number;
  points: number;
  successRate: number;
}
```

2. Sync with backend every:
   - 5 minutes for active sessions
   - End of session
   - Manual sync option

3. Cache invalidation:
   - 24 hours for point calculations
   - 7 days for historical data
   - Immediate for tier changes

4. Backup/Recovery:
   - Local storage backup
   - Conflict resolution
   - Data integrity checks
