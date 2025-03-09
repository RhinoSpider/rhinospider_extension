#!/bin/bash
# Simple deployment script for the direct storage endpoint solution
# This script deploys only the necessary files to the Digital Ocean server

# Define variables
SSH_USER=${1:-root}
SSH_HOST=${2:-143.244.133.154}
REMOTE_DIR="/root/rhinospider-ic-proxy"

echo "=== Deploying Direct Storage Solution ==="
echo "SSH User: $SSH_USER"
echo "SSH Host: $SSH_HOST"
echo "Remote Directory: $REMOTE_DIR"

# Create the integration script locally
echo "Creating integration script..."
cat > integrate-endpoint.js << 'EOF'
// integrate-endpoint.js
// This script integrates the direct storage endpoint with the existing server

// Load required modules
require('./bigint-patch');
const express = require('express');
const directStorageEndpoint = require('./direct-storage-endpoint');

// Create a new Express app for the direct endpoint
const app = express();
app.use(express.json());

// Add the direct storage endpoint
const directStorageRouter = directStorageEndpoint.createDirectStorageRouter();
app.use('/api', directStorageRouter);

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'direct-storage-endpoint' });
});

// Start the server on a different port
const PORT = process.env.DIRECT_PORT || 3002;
app.listen(PORT, () => {
  console.log(`Direct storage endpoint listening on port ${PORT}`);
  console.log(`Direct submit endpoint available at: http://localhost:${PORT}/api/direct-submit`);
});
EOF

# Copy only the necessary files to the server
echo "Copying files to the server..."
scp direct-storage-endpoint.js integrate-endpoint.js "$SSH_USER@$SSH_HOST:$REMOTE_DIR/"

# Start the direct endpoint on the server
echo "Starting the direct endpoint on the server..."
ssh "$SSH_USER@$SSH_HOST" << 'ENDSSH'
cd ~/rhinospider-ic-proxy
pm2 delete direct-endpoint 2>/dev/null || true
pm2 start integrate-endpoint.js --name direct-endpoint
pm2 save
ENDSSH

echo "=== Deployment completed ==="
echo "Direct storage endpoint is now running on port 3002"
echo ""
echo "To test the endpoint, run:"
echo "curl -X POST -H \"Authorization: Bearer ffGpA2saNS47qr\" -H \"Content-Type: application/json\" -d '{\"url\":\"https://example.com\",\"content\":\"Test content\",\"topicId\":\"test-topic\"}' http://$SSH_HOST:3002/api/direct-submit"
echo ""
echo "To use this endpoint in your extension, add these client files:"
echo "1. direct-storage-client.js"
echo "2. submission-helper.js"
echo ""
echo "Then update your code to use the submission helper:"
echo "import submissionHelper from './submission-helper';"
echo "const result = await submissionHelper.submitScrapedData(data);"
