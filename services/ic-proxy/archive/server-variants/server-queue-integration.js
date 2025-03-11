// Server Queue Integration
// This module patches the server.js file to integrate the queue manager
// without modifying any existing code

// Import the data queue manager
const dataQueueManager = require('./data-queue-manager');

// Function to patch the server
const patchServer = (app) => {
  console.log('[QueueIntegration] Patching server with queue integration...');
  
  // Add queue status endpoint
  app.get('/api/queue-status', (req, res) => {
    const status = dataQueueManager.getQueueStatus();
    res.json(status);
  });
  
  // Patch the original request handler to add queue functionality
  const originalPost = app.post;
  
  app.post = function(path, ...handlers) {
    // Only patch the submit endpoint
    if (path === '/api/submit') {
      console.log('[QueueIntegration] Patching /api/submit endpoint');
      
      // Get the original handler
      const originalHandler = handlers[handlers.length - 1];
      
      // Create a new handler that wraps the original
      const newHandler = async (req, res) => {
        try {
          // Call the original handler
          const originalRes = {
            status: function(code) {
              // Capture the status code
              this.statusCode = code;
              return this;
            },
            json: function(data) {
              // Capture the response data
              this.responseData = data;
              return this;
            }
          };
          
          await originalHandler(req, originalRes);
          
          // Check if the response indicates a NotAuthorized error
          if (originalRes.responseData && 
              originalRes.responseData.err && 
              originalRes.responseData.err.NotAuthorized !== undefined) {
            
            console.log('[QueueIntegration] Detected NotAuthorized error, adding to queue');
            
            // Add the submission to the queue
            const submissionData = {
              ...req.body,
              queuedAt: Date.now()
            };
            
            dataQueueManager.addToQueue(submissionData);
            
            // Modify the response to indicate queuing
            const modifiedResponse = {
              ...originalRes.responseData,
              queued: true,
              queueStatus: dataQueueManager.getQueueStatus()
            };
            
            // Send the modified response
            res.status(originalRes.statusCode || 200).json(modifiedResponse);
          } else {
            // Send the original response
            res.status(originalRes.statusCode || 200).json(originalRes.responseData);
          }
        } catch (error) {
          console.error('[QueueIntegration] Error in patched handler:', error);
          res.status(500).json({ error: 'Internal server error in patched handler' });
        }
      };
      
      // Replace the original handler with the new one
      const newHandlers = [...handlers.slice(0, -1), newHandler];
      return originalPost.call(this, path, ...newHandlers);
    }
    
    // For all other endpoints, use the original implementation
    return originalPost.call(this, path, ...handlers);
  };
  
  console.log('[QueueIntegration] Server patched successfully');
  
  // Set up scheduled queue processing
  const scheduleQueueProcessing = () => {
    const PROCESSING_INTERVAL = 5 * 60 * 1000; // 5 minutes
    
    console.log('[QueueIntegration] Setting up scheduled queue processing every 5 minutes');
    
    setInterval(async () => {
      try {
        console.log('[QueueIntegration] Running scheduled queue processing');
        const queueProcessor = require('./queue-processor');
        await queueProcessor.processQueue();
      } catch (error) {
        console.error('[QueueIntegration] Error in scheduled queue processing:', error);
      }
    }, PROCESSING_INTERVAL);
  };
  
  // Start the scheduled processing
  scheduleQueueProcessing();
};

module.exports = {
  patchServer
};
