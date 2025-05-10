// Simple HTTP server with minimal dependencies
const http = require('http');
const fs = require('fs');

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
