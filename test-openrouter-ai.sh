#!/bin/bash

# Test OpenRouter AI processing with free model

echo "Testing OpenRouter AI with free Llama model..."
echo ""

# Test content
CONTENT="OpenAI has released GPT-4, a large multimodal model that accepts image and text inputs. The model demonstrates human-level performance on various professional benchmarks and has been trained with human feedback. This advancement represents a significant step in artificial intelligence development."

# Your OpenRouter API key
API_KEY="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"

# IC Proxy URL (update if different)
IC_PROXY_URL="http://localhost:3001"

echo "Sending request to IC proxy..."
echo "Content: ${CONTENT:0:100}..."
echo ""

# Make the API call
curl -X POST "$IC_PROXY_URL/api/process-with-ai" \
  -H "Content-Type: application/json" \
  -d "{
    \"content\": \"$CONTENT\",
    \"aiConfig\": {
      \"enabled\": true,
      \"apiKey\": \"$API_KEY\",
      \"model\": \"meta-llama/llama-3.1-8b-instruct:free\",
      \"provider\": \"openrouter\",
      \"maxTokensPerRequest\": 150,
      \"features\": {
        \"summarization\": true,
        \"keywordExtraction\": true,
        \"categorization\": true,
        \"sentimentAnalysis\": true
      }
    }
  }" | jq .

echo ""
echo "Done! Check the output above for AI-processed data."
