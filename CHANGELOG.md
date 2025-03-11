# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.2.2] - 2025-03-11

### Added
- Consolidated documentation in `docs-consolidated` directory
- Comprehensive architecture documentation
- Detailed deployment guides for all services
- Extension documentation with privacy and security focus
- Chrome Web Store submission preparation

### Changed
- Updated main README.md to reflect current project structure
- Improved extension build process for Chrome Web Store submission
- Reorganized documentation structure for better clarity
- Enhanced security and privacy documentation

## [3.2.1] - 2025-02-15

### Fixed
- Fixed IC Proxy deployment script to include all required endpoints
- Resolved 404 errors when extension tried to access missing endpoints
- Fixed authentication flow with Internet Identity
- Corrected data submission process to consumer canister

### Changed
- Improved error handling in extension background service
- Enhanced logging for debugging purposes
- Optimized scraping performance

## [3.2.0] - 2025-02-03

### Added
- Added gradient background with colors: #131217, #360D68, #B692F6
- Added proper styling for buttons, inputs, and cards
- Added centered popup for Internet Identity login
- Added better error handling and display

### Fixed
- Fixed Internet Identity popup window positioning
- Fixed CSS styling and layout issues
- Fixed TypeScript errors in AuthClient
- Fixed error handling in authentication flow

### Changed
- Simplified Vite configuration for extension builds
- Improved error boundary with better error messages
- Updated authentication flow to use proper window features
- Consolidated auth-related code into a single location

### Removed
- Removed unused test utilities
- Removed duplicate auth context
- Removed backup files
- Removed dist directory in favor of build directory
