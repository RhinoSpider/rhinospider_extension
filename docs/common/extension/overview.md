# RhinoSpider Extension

## What is this

RhinoSpider is a Chrome extension where you can earn points by letting the extension collect web data. The data helps train AI models, and everything stays private because it all runs through Internet Computer blockchain.

## Main Features

### Popup Interface
The extension has a popup with different tabs - Overview, Stats, Profile, and Settings. You can turn the extension on/off with one click, see your points and stats in real-time, and check if the blockchain and search services are working properly.

### RhinoScan
This is basically a search feature. Opens in a full page, gives you AI-powered topic suggestions, works with multiple search engines, and filters content based on your location.

### Points
You earn 10 points for every KB of data you contribute. Points sync with the blockchain in real-time and everything is stored on the IC canister. Stats update automatically every 30 seconds.

### Referrals
Each user gets their own referral code. You can see how many points your referrals earned, copy the code easily, and the admin panel has analytics for all this.

## AI Integration

Why this is useful for AI:
- Gets real browsing patterns instead of fake data
- Collects content from different sources
- Has region-specific content which helps train global AI models
- Everything is anonymized through blockchain so privacy is maintained

What it can be used for:
1. Training search algorithms to be more relevant
2. Helping AI understand web content better
3. Getting insights about local content preferences
4. Detecting web trends in real-time

## How it Works (Technical)

Components:
1. Service Worker - background script that manages the scraping
2. Content Script - analyzes pages and extracts data
3. Popup UI - React interface for the user
4. IC Integration - talks to the blockchain directly using agents

The flow is like this:
```
User browses → Content Script → Service Worker → IC Proxy → Blockchain
                                               ↓
                                         Search Proxy → finds more content
```

Security stuff:
- Uses Internet Identity for auth
- Only HTTPS connections
- Content Security Policy is followed
- API keys are never exposed
- Auto-recovers from errors

## Privacy

What we do with data:
- No personal info is collected
- URLs get anonymized before storage
- Content is hashed for verification
- User has full control over what gets contributed

We comply with:
- Chrome Web Store policies
- GDPR requirements
- Everything is transparent about data usage
- User has to consent

## Error Handling

The extension handles a lot of edge cases:
- Network failures with retry logic
- Service outages like 502/503 errors
- Rate limiting with exponential backoff
- Laptop going to sleep and waking up
- Chrome restarting

For users:
- Error messages are actually readable
- Tries to recover automatically
- Shows service health status
- Has debug mode for when things go wrong