# RhinoSpider Analytics & Points System

## Overview

RhinoSpider's analytics system consists of two main components:
1. Extension Analytics (User-specific)
2. Admin Portal Analytics (System-wide)

## Extension Analytics

### Purpose
- Track individual user contribution
- Monitor resource usage and rewards
- Provide real-time feedback

### Features

1. **Real-time Metrics**
   - Current bandwidth usage
   - Active scraping tasks
   - Points earned today
   - Current streak
   - Resource utilization

2. **Historical Data**
   - 7-day activity graph
   - Total points earned
   - Bandwidth contribution history
   - Success/failure rates
   - Topic completion rates

3. **Points Dashboard**
   - Current points balance
   - Points breakdown by category
   - Active multipliers
   - Achievement badges
   - Streak status

### Implementation
- Updates every 5 seconds
- Stores data in IndexedDB
- Syncs with storage canister daily
- Uses chart.js for visualizations
- Real-time points calculation

## Points System

### Base Points Calculation

1. **Bandwidth Contribution**
   - 1 point per MB of data processed
   - Includes upload and download
   - Formula: `points = (bytesProcessed / (1024 * 1024)) * POINTS_PER_MB`

2. **Request Processing**
   - 10 points per successful request
   - Formula: `points = requestCount * POINTS_PER_REQUEST`

### Multipliers and Bonuses

1. **Quality Multiplier (20%)**
   - Based on success rate
   - Formula: `bonus = basePoints * (successRate * 0.2)`

2. **Streak Bonus (10% per day)**
   - +10% per consecutive day
   - Caps at 100% (10 days)
   - Formula: `bonus = basePoints * (streak * 0.1)`

3. **Peak Hours Bonus (20%)**
   - +20% during high demand
   - 9 AM - 5 PM local time
   - Formula: `bonus = basePoints * 0.2`

4. **Resource Optimization (5% per topic)**
   - +5% per additional topic
   - Caps at 25% (5 topics)
   - Formula: `bonus = basePoints * (0.05 * min(topicsCount, 5))`

### Limits and Controls
- 1000 points daily cap
- Reset at UTC midnight
- Bonuses apply before cap
- Anti-abuse measures

## Admin Portal Analytics

### Purpose
- Monitor system performance
- Track data collection
- Analyze user contributions
- Identify trends and patterns

### Features

1. **System Overview**
   - Active users count
   - Total points distributed
   - System resource usage
   - Error rates
   - Cost metrics

2. **User Analytics**
   - Top contributors
   - Points distribution
   - User engagement metrics
   - Geographic distribution
   - Activity patterns

3. **Topic Analytics**
   - Popular topics
   - Completion rates
   - Quality metrics
   - Resource usage
   - Cost per topic

4. **Performance Metrics**
   - Response times
   - Success rates
   - Resource efficiency
   - Cost efficiency
   - System health

### Implementation

1. **Data Collection**
   ```typescript
   interface AnalyticsEvent {
     timestamp: number;
     userId: string;
     eventType: string;
     metrics: {
       points?: number;
       bandwidth?: number;
       success?: boolean;
       topicId?: string;
       resourceUsage?: ResourceMetrics;
     };
   }
   ```

2. **Storage**
   - Real-time metrics in Redis
   - Historical data in IC canister
   - Aggregated reports daily
   - Backup system weekly

3. **Visualization**
   - Real-time dashboards
   - Interactive charts
   - Custom report builder
   - Export capabilities

## Security & Privacy

### Data Protection
- Anonymized analytics
- Encrypted transmission
- Secure storage
- Regular cleanup

### Access Control
- Role-based access
- Admin-only features
- User data isolation
- Audit logging

## Future Improvements

1. **Analytics**
   - Machine learning insights
   - Predictive analytics
   - Custom dashboards
   - Advanced reporting

2. **Points System**
   - Dynamic multipliers
   - Achievement system
   - Team competitions
   - Reward marketplace

3. **Integration**
   - API access
   - Export tools
   - Mobile analytics
   - Third-party integrations

## Extension User Analytics

### 1. User Dashboard

```typescript
interface UserAnalytics {
  points: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    rank: number;
  };
  contributions: {
    uptime: number;        // Minutes active
    scrapes: number;       // Successful scrapes
    bandwidth: number;     // MB contributed
  };
  achievements: Achievement[];
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  earnedDate: string;
  icon: string;
}
```

### 2. Performance Stats

```typescript
interface ExtensionPerformance {
  scrapeSuccess: number;   // Success rate %
  avgResponseTime: number; // ms
  errors: {
    count: number;
    lastError: string;
    timestamp: number;
  };
  resourceUsage: {
    cpu: number;          // Average %
    memory: number;       // MB
    bandwidth: number;    // MB/hour
  };
}
```

### 3. Extension UI Components

```typescript
// Points Display
interface PointsDisplay {
  currentPoints: number;
  pointsToNextRank: number;
  rankProgress: number;    // 0-100%
  recentActivity: {
    timestamp: number;
    points: number;
    reason: string;
  }[];
}

// Performance Monitor
interface PerformanceMonitor {
  isActive: boolean;
  currentStatus: 'idle' | 'scraping' | 'syncing';
  resourceStats: {
    cpu: number;
    memory: number;
    network: number;
  };
}
```

## Admin Portal Analytics

### 1. System Overview

```typescript
interface SystemAnalytics {
  users: {
    total: number;
    active: number;      // Last 24h
    newToday: number;
    retentionRate: number;
  };
  scraping: {
    totalScrapes: number;
    successRate: number;
    avgLatency: number;
    activeTopics: number;
  };
  resources: {
    totalBandwidth: number;   // GB
    avgCPUUsage: number;     // %
    concurrentUsers: number;
    peakUsage: {
      time: string;
      value: number;
    };
  };
  costs: {
    aiCosts: number;         // USD
    computeCosts: number;    // USD
    storageUsed: number;     // GB
  };
}
```

### 2. Topic Analytics

```typescript
interface TopicAnalytics {
  name: string;
  stats: {
    totalScrapes: number;
    successRate: number;
    avgProcessingTime: number;
    dataQuality: number;     // 0-100%
  };
  fields: {
    name: string;
    extractionRate: number;  // Success %
    accuracy: number;        // 0-100%
    commonErrors: string[];
  }[];
  aiMetrics: {
    tokensUsed: number;
    costPerScrape: number;
    modelUsage: {
      gpt4: number;
      gpt35: number;
    };
  };
}
```

### 3. User Management

```typescript
interface UserManagement {
  users: {
    id: string;
    joinDate: string;
    status: 'active' | 'inactive' | 'suspended';
    contribution: {
      points: number;
      uptime: number;
      scrapes: number;
    };
    quality: {
      successRate: number;
      reliability: number;   // 0-100%
      flags: string[];      // Any issues
    };
  }[];
  rankings: {
    topContributors: string[];
    mostReliable: string[];
    longestUptime: string[];
  };
}
```

### 4. Cost Analytics

```typescript
interface CostAnalytics {
  ai: {
    dailyCosts: number;
    modelBreakdown: {
      gpt4: number;
      gpt35: number;
    };
    costPerTopic: {
      [topicId: string]: number;
    };
  };
  infrastructure: {
    computeCosts: number;
    storageCosts: number;
    bandwidthCosts: number;
  };
  metrics: {
    costPerScrape: number;
    costPerUser: number;
    roi: number;           // Return on investment
  };
}
```

### 5. Quality Monitoring

```typescript
interface QualityMonitoring {
  overall: {
    accuracy: number;      // 0-100%
    coverage: number;      // % of fields extracted
    reliability: number;   // 0-100%
  };
  byTopic: {
    [topicId: string]: {
      accuracy: number;
      coverage: number;
      commonIssues: string[];
    };
  };
  byField: {
    [fieldId: string]: {
      accuracy: number;
      extractionRate: number;
      validationRate: number;
    };
  };
}
```

## Implementation

### 1. Data Collection

```typescript
// Extension Collector
class ExtensionAnalytics {
  private metrics: Metrics;
  
  trackActivity(activity: Activity) {
    this.metrics.record(activity);
    this.syncWithStorage();
  }
  
  private syncWithStorage() {
    // Sync to storage canister every 5 min
  }
}

// Admin Collector
class AdminAnalytics {
  private store: AnalyticsStore;
  
  async collectSystemMetrics() {
    const metrics = await this.gatherMetrics();
    await this.store.update(metrics);
    this.checkAlerts(metrics);
  }
}
```

### 2. Data Processing

```typescript
interface DataProcessor {
  aggregateUserStats(): UserStats;
  calculateSystemMetrics(): SystemMetrics;
  generateReports(): Report[];
  detectAnomalies(): Alert[];
}
```

### 3. Visualization

```typescript
interface Dashboard {
  extension: {
    pointsChart: TimeSeriesChart;
    performanceMetrics: GaugeChart;
    activityFeed: ActivityList;
  };
  admin: {
    systemOverview: MetricsGrid;
    costAnalysis: CostBreakdown;
    userDistribution: PieChart;
    qualityMetrics: HeatMap;
  };
}
```

## Security

### 1. Data Privacy

```typescript
interface PrivacyControls {
  userDataRetention: number;  // Days
  dataAnonymization: boolean;
  accessControls: {
    role: string;
    permissions: string[];
  }[];
}
```

### 2. Access Control

```typescript
interface AccessControl {
  roles: {
    admin: string[];      // Full access
    analyst: string[];    // Read-only
    support: string[];    // Limited access
  };
  audit: {
    action: string;
    user: string;
    timestamp: number;
    details: string;
  }[];
}
```

## Future Improvements

### 1. Enhanced Analytics
- Real-time monitoring
- Predictive analytics
- Machine learning insights
- Custom reporting

### 2. Visualization
- Interactive dashboards
- Custom chart builders
- Export capabilities
- Mobile optimization

### 3. Integration
- API access
- External reporting
- BI tool integration
- Custom webhooks
