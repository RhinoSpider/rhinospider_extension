# RhinoSpider Extension Testing Guide

This guide explains how to test the scraping functionality of the RhinoSpider extension.

## Prerequisites

1. You must be logged in with Internet Identity
2. The extension must be enabled

## Testing Methods

### Method 1: Using the Test Button

1. Open the extension popup
2. Click the "Test Scrape (Dev Only)" button at the bottom of the settings panel
3. Wait for the scraping process to complete
4. Check the extension console for detailed logs

### Method 2: Using the Console

1. Open the extension background page by:
   - Going to `chrome://extensions`
   - Finding RhinoSpider extension
   - Clicking "background page" under "Inspect views"
2. In the console, run one of the following commands:

```javascript
// Test URL generation
window.testUrlGeneration();

// Test a full scrape cycle
window.testScrape();
```

### Method 3: Using the Test Script

For more comprehensive testing, you can use the test script:

1. Open the extension background page console
2. Run the following command to load the test script:

```javascript
const script = document.createElement('script');
script.src = 'test-scrape.js';
document.head.appendChild(script);
```

3. Once loaded, you can run any of these test functions:

```javascript
// Test URL generation from patterns
testUrlGeneration();

// Test fetching content from generated URLs
testContentFetching();

// Test the full scraping and submission process
testSubmission();

// Run all tests in sequence
runAllTests();
```

## Troubleshooting

If you encounter issues during testing:

1. Check the console logs for detailed error messages
2. Verify that you're authenticated with Internet Identity
3. Ensure the extension is enabled
4. Check that topics and URL patterns are properly configured

## Logging

All test operations are logged to the console with detailed information. Look for log entries with the following prefixes:

- `[Auth]` - Authentication-related logs
- `[Topics]` - Topic-related logs
- `[Scrape]` - Scraping-related logs
- `[URL]` - URL generation logs
- `[Submit]` - Data submission logs

## Expected Results

A successful scrape should:

1. Generate a valid URL from a topic pattern
2. Fetch content from that URL
3. Submit the scraped data to the storage canister
4. Return a success response

If any of these steps fail, detailed error messages will be shown in the console.
