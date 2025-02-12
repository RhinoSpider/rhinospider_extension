# RhinoSpider Points System

## Overview

The RhinoSpider points system rewards users for contributing their bandwidth and computing resources to the network. Points are calculated based on various metrics and can be used for rewards or privileges within the system.

## Points Calculation

### Base Points

1. **Bandwidth Contribution**
   - 1 point per 10MB of data processed
   - Bonus points for consistent availability
   - Formula: `points = (bytesProcessed / (10 * 1024 * 1024)) * availabilityMultiplier`

2. **Request Processing**
   - 5 points per successful request
   - -1 point per failed request
   - Formula: `points = (successCount * 5) - failureCount`

3. **Quality Multiplier**
   - Success rate affects point earning
   - Formula: `multiplier = successCount / (successCount + failureCount)`

### Bonus Points

1. **Consistency Bonus**
   - +10% points for daily activity
   - +25% points for weekly streaks
   - +50% points for monthly streaks

2. **Peak Hours Contribution**
   - +20% points during high-demand periods
   - +15% points for processing priority requests

3. **Resource Optimization**
   - +5% points for efficient bandwidth usage
   - +10% points for processing multiple topics

## Daily Points Cap

To ensure fair distribution and prevent abuse:
- Maximum 1000 points per day
- Minimum 10 points per successful request
- Points reset at UTC midnight

## Point Usage

1. **Privileges**
   - Access to premium features
   - Priority in request processing
   - Access to advanced analytics

2. **Rewards**
   - Monthly leaderboard recognition
   - Special badges and achievements
   - Future: Token conversion

## Implementation Details

### Storage

Points data is stored in two places:
1. Local IndexedDB for real-time tracking
2. IC canister for permanent storage

### Calculation Flow

1. **Real-time Tracking**
   ```typescript
   interface PointsCalculation {
     basePoints: number;
     bandwidthPoints: number;
     requestPoints: number;
     bonusPoints: number;
     multiplier: number;
     total: number;
   }
   ```

2. **Daily Aggregation**
   ```typescript
   interface DailyPoints {
     date: string;
     points: PointsCalculation;
     streak: number;
     achievements: string[];
   }
   ```

### Sync Process

1. Points are calculated locally in real-time
2. Synced to IC canister every hour
3. Daily totals are finalized at UTC midnight
4. Weekly and monthly bonuses are calculated at period end

## Future Improvements

1. **Dynamic Scoring**
   - Adjust point values based on network demand
   - Implement machine learning for fraud detection
   - Add topic-specific point multipliers

2. **Rewards Program**
   - Implement token economics
   - Add marketplace for point redemption
   - Create partnership program

3. **Gamification**
   - Add achievement system
   - Implement competitive challenges
   - Create team-based competitions
