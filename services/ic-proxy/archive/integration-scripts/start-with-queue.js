// Start the server with queue integration
// This script loads the original server.js and applies the queue integration patch

// First, load the original server module
console.log('Loading original server module...');
const originalServer = require('./server');

// Then load the queue integration module
console.log('Loading queue integration module...');
const queueIntegration = require('./server-queue-integration');

// Apply the patch to the Express app
// This needs to be done after the app is created but before it starts listening
console.log('Applying queue integration patch...');

// The app is already created and routes are defined in server.js
// We just need to wait for it to be fully initialized
setTimeout(() => {
  // Get the Express app instance
  const app = originalServer.app || global.app;
  
  if (app) {
    console.log('Found Express app instance, applying patch...');
    queueIntegration.patchServer(app);
    console.log('Queue integration patch applied successfully!');
    
    // Log instructions for testing
    console.log('\nQueue Integration is now active!');
    console.log('To check queue status: curl http://localhost:3001/api/queue-status');
    console.log('Failed submissions will be automatically queued and retried every 5 minutes');
  } else {
    console.error('Could not find Express app instance. Queue integration not applied.');
    console.error('Make sure the server.js file exports the app or sets it as a global variable.');
  }
}, 1000); // Wait 1 second for server initialization

// Note: This script doesn't modify the original server.js file
// It just extends its functionality at runtime
