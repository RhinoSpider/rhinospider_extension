// Script to fix the consumer-submit endpoint routing
const fs = require('fs');
const path = require('path');

// Path to the server.js file
const serverFilePath = path.join(__dirname, 'server.js');

// Read the current server.js file
console.log(`Reading server.js file from ${serverFilePath}`);
const serverContent = fs.readFileSync(serverFilePath, 'utf8');

// Check if we already have a redirect for /api/submit-scraped-content
if (serverContent.includes('/api/submit-scraped-content')) {
  console.log('Found existing redirect for /api/submit-scraped-content');
} else {
  console.log('Adding redirect for /api/submit-scraped-content');
}

// Create the redirect code to add
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

// Find the position to insert the redirect code (before the /api/submit endpoint)
const submitEndpointPosition = serverContent.indexOf('app.post(\'/api/submit\'');

if (submitEndpointPosition === -1) {
  console.error('Could not find /api/submit endpoint in server.js');
  process.exit(1);
}

// Insert the redirect code before the /api/submit endpoint
const updatedServerContent = 
  serverContent.slice(0, submitEndpointPosition) + 
  redirectCode + 
  serverContent.slice(submitEndpointPosition);

// Write the updated content back to the file
console.log('Writing updated server.js file');
fs.writeFileSync(serverFilePath + '.backup', serverContent, 'utf8');
fs.writeFileSync(serverFilePath, updatedServerContent, 'utf8');

console.log('Server.js updated successfully');
console.log('Backup created at server.js.backup');
console.log('\nTo deploy this change to the server, run:');
console.log('  scp server.js root@143.244.133.154:/root/rhinospider-ic-proxy/');
console.log('  ssh root@143.244.133.154 "docker restart ic-proxy-ic-proxy-1"');
