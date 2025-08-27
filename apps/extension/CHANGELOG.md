# RhinoSpider Extension Changelog

## Version 7.1.0 (2025-08-27)

### 🔐 Security & Authentication Updates
- **Internet Identity v2**: Updated all authentication endpoints to use the new Internet Identity v2 URL (`https://identity.internetcomputer.org`)
- **Admin Panel Update**: Admin frontend updated and deployed with Internet Identity v2 support
- **Backward Compatibility**: Maintains support for existing user sessions during transition

### 🛠 Technical Improvements
- Updated authentication URL from `identity.ic0.app` to `identity.internetcomputer.org` across:
  - Chrome Extension (auth.js, login.js, dashboard.js, rhinoscan-page.js)
  - Admin Panel (auth.ts)
  - All popup and content scripts
- Version bump from 7.0.1 to 7.1.0

### 📦 Deployment
- Admin frontend canister redeployed to IC network
- Chrome extension ready for Chrome Web Store update
- No changes required for backend services or proxies

---

## Version 5.2.0 (2025-08-12)

### 🎉 Major Improvements
- **Points History**: Dashboard and popup now fetch real accumulated points from the IC canister (not just local storage)
- **User Profile Sync**: Automatic synchronization of user points every 30 seconds
- **Chrome Error Suppression**: Fixed and suppressed "Could not establish connection" Chrome browser errors

### 🐛 Bug Fixes
- Fixed `principalId is not defined` error in background script
- Fixed user principal mismatch in consumer canister
- Fixed country showing as "Unknown" - now properly displays user's location (e.g., Kazakhstan)
- Made 502 submission errors silent to reduce console noise
- Fixed extension toggle stop functionality

### ✨ Admin Panel Enhancements
- Added geo location badges (📍 for specific regions, 🌍 for global)
- Fixed status display showing "erred" instead of "completed"
- Added "View Full Details" button for complete content viewing
- Shows points generated and bandwidth used per scrape
- Fixed geo filter error when selecting location filters

### 🔧 Technical Improvements
- Enhanced error handling for tab creation
- Improved points calculation (KB × 10 points)
- Better handling of different data types in geo filters
- Optimized API calls to reduce network overhead

### 📊 Current Stats
- User points properly persist across sessions
- Points are stored permanently in IC canister
- Real-time points updates in dashboard and popup

---

## Version 5.1.1 (Previous)
- Initial DePIN functionality
- Tab-based scraping implementation
- IC canister integration