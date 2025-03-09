// Start the server with direct storage endpoint integration
// This script loads the original server.js and adds the direct storage endpoint

// First, require the original server module
console.log('Loading original server module...');
require('./server');

// Then load the direct endpoint integration module
console.log('Loading direct endpoint integration module...');
const directEndpointIntegration = require('./integrate-direct-endpoint');

// Apply the integration to the Express app
// This needs to be done after the app is created but before it starts listening
console.log('Waiting for server initialization...');

// Wait for the server to initialize
setTimeout(() => {
  // Try to get the Express app instance
  // It might be exported by server.js or set as a global variable
  const app = global.app || require('./server').app;
  
  if (app) {
    console.log('Found Express app instance, integrating direct endpoint...');
    directEndpointIntegration.integrateDirectEndpoint(app);
    console.log('Direct endpoint integration complete!');
    
    // Log instructions for testing
    console.log('\nDirect Storage Endpoint is now active!');
    console.log('To test the endpoint: curl -X POST -H "Authorization: Bearer ffGpA2saNS47qr" -H "Content-Type: application/json" -d \'{"url":"https://example.com","content":"Test content","topicId":"test-topic"}\' http://localhost:3001/api/direct-submit');
  } else {
    console.error('Could not find Express app instance. Direct endpoint integration failed.');
    console.error('Please modify the server.js file to export the app or set it as a global variable.');
  }
}, 1000); // Wait 1 second for server initialization

// Note: This script doesn't modify the original server.js file
// It just extends its functionality at runtime
