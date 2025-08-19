# RhinoSpider Chrome Extension

## Overview
RhinoSpider is a DePIN (Decentralized Physical Infrastructure Network) Chrome extension that enables users to earn points by contributing their browsing data to train AI models, while maintaining privacy through the Internet Computer blockchain.

## Core Features

### 1. Enhanced Popup Interface
- **Tabbed Navigation**: Overview, Stats, Profile, Settings
- **Quick Controls**: One-click toggle for extension activation
- **Real-time Stats**: Points earned, pages scraped, bandwidth used
- **Service Health**: Live status of blockchain and search services

### 2. RhinoScan Search
- Full-page search interface for discovering content
- AI-powered topic suggestions
- Multiple search engine integration
- Geo-filtered content discovery

### 3. Points System
- **Earning Rate**: 10 points per KB of data contributed
- **Real-time Tracking**: Points synchronized with blockchain
- **Persistent Storage**: All points stored on IC canister
- **Automatic Updates**: Stats refresh every 30 seconds

### 4. Referral System
- Unique referral codes for each user
- Points tracking for referred users
- Copy-to-clipboard functionality
- Referral analytics in admin panel

## AI Integration

### Benefits
- **Quality Training Data**: Real browsing patterns for AI models
- **Diverse Content**: Multi-source data collection
- **Geo-Distribution**: Region-specific content for global AI training
- **Privacy-Preserved**: Data anonymized through blockchain

### Use Cases
1. **Search Algorithm Training**: Improving search relevance
2. **Content Understanding**: Better AI comprehension of web content
3. **Regional Insights**: Understanding local content preferences
4. **Trend Analysis**: Real-time web trend detection

## Technical Architecture

### Components
1. **Service Worker**: Background script managing scraping orchestration
2. **Content Script**: Page analysis and data extraction
3. **Popup UI**: React-based interface with state management
4. **IC Integration**: Direct blockchain communication via agents

### Data Flow
```
User Browse → Content Script → Service Worker → IC Proxy → Blockchain
                                              ↓
                                        Search Proxy → Content Discovery
```

### Security Features
- Internet Identity authentication
- HTTPS-only connections
- Content Security Policy compliance
- No exposed API keys
- Automatic error recovery

## User Privacy

### Data Handling
- No personal information collected
- URLs anonymized before storage
- Content hashed for verification
- User control over data contribution

### Compliance
- Chrome Web Store policies
- GDPR considerations
- Transparent data usage
- User consent required

## Error Handling

### Comprehensive Coverage
- Network failures with retry logic
- Service outages (502/503 errors)
- Rate limiting with backoff
- Laptop sleep/wake recovery
- Chrome restart state restoration

### User Experience
- User-friendly error messages
- Automatic recovery attempts
- Service health indicators
- Debug mode for troubleshooting