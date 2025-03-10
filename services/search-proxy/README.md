# RhinoSpider Search Proxy Service

A proxy service that provides URLs for the RhinoSpider extension by searching DuckDuckGo (with Google as fallback) and processing the results.

## Features

- Accepts topic names and keywords from the extension
- Uses DuckDuckGo as primary search engine with Google as fallback
- Pre-initializes URL cache with real search results during startup
- Tracks each extension instance with a unique ID
- Returns batches of URLs across requested topics
- Ensures fair distribution of URLs across topics
- Handles pagination to provide fresh URLs on subsequent requests
- Implements caching and rate limiting for efficiency and stability

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file in the root directory with the following content:
   ```
   PORT=3003
   NODE_ENV=development
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   MAX_RESULTS_PER_QUERY=20
   MAX_RETRIES=3
   REQUEST_TIMEOUT_MS=10000
   ```

3. Start the server:
   ```
   npm start
   ```

   For development with auto-restart:
   ```
   npm run dev
   ```

## Deployment

### Using Docker

1. Build the Docker image:
   ```
   docker build -t rhinospider-search-proxy:latest .
   ```

2. Run the container:
   ```
   docker run -d --name rhinospider-search-proxy -p 3003:3003 --restart always rhinospider-search-proxy:latest
   ```

### Using the Deployment Script

1. Make the script executable:
   ```
   chmod +x deploy.sh
   ```

2. Run the deployment script:
   ```
   ./deploy.sh
   ```

3. Follow the instructions in the script output to complete the deployment on your server.

## API Endpoints

### Get URLs for Topics
- **URL**: `/api/search/urls`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "extensionId": "unique-extension-instance-id",
    "topics": [
      {
        "id": "topic-id-1",
        "name": "Topic Name",
        "keywords": ["keyword1", "keyword2"]
      }
    ],
    "batchSize": 500,
    "reset": false
  }
  ```
- **Response**:
  ```json
  {
    "urls": [
      {
        "url": "https://example.com/article",
        "topicId": "topic-id-1",
        "topicName": "Topic Name"
      }
    ],
    "totalUrls": 500,
    "timestamp": "2023-01-01T00:00:00.000Z"
  }
  ```

### Reset URL Pool
- **URL**: `/api/search/reset`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "extensionId": "unique-extension-instance-id"
  }
  ```
- **Response**:
  ```json
  {
    "message": "URL pool reset successfully",
    "extensionId": "unique-extension-instance-id"
  }
  ```

## Deployment

This service can be deployed to Digital Ocean or any other Node.js hosting platform.

## Extension Integration

The extension should generate a unique ID on installation and use this ID for all requests to the proxy service. This ensures that each extension instance gets its own URL pool and pagination state.
