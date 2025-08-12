# Extension Reload Instructions

## Step 1: Complete Extension Reload

1. Open Chrome and go to `chrome://extensions/`
2. Find the RhinoSpider extension
3. Click the "Remove" button to completely uninstall it
4. Confirm removal when prompted

## Step 2: Clear Chrome Cache (Important!)

1. Open Chrome DevTools (F12 or Cmd+Option+I)
2. Right-click the refresh button in Chrome
3. Select "Empty Cache and Hard Reload"

## Step 3: Reinstall Extension

1. In `chrome://extensions/`, ensure "Developer mode" is ON (top right)
2. Click "Load unpacked"
3. Navigate to `/Users/ayanuali/development/rhinospider/apps/extension/dist`
4. Click "Select"

## Step 4: Test the Extension

1. Click on the extension icon to open the popup
2. Login if needed
3. Open the extension's background page:
   - In `chrome://extensions/`, find RhinoSpider
   - Click "background page" or "service worker" link
4. In the DevTools console that opens, paste and run:

```javascript
// Test 1: Check extension state
chrome.storage.local.get(['principalId', 'enabled', 'topics'], (r) => {
    console.log('State:', {
        authenticated: !!r.principalId,
        enabled: r.enabled,
        topics: r.topics?.length || 0
    });
});

// Test 2: Try to start scraping
rhinoSpiderDebug.startScraping();

// Test 3: Test tab creation
chrome.tabs.create({
    url: 'https://example.com',
    active: false,
    pinned: true
}, (tab) => {
    console.log('Tab created:', tab.id);
    setTimeout(() => chrome.tabs.remove(tab.id), 2000);
});
```

## Step 5: Check for Critical Logs

After running the tests, you should see logs that include:
- `[CRITICAL] startScraping FUNCTION CALLED`
- `[CRITICAL] TOPICS LOADED: X topics`
- `[CRITICAL] performScrape FUNCTION CALLED`
- `[CRITICAL] CREATING TAB NOW for URL`

If you don't see these logs, the extension code hasn't been updated properly.

## Alternative: Force Service Worker Restart

If the above doesn't work, try:
1. In the extension's background page DevTools console, run:
   ```javascript
   chrome.runtime.reload();
   ```
2. Or in `chrome://extensions/`, click the reload button (circular arrow) on the RhinoSpider extension

## Debug Scripts Available

We've created several debug scripts in the extension folder:
- `test-tab-creation.js` - Tests if tabs can be created
- `debug-extension-state.js` - Shows complete extension state
- `test-scraping.js` - Tests the scraping functionality

Run these by copying their content to the background page console.