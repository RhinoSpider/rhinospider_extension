# Extension

## Privacy-First Design

- **NEVER** accesses user's browsing history, open tabs, or personal data.
- **ONLY** works as a background process based on server-provided topics.
- **NEVER** opens new tabs or pages.
- **NEVER** tracks what the user is browsing.

## Scraping Implementation

- **URL Generation**: URLs are generated based on topic configurations from the server, including RSS feeds, sitemaps, and a search proxy service.
- **Content Scraping**: The extension uses the `fetch` API to scrape content in a background service worker.
- **Data Submission**: Scraped data is submitted to the IC Proxy with retry logic.

## Data Structures

- **Topic**: Contains information about what to scrape, including URL patterns, content identifiers, and extraction rules.
- **ScrapedContent**: Contains the scraped URL, HTML content, topic ID, and status.
- **StoredIdentity**: Contains the delegation chain from Internet Identity.

## Storage

The extension uses `chrome.storage.local` to store topics, scraped content, and authentication information.
