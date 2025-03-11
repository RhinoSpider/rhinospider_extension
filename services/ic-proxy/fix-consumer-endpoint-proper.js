// fix-consumer-endpoint-proper.js
// This script modifies the server.js file to add redirects for consumer-submit
// Usage: node fix-consumer-endpoint-proper.js <path-to-server.js>

const fs = require('fs');
const path = require('path');

// Get the server.js path from command line arguments
const serverJsPath = process.argv[2];

if (!serverJsPath) {
  console.error('Error: No server.js path provided.');
  console.error('Usage: node fix-consumer-endpoint-proper.js <path-to-server.js>');
  process.exit(1);
}

// Read the server.js file
console.log(`Reading server.js from: ${serverJsPath}`);
let serverJs;
try {
  serverJs = fs.readFileSync(serverJsPath, 'utf8');
} catch (error) {
  console.error(`Error reading server.js: ${error.message}`);
  process.exit(1);
}

// Find the position to insert the redirects (before the /api/submit endpoint)
const submitEndpointRegex = /app\.post\(['"]\/api\/submit['"]/;
const match = serverJs.match(submitEndpointRegex);

if (!match) {
  console.error('Error: Could not find /api/submit endpoint in server.js');
  process.exit(1);
}

const insertPosition = match.index;
console.log(`Found /api/submit endpoint at position ${insertPosition}`);

// Create the redirect code to insert
const redirectCode = `
// Redirect /api/submit-scraped-content to /api/submit for backward compatibility
app.post('/api/submit-scraped-content', authenticateApiKey, (req, res, next) => {
  console.log('[/api/submit-scraped-content] Received request, forwarding to /api/submit');
  req.url = '/api/submit';
  next('route');
});

// Redirect /api/consumer-submit to /api/submit for extension compatibility
app.post('/api/consumer-submit', authenticateApiKey, (req, res, next) => {
  console.log('[/api/consumer-submit] Received request, forwarding to /api/submit');
  req.url = '/api/submit';
  next('route');
});

`;

// Insert the redirect code before the /api/submit endpoint
const modifiedServerJs = serverJs.slice(0, insertPosition) + redirectCode + serverJs.slice(insertPosition);

// Write the modified server.js file
try {
  fs.writeFileSync(serverJsPath, modifiedServerJs);
  console.log(`Successfully modified server.js with redirects for consumer-submit`);
} catch (error) {
  console.error(`Error writing modified server.js: ${error.message}`);
  process.exit(1);
}
