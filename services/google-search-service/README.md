# Google Search Service for RhinoSpider

A dedicated backend service that provides Google search results URLs for the RhinoSpider extension.

## Features

- Accepts multiple topics and randomizes their usage for better variety
- Performs Google searches based on topic names and keywords
- Returns URLs in batches of 500
- Tracks sessions with 30-minute inactivity timeout
- Handles multiple extension instances with unique identifiers
- Simple REST API for integration with the extension

## API Endpoints

### Search

- `POST /api/search` - Start a new search or continue an existing one
  - Request body: `{ topics: [{ name: "topic name", keywords: ["keyword1", "keyword2"] }, { name: "topic2", keywords: ["kw1", "kw2"] }], extensionId: "extension-id", sessionToken?: "existing-token" }`
  - Response: `{ sessionToken: "new-token", urls: [...], hasMore: true, totalFound: 500 }`

- `GET /api/search/:sessionToken` - Get the next batch of URLs for an existing session
  - Response: `{ urls: [...], hasMore: true, totalFound: 500 }`

### Status

- `GET /api/status/:sessionToken` - Get status of a specific search session
  - Response: `{ sessionToken: "token", extensionId: "id", topic: "name", totalUrls: 500, currentIndex: 100, remaining: 400, lastAccessTime: "timestamp", createdAt: "timestamp" }`

- `GET /api/status` - Get overall service status
  - Response: `{ status: "OK", activeSessions: 10, timestamp: "timestamp" }`

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file with the following variables:
   ```
   PORT=3000
   NODE_ENV=development
   ```

3. Start the service:
   ```
   npm start
   ```

## Integration with RhinoSpider Extension

Update the extension's background.js to use this service instead of direct Google searches:

```javascript
// Example code for the extension
async function fetchGoogleSearchResults(topics) {
  try {
    // Convert single topic to array if needed
    const topicsArray = Array.isArray(topics) ? topics : [topics];
    
    const response = await fetch('http://your-service-url/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        topics: topicsArray,
        extensionId: chrome.runtime.id
      })
    });
    
    const data = await response.json();
    
    // Store session token for future requests
    await chrome.storage.local.set({ googleSearchSessionToken: data.sessionToken });
    
    // Return URLs
    return data.urls;
  } catch (error) {
    console.error('Error fetching Google search results:', error);
    return [];
  }
}
```

## Deployment

This service can be deployed to Digital Ocean or any other cloud provider that supports Node.js applications.

## Security Considerations

- The service uses rate limiting to prevent abuse
- Add authentication in production to secure the API
- Consider using HTTPS in production
