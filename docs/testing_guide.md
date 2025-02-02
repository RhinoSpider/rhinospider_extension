# RhinoSpider Testing Guide

This guide explains how to test and demonstrate the RhinoSpider extension's functionality, particularly focusing on the AI content aggregation features.

## Prerequisites

1. Make sure you have the following running:
   - Local ICP replica (`dfx start`)
   - Backend server (`cd apps/backend && node server.js`)
   - Extension in development mode

## Test Data

We have populated the storage canister with test content from various sources:

1. **GitHub Example**
   - Title: "Advanced AI Project"
   - Topics: AI, Machine Learning
   - Features: Deep learning, BERT implementation
   - Tech Stack: Python, TensorFlow, PyTorch

2. **Dev.to Tutorial**
   - Title: "Building LLMs with Transformers"
   - Topics: AI, NLP, Machine Learning
   - Features: Transformer architecture, LLM training
   - Tech Stack: Python, PyTorch, Transformers

3. **Medium Article**
   - Title: "Ethics in AI: A Practical Guide"
   - Topics: AI, Ethics, Responsible AI
   - Features: Bias analysis, responsible development
   - Tech Stack: Python, TensorFlow, Ethics-AI

## Demo Steps

1. **Start Local Environment**
   ```bash
   # Terminal 1: Start ICP replica
   cd canisters
   dfx start --clean

   # Terminal 2: Deploy canisters
   cd canisters
   dfx deploy

   # Terminal 3: Start backend server
   cd apps/backend
   node server.js
   ```

2. **Test API Endpoint**
   ```bash
   # Test the API directly
   curl "http://localhost:3001/api/content/topic/artificial-intelligence"
   ```

3. **Extension Testing**
   - Open the extension in development mode
   - Search for different topics:
     - "artificial-intelligence" - Should show all content
     - "ethics" - Should show the Medium article
     - "nlp" - Should show the Dev.to tutorial

4. **Features to Demonstrate**
   - Content aggregation from multiple sources
   - Topic-based filtering
   - Rich metadata display:
     - Source icons (GitHub 🐙, Dev.to 👩‍💻, Medium 📝)
     - Engagement metrics (stars ⭐, reactions ❤️, claps 👏, comments 💬)
     - Publication dates
     - Reading time estimates
     - Tech stack tags

5. **Error Handling**
   - Try searching for non-existent topics
   - Test offline behavior
   - Check error messages

## Expected Results

When searching for "artificial-intelligence", you should see:
1. Three articles from different sources
2. Each article should show:
   - Title and author
   - Source icon
   - Publication date
   - Engagement metrics
   - Topic tags
   - Summary
   - AI analysis key points

## Troubleshooting

1. **No Results Showing**
   - Check if the backend server is running (http://localhost:3001)
   - Verify ICP replica is running (`dfx info replica-port`)
   - Check browser console for errors

2. **Backend Server Issues**
   - Verify port 3001 is not in use
   - Check if canisters are deployed (`dfx canister status storage`)

3. **Data Issues**
   - Use `dfx canister call storage getContentByTopic '("artificial-intelligence", 10)'` to verify data

## Next Steps

Future enhancements planned:
1. Real-time content scraping
2. More source integrations
3. Advanced filtering options
4. User preferences and bookmarks
