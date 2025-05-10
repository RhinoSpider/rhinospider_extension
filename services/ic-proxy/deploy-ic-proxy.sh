#!/bin/bash
# Script to deploy only the IC Proxy service

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get password from command line argument
if [ -z "$1" ]; then
  echo -e "${RED}Error: Password is required as the first argument${NC}"
  echo -e "Usage: $0 <password>"
  exit 1
fi

SSH_PASSWORD="$1"

# Configuration
REMOTE_USER="root"
REMOTE_HOST="ic-proxy.rhinospider.com"
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

section "Deploying IC Proxy Service"

# Step 1: Create directory on server
section "Step 1: Creating directory on server"
status "Creating IC Proxy directory..."
sshpass -p "${SSH_PASSWORD}" ssh -o StrictHostKeyChecking=no ${REMOTE_USER}@${REMOTE_HOST} "mkdir -p ${IC_PROXY_DIR}"

# Step 2: Prepare IC Proxy files
section "Step 2: Preparing IC Proxy files"
status "Creating temporary directory for IC Proxy..."
mkdir -p /tmp/rhinospider-ic-proxy

status "Copying IC Proxy files..."
cp -r /Users/ayanuali/development/rhinospider/services/ic-proxy/* /tmp/rhinospider-ic-proxy/

# Create a simplified authorization script
status "Creating simplified authorization script..."
cat > /tmp/rhinospider-ic-proxy/simple-authorize.js << 'EOL'
// Simple script to authorize the consumer canister to call the storage canister
// This script uses minimal dependencies and is designed to be run on the server

// BigInt serialization patch
if (typeof BigInt.prototype.toJSON !== 'function') {
  BigInt.prototype.toJSON = function() { 
    return this.toString(); 
  };
}

const { Actor, HttpAgent, AnonymousIdentity } = require('@dfinity/agent');
const { Principal } = require('@dfinity/principal');
const fetch = require('node-fetch');

// Environment variables
const IC_HOST = process.env.IC_HOST || 'https://icp0.io';
const CONSUMER_CANISTER_ID = process.env.CONSUMER_CANISTER_ID || 'tgyl5-yyaaa-aaaaj-az4wq-cai';
const STORAGE_CANISTER_ID = process.env.STORAGE_CANISTER_ID || 'hhaip-uiaaa-aaaao-a4khq-cai';

// Define the storage canister interface with just the authorization method
const storageIdlFactory = ({ IDL }) => {
  const Error = IDL.Variant({
    'NotFound': IDL.Null,
    'NotAuthorized': IDL.Null,
    'AlreadyExists': IDL.Null,
    'InvalidInput': IDL.Null,
  });
  
  const Result = IDL.Variant({ 'ok': IDL.Null, 'err': Error });
  
  return IDL.Service({
    'addAuthorizedCanister': IDL.Func([IDL.Principal], [Result], []),
  });
};

// Authorize the consumer canister to call the storage canister
const authorizeConsumerCanister = async () => {
  try {
    console.log('=== Authorizing Consumer Canister to Call Storage Canister ===');
    console.log('Consumer Canister ID:', CONSUMER_CANISTER_ID);
    console.log('Storage Canister ID:', STORAGE_CANISTER_ID);
    
    // Convert consumer canister ID to Principal
    const consumerPrincipal = Principal.fromText(CONSUMER_CANISTER_ID);
    console.log('Consumer Principal:', consumerPrincipal.toString());
    
    // Use anonymous identity for authorization
    const anonymousIdentity = new AnonymousIdentity();
    
    // Create a new agent with the anonymous identity
    const agent = new HttpAgent({
      host: IC_HOST,
      identity: anonymousIdentity,
      fetch
    });
    
    // Fetch the root key for non-production environment
    if (IC_HOST !== 'https://ic0.app') {
      await agent.fetchRootKey().catch(err => {
        console.warn('Warning: Unable to fetch root key');
        console.error(err);
      });
    }
    
    // Log the principal ID being used - the anonymous identity principal is always 2vxsx-fae
    console.log(`Using anonymous identity with principal: 2vxsx-fae for authorization`);
    
    // Create a new storage actor with the anonymous identity
    const storageActor = Actor.createActor(storageIdlFactory, {
      agent,
      canisterId: STORAGE_CANISTER_ID
    });
    
    // Call the addAuthorizedCanister method on the storage canister
    console.log('Calling addAuthorizedCanister method...');
    const result = await storageActor.addAuthorizedCanister(consumerPrincipal);
    console.log('Authorization result:', JSON.stringify(result));
    
    if (result.err) {
      if (result.err.AlreadyExists) {
        console.log('\n=== Already Authorized ===');
        console.log('The consumer canister is already authorized to call the storage canister.');
        return true;
      } else {
        console.error('Error authorizing consumer canister:', JSON.stringify(result.err));
        return false;
      }
    }
    
    console.log('\n=== Authorization Successful ===');
    console.log('The consumer canister has been authorized to call the storage canister.');
    return true;
  } catch (error) {
    console.error('Error authorizing consumer canister:', error.message || error);
    console.error('Error stack:', error.stack);
    return false;
  }
};

// Run the authorization process
authorizeConsumerCanister()
  .then((success) => {
    if (success) {
      console.log('Authorization process completed successfully.');
      process.exit(0);
    } else {
      console.log('Authorization process failed.');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('Unhandled error during authorization:', error);
    process.exit(1);
  });
EOL

# Create a package.json file with all required dependencies
status "Creating package.json with all required dependencies..."
cat > /tmp/rhinospider-ic-proxy/package.json << 'EOL'
{
  "name": "rhinospider-ic-proxy",
  "version": "1.0.0",
  "description": "IC Proxy Server for RhinoSpider",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "authorize": "node simple-authorize.js"
  },
  "dependencies": {
    "@dfinity/agent": "^0.20.2",
    "@dfinity/identity": "^0.20.2",
    "@dfinity/principal": "^0.20.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "morgan": "^1.10.0",
    "node-fetch": "^2.6.7"
  }
}
EOL

status "Compressing IC Proxy files..."
cd /tmp
tar -czf rhinospider-ic-proxy.tar.gz rhinospider-ic-proxy

status "Copying compressed IC Proxy files to server..."
sshpass -p "${SSH_PASSWORD}" scp -o StrictHostKeyChecking=no /tmp/rhinospider-ic-proxy.tar.gz ${REMOTE_USER}@${REMOTE_HOST}:/tmp/

status "Extracting IC Proxy files on server..."
sshpass -p "${SSH_PASSWORD}" ssh -o StrictHostKeyChecking=no ${REMOTE_USER}@${REMOTE_HOST} "cd /tmp && tar -xzf rhinospider-ic-proxy.tar.gz && cp -r rhinospider-ic-proxy/* ${IC_PROXY_DIR}/ && rm -rf /tmp/rhinospider-ic-proxy*"

# Step 3: Install dependencies and run the service
section "Step 3: Installing dependencies"
status "Installing dependencies for IC Proxy..."
sshpass -p "${SSH_PASSWORD}" ssh -o StrictHostKeyChecking=no ${REMOTE_USER}@${REMOTE_HOST} "cd ${IC_PROXY_DIR} && npm install --force"

# Step 4: Create Docker Compose file for IC Proxy only
section "Step 4: Creating Docker Compose file"
status "Creating Docker Compose file for IC Proxy only..."
cat > /tmp/docker-compose.yml << 'EOL'
version: '3'

services:
  ic-proxy:
    image: node:18
    container_name: ic-proxy
    restart: unless-stopped
    working_dir: /app
    volumes:
      - /root/rhinospider-ic-proxy:/app
    ports:
      - '3001:3001'
    command: >
      bash -c 'cd /app && npm install --force && node server.js'
    environment:
      - PORT=3001
      - NODE_ENV=production
      - IC_HOST=https://icp0.io
      - CONSUMER_CANISTER_ID=tgyl5-yyaaa-aaaaj-az4wq-cai
      - ADMIN_CANISTER_ID=444wf-gyaaa-aaaaj-az5sq-cai
      - STORAGE_CANISTER_ID=hhaip-uiaaa-aaaao-a4khq-cai
      - API_PASSWORD=ffGpA2saNS47qr
EOL

status "Copying Docker Compose file to server..."
sshpass -p "${SSH_PASSWORD}" scp -o StrictHostKeyChecking=no /tmp/docker-compose.yml ${REMOTE_USER}@${REMOTE_HOST}:/root/

# Step 5: Start the service
section "Step 5: Starting IC Proxy service"
status "Stopping any existing services..."
sshpass -p "${SSH_PASSWORD}" ssh -o StrictHostKeyChecking=no ${REMOTE_USER}@${REMOTE_HOST} "docker stop ic-proxy 2>/dev/null || true"
sshpass -p "${SSH_PASSWORD}" ssh -o StrictHostKeyChecking=no ${REMOTE_USER}@${REMOTE_HOST} "docker rm ic-proxy 2>/dev/null || true"

status "Starting IC Proxy using Docker Compose..."
sshpass -p "${SSH_PASSWORD}" ssh -o StrictHostKeyChecking=no ${REMOTE_USER}@${REMOTE_HOST} "cd /root && docker-compose up -d"

status "Waiting for service to start..."
sleep 10

status "Checking if service is running..."
sshpass -p "${SSH_PASSWORD}" ssh -o StrictHostKeyChecking=no ${REMOTE_USER}@${REMOTE_HOST} "docker ps"

# Step 6: Authorize consumer canister
section "Step 6: Authorizing consumer canister"
status "Running authorization script..."
sshpass -p "${SSH_PASSWORD}" ssh -o StrictHostKeyChecking=no ${REMOTE_USER}@${REMOTE_HOST} "cd ${IC_PROXY_DIR} && node simple-authorize.js"

# Step 7: Test the endpoint
section "Step 7: Testing IC Proxy endpoint"
status "Testing IC Proxy health endpoint..."
sshpass -p "${SSH_PASSWORD}" ssh -o StrictHostKeyChecking=no ${REMOTE_USER}@${REMOTE_HOST} "curl -s http://localhost:3001/api/health"
echo ""

status "Testing consumer-submit endpoint..."
sshpass -p "${SSH_PASSWORD}" ssh -o StrictHostKeyChecking=no ${REMOTE_USER}@${REMOTE_HOST} "curl -s -X POST http://localhost:3001/api/consumer-submit \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer ffGpA2saNS47qr' \
  -d '{\"url\":\"https://example.com\",\"content\":\"test content\",\"topicId\":\"test-topic\",\"deviceId\":\"test-device\",\"principalId\":\"2vxsx-fae\"}'"
echo ""

section "Deployment Complete"
echo -e "${GREEN}IC Proxy has been deployed successfully.${NC}"
echo -e "IC Proxy URL: https://ic-proxy.rhinospider.com"
echo -e "\nTo check Docker logs:"
echo -e "  ${YELLOW}sshpass -p "${SSH_PASSWORD}" ssh -o StrictHostKeyChecking=no ${REMOTE_USER}@${REMOTE_HOST} \"docker logs ic-proxy\"${NC}"

# Clean up temporary files
rm -rf /tmp/rhinospider-ic-proxy
rm -f /tmp/rhinospider-ic-proxy.tar.gz
rm -f /tmp/docker-compose.yml
