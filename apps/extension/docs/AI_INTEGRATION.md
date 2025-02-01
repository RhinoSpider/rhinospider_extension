# AI Integration Documentation

## Current Implementation

### Overview
The extension uses AI to dynamically analyze search terms and generate scraping configurations. This allows for flexible and intelligent data extraction without hardcoding rules for each data type.

### AI Options Comparison

1. **OpenAI GPT-3.5 (Current)**
   - Cost: ~$0.002 per request
   - Pros: Ready to use, highly accurate
   - Cons: Requires API key, ongoing costs

2. **Self-hosted Open Source Alternatives**
   - Option 1: **LangChain + Llama 2**
     - Cost: Server hosting only (~$10-20/month on DigitalOcean)
     - Pros: Free to use, one-time setup
     - Cons: Requires server setup, lower accuracy
     - Setup: Can be deployed on a $10/month DigitalOcean droplet

   - Option 2: **LocalAI + Mistral-7B**
     - Cost: Server hosting only
     - Pros: Better accuracy than Llama 2, free to use
     - Cons: Higher resource requirements

3. **Hybrid Approach (Recommended)**
   - Use cached responses for common patterns
   - Fall back to AI only for new patterns
   - Estimated cost reduction: 80-90%

### Current Prompt Structure
```javascript
{
  role: "system",
  content: "You are a web scraping assistant. Based on the search term, return a JSON object with: 1) relevant APIs to get this data, 2) what fields to extract, 3) type of content"
}
```

### Caching Strategy
1. Cache key: Hash of search term + configuration
2. Cache duration: 7 days for stable data sources
3. Cache invalidation: Manual through admin interface

## Setup Instructions

1. For OpenAI (current implementation):
   ```bash
   # Add to extension settings
   OPENAI_API_KEY=your_key_here
   ```

2. For self-hosted alternative:
   ```bash
   # Deploy on DigitalOcean
   docker run -d \
     -p 8080:8080 \
     -v ~/models:/models \
     localai/localai
   ```

## Planned Improvements

1. Enhanced Prompt Engineering
   ```javascript
   {
     role: "system",
     content: `You are a web scraping expert. Analyze the search term and provide:
       1. Primary and fallback APIs
       2. Required headers and authentication
       3. Data transformation rules
       4. Rate limiting suggestions
       5. Caching recommendations
       Format response as JSON with these exact fields.`
   }
   ```

2. Caching Implementation
   - Use IndexedDB for local storage
   - Sync with backend periodically
   - Share cache across users

3. Error Handling
   - Fallback APIs on failure
   - Rate limiting protection
   - Data validation
