// integrate-endpoint.js
// This script integrates the direct storage endpoint with the existing server

// Load required modules
require('./bigint-patch');
const express = require('express');
const directStorageEndpoint = require('./direct-storage-endpoint');

// Create a new Express app for the direct endpoint
const app = express();
app.use(express.json());

// Add the direct storage endpoint
const directStorageRouter = directStorageEndpoint.createDirectStorageRouter();
app.use('/api', directStorageRouter);

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'direct-storage-endpoint' });
});

// Start the server on a different port
const PORT = process.env.PROXY_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Direct storage endpoint listening on port ${PORT}`);
  console.log(`Direct submit endpoint available at: http://localhost:${PORT}/api/direct-submit`);
});
