const express = require('express');
const { createDirectStorageRouter } = require('./direct-storage-endpoint');

/**
 * Creates a router for consumer endpoints
 * @param {Object} options - Configuration options
 * @returns {express.Router} - Express router
 */
function createConsumerEndpointsRouter(options) {
  const router = express.Router();
  
  // Get the direct storage router which has our new endpoints
  const directStorageRouter = createDirectStorageRouter(options);
  
  // Mount the direct storage router
  router.use('/', directStorageRouter);
  
  // Health check endpoint
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'consumer-endpoints' });
  });
  
  return router;
}

module.exports = {
  createConsumerEndpointsRouter
};
