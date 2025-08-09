# RhinoSpider Extension - Complete Feature Documentation

## 🦏 Overview
RhinoSpider is a DePIN (Decentralized Physical Infrastructure Network) Chrome extension that allows users to contribute their bandwidth for web scraping while earning points and rewards.

## 🎯 Core Features

### 1. 🗺️ RhinoScan - Global Network Visualization
**Location:** Dashboard → RhinoScan tab

RhinoScan shows the global distribution of all nodes in the RhinoSpider network:
- **Interactive World Map**: See all active nodes globally
- **Real-time Statistics**: 
  - Total nodes in network
  - Active nodes (last 24 hours)
  - Total data indexed
  - Number of countries/regions
- **Geographic Distribution**: Nodes clustered by country with contribution volumes
- **Activity Tracking**: Monitor which nodes are actively contributing

**How it works:**
- Your IP address is geolocated when you login
- Location data (country, region, city) stored on-chain
- Updates automatically as you contribute data
- Default location: USA (for VPN/blocked IPs)

### 2. 💎 Points System
**Location:** Dashboard → Main view

**Earning Points:**
- **Base Rate**: 10 points per KB of data scraped
- **Automatic**: Points credited instantly on data submission
- **Transparent**: All points tracked on-chain

**Points Display:**
- Current balance shown in dashboard
- Transaction history available
- Contribution metrics tracked

**Future Redemption** (Coming Soon):
- Convert to RHINO tokens
- Unlock premium features
- Exclusive NFT rewards
- Cash out options

### 3. 🔗 Referral System
**Location:** Dashboard → Referrals tab

**Your Referral Code:**
- Unique 12-character code
- Generated automatically on signup
- Example: `a3f2b1c84567`

**How to Share:**
1. Go to Referrals tab
2. Copy your referral code
3. Share with friends
4. They enter code during signup

**Referral Rewards:**
- **Tier 1 (1-10 referrals)**: 100 points each
- **Tier 2 (11-30 referrals)**: 50 points each
- **Tier 3 (31-70 referrals)**: 25 points each
- **Tier 4 (71+ referrals)**: 5 points each
- **Commission**: 10% of all points your referrals earn

**Tracking:**
- See total referrals count
- View referral earnings
- Monitor referral activity

### 4. 🌐 Web Scraping
**Location:** Automatic when browsing

**How it Works:**
1. Extension monitors your browsing
2. Matches pages against active topics
3. Extracts relevant data automatically
4. Submits to blockchain storage
5. Awards points instantly

**Privacy:**
- Only scrapes public web pages
- Respects robots.txt
- No personal data collected
- You control on/off toggle

### 5. 🔐 Authentication
**Location:** Login screen

**Internet Identity Integration:**
- Secure blockchain authentication
- No passwords needed
- One identity across all IC apps
- Fully decentralized

**Device Management:**
- Register multiple devices
- Use same account everywhere
- Points sync across devices

## 📊 Dashboard Features

### Main Dashboard
- **Principal ID**: Your unique blockchain identity
- **Points Earned**: Total points accumulated
- **Pages Scraped**: Number of pages contributed
- **Extension Toggle**: Enable/disable scraping

### RhinoScan View
- **World Map**: Interactive Leaflet.js map
- **Statistics Cards**: Network metrics
- **Country Leaderboard**: Top contributing countries
- **Verification Links**: Direct blockchain verification

### Referrals Page
- **Your Code**: Copy-able referral code
- **Referral Stats**: Total referrals and earnings
- **Share Options**: Easy sharing methods
- **Tier Progress**: Current tier and next milestone

### Settings
- **Extension Enable/Disable**: Master control
- **Theme Selection**: Light/Dark mode (coming soon)
- **Notification Preferences**: Control alerts

## 🚀 Getting Started

### Installation
1. Install from Chrome Web Store (or load unpacked)
2. Click extension icon in toolbar
3. Login with Internet Identity
4. Extension starts working automatically

### First Time Setup
1. **Create Internet Identity**: If new user
2. **Enter Referral Code**: If you have one (optional)
3. **Enable Extension**: Toggle on in dashboard
4. **Start Browsing**: Points earned automatically

### Maximizing Earnings
1. **Browse Regularly**: More activity = more points
2. **Quality Content**: Visit diverse, content-rich sites
3. **Share Referral Code**: Earn from your network
4. **Stay Active**: Maintain daily activity for bonuses (coming)

## 📈 Technical Details

### Data Flow
```
Your Browser → Extension → Consumer Canister → Storage Canister
                              ↓
                         Points Awarded
```

### Canisters (Blockchain Components)
- **Consumer**: `t3pjp-kqaaa-aaaao-a4ooq-cai` - Handles user data
- **Storage**: `hhaip-uiaaa-aaaao-a4khq-cai` - Stores scraped data
- **Admin Backend**: `wvset-niaaa-aaaao-a4osa-cai` - Administrative backend API

### Security
- All data encrypted in transit
- Principal-based authentication
- On-chain data verification
- No private keys in extension

## 🎯 Use Cases

### For Individual Users
- Earn passive income while browsing
- Contribute to decentralized web index
- Build reputation in Web3 ecosystem

### For Researchers
- Access aggregated web data
- Contribute specific scraping topics
- Verify data authenticity on-chain

### For Businesses
- Decentralized market research
- Competitive intelligence gathering
- SEO and content analysis

## ❓ FAQ

**Q: How much can I earn?**
A: Earnings depend on browsing activity. Average users earn 500-2000 points daily.

**Q: Is my browsing private?**
A: Yes, only public webpage content is scraped. No personal data is collected.

**Q: Can I use VPN?**
A: Yes, but location will default to USA for geographic tracking.

**Q: When can I cash out points?**
A: Token conversion coming in Q1 2025. Points are preserved on-chain.

**Q: How do referrals work?**
A: Share your code, earn instant bonus when they join, plus 10% of their earnings forever.

**Q: Is this legal?**
A: Yes, we only scrape public data following robots.txt and terms of service.

## 🔧 Troubleshooting

### Extension Not Working
1. Check if enabled in dashboard
2. Refresh the page
3. Restart Chrome
4. Reinstall extension

### Points Not Updating
1. Check internet connection
2. Verify authentication
3. Wait 1-2 minutes (blockchain confirmation)
4. Check dashboard for updates

### Login Issues
1. Clear browser cache
2. Try different browser
3. Create new Internet Identity
4. Contact support

## 📞 Support

- **GitHub Issues**: https://github.com/RhinoSpider/rhinospider_extension/issues
- **Documentation**: This file and `/docs` folder
- **Admin Dashboard**: https://sxsvc-aqaaa-aaaaj-az4ta-cai.icp0.io/

## 🚀 Future Features

### Coming Soon
- Mobile app version
- Advanced scraping rules
- Team competitions
- Staking mechanisms
- NFT rewards program
- API access for developers

### Roadmap 2025
- Q1: Token launch and redemption
- Q2: Mobile apps (iOS/Android)
- Q3: Advanced analytics dashboard
- Q4: Enterprise features

---

*Version: 1.0.0*
*Last Updated: December 2024*
*Status: Production Ready*