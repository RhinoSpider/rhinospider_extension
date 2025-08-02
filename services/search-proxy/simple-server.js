/**
 * Simple Search Proxy Server
 *
 * This is a simplified version of the search proxy server that includes
 * the missing /api/search/urls endpoint.
 */

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3002;

// Configure middleware
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-device-id'],
  exposedHeaders: ['Access-Control-Allow-Origin'],
  credentials: false,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('[/api/health] Health check requested');
  res.json({
    status: 'ok',
    service: 'search-proxy',
    timestamp: new Date().toISOString()
  });
});

// Search endpoint
app.post('/api/search', (req, res) => {
  try {
    const { query, limit = 10, domain, extensionId } = req.body;
    const deviceId = req.headers['x-device-id'];

    console.log(`[/api/search] Search requested: query=${query}, limit=${limit}, domain=${domain}, extensionId=${extensionId}, deviceId=${deviceId}`);

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Return a response with search results
    console.log(`[/api/search] Returning search results for query: ${query}`);

    const searchResults = {
      urls: [
        `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
        `https://duckduckgo.com/?q=${encodeURIComponent(query)}`
      ],
      message: 'Search results'
    };

    return res.json(searchResults);
  } catch (error) {
    console.error(`[/api/search] Error processing search request: ${error.message}`);
    return res.status(500).json({ error: 'Failed to process search request', details: error.message });
  }
});

// URLs endpoint for topic-based URL retrieval
app.post('/api/search/urls', (req, res) => {
  try {
    const { topics, batchSize = 5, reset = false, extensionId } = req.body;
    const deviceId = req.headers['x-device-id'];

    console.log(`[/api/search/urls] URLs requested: topics=${JSON.stringify(topics)}, batchSize=${batchSize}, reset=${reset}, extensionId=${extensionId}, deviceId=${deviceId}`);

    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid topics array' });
    }

    // Create a response object with URLs for each topic
    const urls = {};

    topics.forEach(topic => {
      const topicId = topic.id;
      const topicName = topic.name;

      // Generate URLs for this topic
      urls[topicId] = [];

      // Add some example URLs
      if (topicName.toLowerCase().includes('tech') || topicName.toLowerCase().includes('technology')) {
        urls[topicId] = [
          {
            url: "https://en.wikipedia.org/wiki/Technology_journalism",
            topicId: topicId,
            topicName: topicName
          },
          {
            url: "https://en.wikipedia.org/wiki/Tech_Engineering_News",
            topicId: topicId,
            topicName: topicName
          },
          {
            url: "https://en.wikipedia.org/wiki/Worcester_Polytechnic_Institute",
            topicId: topicId,
            topicName: topicName
          },
          {
            url: "https://en.wikipedia.org/wiki/Virginia_Tech_shooting",
            topicId: topicId,
            topicName: topicName
          },
          {
            url: "https://en.wikipedia.org/wiki/Future_plc",
            topicId: topicId,
            topicName: topicName
          }
        ].slice(0, batchSize);
      } else {
        urls[topicId] = [
          {
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(topicName)}`,
            topicId: topicId,
            topicName: topicName
          },
          {
            url: `https://www.britannica.com/topic/${encodeURIComponent(topicName.toLowerCase())}`,
            topicId: topicId,
            topicName: topicName
          },
          {
            url: `https://www.sciencedirect.com/topics/${encodeURIComponent(topicName.toLowerCase())}`,
            topicId: topicId,
            topicName: topicName
          },
          {
            url: `https://www.jstor.org/topic/${encodeURIComponent(topicName.toLowerCase())}`,
            topicId: topicId,
            topicName: topicName
          },
          {
            url: `https://www.researchgate.net/topic/${encodeURIComponent(topicName.toLowerCase())}`,
            topicId: topicId,
            topicName: topicName
          }
        ].slice(0, batchSize);
      }
    });

    // Return the response
    return res.json({
      urls: urls,
      totalUrls: Object.values(urls).reduce((sum, arr) => sum + arr.length, 0),
      timestamp: new Date().toISOString(),
      quotaInfo: {}
    });
  } catch (error) {
    console.error(`[/api/search/urls] Error processing URLs request: ${error.message}`);
    return res.status(500).json({ error: 'Failed to process URLs request', details: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Search Proxy server running on port ${PORT}`);
});

module.exports = app;
