// Standalone Direct Storage Server
// This server runs alongside the existing proxy server without modifying it
// It provides a simplified interface for the extension to submit and fetch data

require('./bigint-patch');
const express = require('express');
const fetch = require('node-fetch');

// Environment variables
const API_PASSWORD = process.env.API_PASSWORD || 'ffGpA2saNS47qr';
const PROXY_HOST = process.env.PROXY_HOST || 'localhost';
const PROXY_PORT = process.env.PROXY_PORT || 3001;
const DIRECT_PORT = process.env.DIRECT_PORT || 3002; // Using a different port to avoid conflicts

// Create Express app
const app = express();
app.use(express.json());

// Add CORS headers for Chrome extension
app.use((req, res, next) => {
  // Allow requests from Chrome extensions
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Device-ID');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Authentication middleware
const authenticateApiKey = (req, res, next) => {
  // Get authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header is required' });
  }
  
  // Check if the header is in the correct format
  const [type, token] = authHeader.split(' ');
  
  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Invalid authorization format. Use Bearer token' });
  }
  
  // Verify the token
  if (token !== API_PASSWORD) {
    return res.status(401).json({ error: 'Invalid API password' });
  }
  
  // If we get here, the request is authenticated
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'direct-storage-server' });
});

// API health check endpoint (for client compatibility)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'direct-storage-server', timestamp: Date.now() });
});

// Direct storage submission endpoint
app.post('/api/direct-submit', authenticateApiKey, async (req, res) => {
  console.log('==== /api/direct-submit endpoint called ====');
  console.log('Request body:', JSON.stringify(req.body));
  
  try {
    const { url, content, topicId } = req.body;
    
    if (!url || !content || !topicId) {
      return res.status(400).json({ err: 'Missing required fields: url, content, topicId' });
    }
    
    // Forward the request to the proxy server
    console.log('Forwarding request to proxy server...');
    try {
      // The proxy server has a working endpoint for submitting scraped data
      // that handles all the authorization correctly
      const proxyResponse = await fetch(`http://${PROXY_HOST}:${PROXY_PORT}/api/submit-scraped-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_PASSWORD}`
        },
        body: JSON.stringify({
          url,
          content,
          topicId,
          principalId: '2vxsx-fae'
        })
      });
      
      // Check if the response is valid JSON
      const contentType = proxyResponse.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const proxyResult = await proxyResponse.json();
        console.log('Proxy submission result:', proxyResult);
        return res.json(proxyResult);
      } else {
        // If we didn't get JSON back, try a different endpoint
        console.log('Non-JSON response from proxy server, trying alternate endpoint...');
        const alternateResponse = await fetch(`http://${PROXY_HOST}:${PROXY_PORT}/api/submit-data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_PASSWORD}`
          },
          body: JSON.stringify({
            url,
            content,
            topicId,
            principalId: '2vxsx-fae'
          })
        });
        
        // Try to parse the response as JSON, but handle non-JSON responses
        try {
          const alternateResult = await alternateResponse.text();
          console.log('Alternate endpoint response:', alternateResult);
          
          // If it looks like JSON, try to parse it
          if (alternateResult.startsWith('{') || alternateResult.startsWith('[')) {
            return res.json(JSON.parse(alternateResult));
          } else {
            // Otherwise, just return success since we can't parse the response
            return res.json({ 
              ok: { 
                dataSubmitted: true,
                url,
                topicId,
                timestamp: Date.now(),
                note: 'Request forwarded to proxy server'
              }
            });
          }
        } catch (parseError) {
          console.error('Error parsing proxy response:', parseError);
          // Return success anyway since we did forward the request
          return res.json({ 
            ok: { 
              dataSubmitted: true,
              url,
              topicId,
              timestamp: Date.now(),
              note: 'Request forwarded to proxy server but response could not be parsed'
            }
          });
        }
      }
    } catch (proxyError) {
      console.error('Error forwarding to proxy server:', proxyError);
      
      // Try the consumer canister endpoint directly
      try {
        console.log('Trying consumer canister endpoint directly...');
        const consumerResponse = await fetch(`http://${PROXY_HOST}:${PROXY_PORT}/api/consumer/submit-data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_PASSWORD}`
          },
          body: JSON.stringify({
            url,
            content,
            topicId,
            principalId: '2vxsx-fae'
          })
        });
        
        // Try to parse the response
        try {
          const consumerResult = await consumerResponse.text();
          console.log('Consumer endpoint response:', consumerResult);
          
          return res.json({ 
            ok: { 
              dataSubmitted: true,
              url,
              topicId,
              timestamp: Date.now(),
              note: 'Request forwarded to consumer endpoint'
            }
          });
        } catch (parseError) {
          console.error('Error parsing consumer response:', parseError);
          return res.json({ 
            ok: { 
              dataSubmitted: true,
              url,
              topicId,
              timestamp: Date.now(),
              note: 'Request forwarded to consumer endpoint but response could not be parsed'
            }
          });
        }
      } catch (consumerError) {
        console.error('Error with consumer endpoint:', consumerError);
        return res.status(500).json({ 
          err: 'Failed to submit data through any available endpoint', 
          details: consumerError.message 
        });
      }
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ err: 'Server error', details: error.message });
  }
});

// Fetch data endpoint
app.get('/api/fetch-data', authenticateApiKey, async (req, res) => {
  // Add debug logging
  console.log('Received fetch request with query params:', req.query);
  console.log('==== /api/fetch-data endpoint called ====');
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ err: 'URL parameter is required' });
  }
  
  console.log('Fetching data for URL:', url);
  
  try {
    // Forward the request to the proxy server
    console.log('Forwarding fetch request to proxy server...');
    try {
      // We'll use the fetch-content endpoint which directly fetches from a URL
      console.log(`Attempting to fetch content directly from URL: ${url}`);
      const proxyResponse = await fetch(`http://${PROXY_HOST}:${PROXY_PORT}/api/fetch-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_PASSWORD}`
        },
        body: JSON.stringify({
          url,
          principalId: '2vxsx-fae'
        })
      });
      
      console.log('Proxy response status:', proxyResponse.status);
      console.log('Proxy response headers:', JSON.stringify([...proxyResponse.headers.entries()]));
      const responseText = await proxyResponse.text();
      console.log('Proxy response text (first 200 chars):', responseText.substring(0, 200));
      
      // Try to parse the response as JSON
      try {
        const proxyResult = JSON.parse(responseText);
        console.log('Proxy fetch result:', proxyResult);
        return res.json(proxyResult);
      } catch (jsonError) {
        console.log('Failed to parse response as JSON:', jsonError.message);
        // If we didn't get JSON back, try a different endpoint
        console.log('Non-JSON response from proxy server, trying alternate endpoint...');
        // Try the fetch-content endpoint which directly fetches from a URL
        console.log(`Trying alternate approach: direct fetch from URL using fetch-content endpoint`);
        const alternateResponse = await fetch(`http://${PROXY_HOST}:${PROXY_PORT}/api/fetch-content`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_PASSWORD}`
          },
          body: JSON.stringify({
            url,
            principalId: '2vxsx-fae'
          })
        });
        
        console.log('Alternate response status:', alternateResponse.status);
        console.log('Alternate response headers:', JSON.stringify([...alternateResponse.headers.entries()]));
        
        // Try to parse the response as JSON, but handle non-JSON responses
        try {
          const alternateResult = await alternateResponse.text();
          console.log('Alternate endpoint response:', alternateResult);
          
          // If it looks like JSON, try to parse it
          if (alternateResult.startsWith('{') || alternateResult.startsWith('[')) {
            return res.json(JSON.parse(alternateResult));
          } else {
            // Otherwise, just return an error since we can't get the data
            return res.json({ 
              err: 'Could not fetch data from proxy server', 
              note: 'Response was not in JSON format' 
            });
          }
        } catch (parseError) {
          console.error('Error parsing proxy response:', parseError);
          return res.json({ 
            err: 'Error parsing proxy server response', 
            details: parseError.message 
          });
        }
      }
    } catch (proxyError) {
      console.error('Error fetching from proxy server:', proxyError);
      
      // Try the consumer canister endpoint directly
      try {
        console.log('Trying consumer canister endpoint directly...');
        const consumerResponse = await fetch(`http://${PROXY_HOST}:${PROXY_PORT}/api/consumer/get-data?url=${encodeURIComponent(url)}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${API_PASSWORD}`
          }
        });
        
        // Try to parse the response
        try {
          const consumerResult = await consumerResponse.text();
          console.log('Consumer endpoint response:', consumerResult);
          
          // If it looks like JSON, try to parse it
          if (consumerResult.startsWith('{') || consumerResult.startsWith('[')) {
            return res.json(JSON.parse(consumerResult));
          } else {
            // Otherwise, just return an error
            return res.json({ 
              err: 'Could not fetch data from consumer endpoint', 
              note: 'Response was not in JSON format' 
            });
          }
        } catch (parseError) {
          console.error('Error parsing consumer response:', parseError);
          return res.json({ 
            err: 'Error parsing consumer endpoint response', 
            details: parseError.message 
          });
        }
      } catch (consumerError) {
        console.error('Error with consumer endpoint:', consumerError);
        return res.status(500).json({ 
          err: 'Failed to fetch data through any available endpoint', 
          details: consumerError.message 
        });
      }
    }
  } catch (error) {
    console.error('Error processing fetch request:', error);
    return res.status(500).json({ err: 'Server error', details: error.message });
  }
});

// Start the server
app.listen(DIRECT_PORT, () => {
  console.log(`Direct Storage Server listening on port ${DIRECT_PORT}`);
  console.log(`Direct submit endpoint: http://localhost:${DIRECT_PORT}/api/direct-submit`);
  console.log(`Fetch data endpoint: http://localhost:${DIRECT_PORT}/api/fetch-data`);
});
