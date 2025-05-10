#!/bin/bash
# Simple deployment script for RhinoSpider IC Proxy - No Docker, No PM2, just Node.js
# This script also removes Docker from the Digital Ocean server

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
REMOTE_USER="root"
REMOTE_HOST="143.244.133.154"
IC_PROXY_DIR="/root/rhinospider-ic-proxy"

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

section "Simple Deployment for RhinoSpider IC Proxy"

# Step 0: Remove Docker from the server
section "Step 0: Removing Docker from the server"
status "Stopping and removing all Docker containers..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "docker stop \$(docker ps -a -q) 2>/dev/null || true"
ssh ${REMOTE_USER}@${REMOTE_HOST} "docker rm \$(docker ps -a -q) 2>/dev/null || true"

status "Removing all Docker images..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "docker rmi \$(docker images -q) 2>/dev/null || true"

status "Removing Docker Compose files..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "rm -f /root/docker-compose.yml 2>/dev/null || true"

status "Removing Docker..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "apt-get purge -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin docker-compose 2>/dev/null || true"
ssh ${REMOTE_USER}@${REMOTE_HOST} "apt-get autoremove -y 2>/dev/null || true"
ssh ${REMOTE_USER}@${REMOTE_HOST} "rm -rf /var/lib/docker /etc/docker /var/run/docker.sock 2>/dev/null || true"

status "Docker has been removed from the server."

# Step 1: Create directory on server
section "Step 1: Setting up server directory"
status "Creating IC Proxy directory..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "mkdir -p ${IC_PROXY_DIR}"

# Step 2: Prepare and deploy IC Proxy
section "Step 2: Preparing and deploying IC Proxy"

status "Creating temporary directory for IC Proxy..."
mkdir -p /tmp/rhinospider-ic-proxy

status "Copying IC Proxy files..."
cp -r /Users/ayanuali/development/rhinospider/services/ic-proxy/* /tmp/rhinospider-ic-proxy/

# Create a package.json file with all required dependencies
status "Creating package.json with all required dependencies..."
cat > /tmp/rhinospider-ic-proxy/package.json << 'EOL'
{
  "name": "rhinospider-ic-proxy",
  "version": "1.0.0",
  "description": "IC Proxy Server for RhinoSpider",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "dotenv": "^16.3.1"
  }
}
EOL

# Create a simple server.js file if it doesn't exist
if [ ! -f /tmp/rhinospider-ic-proxy/server.js ]; then
  status "Creating a basic server.js file..."
  cat > /tmp/rhinospider-ic-proxy/server.js << 'EOL'
// Simple HTTP server with minimal dependencies
const http = require('http');

// Environment variables
const PORT = process.env.PORT || 3001;
const API_PASSWORD = process.env.API_PASSWORD || 'ffGpA2saNS47qr';
const IC_HOST = process.env.IC_HOST || 'https://icp0.io';
const CONSUMER_CANISTER_ID = process.env.CONSUMER_CANISTER_ID || 'tgyl5-yyaaa-aaaaj-az4wq-cai';
const STORAGE_CANISTER_ID = process.env.STORAGE_CANISTER_ID || 'hhaip-uiaaa-aaaao-a4khq-cai';

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
    res.end(JSON.stringify({ status: 'ok', message: 'IC Proxy is running' }));
    return;
  }
  
  // Consumer submit endpoint
  if (req.method === 'POST' && req.url === '/api/consumer-submit') {
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
        const { url, content, topicId } = data;
        
        if (!url || !content || !topicId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ err: 'Missing required fields: url, content, topicId' }));
          return;
        }
        
        console.log(`Received submission for URL: ${url}, Topic: ${topicId}`);
        console.log('Content length:', content.length);
        
        // For now, just acknowledge receipt
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'success', 
          message: 'Submission received by IC Proxy',
          details: {
            url,
            topicId,
            contentLength: content.length,
            timestamp: new Date().toISOString()
          }
        }));
      } catch (error) {
        console.error('Error processing submission:', error);
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
  console.log(`IC Proxy server listening on port ${PORT}`);
  console.log(`IC Host: ${IC_HOST}`);
  console.log(`Consumer Canister ID: ${CONSUMER_CANISTER_ID}`);
  console.log(`Storage Canister ID: ${STORAGE_CANISTER_ID}`);
});
EOL
fi

# Create a .env file
status "Creating .env file..."
cat > /tmp/rhinospider-ic-proxy/.env << 'EOL'
PORT=3001
NODE_ENV=production
IC_HOST=https://icp0.io
CONSUMER_CANISTER_ID=tgyl5-yyaaa-aaaaj-az4wq-cai
ADMIN_CANISTER_ID=444wf-gyaaa-aaaaj-az5sq-cai
STORAGE_CANISTER_ID=hhaip-uiaaa-aaaao-a4khq-cai
API_PASSWORD=ffGpA2saNS47qr
EOL

status "Compressing IC Proxy files..."
cd /tmp
tar -czf rhinospider-ic-proxy.tar.gz rhinospider-ic-proxy

status "Copying compressed IC Proxy files to server..."
scp /tmp/rhinospider-ic-proxy.tar.gz ${REMOTE_USER}@${REMOTE_HOST}:/tmp/

status "Extracting IC Proxy files on server..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "cd /tmp && tar -xzf rhinospider-ic-proxy.tar.gz && cp -r rhinospider-ic-proxy/* ${IC_PROXY_DIR}/ && rm -rf /tmp/rhinospider-ic-proxy*"

# Step 3: Install dependencies and run the service
section "Step 3: Installing dependencies"
status "Checking Node.js version..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "node --version"

status "Installing Node.js dependencies for IC Proxy..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "cd ${IC_PROXY_DIR} && rm -rf node_modules package-lock.json && npm cache clean --force && npm install --no-fund --no-audit"

# Step 4: Start the service
section "Step 4: Starting IC Proxy service"
status "Killing any existing Node.js processes..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "pkill -f 'node server.js' || true"

status "Starting IC Proxy as a background process..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "cd ${IC_PROXY_DIR} && nohup node server.js > ic-proxy.log 2>&1 &"

status "Waiting for service to start..."
sleep 5

status "Checking if service is running..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "ps aux | grep '[n]ode server.js'"

# Step 5: Test the endpoint
section "Step 5: Testing IC Proxy endpoint"
status "Testing IC Proxy health endpoint..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "curl -s http://localhost:3001/api/health"
echo ""

status "Testing consumer-submit endpoint..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "curl -s -X POST http://localhost:3001/api/consumer-submit \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer ffGpA2saNS47qr' \
  -d '{\"url\":\"https://example.com\",\"content\":\"test content\",\"topicId\":\"test-topic\",\"deviceId\":\"test-device\",\"principalId\":\"2vxsx-fae\"}'"
echo ""

section "Deployment Complete"
echo -e "${GREEN}IC Proxy has been deployed successfully.${NC}"
echo -e "\nIC Proxy URL: http://${REMOTE_HOST}:3001"
echo -e "\nTo check logs:"
echo -e "  ${YELLOW}ssh ${REMOTE_USER}@${REMOTE_HOST} \"cat ${IC_PROXY_DIR}/ic-proxy.log\"${NC}"

# Clean up temporary files
rm -rf /tmp/rhinospider-ic-proxy
rm -f /tmp/rhinospider-ic-proxy.tar.gz
