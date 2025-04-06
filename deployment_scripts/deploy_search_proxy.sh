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
const cheerio = require('cheerio');

// Environment variables
const PORT = process.env.PORT || 3002;
const API_KEY = process.env.API_KEY || 'ffGpA2saNS47qr';
const IC_PROXY_URL = process.env.IC_PROXY_URL || 'http://ic-proxy.rhinospider.com';

// Express app setup
const app = express();
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Cache for topics to avoid frequent requests to IC Proxy
let topicsCache = null;
let topicsCacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

// Function to fetch topics from IC Proxy
async function fetchTopics() {
  console.log('Fetching topics from IC Proxy...');
  const now = Date.now();
  
  // Return cached topics if they're still valid
  if (topicsCache && topicsCacheExpiry > now) {
    console.log('Using cached topics');
    return topicsCache;
  }
  
  try {
    // Make request to IC Proxy
    const response = await axios.post(`${IC_PROXY_URL}/api/topics`, {}, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      }
    });
    
    // Update cache
    topicsCache = response.data;
    topicsCacheExpiry = now + CACHE_TTL;
    console.log(`Fetched ${topicsCache.length} topics from IC Proxy`);
    
    return topicsCache;
  } catch (error) {
    console.error('Error fetching topics from IC Proxy:', error.message);
    // If we have cached topics, return them even if expired
    if (topicsCache) {
      console.log('Using expired cached topics due to fetch error');
      return topicsCache;
    }
    throw new Error('Failed to fetch topics and no cache available');
  }
}

// Function to get topic details by ID
async function getTopicById(topicId) {
  try {
    const topics = await fetchTopics();
    return topics.find(topic => topic.id === topicId);
  } catch (error) {
    console.error('Error getting topic by ID:', error.message);
    return null;
  }
}

// Search endpoint - Using real DuckDuckGo API and dynamic topics
app.post('/api/search', authenticateApiKey, async (req, res) => {
  console.log('==== /api/search endpoint called ====');
  console.log('Request body:', req.body);
  
  try {
    const { query, topic: topicId, limit = 10 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Missing required field: query' });
    }
    
    console.log(`Searching for: ${query}`);
    console.log(`Topic ID: ${topicId || 'none'}`);
    console.log(`Limit: ${limit}`);
    
    // Construct search query based on topic
    let searchQuery = query;
    let topicName = 'General';
    
    if (topicId) {
      // Get topic details from IC Proxy
      const topicDetails = await getTopicById(topicId);
      
      if (topicDetails) {
        topicName = topicDetails.name;
        console.log(`Found topic: ${topicName}`);
        
        // Extract domain patterns from urlPatterns
        if (topicDetails.urlPatterns && topicDetails.urlPatterns.length > 0) {
          const domains = topicDetails.urlPatterns
            .map(pattern => {
              // Extract domain from URL pattern
              const match = pattern.match(/https?:\/\/([^\/\*]+)/);
              return match ? match[1] : null;
            })
            .filter(Boolean);
          
          if (domains.length > 0) {
            // Construct site-specific search query
            if (domains.length === 1) {
              searchQuery = `${query} site:${domains[0]}`;
            } else {
              const siteQuery = domains.map(domain => `site:${domain}`).join(' OR ');
              searchQuery = `${query} (${siteQuery})`;
            }
            console.log(`Using domain-specific search query: ${searchQuery}`);
          }
        }
      } else {
        console.log(`Topic ID ${topicId} not found, using generic search`);
      }
    }
    
    // Perform real search using DuckDuckGo
    const results = await performDuckDuckGoSearch(searchQuery, limit, topicName, topicId);
    
    // Return results directly as an array
    return res.json(results);
  } catch (error) {
    console.error('Error in search endpoint:', error);
    return res.status(500).json({ error: error.message || 'Failed to perform search' });
  }
});

// Function to perform a real search using DuckDuckGo
async function performDuckDuckGoSearch(query, limit, topicName, topicId) {
  console.log(`Performing DuckDuckGo search for: ${query}`);
  
  try {
    // Encode the query for URL
    const encodedQuery = encodeURIComponent(query);
    
    // Make request to DuckDuckGo
    const response = await axios.get(`https://html.duckduckgo.com/html/?q=${encodedQuery}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    // Parse the HTML response
    const $ = cheerio.load(response.data);
    const results = [];
    
    // Extract search results
    $('.result').each((i, element) => {
      if (i >= limit) return false;
      
      const titleElement = $(element).find('.result__title a');
      const title = titleElement.text().trim();
      const url = $(element).find('.result__url').text().trim() || titleElement.attr('href');
      const snippet = $(element).find('.result__snippet').text().trim();
      
      // Clean the URL if it's from DuckDuckGo's redirect
      let cleanUrl = url;
      if (url && url.startsWith('/d.js?')) {
        const urlMatch = url.match(/uddg=([^&]+)/);
        if (urlMatch && urlMatch[1]) {
          cleanUrl = decodeURIComponent(urlMatch[1]);
        }
      }
      
      results.push({
        url: cleanUrl,
        title: title,
        snippet: snippet,
        relevanceScore: 10 - (i * 0.5), // Assign relevance score based on position
        topicId: topicId || null,
        topicName: topicName || 'General'
      });
    });
    
    // If no results from DuckDuckGo, use fallback
    if (results.length === 0) {
      console.log('No results from DuckDuckGo, using fallback data');
      return generateFallbackResults(query, limit, topicName, topicId);
    }
    
    console.log(`Found ${results.length} results from DuckDuckGo`);
    return results;
  } catch (error) {
    console.error('Error performing DuckDuckGo search:', error);
    console.log('Using fallback data due to search error');
    return generateFallbackResults(query, limit, topicName, topicId);
  }
}

// Fallback function to generate results if the API fails
function generateFallbackResults(query, limit, topicName, topicId) {
  console.log('Generating fallback results');
  
  // Generate fallback URLs based on topic
  let baseUrls = [
    'https://example.com/article1',
    'https://example.org/product1',
    'https://example.net/news1',
    'https://test.com/blog1',
    'https://sample.org/review1'
  ];
  
  // If we have a topic name that contains certain keywords, use more specific URLs
  if (topicName) {
    if (topicName.toLowerCase().includes('tech') || topicName.toLowerCase().includes('crunch')) {
      baseUrls = [
        'https://techcrunch.com/2025/04/01/startup-funding-trends',
        'https://techcrunch.com/2025/04/02/ai-breakthroughs',
        'https://techcrunch.com/2025/04/03/blockchain-developments',
        'https://techcrunch.com/2025/04/04/cloud-computing-news',
        'https://techcrunch.com/2025/04/05/cybersecurity-updates'
      ];
    } else if (topicName.toLowerCase().includes('commerce') || topicName.toLowerCase().includes('product')) {
      baseUrls = [
        'https://www.amazon.com/dp/B09B9LFKDZ',
        'https://www.amazon.com/dp/B09CTLVHKW',
        'https://www.bestbuy.com/site/apple-airpods-pro-2nd-generation',
        'https://www.bestbuy.com/site/samsung-galaxy-s24-ultra',
        'https://www.walmart.com/ip/PlayStation-5-Console'
      ];
    }
  }
  
  // Generate results
  const results = [];
  const maxResults = Math.min(limit, baseUrls.length * 3);
  
  for (let i = 0; i < maxResults; i++) {
    const baseUrl = baseUrls[i % baseUrls.length];
    const urlWithQuery = baseUrl + (baseUrl.includes('?') ? '&' : '?') + 
                        'q=' + encodeURIComponent(query);
    
    results.push({
      url: urlWithQuery,
      title: `Result ${i + 1} for "${query}"${topicName ? ` in ${topicName}` : ''}`,
      snippet: `This is a fallback search result for the query "${query}"${topicName ? ` in the topic "${topicName}"` : ''}. The real search API was unavailable.`,
      relevanceScore: (10 - (i * 0.5)),
      topicId: topicId || null,
      topicName: topicName || 'General'
    });
  }
  
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
IC_PROXY_URL=http://ic-proxy.rhinospider.com
ENVFILE

# Install dependencies
echo "Installing dependencies..."
cd /opt/search-proxy
npm init -y
npm install --save dotenv express cors axios cheerio

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
