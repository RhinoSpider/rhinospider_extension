#!/bin/bash

# Comprehensive deployment script for the Search Proxy server
# This script handles the complete deployment process for the Search Proxy server
# including server setup, dependencies, configuration, and service management

echo "===== RHINOSPIDER SEARCH PROXY SERVER DEPLOYMENT ====="

# Configuration variables
SERVER="root@search-proxy.rhinospider.com"
PASSWORD="ffGpA2saNS47qr"
SERVER_PORT=3002
API_KEY="ffGpA2saNS47qr"

# Create deployment script to run on the server
cat > /tmp/search_proxy_deploy.sh << 'EOF'
#!/bin/bash

# Server setup script for Search Proxy
# This will be executed on the remote server

# Configuration variables - will be replaced by the deployment script
SERVER_PORT="__SERVER_PORT__"
API_KEY="__API_KEY__"

echo "===== SETTING UP SEARCH PROXY SERVER ====="

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

# Create directory for Search Proxy
echo "Creating Search Proxy directory..."
mkdir -p /opt/search-proxy

# Create server.js file
echo "Creating server.js file..."
cat > /opt/search-proxy/server.js << 'SERVERJS'
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

// Environment variables
const PORT = process.env.PORT || 3002;
const API_KEY = process.env.API_KEY || 'ffGpA2saNS47qr';

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'search-proxy'
  });
});

// Search endpoint
app.post('/api/search', authenticateApiKey, async (req, res) => {
  console.log('==== /api/search endpoint called ====');
  
  try {
    const { query, topic, limit } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Missing required field: query' });
    }
    
    console.log(`Searching for: ${query}`);
    console.log(`Topic: ${topic || 'none'}`);
    console.log(`Limit: ${limit || 10}`);
    
    // Perform search operation
    // This is a simplified implementation
    // In a real-world scenario, you would integrate with a search engine or database
    
    // Simulate search results
    const results = generateSearchResults(query, topic, limit || 10);
    
    return res.json({ results });
  } catch (error) {
    console.error('Error in search endpoint:', error);
    return res.status(500).json({ error: error.message || 'Failed to perform search' });
  }
});

// Function to generate search results
function generateSearchResults(query, topic, limit) {
  // This is a placeholder function
  // In a real implementation, this would query a search engine or database
  
  const baseUrls = [
    'https://example.com',
    'https://example.org',
    'https://example.net',
    'https://test.com',
    'https://sample.org'
  ];
  
  const results = [];
  
  for (let i = 0; i < limit; i++) {
    const baseUrl = baseUrls[Math.floor(Math.random() * baseUrls.length)];
    const path = `/${query.replace(/\s+/g, '-')}/${i + 1}`;
    
    results.push({
      url: `${baseUrl}${path}`,
      title: `Result ${i + 1} for "${query}"${topic ? ` in topic ${topic}` : ''}`,
      snippet: `This is a sample search result for the query "${query}"${topic ? ` in the topic "${topic}"` : ''}.`,
      relevanceScore: Math.random() * 10
    });
  }
  
  // Sort by relevance score
  return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

// Start the server
app.listen(PORT, () => {
  console.log(`Search Proxy server running on port ${PORT}`);
});
SERVERJS

# Create .env file
echo "Creating .env file..."
cat > /opt/search-proxy/.env << ENVFILE
PORT=${SERVER_PORT}
API_KEY=${API_KEY}
ENVFILE

# Install dependencies
echo "Installing dependencies..."
cd /opt/search-proxy
npm init -y
npm install --save dotenv express cors axios

# Create PM2 configuration
echo "Creating PM2 configuration..."
cat > /opt/search-proxy/ecosystem.config.js << PMCONFIG
module.exports = {
  apps: [{
    name: 'search-proxy',
    script: '/opt/search-proxy/server.js',
    env: {
      NODE_ENV: 'production',
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/var/log/search-proxy-error.log',
    out_file: '/var/log/search-proxy-out.log',
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
cat > /etc/nginx/sites-available/search-proxy.rhinospider.com << NGINXCONF
server {
    listen 80;
    server_name search-proxy.rhinospider.com;

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
ln -sf /etc/nginx/sites-available/search-proxy.rhinospider.com /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx

# Set up SSL with Certbot
echo "Setting up SSL with Certbot..."
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d search-proxy.rhinospider.com --non-interactive --agree-tos --email admin@rhinospider.com

# Start the server with PM2
echo "Starting the server with PM2..."
cd /opt/search-proxy
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Print server status
echo "===== SEARCH PROXY SERVER DEPLOYMENT COMPLETE ====="
echo "Server is running at: https://search-proxy.rhinospider.com"
echo "Testing health endpoint..."
curl -s http://localhost:${SERVER_PORT}/api/health
echo ""
echo "PM2 status:"
pm2 list
EOF

# Replace configuration variables in the deployment script
sed -i "s/__SERVER_PORT__/$SERVER_PORT/g" /tmp/search_proxy_deploy.sh
sed -i "s/__API_KEY__/$API_KEY/g" /tmp/search_proxy_deploy.sh

# Make the script executable
chmod +x /tmp/search_proxy_deploy.sh

# Deploy to the server
echo "===== DEPLOYING TO SERVER ====="
echo "Copying deployment script to server..."
sshpass -p "$PASSWORD" scp /tmp/search_proxy_deploy.sh $SERVER:/tmp/

# Execute the deployment script on the server
echo "Executing deployment script on server..."
sshpass -p "$PASSWORD" ssh $SERVER "cd /tmp && chmod +x search_proxy_deploy.sh && ./search_proxy_deploy.sh"

echo "===== DEPLOYMENT COMPLETED ====="
echo "Search Proxy server is now deployed and running at: https://search-proxy.rhinospider.com"
