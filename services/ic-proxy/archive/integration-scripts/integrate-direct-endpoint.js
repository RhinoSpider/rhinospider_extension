// Integrate Direct Storage Endpoint
// This script adds the direct storage endpoint to the existing server
// without modifying any working code

// Import the direct storage endpoint module
const directStorageEndpoint = require('./direct-storage-endpoint');

// Function to integrate the direct storage endpoint
const integrateDirectEndpoint = (app) => {
  console.log('[DirectEndpointIntegration] Adding direct storage endpoint to server...');
  
  try {
    // Create the direct storage router
    const directStorageRouter = directStorageEndpoint.createDirectStorageRouter();
    
    // Mount the router at /api
    app.use('/api', directStorageRouter);
    
    console.log('[DirectEndpointIntegration] Direct storage endpoint added successfully!');
    console.log('[DirectEndpointIntegration] New endpoint available: POST /api/direct-submit');
    
    return true;
  } catch (error) {
    console.error('[DirectEndpointIntegration] Error adding direct storage endpoint:', error);
    return false;
  }
};

// Export the integration function
module.exports = {
  integrateDirectEndpoint
};
