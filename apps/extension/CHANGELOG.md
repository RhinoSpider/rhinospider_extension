# RhinoSpider Extension Changelog

## Version 7.2.0 (2025-08-27)

### 🎆 MAJOR UPDATE: Internet Identity 2.0 Integration
- **Complete Migration to Internet Identity 2.0**: Updated all authentication to use the new `https://id.ai` endpoint
- **Revolutionary New Features Available**:
  - No more identity numbers to remember
  - Google login integration
  - Multiple accounts per identity
  - Completely redesigned authentication flow
  - Enhanced passkey standards

### ⚠️ Important User Notice
- **Users must upgrade their Internet Identity** at https://id.ai to use the new 2.0 flow
- Existing credentials remain valid on both 1.0 and 2.0
- No data loss during upgrade process
- Primary account remains the same as 1.0 identity

### 🛠 Technical Updates
- Updated all authentication URLs from `identity.internetcomputer.org` to `id.ai`
- Version bump to 7.2.0 for Internet Identity 2.0 support
- Updated both Chrome Extension and Admin Panel
- Maintained backward compatibility for users still on II 1.0

### 📦 Deployment
- Chrome extension v7.2.0 ready for Chrome Web Store
- Admin panel requires redeployment to IC canister
- No backend service changes required

---

## Version 7.1.0 (2025-08-27 - Deprecated)

### 🔐 Interim Update (Superseded by 7.2.0)
- Updated to intermediate v2 URL (`identity.internetcomputer.org`)
- This version has been immediately superseded by 7.2.0 with full Internet Identity 2.0 support

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