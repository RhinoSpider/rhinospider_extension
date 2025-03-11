// Fix Duplicate Endpoints in server.js
// This script removes duplicate endpoint declarations in the server.js file

const fs = require('fs');
const path = require('path');

// Colors for output
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

console.log(`${GREEN}===== Fixing Duplicate Endpoints in server.js =====${RESET}`);

// Path to server.js
const SERVER_JS_PATH = path.join(__dirname, 'server.js');

// Read the server.js file
try {
  console.log(`${YELLOW}Reading server.js file...${RESET}`);
  const serverContent = fs.readFileSync(SERVER_JS_PATH, 'utf8');
  
  // Check for duplicate endpoint declarations
  const registerDeviceCount = (serverContent.match(/app\.post\('\/api\/register-device'/g) || []).length;
  const consumerSubmitCount = (serverContent.match(/app\.post\('\/api\/consumer-submit'/g) || []).length;
  
  console.log(`${YELLOW}Found ${registerDeviceCount} declarations of /api/register-device endpoint${RESET}`);
  console.log(`${YELLOW}Found ${consumerSubmitCount} declarations of /api/consumer-submit endpoint${RESET}`);
  
  if (registerDeviceCount <= 1 && consumerSubmitCount <= 1) {
    console.log(`${GREEN}No duplicate endpoints found. No changes needed.${RESET}`);
    process.exit(0);
  }
  
  // Create a backup of the original file
  const backupPath = `${SERVER_JS_PATH}.backup-${Date.now()}`;
  fs.writeFileSync(backupPath, serverContent, 'utf8');
  console.log(`${GREEN}Created backup of server.js at ${backupPath}${RESET}`);
  
  // Split the file into lines
  const lines = serverContent.split('\n');
  
  // Keep track of endpoints we've seen
  const seenEndpoints = new Set();
  
  // Flag to track if we're inside an endpoint handler
  let insideHandler = false;
  let currentEndpoint = null;
  let skipLine = false;
  let bracketCount = 0;
  
  // Process the file line by line
  const newLines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this line starts a new endpoint handler
    const endpointMatch = line.match(/app\.post\('(\/api\/[^']+)'/);
    
    if (endpointMatch && !insideHandler) {
      const endpoint = endpointMatch[1];
      
      if (seenEndpoints.has(endpoint)) {
        // This is a duplicate endpoint, skip it
        console.log(`${RED}Found duplicate endpoint: ${endpoint} at line ${i+1}${RESET}`);
        insideHandler = true;
        currentEndpoint = endpoint;
        skipLine = true;
        bracketCount = 0;
        
        // Count opening brackets in this line
        for (const char of line) {
          if (char === '{') bracketCount++;
          if (char === '}') bracketCount--;
        }
        
        continue;
      } else {
        // This is the first time we've seen this endpoint
        seenEndpoints.add(endpoint);
        console.log(`${GREEN}Keeping endpoint: ${endpoint} at line ${i+1}${RESET}`);
      }
    }
    
    // If we're skipping a duplicate handler, track bracket count
    if (skipLine) {
      for (const char of line) {
        if (char === '{') bracketCount++;
        if (char === '}') bracketCount--;
      }
      
      // If bracket count reaches 0, we've reached the end of the handler
      if (bracketCount <= 0) {
        console.log(`${YELLOW}Reached end of duplicate handler for ${currentEndpoint}${RESET}`);
        insideHandler = false;
        skipLine = false;
        currentEndpoint = null;
      }
      
      continue;
    }
    
    // Add the line to the new content
    newLines.push(line);
  }
  
  // Write the new content to the file
  const newContent = newLines.join('\n');
  fs.writeFileSync(SERVER_JS_PATH, newContent, 'utf8');
  
  console.log(`${GREEN}Successfully removed duplicate endpoint declarations!${RESET}`);
  console.log(`${GREEN}Updated server.js file${RESET}`);
  
} catch (error) {
  console.error(`${RED}Error fixing duplicate endpoints:${RESET}`, error);
  process.exit(1);
}
