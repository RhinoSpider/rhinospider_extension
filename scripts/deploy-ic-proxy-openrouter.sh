#!/bin/bash

# Deploy updated IC proxy with OpenRouter support to Digital Ocean

echo "================================================"
echo "Deploying IC Proxy with OpenRouter Support"
echo "================================================"
echo ""

# First, commit the changes locally
echo "1. Committing local changes..."
git add services/ic-proxy/server.js AI_INTEGRATION.md SECURITY_FIXES.md DEPLOYMENT_SUMMARY.md test-openrouter-ai.sh
git commit -m "Add OpenRouter support for free AI models

- Updated IC proxy to support both OpenAI and OpenRouter
- Detects provider and sets correct base URL automatically
- Added comprehensive AI integration guide
- Created test script for OpenRouter
- Updated security documentation" || echo "Nothing to commit or already committed"

echo ""
echo "2. Pushing to repository..."
git push origin main

echo ""
echo "================================================"
echo "Now SSH into Digital Ocean and run these commands:"
echo "================================================"
echo ""
echo "ssh root@your-droplet-ip"
echo ""
echo "# Navigate to IC proxy directory"
echo "cd /path/to/rhinospider/services/ic-proxy"
echo ""
echo "# Pull latest changes"
echo "git pull origin main"
echo ""
echo "# Install any new dependencies (just in case)"
echo "npm install"
echo ""
echo "# Restart IC proxy service"
echo "pm2 restart ic-proxy"
echo ""
echo "# Check logs to verify it's running"
echo "pm2 logs ic-proxy --lines 50"
echo ""
echo "================================================"
echo "After deployment, test with:"
echo "================================================"
echo ""
echo "curl -X POST http://your-ic-proxy-url:3001/api/process-with-ai \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"content\": \"OpenAI has released GPT-4...\","
echo "    \"aiConfig\": {"
echo "      \"enabled\": true,"
echo "      \"apiKey\": \"sk-or-v1-YOUR-KEY-HERE\","
echo "      \"model\": \"meta-llama/llama-3.1-8b-instruct:free\","
echo "      \"provider\": \"openrouter\","
echo "      \"maxTokensPerRequest\": 150,"
echo "      \"features\": {"
echo "        \"summarization\": true,"
echo "        \"keywordExtraction\": true,"
echo "        \"categorization\": true,"
echo "        \"sentimentAnalysis\": true"
echo "      }"
echo "    }"
echo "  }'"
echo ""
