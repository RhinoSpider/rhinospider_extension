require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const searchRouter = require('./routes/search');
const { initializeUrlCache } = require('./services/initializeCache');
const { initUserQuotaSystem } = require('./services/userQuotaManager');
const { initBackgroundSync } = require('./services/scrapedUrlsTracker');
const { getRateLimitConfig, setupRateLimitEndpoints } = require('./rateLimitConfig');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3002;

// Apply security middleware
app.use(helmet());

// Enable CORS directly in the application for Chrome extension access
app.use(cors({
  origin: '*', // Allow all origins to ensure the extension can access it
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-device-id'],
  exposedHeaders: ['Access-Control-Allow-Origin'],
  credentials: false, // Set to false to avoid preflight issues
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Add additional headers to ensure CORS works properly
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-device-id');
  next();
});


app.use(express.json());
app.use(morgan('combined'));

// Rate limiting
// Dynamic rate limiter that uses config
const createRateLimiter = () => {
  const config = getRateLimitConfig();
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: config.skipSuccessfulRequests,
    skipFailedRequests: config.skipFailedRequests,
    message: 'Too many requests, please try again later.'
  });
};

const limiter = createRateLimiter();

// Apply rate limiting only to search endpoints, not health checks or admin
app.use('/api/search', limiter);

// Setup admin endpoints for rate limit management
setupRateLimitEndpoints(app);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'search-proxy', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/search', searchRouter);

// Fetch data endpoint to scrape web content
app.get('/api/fetch-data', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    console.log(`[fetch-data] Fetching content from: ${url}`);
    
    // Validate URL
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    // Fetch the content using axios with proper headers
    const axios = require('axios');
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 30000,
      maxRedirects: 5,
      validateStatus: function (status) {
        return status >= 200 && status < 400; // Accept redirects
      }
    });
    
    // Return the HTML content
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(response.data);
    
  } catch (error) {
    console.error('[fetch-data] Error fetching URL:', error.message);
    
    // Return appropriate error status
    if (error.response) {
      res.status(error.response.status).json({ 
        error: `Failed to fetch URL: ${error.response.statusText}` 
      });
    } else if (error.code === 'ECONNABORTED') {
      res.status(504).json({ error: 'Request timeout' });
    } else {
      res.status(500).json({ error: 'Failed to fetch content' });
    }
  }
});

// Direct endpoint for compatibility with extension
app.post('/api/search', (req, res) => {
  // Forward the request to the /urls endpoint
  req.url = '/urls';
  searchRouter(req, res);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Import IC proxy client service (for communicating with the consumer canister)
const { isConsumerCanisterAvailable } = require('./services/consumerCanisterService');

// Initialize URL cache, user quota system, and scraped URLs tracker, then start server
async function startServer() {
  try {
    console.log('Initializing URL cache system...');
    await initializeUrlCache();
    console.log('URL cache system initialized and ready');
    
    console.log('Initializing user quota system...');
    const quotaSystemInfo = await initUserQuotaSystem();
    console.log(`User quota system initialized with ${quotaSystemInfo.userCount} users`);
    
    console.log('Initializing scraped URLs tracker and background sync...');
    initBackgroundSync();
    console.log('Scraped URLs tracker and background sync initialized');
    
    // Check IC proxy availability (for consumer canister integration)
    console.log('Checking IC proxy availability...');
    const icProxyAvailable = await isConsumerCanisterAvailable();
    console.log(`IC proxy is ${icProxyAvailable ? 'available' : 'not available'} for consumer canister integration`);
    console.log('Note: This is just checking the connection to the IC proxy, not deploying anything to the actual consumer canister');
    
    // Start server after initialization
    app.listen(PORT, () => {
      console.log(`Search proxy server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize systems:', error);
    console.log('Starting server without complete initialization...');
    
    // Start server even if initialization fails
    app.listen(PORT, () => {
      console.log(`Search proxy server running on port ${PORT} (with limited functionality)`);
    });
  }
}

// Start the server
startServer();

module.exports = app;
