# RhinoSpider Scraper Service

This service acts as an intermediary between the RhinoSpider Chrome extension and the Internet Computer (IC) canisters. It receives scraped content from the extension, processes it, and submits it to the consumer canister.

## Features

- Receives raw HTML and extracted content from the extension
- Cleans and processes the content into a standardized format
- Stores raw HTML locally for backup and debugging
- Submits processed content to the consumer canister
- Manages storage limits to prevent disk space issues
- Authenticates requests using Internet Identity principals

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Copy the example environment file:
   ```
   cp example.env .env
   ```
4. Edit the `.env` file with your configuration
5. Start the server:
   ```
   npm start
   ```

## API Endpoints

### Health Check
```
GET /api/health
```
Returns the current status of the service.

### Submit Content
```
POST /api/submit
```
Receives scraped content from the extension, processes it, and submits it to the consumer canister.

**Headers:**
- `Authorization: Bearer <principal_id>` - The principal ID of the authenticated user

**Request Body:**
```json
{
  "topicId": "string",
  "url": "string",
  "rawContent": "string",
  "extractedContent": {
    "title": "string",
    "content": "string",
    "author": "string",
    "date": "string"
  },
  "timestamp": "number",
  "aiConfig": {
    "model": "string",
    "apiKey": "string",
    "costLimitMonthly": "number",
    "promptTemplate": "string"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Content submitted successfully",
  "contentId": "string",
  "savedLocally": true
}
```

## Data Flow

1. Extension scrapes content from websites
2. Extension sends raw HTML and extracted content to this service
3. Service processes and cleans the content
4. Service submits the processed content to the consumer canister
5. Service stores raw HTML locally for backup
6. Admin portal and client portal access the processed content from the storage canister

## Configuration

- `PORT`: The port to run the server on (default: 3000)
- `DATA_DIR`: The directory to store raw HTML files (default: ./data)
- `STORAGE_LIMIT_MB`: The maximum amount of disk space to use for storage (default: 500MB)
- `IC_HOST`: The Internet Computer host URL (default: https://icp0.io)
- `CONSUMER_CANISTER_ID`: The ID of the consumer canister

## Digital Ocean Deployment

This service is designed to be deployed on a Digital Ocean droplet. The current deployment is at:

```
http://143.244.133.154:3000
```

To deploy a new version:

1. SSH into the Digital Ocean droplet
2. Navigate to the project directory
3. Pull the latest changes
4. Install dependencies
5. Restart the service using PM2
