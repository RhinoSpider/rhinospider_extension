require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const searchRouter = require('./routes/search');
const { initializeUrlCache } = require('./services/initializeCache');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Apply security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Routes
app.use('/api/search', searchRouter);

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

// Initialize URL cache with real search results, then start server
async function startServer() {
  try {
    // Initialize URL cache with real search results from DuckDuckGo
    await initializeUrlCache();
    
    // Start server after initialization
    app.listen(PORT, () => {
      console.log(`Search proxy server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize URL cache:', error);
    console.log('Starting server without initialized cache...');
    
    // Start server even if initialization fails
    app.listen(PORT, () => {
      console.log(`Search proxy server running on port ${PORT}`);
    });
  }
}

// Start the server
startServer();

module.exports = app;
