# AI Integration Guide

## Current Status

AI processing is **currently disabled** in production. The infrastructure exists but isn't active because the storage canister has an empty API key.

### What AI Does

When enabled, AI processes scraped content to extract:
- **Summary**: 2-3 sentence overview of the content
- **Keywords**: 5-10 important keywords from the content
- **Category**: Content classification (Technology, Business, Science, etc.)
- **Sentiment**: Positive, negative, or neutral sentiment analysis

This turns raw HTML (100MB+) into useful 1-5KB of analyzed data.

## How to Enable AI

You have two options: OpenAI (paid) or OpenRouter (free models available).

### Option 1: OpenAI (Paid but Reliable)

1. Get API key from https://platform.openai.com/api-keys
2. Update storage canister:
```bash
dfx canister --network ic call storage updateAIConfig '(
  record {
    enabled = true;
    apiKey = "sk-your-openai-key-here";
    model = "gpt-3.5-turbo";
    maxTokensPerRequest = 150;
    provider = "openai";
    features = record {
      summarization = true;
      keywordExtraction = true;
      categorization = true;
      sentimentAnalysis = true;
    };
  }
)'
```

**Cost**: ~$0.002 per 1K tokens (very cheap for GPT-3.5-turbo)

### Option 2: OpenRouter (FREE Models Available!)

OpenRouter gives you access to multiple AI providers including **free models**.

1. Get API key from https://openrouter.ai/keys (free signup)
2. Update storage canister:
```bash
dfx canister --network ic call storage updateAIConfig '(
  record {
    enabled = true;
    apiKey = "sk-or-v1-your-openrouter-key-here";
    model = "meta-llama/llama-3.1-8b-instruct:free";
    maxTokensPerRequest = 150;
    provider = "openrouter";
    features = record {
      summarization = true;
      keywordExtraction = true;
      categorization = true;
      sentimentAnalysis = true;
    };
  }
)'
```

**Cost**: FREE for the models listed below!

### Recommended Free Models on OpenRouter

All these models work great for our use case:

1. **`meta-llama/llama-3.1-8b-instruct:free`** (Recommended!)
   - Fast and accurate
   - Great for summarization and categorization
   - 8B parameters, very capable

2. **`google/gemma-2-9b-it:free`**
   - Google's open model
   - Good for keyword extraction
   - Fast response times

3. **`mistralai/mistral-7b-instruct:free`**
   - Reliable and consistent
   - Good general-purpose model
   - Fast inference

4. **`meta-llama/llama-3.2-3b-instruct:free`**
   - Smaller, faster model
   - Still very good for our tasks
   - Lower latency

### How It Works

The IC proxy's `/api/process-with-ai` endpoint now supports both providers:

**OpenAI Request:**
```javascript
{
  "content": "Article content here...",
  "aiConfig": {
    "enabled": true,
    "apiKey": "sk-...",
    "model": "gpt-3.5-turbo",
    "provider": "openai",
    "features": {
      "summarization": true,
      "keywordExtraction": true,
      "categorization": true,
      "sentimentAnalysis": true
    }
  }
}
```

**OpenRouter Request:**
```javascript
{
  "content": "Article content here...",
  "aiConfig": {
    "enabled": true,
    "apiKey": "sk-or-v1-...",
    "model": "meta-llama/llama-3.1-8b-instruct:free",
    "provider": "openrouter",
    "features": {
      "summarization": true,
      "keywordExtraction": true,
      "categorization": true,
      "sentimentAnalysis": true
    }
  }
}
```

The only difference is:
- `provider`: "openai" or "openrouter"
- `model`: Different model name format
- OpenRouter automatically uses `https://openrouter.ai/api/v1` as base URL

## Why OpenRouter is Perfect for Us

1. **FREE models** - no cost for development and testing
2. **OpenAI-compatible API** - same code works for both
3. **Multiple providers** - can switch models easily
4. **No vendor lock-in** - not tied to one provider
5. **Rate limits are generous** - plenty for our needs

## Testing AI Processing

After enabling AI, you can test it:

```bash
# Test the endpoint
curl -X POST http://your-ic-proxy:3001/api/process-with-ai \
  -H "Content-Type: application/json" \
  -d '{
    "content": "OpenAI has released GPT-4, a large multimodal model that accepts image and text inputs.",
    "aiConfig": {
      "enabled": true,
      "apiKey": "sk-or-v1-your-key",
      "model": "meta-llama/llama-3.1-8b-instruct:free",
      "provider": "openrouter",
      "maxTokensPerRequest": 150,
      "features": {
        "summarization": true,
        "keywordExtraction": true,
        "categorization": true,
        "sentimentAnalysis": true
      }
    }
  }'
```

Expected response:
```json
{
  "ok": {
    "summary": "OpenAI has launched GPT-4, a new multimodal AI model capable of processing both text and image inputs.",
    "keywords": ["OpenAI", "GPT-4", "multimodal", "AI", "machine learning", "image processing", "text inputs"],
    "category": "Technology",
    "sentiment": "positive"
  }
}
```

## When to Enable AI

### Now (Development/Testing):
- Use OpenRouter free models
- Test that processing works
- Validate data quality
- No cost!

### Later (Production):
- Consider switching to OpenAI's GPT-3.5-turbo for consistency
- Or stick with OpenRouter free models if quality is good
- Monitor usage and costs

## Implementation Details

The IC proxy (`services/ic-proxy/server.js`) handles both providers transparently:

```javascript
// Automatically detects provider and sets correct base URL
const clientConfig = {
  apiKey: aiConfig.apiKey
};

if (aiConfig.provider === 'openrouter') {
  clientConfig.baseURL = 'https://openrouter.ai/api/v1';
}

const openai = new OpenAI(clientConfig);
// Works for both OpenAI and OpenRouter!
```

## Advantages Over Competitors

Remember: This is what makes us 100x more efficient than GRASS:

- **GRASS**: Stores 100MB+ raw HTML per page
- **Us**: Store 1-5KB analyzed data per page
- **Result**: Perfect fit for IC storage, clear B2B value

## Get Started

1. Sign up for OpenRouter: https://openrouter.ai/
2. Get your free API key
3. Update storage canister with config above
4. Start scraping and watch AI process content automatically!

No credit card needed for free models!
