#!/bin/bash

# Deploy and fix proxy services on Digital Ocean
# This script should be run on the Digital Ocean droplet

echo "🚀 RhinoSpider Proxy Deployment Fix Script"
echo "========================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Step 1: Check current service status
echo ""
echo "📊 Checking current service status..."
echo "-----------------------------------"
netstat -tuln | grep -E "3001|3002" || echo "No services found on ports 3001/3002"
pm2 list 2>/dev/null || echo "PM2 not installed or no processes"

# Step 2: Create directories if needed
echo ""
echo "📁 Setting up directories..."
echo "--------------------------"
mkdir -p /var/www/rhinospider/ic-proxy
mkdir -p /var/www/rhinospider/search-proxy

# Step 3: Deploy IC Proxy Service
echo ""
echo "🔧 Deploying IC Proxy Service..."
echo "-------------------------------"
cd /var/www/rhinospider/ic-proxy

# Check if code exists
if [ ! -f "server.js" ]; then
    echo "❌ IC Proxy code not found! Please copy from:"
    echo "   /services/ic-proxy/* to /var/www/rhinospider/ic-proxy/"
    echo "   Use: scp -r services/ic-proxy/* root@your-droplet-ip:/var/www/rhinospider/ic-proxy/"
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install --production

# Start with PM2
echo "Starting IC Proxy with PM2..."
pm2 delete ic-proxy 2>/dev/null || true
pm2 start server.js --name ic-proxy --env production -- --port 3001
pm2 save

# Step 4: Deploy Search Proxy Service
echo ""
echo "🔧 Deploying Search Proxy Service..."
echo "----------------------------------"
cd /var/www/rhinospider/search-proxy

# Check if code exists
if [ ! -f "server.js" ]; then
    echo "❌ Search Proxy code not found! Please copy from:"
    echo "   /services/search-proxy/* to /var/www/rhinospider/search-proxy/"
    echo "   Use: scp -r services/search-proxy/* root@your-droplet-ip:/var/www/rhinospider/search-proxy/"
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install --production

# Start with PM2
echo "Starting Search Proxy with PM2..."
pm2 delete search-proxy 2>/dev/null || true
pm2 start server.js --name search-proxy --env production -- --port 3002
pm2 save

# Step 5: Fix Nginx Configuration
echo ""
echo "🔧 Fixing Nginx Configuration..."
echo "------------------------------"

# Backup current config
cp /etc/nginx/sites-available/rhinospider /etc/nginx/sites-available/rhinospider.backup.$(date +%Y%m%d_%H%M%S)

# Create proper Nginx config
cat > /etc/nginx/sites-available/rhinospider << 'EOF'
# IC Proxy Server
server {
    listen 80;
    listen [::]:80;
    server_name ic-proxy.rhinospider.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        
        # Handle preflight
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
}

# Search Proxy Server
server {
    listen 80;
    listen [::]:80;
    server_name search-proxy.rhinospider.com;
    
    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        
        # Handle preflight
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
}
EOF

# Test Nginx config
echo "Testing Nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    # Reload Nginx
    systemctl reload nginx
    echo "✅ Nginx reloaded"
else
    echo "❌ Nginx configuration is invalid! Please check the config."
    exit 1
fi

# Step 6: Setup SSL with Certbot (optional)
echo ""
echo "🔒 SSL Setup (Certbot)..."
echo "----------------------"
read -p "Do you want to setup SSL certificates? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    certbot --nginx -d ic-proxy.rhinospider.com -d search-proxy.rhinospider.com --non-interactive --agree-tos --email admin@rhinospider.com
fi

# Step 7: Test endpoints
echo ""
echo "🧪 Testing Endpoints..."
echo "--------------------"
sleep 5  # Give services time to start

echo "Testing IC Proxy Health..."
curl -s http://localhost:3001/api/health || echo "❌ IC Proxy not responding"

echo ""
echo "Testing Search Proxy Health..."
curl -s http://localhost:3002/api/health || echo "❌ Search Proxy not responding"

echo ""
echo "Testing IC Proxy Topics..."
curl -s http://localhost:3001/api/topics | head -n 5 || echo "❌ Topics endpoint not working"

# Step 8: Setup PM2 startup
echo ""
echo "⚙️  Setting up PM2 Startup..."
echo "-------------------------"
pm2 startup systemd -u root --hp /root
pm2 save

echo ""
echo "✅ Deployment Complete!"
echo "===================="
echo ""
echo "Next steps:"
echo "1. Verify services are running: pm2 list"
echo "2. Check logs: pm2 logs ic-proxy"
echo "3. Test from browser:"
echo "   - https://ic-proxy.rhinospider.com/api/health"
echo "   - https://ic-proxy.rhinospider.com/api/topics"
echo "   - https://search-proxy.rhinospider.com/api/health"
echo ""
echo "If services are not running, you may need to copy the code first:"
echo "  scp -r services/ic-proxy/* root@your-droplet-ip:/var/www/rhinospider/ic-proxy/"
echo "  scp -r services/search-proxy/* root@your-droplet-ip:/var/www/rhinospider/search-proxy/"