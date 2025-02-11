# RhinoSpider AI Integration

## Overview
RhinoSpider uses AI to enhance web scraping capabilities through intelligent content analysis, data extraction, and topic classification. The AI integration helps make the scraping process more accurate and adaptable.

## Implementation Details

### Current Implementation
The extension uses AI to dynamically analyze search terms and generate scraping configurations. This allows for flexible and intelligent data extraction without hardcoding rules for each data type.

### AI Options

1. **OpenAI GPT-3.5 (Current)**
   - Cost: ~$0.002 per request
   - Pros: Ready to use, highly accurate
   - Cons: Requires API key, ongoing costs

2. **Self-hosted Open Source Alternatives**
   - Option: **LangChain + Llama 2**
     - Cost: Server hosting only (~$10-20/month on DigitalOcean)
     - Pros: Free to use, one-time setup
     - Cons: Requires server setup, lower accuracy
     - Setup: Can be deployed on a $10/month DigitalOcean droplet

## Key Features

### 1. Content Analysis
- Uses AI to analyze webpage content and determine its relevance to configured topics
- Identifies key information and data points within unstructured text
- Helps filter out irrelevant content and noise

### 2. Smart Data Extraction
- Dynamically adapts to different webpage layouts and structures
- Extracts structured data even when HTML patterns change
- Understands context and relationships between data points

### 3. Topic Classification
- Automatically categorizes content into configured topics
- Identifies subtopics and related themes
- Helps maintain organized and well-categorized data

## Implementation

### 1. Extraction Rules
```typescript
interface ExtractionField {
    name: string;
    fieldType: string;
    required: boolean;
    aiPrompt: string;
}
```

### 2. AI Processing Flow
1. User configures extraction rules with AI prompts
2. System fetches webpage content
3. AI processes content using prompts
4. Results are validated and stored

### 3. Error Handling
- Graceful fallback for AI service outages
- Retry logic for failed requests
- Validation of AI responses

## Local Development

For local development and testing:
1. Use the `testExtractionLocal` endpoint that bypasses HTTP requests
2. Provide HTML content directly for testing
3. Configure extraction rules as needed

Example test call:
```bash
dfx canister call storage testExtractionLocal '(
  record { 
    html_content = "<div>...</div>";
    extraction_rules = record {
      fields = vec {
        record {
          name = "field_name";
          fieldType = "text";
          aiPrompt = "Extract...";
          required = true
        }
      };
      custom_prompt = null
    }
  }
)'
```

## Production Deployment

When deploying to production:
1. Set up OpenAI API key
2. Configure rate limiting
3. Monitor AI usage and costs
4. Use proper error handling and logging

## Future Improvements

1. **Model Optimization**
   - Fine-tune models for specific use cases
   - Implement model caching
   - Optimize prompt engineering

2. **Cost Reduction**
   - Implement batching for similar requests
   - Cache common extractions
   - Consider self-hosted alternatives

3. **Quality Improvements**
   - Add confidence scores
   - Implement cross-validation
   - Add human feedback loop
