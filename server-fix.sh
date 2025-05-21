#!/bin/bash

echo "===== RhinoSpider Server Fix Script ====="
echo "This script will fix HTTPS connections for RhinoSpider proxy servers"

# Check if we're on the Digital Ocean server
if [ "$(hostname)" != "rhinospider-server" ]; then
  echo "This script must be run on the Digital Ocean server."
  echo "Let's connect to the server now..."
  
  # SSH into the Digital Ocean server
  ssh root@143.244.133.154
  exit 0
fi

echo "===== Installing required packages ====="
apt-get update
apt-get install -y nginx certbot python3-certbot-nginx

echo "===== Configuring Nginx for both proxy servers ====="
cat > /etc/nginx/sites-available/rhinospider << 'EOF'
# IC Proxy Server
server {
    listen 80;
    listen 443 ssl;
    server_name ic-proxy.rhinospider.com;

    ssl_certificate /etc/letsencrypt/live/ic-proxy.rhinospider.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ic-proxy.rhinospider.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,x-device-id' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,x-device-id';
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
    listen 443 ssl;
    server_name search-proxy.rhinospider.com;

    ssl_certificate /etc/letsencrypt/live/search-proxy.rhinospider.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/search-proxy.rhinospider.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,x-device-id' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,x-device-id';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
}
EOF

# Create symbolic links to enable sites
ln -sf /etc/nginx/sites-available/rhinospider /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Check nginx config
nginx -t

# Obtain SSL certificates
echo "===== Obtaining SSL certificates ====="
certbot --nginx -d ic-proxy.rhinospider.com -d search-proxy.rhinospider.com --non-interactive --agree-tos --email admin@rhinospider.com

# Restart nginx
systemctl restart nginx

# Check if IC Proxy and Search Proxy services are running
echo "===== Checking if proxy services are running ====="
IC_PROXY_RUNNING=$(netstat -tuln | grep 3001 | wc -l)
SEARCH_PROXY_RUNNING=$(netstat -tuln | grep 3002 | wc -l)

if [ "$IC_PROXY_RUNNING" -eq 0 ]; then
  echo "IC Proxy is not running. Starting it now..."
  cd /Users/ayanuali/development/rhinospider/services/ic-proxy
  npm start &
fi

if [ "$SEARCH_PROXY_RUNNING" -eq 0 ]; then
  echo "Search Proxy is not running. Starting it now..."
  cd /Users/ayanuali/development/rhinospider/services/search-proxy
  npm start &
fi

echo "===== Testing connections ====="
echo "Testing HTTP endpoints..."
curl -v http://localhost:3001
curl -v http://localhost:3002
curl -v http://ic-proxy.rhinospider.com
curl -v http://search-proxy.rhinospider.com

echo "Testing HTTPS endpoints..."
curl -v https://ic-proxy.rhinospider.com
curl -v https://search-proxy.rhinospider.com

echo "===== Server fix completed ====="
echo "The server should now accept both HTTP and HTTPS connections"
echo "Next step: Update the Chrome extension"
