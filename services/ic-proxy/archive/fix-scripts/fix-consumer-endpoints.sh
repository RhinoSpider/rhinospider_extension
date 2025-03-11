#!/bin/bash

# Script to fix the consumer endpoints on the IC proxy server
# This script updates the server.js file to properly handle the consumer endpoints

# Default SSH settings
SSH_USER=${SSH_USER:-"root"}
SSH_HOST=${SSH_HOST:-"143.244.133.154"}
REMOTE_DIR="/root/rhinospider-ic-proxy"

echo "=== Fixing Consumer Endpoints on IC Proxy Server ==="

# Create a temporary directory for the files
TEMP_DIR=$(mktemp -d)
echo "Created temporary directory: $TEMP_DIR"

# Copy the server.js file to the temporary directory
cp server.js "$TEMP_DIR/"

# Add CORS headers to server.js
cat > "$TEMP_DIR/server.js" << 'EOF'
// IC Proxy Server
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Actor, HttpAgent } = require('@dfinity/agent');
const { IDL } = require('@dfinity/candid');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { Ed25519KeyIdentity } = require('@dfinity/identity');
const { Principal } = require('@dfinity/principal');
const { Cbor } = require('@dfinity/agent');
const { Secp256k1KeyIdentity } = require('@dfinity/identity-secp256k1');
const { idlFactory } = require('./consumer.did.js');

// Configuration
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.API_KEY || 'development-api-key';
const CANISTER_ID = process.env.CANISTER_ID || 'ryjl3-tyaaa-aaaaa-aaaba-cai'; // Default to IC management canister
const CONSUMER_CANISTER_ID = process.env.CONSUMER_CANISTER_ID || 'rrkah-fqaaa-aaaaa-aaaaq-cai'; // Default to consumer canister

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// API key authentication middleware
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['authorization'];
  
  // Skip authentication for development environment
  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  
  if (!apiKey || !apiKey.startsWith('Bearer ') || apiKey.substring(7) !== API_KEY) {
    return res.status(401).json({ err: { message: 'Unauthorized: Invalid API key' } });
  }
  
  next();
};

// Create HTTP agent for Internet Computer
const createAgent = () => {
  return new HttpAgent({
    host: 'https://ic0.app',
    fetch
  });
};

// Create actor for interacting with consumer canister
const createConsumerActor = (identity) => {
  const agent = createAgent();
  
  if (identity) {
    agent.replaceIdentity(identity);
  }
  
  return Actor.createActor(idlFactory, {
    agent,
    canisterId: CONSUMER_CANISTER_ID
  });
};

// Utility function to parse delegation
const parseDelegation = (delegationString) => {
  if (!delegationString) return null;
  
  try {
    return JSON.parse(delegationString);
  } catch (error) {
    console.error('Error parsing delegation:', error);
    return null;
  }
};

// Utility function to create identity from delegation
const createIdentityFromDelegation = (delegationString) => {
  const delegation = parseDelegation(delegationString);
  if (!delegation) return null;
  
  try {
    // Create identity from delegation
    // This is a simplified version, in production you would validate the delegation chain
    return Ed25519KeyIdentity.fromJSON(JSON.stringify(delegation));
  } catch (error) {
    console.error('Error creating identity from delegation:', error);
    return null;
  }
};

// Utility function to format data for consumer canister
const formatDataForConsumer = (data) => {
  // Ensure all required fields are present
  return {
    url: data.url,
    content: data.content,
    topic: data.topic || data.topicId,
    status: data.status || 'completed',
    timestamp: data.timestamp || Date.now(),
    scraping_time: data.scraping_time || 500,
    source: data.source || 'extension',
    deviceId: data.deviceId
  };
};

// CORS middleware for all API endpoints
app.use('/api/*', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Device-ID, X-Use-Consumer');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Device registration endpoint for consumer canister
app.post('/api/register-device', authenticateApiKey, async (req, res) => {
  console.log('==== /api/register-device endpoint called ====');
  
  try {
    const { deviceId } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({ err: { message: 'Device ID is required' } });
    }
    
    console.log(`Registering device with ID: ${deviceId}`);
    
    // Create anonymous actor (no identity needed for registration)
    const actor = createConsumerActor();
    
    // Register device with consumer canister
    const result = await actor.registerDevice(deviceId);
    console.log('Registration result:', result);
    
    // Return success response
    return res.json({ ok: { registered: true, deviceId } });
  } catch (error) {
    console.error('Error registering device:', error);
    return res.status(500).json({ err: { message: error.message || String(error) } });
  }
});

// Consumer submission endpoint
app.post('/api/consumer-submit', authenticateApiKey, async (req, res) => {
  console.log('==== /api/consumer-submit endpoint called ====');
  
  try {
    const data = req.body;
    const deviceId = data.deviceId || req.headers['x-device-id'];
    
    if (!deviceId) {
      return res.status(400).json({ err: { message: 'Device ID is required' } });
    }
    
    console.log(`Submitting data with device ID: ${deviceId}`);
    console.log('Data fields:', Object.keys(data).join(', '));
    
    // Create anonymous actor (device ID is used for authentication)
    const actor = createConsumerActor();
    
    // Format data for consumer canister
    const formattedData = formatDataForConsumer(data);
    
    // Submit data to consumer canister
    const result = await actor.submitScrapedContent(deviceId, formattedData);
    console.log('Submission result:', result);
    
    // Return success or error response
    if (result.ok) {
      return res.json({ ok: result.ok });
    } else {
      return res.json({ err: result.err });
    }
  } catch (error) {
    console.error('Error submitting data to consumer canister:', error);
    return res.status(500).json({ err: { message: error.message || String(error) } });
  }
});

// Default route
app.get('/', (req, res) => {
  res.send('IC Proxy Server');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
EOF

# Upload the files to the server
echo "Uploading fixed files to server..."
scp -r "$TEMP_DIR"/* $SSH_USER@$SSH_HOST:$REMOTE_DIR/

# Restart the server
echo "Restarting the server..."
ssh $SSH_USER@$SSH_HOST "cd $REMOTE_DIR && pm2 restart ic-proxy"

# Clean up
rm -rf "$TEMP_DIR"
echo "Temporary directory removed"

echo "=== Consumer Endpoints Fixed ==="
echo "The server has been updated with fixed consumer endpoints."
echo "You can now build and deploy the extension with the updated proxy client."
