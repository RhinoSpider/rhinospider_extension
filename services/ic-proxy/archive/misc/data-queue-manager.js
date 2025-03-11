// Data Queue Manager for handling storage submission failures
// This module stores failed submissions and attempts to retry them periodically
const fs = require('fs');
const path = require('path');

// Queue storage path
const QUEUE_DIR = path.join(__dirname, 'data-queue');
const QUEUE_FILE = path.join(QUEUE_DIR, 'pending-submissions.json');

// Ensure queue directory exists
if (!fs.existsSync(QUEUE_DIR)) {
  fs.mkdirSync(QUEUE_DIR, { recursive: true });
}

// Initialize queue file if it doesn't exist
if (!fs.existsSync(QUEUE_FILE)) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify({
    pendingSubmissions: [],
    lastProcessed: Date.now()
  }));
}

// Load the queue
const loadQueue = () => {
  try {
    const queueData = fs.readFileSync(QUEUE_FILE, 'utf8');
    return JSON.parse(queueData);
  } catch (error) {
    console.error('Error loading queue:', error);
    return { pendingSubmissions: [], lastProcessed: Date.now() };
  }
};

// Save the queue
const saveQueue = (queueData) => {
  try {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(queueData, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving queue:', error);
    return false;
  }
};

// Add a submission to the queue
const addToQueue = (submission) => {
  try {
    const queue = loadQueue();
    
    // Add submission with timestamp and unique ID
    queue.pendingSubmissions.push({
      ...submission,
      queuedAt: Date.now(),
      retryCount: 0,
      nextRetry: Date.now() + 60000 // Try again in 1 minute
    });
    
    // Save updated queue
    saveQueue(queue);
    
    console.log(`[DataQueueManager] Added submission to queue. Queue size: ${queue.pendingSubmissions.length}`);
    return true;
  } catch (error) {
    console.error('[DataQueueManager] Error adding to queue:', error);
    return false;
  }
};

// Get the current queue status
const getQueueStatus = () => {
  try {
    const queue = loadQueue();
    return {
      pendingCount: queue.pendingSubmissions.length,
      lastProcessed: queue.lastProcessed
    };
  } catch (error) {
    console.error('[DataQueueManager] Error getting queue status:', error);
    return { pendingCount: 0, lastProcessed: 0 };
  }
};

// Process the queue (to be called by a scheduled job)
const processQueue = async (storageSubmitFunction) => {
  try {
    const queue = loadQueue();
    const now = Date.now();
    
    // Update last processed time
    queue.lastProcessed = now;
    
    // No submissions to process
    if (queue.pendingSubmissions.length === 0) {
      saveQueue(queue);
      return { processed: 0, succeeded: 0, failed: 0, remaining: 0 };
    }
    
    console.log(`[DataQueueManager] Processing queue with ${queue.pendingSubmissions.length} pending submissions`);
    
    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    
    // Process submissions that are due for retry
    const updatedSubmissions = [];
    
    for (const submission of queue.pendingSubmissions) {
      // Skip submissions that aren't due for retry yet
      if (submission.nextRetry > now) {
        updatedSubmissions.push(submission);
        continue;
      }
      
      processed++;
      
      try {
        // Attempt to submit the data
        const result = await storageSubmitFunction(submission);
        
        // Check if submission was successful
        if (result && result.ok) {
          succeeded++;
          console.log(`[DataQueueManager] Successfully processed queued submission: ${submission.id}`);
          // Don't add back to the queue
        } else {
          // Submission failed, increment retry count and add back to queue
          failed++;
          
          // Calculate next retry time with exponential backoff
          const retryDelay = Math.min(
            1000 * 60 * 60 * 24, // Max 1 day
            1000 * 60 * Math.pow(2, submission.retryCount) // Exponential backoff
          );
          
          updatedSubmissions.push({
            ...submission,
            retryCount: submission.retryCount + 1,
            nextRetry: now + retryDelay,
            lastError: result.err ? JSON.stringify(result.err) : 'Unknown error'
          });
          
          console.log(`[DataQueueManager] Failed to process submission ${submission.id}. Will retry in ${retryDelay/1000} seconds.`);
        }
      } catch (error) {
        // Error during submission, increment retry count and add back to queue
        failed++;
        
        // Calculate next retry time with exponential backoff
        const retryDelay = Math.min(
          1000 * 60 * 60 * 24, // Max 1 day
          1000 * 60 * Math.pow(2, submission.retryCount) // Exponential backoff
        );
        
        updatedSubmissions.push({
          ...submission,
          retryCount: submission.retryCount + 1,
          nextRetry: now + retryDelay,
          lastError: error.message || String(error)
        });
        
        console.log(`[DataQueueManager] Error processing submission ${submission.id}:`, error.message || error);
        console.log(`[DataQueueManager] Will retry in ${retryDelay/1000} seconds.`);
      }
    }
    
    // Update the queue
    queue.pendingSubmissions = updatedSubmissions;
    saveQueue(queue);
    
    console.log(`[DataQueueManager] Queue processing complete. Processed: ${processed}, Succeeded: ${succeeded}, Failed: ${failed}, Remaining: ${updatedSubmissions.length}`);
    
    return {
      processed,
      succeeded,
      failed,
      remaining: updatedSubmissions.length
    };
  } catch (error) {
    console.error('[DataQueueManager] Error processing queue:', error);
    return { processed: 0, succeeded: 0, failed: 0, remaining: 0, error: error.message || String(error) };
  }
};

// Export the module
module.exports = {
  addToQueue,
  getQueueStatus,
  processQueue
};
