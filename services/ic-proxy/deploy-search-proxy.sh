#!/bin/bash
# Deployment script for RhinoSpider Search Proxy - No Docker, just Node.js

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
REMOTE_USER="root"
REMOTE_HOST="143.244.133.154"
SEARCH_PROXY_DIR="/root/rhinospider-search-proxy"

# Print section header
section() {
  echo -e "\n${GREEN}==== $1 ====${NC}"
}

# Print status message
status() {
  echo -e "${YELLOW}$1${NC}"
}

# Print error message
error() {
  echo -e "${RED}$1${NC}"
}

section "Deployment for RhinoSpider Search Proxy"

# Step 1: Create directory on server
section "Step 1: Setting up server directory"
status "Creating Search Proxy directory..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "mkdir -p ${SEARCH_PROXY_DIR}"

# Step 2: Prepare and deploy Search Proxy
section "Step 2: Preparing and deploying Search Proxy"

# Create the server.js file locally
status "Creating server.js file..."
cat > /tmp/search-server.js << 'EOL'
// Simple HTTP server for Search Proxy with minimal dependencies
const http = require('http');

// Environment variables
const PORT = process.env.PORT || 3002;
const API_PASSWORD = process.env.API_PASSWORD || 'ffGpA2saNS47qr';
const IC_HOST = process.env.IC_HOST || 'https://icp0.io';
const CONSUMER_CANISTER_ID = process.env.CONSUMER_CANISTER_ID || 'tgyl5-yyaaa-aaaaj-az4wq-cai';
const ADMIN_CANISTER_ID = process.env.ADMIN_CANISTER_ID || '444wf-gyaaa-aaaaj-az5sq-cai';

// Create HTTP server
const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // Health check endpoint
  if (req.method === 'GET' && req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', message: 'Search Proxy is running' }));
    return;
  }
  
  // Search endpoint
  if (req.method === 'POST' && req.url === '/api/search') {
    // Check authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== API_PASSWORD) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ err: 'Unauthorized: Missing or invalid token' }));
      return;
    }
    
    // Process request body
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { query, topicId } = data;
        
        if (!query) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ err: 'Missing required field: query' }));
          return;
        }
        
        console.log(`Received search request: ${query}, Topic: ${topicId || 'all'}`);
        
        // For now, just acknowledge receipt
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'success', 
          message: 'Search request received by Search Proxy',
          results: [
            {
              url: 'https://example.com/result1',
              title: 'Example Result 1',
              snippet: 'This is a sample search result for ' + query
            },
            {
              url: 'https://example.com/result2',
              title: 'Example Result 2',
              snippet: 'Another sample search result for ' + query
            }
          ],
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        console.error('Error processing search request:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ err: 'Internal server error', details: error.message }));
      }
    });
    
    return;
  }
  
  // Handle 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ err: 'Not Found' }));
});

// Start the server
server.listen(PORT, () => {
  console.log(`Search Proxy server listening on port ${PORT}`);
  console.log(`IC Host: ${IC_HOST}`);
  console.log(`Consumer Canister ID: ${CONSUMER_CANISTER_ID}`);
  console.log(`Admin Canister ID: ${ADMIN_CANISTER_ID}`);
});
EOL

# Create a systemd service file
status "Creating systemd service file..."
cat > /tmp/search-proxy.service << 'EOL'
[Unit]
Description=Search Proxy Server for RhinoSpider
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/rhinospider-search-proxy
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=PORT=3002
Environment=IC_HOST=https://icp0.io
Environment=CONSUMER_CANISTER_ID=tgyl5-yyaaa-aaaaj-az4wq-cai
Environment=ADMIN_CANISTER_ID=444wf-gyaaa-aaaaj-az5sq-cai
Environment=API_PASSWORD=ffGpA2saNS47qr

[Install]
WantedBy=multi-user.target
EOL

status "Copying files to server..."
scp /tmp/search-server.js ${REMOTE_USER}@${REMOTE_HOST}:${SEARCH_PROXY_DIR}/server.js
scp /tmp/search-proxy.service ${REMOTE_USER}@${REMOTE_HOST}:/etc/systemd/system/

status "Setting up systemd service..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "systemctl daemon-reload && systemctl enable search-proxy.service"

# Step 3: Start the service
section "Step 3: Starting Search Proxy service"
status "Starting Search Proxy service..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "systemctl start search-proxy.service"

status "Waiting for service to start..."
sleep 5

status "Checking if service is running..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "systemctl status search-proxy.service"

# Step 4: Test the endpoint
section "Step 4: Testing Search Proxy endpoint"
status "Testing Search Proxy health endpoint..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "curl -s http://localhost:3002/api/health"
echo ""

status "Testing search endpoint..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "curl -s -X POST http://localhost:3002/api/search \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer ffGpA2saNS47qr' \
  -d '{\"query\":\"test query\",\"topicId\":\"test-topic\"}'"
echo ""

section "Deployment Complete"
echo -e "${GREEN}Search Proxy has been deployed successfully.${NC}"
echo -e "\nSearch Proxy URL: http://${REMOTE_HOST}:3002"
echo -e "\nTo check logs:"
echo -e "  ${YELLOW}ssh ${REMOTE_USER}@${REMOTE_HOST} \"journalctl -u search-proxy.service\"${NC}"
echo -e "\nTo restart the service:"
echo -e "  ${YELLOW}ssh ${REMOTE_USER}@${REMOTE_HOST} \"systemctl restart search-proxy.service\"${NC}"

# Clean up temporary files
rm -f /tmp/search-server.js
rm -f /tmp/search-proxy.service
