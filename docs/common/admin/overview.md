# Admin Panel Documentation

## Overview
The RhinoSpider Admin Panel is a React-based dashboard for managing the extension ecosystem, monitoring user activity, and configuring AI scraping parameters.

## Access
- **Production URL**: https://sxsvc-aqaaa-aaaaj-az4ta-cai.icp0.io
- **Authentication**: Internet Identity required
- **Authorized Principals**: Configured in admin canister

## Features

### 1. Dashboard Overview
- **Real-time Statistics**
  - Total users
  - Total points distributed
  - Active scrapers
  - Data collected (GB)
- **Recent Activity Feed**
- **System Health Indicators**

### 2. Scraped Data Management
- **Data Viewer**
  - URL, content preview
  - Timestamp and user info
  - Points generated
  - Bandwidth used
  - Geo-location badges (📍 specific, 🌍 global)
- **Filters**
  - By date range
  - By user
  - By location
  - By status
- **Actions**
  - View full content
  - Export data
  - Delete entries

### 3. Extension Users
- **User List**
  - Principal ID
  - Points earned
  - Pages scraped
  - Join date
  - Location
- **User Details**
  - Activity history
  - Referral stats
  - Points breakdown
- **User Management**
  - Block/unblock users
  - Adjust points
  - Reset statistics

### 4. Points Management
- **Points Configuration**
  - Rate per KB (default: 10)
  - Bonus multipliers
  - Referral rewards
- **Points Distribution**
  - Manual point grants
  - Bulk adjustments
  - Point history

### 5. AI Configuration
- **Topic Management**
  - Add/edit/delete topics
  - Set topic priorities
  - Configure search parameters
- **Scraping Rules**
  - URL patterns
  - Content filters
  - Quality thresholds
- **Model Parameters**
  - Data requirements
  - Training schedules
  - Quality metrics

### 6. Geo-Distribution
- **Location Analytics**
  - User distribution map
  - Content by region
  - Regional performance
- **Geo-Filtering**
  - Configure allowed regions
  - Set regional quotas
  - Priority locations

## Technical Implementation

### Frontend Stack
- **Framework**: React 18 with TypeScript
- **State Management**: React hooks
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Authentication**: Internet Identity

### Backend Integration
- **Admin Canister**: Direct IC integration
- **Storage Canister**: Data retrieval
- **Consumer Canister**: User management

### Key Components
```typescript
// Main components structure
src/components/
├── Dashboard.tsx       // Overview page
├── ScrapedData.tsx    // Data management
├── ExtensionUsers.tsx // User management
├── PointsManagement.tsx // Points system
├── AIConfigModal.tsx  // AI configuration
├── TopicModal.tsx     // Topic management
└── Sidebar.tsx        // Navigation
```

## Geo-Distribution Features

### Location Tracking
- Automatic IP-based geo-location
- Manual location override option
- VPN detection and handling

### Regional Configuration
```javascript
// Example geo-filter configuration
{
  "allowed_regions": ["US", "EU", "ASIA"],
  "blocked_countries": ["XX", "YY"],
  "priority_locations": {
    "US": 1.5,  // 1.5x points multiplier
    "EU": 1.2,
    "DEFAULT": 1.0
  }
}
```

### Distribution Analytics
- Real-time user distribution
- Content diversity metrics
- Regional performance tracking

## Security

### Access Control
- Principal-based authentication
- Role-based permissions (future)
- Audit logging

### Data Protection
- No PII storage
- Encrypted communications
- Secure canister calls

## Troubleshooting

### Common Issues

1. **Login Fails**
   - Ensure Internet Identity is set up
   - Check principal is authorized
   - Clear browser cache

2. **Data Not Loading**
   - Verify canister connections
   - Check network tab for errors
   - Ensure proper CORS headers

3. **Geo-filter Errors**
   - Validate filter syntax
   - Check for data type mismatches
   - Review console logs

### Debug Mode
```javascript
// Enable debug mode in console
localStorage.setItem('debug', 'true');
location.reload();
```

## Best Practices

1. **Regular Monitoring**
   - Check daily active users
   - Monitor points distribution
   - Review error logs

2. **Data Management**
   - Archive old data periodically
   - Export important datasets
   - Maintain data quality

3. **User Support**
   - Respond to user issues promptly
   - Document common problems
   - Provide clear communication