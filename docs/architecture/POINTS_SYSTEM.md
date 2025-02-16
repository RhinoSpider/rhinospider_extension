# Points System Architecture

## Overview

The points system rewards users for contributing their bandwidth and processing power to RhinoSpider's background scraping operations. Points are calculated based on various factors including uptime, successful scrapes, and resource usage.

## Points Calculation

### 1. Base Points

```typescript
interface BasePoints {
  uptime: number;          // Minutes the extension is active
  uptimeMultiplier: number;// Configurable in admin (default: 1)
  basePointsPerMinute: number; // Default: 1
}

// Example calculation
const basePoints = uptime * uptimeMultiplier * basePointsPerMinute;
```

### 2. Scraping Bonus

```typescript
interface ScrapingPoints {
  successfulScrapes: number;   // Number of successful scrapes
  scrapeMultiplier: number;    // Configurable in admin (default: 5)
  failedScrapes: number;       // Failed scrape attempts
  penaltyMultiplier: number;   // Default: 0.5
}

// Example calculation
const scrapePoints = (successfulScrapes * scrapeMultiplier) - 
                    (failedScrapes * penaltyMultiplier);
```

### 3. Resource Contribution

```typescript
interface ResourcePoints {
  bandwidthUsed: number;      // MB of bandwidth used
  bandwidthMultiplier: number;// Configurable in admin (default: 0.1)
  cpuUsage: number;           // Average CPU usage percentage
  cpuMultiplier: number;      // Default: 0.2
}

// Example calculation
const resourcePoints = (bandwidthUsed * bandwidthMultiplier) +
                      (cpuUsage * cpuMultiplier);
```

## Admin Configuration

The admin portal allows configuration of:

```typescript
interface PointsConfig {
  uptimeMultiplier: number;    // Points per minute multiplier
  scrapeMultiplier: number;    // Points per successful scrape
  bandwidthMultiplier: number; // Points per MB of bandwidth
  cpuMultiplier: number;       // Points per % CPU usage
  dailyPointsCap: number;      // Maximum points per day
  minimumUptimeForReward: number; // Minimum minutes for any points
}
```

## Implementation

### 1. Points Tracking

```typescript
class PointsTracker {
  private uptimeStart: number;
  private scrapeResults: ScrapeResult[];
  private resourceUsage: ResourceUsage[];

  // Called when extension is activated
  startTracking() {
    this.uptimeStart = Date.now();
    this.monitorResources();
  }

  // Called after each scrape
  recordScrape(result: ScrapeResult) {
    this.scrapeResults.push(result);
    this.calculateAndUpdatePoints();
  }

  // Called periodically
  private monitorResources() {
    // Monitor bandwidth and CPU usage
    // Update resourceUsage array
  }
}
```

### 2. Points Storage

Points are stored in the storage canister:

```typescript
interface UserPoints {
  userId: string;
  totalPoints: number;
  dailyPoints: {
    date: string;
    points: number;
  }[];
  pointsHistory: {
    timestamp: number;
    points: number;
    reason: string;
  }[];
}
```

### 3. Background Process

The background script manages points:

```typescript
// background.js
class PointsManager {
  private tracker: PointsTracker;
  private config: PointsConfig;

  async initialize() {
    this.config = await this.loadAdminConfig();
    this.tracker = new PointsTracker(this.config);
    this.startPeriodicSync();
  }

  private startPeriodicSync() {
    // Sync points to storage canister every 5 minutes
    setInterval(() => this.syncPoints(), 5 * 60 * 1000);
  }
}
```

## Points Rewards

### 1. Daily Rewards
- Points are calculated and awarded daily
- Subject to daily points cap from admin config
- Requires minimum uptime threshold

### 2. Bonus Points
- Extra points for consistent daily usage
- Bonus multiplier for high-quality scrapes
- Special rewards for discovering new topics

### 3. Penalties
- Points reduction for excessive failed scrapes
- Temporary suspension for suspicious activity
- Reset of bonus multipliers

## Security Measures

### 1. Anti-Gaming
- Rate limiting on points accumulation
- Verification of resource usage claims
- Detection of artificial uptime

### 2. Validation
- Cross-check scraping results
- Verify bandwidth usage claims
- Monitor for suspicious patterns

## Analytics

### 1. User Stats
```typescript
interface UserStats {
  dailyAveragePoints: number;
  totalContribution: {
    uptime: number;
    scrapes: number;
    bandwidth: number;
  };
  rank: number;
  achievements: string[];
}
```

### 2. System Stats
```typescript
interface SystemStats {
  totalPointsAwarded: number;
  averagePointsPerUser: number;
  topContributors: string[];
  dailyStats: {
    date: string;
    pointsAwarded: number;
    activeUsers: number;
  }[];
}
```

## Future Improvements

### 1. Enhanced Rewards
- Dynamic multipliers based on demand
- Achievement-based bonuses
- Team/group rewards

### 2. Advanced Analytics
- Predictive point forecasting
- User behavior analysis
- Performance optimization

### 3. Gamification
- Leaderboards
- Achievements/badges
- Challenges and competitions
