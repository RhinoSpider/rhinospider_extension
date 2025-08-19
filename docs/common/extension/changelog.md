# RhinoSpider Extension Changelog

## Version 5.6.0 (2025-08-17)
### 📚 Documentation & Quality Update
- **Documentation Overhaul**: Complete reorganization of all documentation
- **Code Quality**: Production-ready with comprehensive testing
- **Clean Structure**: Removed all duplicate and redundant files
- **Enhanced Popup**: Finalized popup-first interface design

## Version 5.5.0 (2025-08-17)
### 🎯 Major Update: Extension-First Design
- **Enhanced Popup Interface**: Complete redesign with tabbed navigation
- **Popup-Centric UX**: All functionality accessible from compact 380x540px popup
- **RhinoScan Integration**: "Open RhinoScan" button for full-page search
- **Comprehensive Error Handling**: All edge cases covered
  - Network failures with retry logic
  - Service outages (502/503)
  - Rate limiting (429)
  - Laptop sleep/wake scenarios
  - Chrome restart state restoration
- **Google Analytics**: Integrated GA4 tracking (ID: G-4RKCDJC94M)

### 🔧 Technical Improvements
- Added exponential backoff for retries
- Service health monitoring
- User-friendly error messages
- Chrome lifecycle event handlers
- Production-ready code quality

## Version 5.2.0 (2025-08-12)
### 🎉 Major Improvements
- **Points History**: Real accumulated points from IC canister
- **User Profile Sync**: Automatic synchronization every 30 seconds
- **Chrome Error Suppression**: Fixed "Could not establish connection" errors

### 🐛 Bug Fixes
- Fixed `principalId is not defined` error in background
- Fixed user principal mismatch in consumer canister
- Fixed country showing as "Unknown"
- Made 502 submission errors silent
- Fixed extension toggle stop functionality

### ✨ Admin Panel Enhancements
- Added geo location badges (📍 specific, 🌍 global)
- Fixed status display showing "erred"
- Added "View Full Details" button
- Shows points and bandwidth per scrape
- Fixed geo filter errors

## Version 5.1.1 (2025-08-10)
### Critical Production Fixes
- **Login Blocking Issue**: Made login non-blocking to prevent 504 timeouts
- **Data Storage Hash Error**: Fixed PM2 configuration issues
- **IC Proxy Configuration**: Corrected canister ID loading
- Added retry queue system with exponential backoff
- Debug endpoint at `/api/debug`

## Version 5.0.0 (Initial Production Release)
- DePIN functionality implementation
- Tab-based scraping system
- IC canister integration
- Internet Identity authentication
- Points and referral system
- Admin dashboard
- Geo-filtering capabilities