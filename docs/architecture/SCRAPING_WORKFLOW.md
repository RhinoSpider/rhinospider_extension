# RhinoSpider Scraping Architecture

## Overview

RhinoSpider uses a Topic-based scraping system where each Topic defines what to scrape, how to scrape it, and when to scrape it.

## Components

### 1. Topics
A Topic represents a specific type of content to scrape:
- **Basic Info**:
  - Name and description
  - Target URL
  - Status (active/inactive)

- **Scheduling**:
  - `scrapingInterval`: How often to scrape (in seconds)
  - `activeHours`: When scraping is allowed (UTC hours)
  - `lastScraped`: Last successful scrape timestamp
  - `maxRetries`: Maximum retry attempts per URL

- **AI Configuration**:
  - Model (gpt-4, gpt-3.5-turbo)
  - Temperature
  - Max tokens
  - Cost limits (daily/monthly)

- **Extraction Rules**:
  - Fields to extract
  - Custom prompts
  - Field requirements

### 2. Extension Workflow

1. **Topic Discovery**:
   - Extension fetches active topics from admin canister
   - Filters topics based on scheduling:
     - Within active hours
     - Enough time passed since last scrape
     - Topic is active

2. **Scraping Process**:
   ```
   For each active topic:
   1. Check scheduling conditions
   2. If ready to scrape:
      - Extract content using topic's rules
      - Process with AI using topic's config
      - Update lastScraped timestamp
      - Update analytics
   ```

3. **Error Handling**:
   - Track failed attempts
   - Respect maxRetries limit
   - Log errors for analytics

### 3. AI Processing

1. **Content Extraction**:
   - Use topic's extraction rules
   - Apply custom prompts if specified
   - Validate required fields

2. **Quality Control**:
   - Use AI config parameters
   - Track token usage
   - Monitor cost limits

3. **Cost Management**:
   - Track daily/monthly costs
   - Stop processing if limits reached
   - Alert admins on high usage

## Example Topic

```json
{
  "id": "crypto-news",
  "name": "Cryptocurrency News",
  "description": "Latest crypto news and updates",
  "url": "https://example.com/crypto",
  "status": "active",
  "aiConfig": {
    "model": "gpt-4",
    "temperature": 0.7,
    "maxTokens": 2000,
    "costLimits": {
      "maxDailyCost": 10,
      "maxMonthlyCost": 100
    }
  },
  "extractionRules": {
    "fields": [
      {
        "name": "title",
        "description": "Article title",
        "required": true
      },
      {
        "name": "summary",
        "description": "Brief summary",
        "required": true
      }
    ],
    "customPrompt": "Extract key information from crypto news articles"
  },
  "scrapingInterval": 3600,
  "activeHours": {
    "start": 0,
    "end": 23
  },
  "maxRetries": 3
}
```

## Analytics

1. **Per Topic**:
   - Success/failure rates
   - Data quality scores
   - Processing costs
   - Scraping frequency

2. **System-wide**:
   - Total pages scraped
   - Cost utilization
   - Error patterns
   - Performance metrics

## Best Practices

1. **Scheduling**:
   - Set reasonable intervals (1+ hours)
   - Consider target site's update frequency
   - Use active hours to respect site's peak times

2. **AI Config**:
   - Start with conservative cost limits
   - Use lower temperature for factual extraction
   - Adjust maxTokens based on content size

3. **Extraction Rules**:
   - Keep fields focused and specific
   - Use clear field descriptions
   - Test rules before activating
