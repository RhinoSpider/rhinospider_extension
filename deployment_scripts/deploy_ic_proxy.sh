#!/bin/bash

# Comprehensive deployment script for the IC Proxy server
# This script handles the complete deployment process for the IC Proxy server
# including server setup, dependencies, configuration, and service management

echo "===== RHINOSPIDER IC PROXY SERVER DEPLOYMENT ====="

# Configuration variables
SERVER="root@ic-proxy.rhinospider.com"
PASSWORD="ffGpA2saNS47qr"
SERVER_PORT=3001
API_KEY="ffGpA2saNS47qr"
CONSUMER_CANISTER_ID="tgyl5-yyaaa-aaaaj-az4wq-cai"
ADMIN_CANISTER_ID="szqyk-3aaaa-aaaaj-az4sa-cai"
IC_HOST="https://icp0.io"

# Create deployment script to run on the server
cat > /tmp/ic_proxy_deploy.sh << 'EOF'
#!/bin/bash

# Server setup script for IC Proxy
# This will be executed on the remote server

# Configuration variables - will be replaced by the deployment script
SERVER_PORT="__SERVER_PORT__"
API_KEY="__API_KEY__"
CONSUMER_CANISTER_ID="__CONSUMER_CANISTER_ID__"
ADMIN_CANISTER_ID="__ADMIN_CANISTER_ID__"
IC_HOST="__IC_HOST__"

echo "===== SETTING UP IC PROXY SERVER ====="

# Update system packages
echo "Updating system packages..."
apt-get update
apt-get upgrade -y

# Install required packages
echo "Installing required packages..."
apt-get install -y curl wget git nginx

# Install Node.js if not already installed
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# Install PM2 globally if not already installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# Create directory for IC Proxy
echo "Creating IC Proxy directory..."
mkdir -p /opt/ic-proxy

# Create server.js file
echo "Creating server.js file..."
cat > /opt/ic-proxy/server.js << 'SERVERJS'
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Actor, HttpAgent } = require('@dfinity/agent');
const { Principal } = require('@dfinity/principal');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { Ed25519KeyIdentity } = require('@dfinity/identity');

// Add BigInt serialization support
BigInt.prototype.toJSON = function() {
  return this.toString();
};

// Environment variables
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.API_KEY || 'ffGpA2saNS47qr';
const CONSUMER_CANISTER_ID = process.env.CONSUMER_CANISTER_ID || 'tgyl5-yyaaa-aaaaj-az4wq-cai';
const ADMIN_CANISTER_ID = process.env.ADMIN_CANISTER_ID || 'szqyk-3aaaa-aaaaj-az4sa-cai';
const IC_HOST = process.env.IC_HOST || 'https://icp0.io';

// Express app setup
const app = express();
app.use(express.json());
app.use(cors());

// Authentication middleware
function authenticateApiKey(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid API key' });
  }
  
  const apiKey = authHeader.split(' ')[1];
  
  if (apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }
  
  next();
}

// Server identity management
function loadOrCreateIdentity() {
  console.log('Loading existing server identity...');
  const identityPath = path.join(__dirname, 'server-identity.json');
  
  try {
    if (fs.existsSync(identityPath)) {
      const identityJson = fs.readFileSync(identityPath, 'utf8');
      const { publicKey, privateKey } = JSON.parse(identityJson);
      const identity = Ed25519KeyIdentity.fromJSON(JSON.stringify([publicKey, privateKey]));
      console.log('Server Principal:', identity.getPrincipal().toString());
      return identity;
    } else {
      console.log('Creating new server identity...');
      const identity = Ed25519KeyIdentity.generate();
      const publicKey = Array.from(identity.getPublicKey().toDer());
      const privateKey = Array.from(identity.toSecretKey());
      
      fs.writeFileSync(
        identityPath,
        JSON.stringify({ publicKey, privateKey }),
        'utf8'
      );
      
      console.log('Server Principal:', identity.getPrincipal().toString());
      return identity;
    }
  } catch (error) {
    console.error('Error loading/creating identity:', error);
    console.log('Using anonymous identity as fallback');
    return null;
  }
}

// Load or create server identity
const serverIdentity = loadOrCreateIdentity();

// Consumer canister interface
const consumerIdlFactory = ({ IDL }) => {
  // Define error type
  const Error = IDL.Variant({
    'NotFound': IDL.Null,
    'AlreadyExists': IDL.Null,
    'NotAuthorized': IDL.Null,
    'InvalidInput': IDL.Text,
    'SystemError': IDL.Text
  });

  // Define ScrapingField
  const ScrapingField = IDL.Record({
    'name': IDL.Text,
    'fieldType': IDL.Text,
    'required': IDL.Bool,
    'aiPrompt': IDL.Opt(IDL.Text)
  });

  // Define ExtractionRules
  const ExtractionRules = IDL.Record({
    'fields': IDL.Vec(ScrapingField),
    'customPrompt': IDL.Opt(IDL.Text)
  });

  // Define AIConfig
  const AIConfig = IDL.Record({
    'apiKey': IDL.Text,
    'model': IDL.Text,
    'costLimits': IDL.Record({
      'maxDailyCost': IDL.Float64,
      'maxMonthlyCost': IDL.Float64,
      'maxConcurrent': IDL.Nat
    })
  });

  // Define ScrapingTopic
  const ScrapingTopic = IDL.Record({
    'id': IDL.Text,
    'status': IDL.Text,
    'name': IDL.Text,
    'description': IDL.Text,
    'scrapingInterval': IDL.Nat,
    'maxRetries': IDL.Nat,
    'activeHours': IDL.Record({
      'start': IDL.Nat,
      'end': IDL.Nat
    }),
    'urlPatterns': IDL.Vec(IDL.Text),
    'extractionRules': ExtractionRules,
    'aiConfig': AIConfig,
    'createdAt': IDL.Int
  });

  // Define Result
  const Result = IDL.Variant({
    'ok': IDL.Vec(ScrapingTopic),
    'err': Error
  });

  // Define UserProfile
  const UserProfile = IDL.Record({
    'principal': IDL.Principal,
    'devices': IDL.Vec(IDL.Text),
    'created': IDL.Int,
    'lastLogin': IDL.Int,
    'preferences': IDL.Record({
      'notificationsEnabled': IDL.Bool,
      'theme': IDL.Text
    })
  });

  // Define ScrapedData
  const ScrapedData = IDL.Record({
    'id': IDL.Text,
    'url': IDL.Text,
    'topic': IDL.Text,
    'content': IDL.Text,
    'source': IDL.Text,
    'timestamp': IDL.Int,
    'client_id': IDL.Principal,
    'status': IDL.Text,
    'scraping_time': IDL.Int
  });

  // Define the service interface
  return IDL.Service({
    'getTopics': IDL.Func([], [Result], []),
    'getAIConfig': IDL.Func([], [IDL.Variant({ 'ok': AIConfig, 'err': Error })], ['query']),
    'getProfile': IDL.Func([], [IDL.Variant({ 'ok': UserProfile, 'err': Error })], []),
    'submitScrapedData': IDL.Func([ScrapedData], [IDL.Variant({ 'ok': IDL.Null, 'err': Error })], [])
  });
};

// Function to transform topics and ensure all required fields are present
function transformTopics(topics) {
  return topics.map(topic => {
    // Ensure all required fields are present
    return {
      id: topic.id || '',
      status: topic.status || 'active',
      name: topic.name || '',
      description: topic.description || '',
      scrapingInterval: topic.scrapingInterval || 0,
      maxRetries: topic.maxRetries || 0,
      activeHours: topic.activeHours || { start: 0, end: 24 },
      urlPatterns: topic.urlPatterns || [],
      extractionRules: topic.extractionRules || { 
        fields: [], 
        customPrompt: [] 
      },
      aiConfig: topic.aiConfig || {
        apiKey: '',
        model: '',
        costLimits: {
          maxDailyCost: 0,
          maxMonthlyCost: 0,
          maxConcurrent: 0
        }
      },
      createdAt: topic.createdAt || 0,
      siteTypeClassification: 'general',
      urlGenerationStrategy: 'manual'
    };
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    policy: 'STRICT REAL ADMIN DATA ONLY - NO MOCK DATA',
    serverPrincipal: serverIdentity ? serverIdentity.getPrincipal().toString() : 'anonymous-read-only',
    consumerCanisterId: CONSUMER_CANISTER_ID,
    adminCanisterId: ADMIN_CANISTER_ID,
    icHost: IC_HOST
  });
});

// Topics endpoint
app.post('/api/topics', authenticateApiKey, async (req, res) => {
  console.log('==== /api/topics endpoint called ====');

  try {
    // Use the consumer canister to get topics
    console.log('Getting topics via consumer canister...');
    console.log(`Consumer Canister ID: ${CONSUMER_CANISTER_ID}`);

    // Create an anonymous agent
    const agent = new HttpAgent({
      host: IC_HOST,
      fetch
    });

    // Create an actor to interact with the consumer canister
    const consumerActor = Actor.createActor(consumerIdlFactory, {
      agent,
      canisterId: CONSUMER_CANISTER_ID
    });

    // Call the getTopics method
    console.log('Calling consumer.getTopics()...');
    const result = await consumerActor.getTopics();
    
    if ('err' in result) {
      console.error('Error getting topics:', result.err);
      return res.status(500).json({ error: `Error getting topics: ${JSON.stringify(result.err)}` });
    }
    
    // Transform topics to ensure all required fields are present
    const transformedTopics = transformTopics(result.ok);
    return res.json({ topics: transformedTopics });
  } catch (error) {
    console.error('Error in topics endpoint:', error);
    return res.status(500).json({ error: error.message || 'Failed to get topics' });
  }
});

// Profile endpoint
app.post('/api/profile', authenticateApiKey, async (req, res) => {
  console.log('==== /api/profile endpoint called ====');
  
  try {
    // Create an anonymous agent
    const agent = new HttpAgent({
      host: IC_HOST,
      fetch
    });

    // Create an actor to interact with the consumer canister
    const consumerActor = Actor.createActor(consumerIdlFactory, {
      agent,
      canisterId: CONSUMER_CANISTER_ID
    });

    // Call the getProfile method
    const result = await consumerActor.getProfile();
    
    if ('err' in result) {
      console.error('Error getting profile:', result.err);
      return res.status(500).json({ error: `Error getting profile: ${JSON.stringify(result.err)}` });
    }
    
    return res.json({ profile: result.ok });
  } catch (error) {
    console.error('Error in profile endpoint:', error);
    return res.status(500).json({ error: error.message || 'Failed to get profile' });
  }
});

// Consumer submit endpoint
app.post('/api/consumer-submit', authenticateApiKey, async (req, res) => {
  console.log('==== /api/consumer-submit endpoint called ====');
  
  try {
    const scrapedData = req.body;
    
    if (!scrapedData || !scrapedData.url || !scrapedData.topic || !scrapedData.content) {
      return res.status(400).json({ error: 'Missing required fields in scraped data' });
    }
    
    // Create an anonymous agent
    const agent = new HttpAgent({
      host: IC_HOST,
      fetch
    });

    // Create an actor to interact with the consumer canister
    const consumerActor = Actor.createActor(consumerIdlFactory, {
      agent,
      canisterId: CONSUMER_CANISTER_ID
    });

    // Call the submitScrapedData method
    const result = await consumerActor.submitScrapedData(scrapedData);
    
    if ('err' in result) {
      console.error('Error submitting scraped data:', result.err);
      return res.status(500).json({ error: `Error submitting scraped data: ${JSON.stringify(result.err)}` });
    }
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error in consumer-submit endpoint:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit scraped data' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`IC Proxy server running on port ${PORT}`);
  console.log(`IC Host: ${IC_HOST}`);
  console.log(`Consumer Canister ID: ${CONSUMER_CANISTER_ID}`);
  console.log(`Admin Canister ID: ${ADMIN_CANISTER_ID}`);
  console.log(`Policy: STRICT REAL ADMIN DATA ONLY - NO MOCK DATA`);
});
SERVERJS

# Create .env file
echo "Creating .env file..."
cat > /opt/ic-proxy/.env << ENVFILE
PORT=${SERVER_PORT}
API_KEY=${API_KEY}
CONSUMER_CANISTER_ID=${CONSUMER_CANISTER_ID}
ADMIN_CANISTER_ID=${ADMIN_CANISTER_ID}
IC_HOST=${IC_HOST}
ENVFILE

# Install dependencies
echo "Installing dependencies..."
cd /opt/ic-proxy
npm init -y
npm install --save dotenv express cors @dfinity/agent @dfinity/principal @dfinity/identity node-fetch

# Create PM2 configuration
echo "Creating PM2 configuration..."
cat > /opt/ic-proxy/ecosystem.config.js << PMCONFIG
module.exports = {
  apps: [{
    name: 'ic-proxy',
    script: '/opt/ic-proxy/server.js',
    env: {
      NODE_ENV: 'production',
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/var/log/ic-proxy-error.log',
    out_file: '/var/log/ic-proxy-out.log',
    merge_logs: true,
    max_memory_restart: '200M',
    restart_delay: 5000,
    wait_ready: true,
    kill_timeout: 3000,
    listen_timeout: 10000,
  }]
};
PMCONFIG

# Set up Nginx configuration
echo "Setting up Nginx configuration..."
cat > /etc/nginx/sites-available/ic-proxy.rhinospider.com << NGINXCONF
server {
    listen 80;
    server_name ic-proxy.rhinospider.com;

    location / {
        proxy_pass http://localhost:${SERVER_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        
        # Remove any existing CORS headers
        proxy_hide_header Access-Control-Allow-Origin;
        proxy_hide_header Access-Control-Allow-Methods;
        proxy_hide_header Access-Control-Allow-Headers;
        
        # Add CORS headers
        add_header Access-Control-Allow-Origin '*' always;
        add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS' always;
        add_header Access-Control-Allow-Headers 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        
        # Handle OPTIONS requests
        if (\$request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin '*' always;
            add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS' always;
            add_header Access-Control-Allow-Headers 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type 'text/plain; charset=utf-8';
            add_header Content-Length 0;
            return 204;
        }
    }
}
NGINXCONF

# Enable the Nginx site
echo "Enabling Nginx site..."
ln -sf /etc/nginx/sites-available/ic-proxy.rhinospider.com /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx

# Set up SSL with Certbot
echo "Setting up SSL with Certbot..."
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d ic-proxy.rhinospider.com --non-interactive --agree-tos --email admin@rhinospider.com

# Start the server with PM2
echo "Starting the server with PM2..."
cd /opt/ic-proxy
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Print server status
echo "===== IC PROXY SERVER DEPLOYMENT COMPLETE ====="
echo "Server is running at: https://ic-proxy.rhinospider.com"
echo "Testing health endpoint..."
curl -s http://localhost:${SERVER_PORT}/api/health
echo ""
echo "PM2 status:"
pm2 list
EOF

# Replace configuration variables in the deployment script
sed -i "s/__SERVER_PORT__/$SERVER_PORT/g" /tmp/ic_proxy_deploy.sh
sed -i "s/__API_KEY__/$API_KEY/g" /tmp/ic_proxy_deploy.sh
sed -i "s/__CONSUMER_CANISTER_ID__/$CONSUMER_CANISTER_ID/g" /tmp/ic_proxy_deploy.sh
sed -i "s/__ADMIN_CANISTER_ID__/$ADMIN_CANISTER_ID/g" /tmp/ic_proxy_deploy.sh
sed -i "s/__IC_HOST__/$IC_HOST/g" /tmp/ic_proxy_deploy.sh

# Make the script executable
chmod +x /tmp/ic_proxy_deploy.sh

# Deploy to the server
echo "===== DEPLOYING TO SERVER ====="
echo "Copying deployment script to server..."
sshpass -p "$PASSWORD" scp /tmp/ic_proxy_deploy.sh $SERVER:/tmp/

# Execute the deployment script on the server
echo "Executing deployment script on server..."
sshpass -p "$PASSWORD" ssh $SERVER "cd /tmp && chmod +x ic_proxy_deploy.sh && ./ic_proxy_deploy.sh"

echo "===== DEPLOYMENT COMPLETED ====="
echo "IC Proxy server is now deployed and running at: https://ic-proxy.rhinospider.com"
