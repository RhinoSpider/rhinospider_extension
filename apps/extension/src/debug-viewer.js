// debug-viewer.js - Simple debug log viewer for RhinoSpider extension
// This script will be injected into the debug-viewer.html page

document.addEventListener('DOMContentLoaded', async () => {
  const logContainer = document.getElementById('log-container');
  const clearButton = document.getElementById('clear-logs');
  const refreshButton = document.getElementById('refresh-logs');
  
  // Function to load and display logs
  async function loadLogs() {
    try {
      // Get logs from storage
      const result = await chrome.storage.local.get(['debugLogs']);
      const logs = result.debugLogs || [];
      
      // Clear the container
      logContainer.innerHTML = '';
      
      if (logs.length === 0) {
        logContainer.innerHTML = '<div class="no-logs">No debug logs found</div>';
        return;
      }
      
      // Display logs in reverse order (newest first)
      logs.reverse().forEach(log => {
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        
        // Format timestamp
        const timestamp = new Date(log.timestamp).toLocaleString();
        
        // Create log header with timestamp and source
        const logHeader = document.createElement('div');
        logHeader.className = 'log-header';
        logHeader.innerHTML = `<span class="timestamp">${timestamp}</span> <span class="source">[${log.source}]</span>`;
        
        // Create log message
        const logMessage = document.createElement('div');
        logMessage.className = 'log-message';
        logMessage.textContent = log.message;
        
        // Create log data if available
        let logData = null;
        if (log.data) {
          logData = document.createElement('pre');
          logData.className = 'log-data';
          
          // Try to format the data as JSON if it's a string
          if (typeof log.data === 'string') {
            try {
              const jsonData = JSON.parse(log.data);
              logData.textContent = JSON.stringify(jsonData, null, 2);
            } catch (e) {
              logData.textContent = log.data;
            }
          } else {
            logData.textContent = JSON.stringify(log.data, null, 2);
          }
        }
        
        // Append all elements
        logEntry.appendChild(logHeader);
        logEntry.appendChild(logMessage);
        if (logData) {
          logEntry.appendChild(logData);
        }
        
        logContainer.appendChild(logEntry);
      });
    } catch (error) {
      console.error('Error loading logs:', error);
      logContainer.innerHTML = `<div class="error">Error loading logs: ${error.message}</div>`;
    }
  }
  
  // Clear logs
  clearButton.addEventListener('click', async () => {
    try {
      await chrome.storage.local.set({ debugLogs: [] });
      loadLogs();
    } catch (error) {
      console.error('Error clearing logs:', error);
    }
  });
  
  // Refresh logs
  refreshButton.addEventListener('click', () => {
    loadLogs();
  });
  
  // Initial load
  loadLogs();
});
