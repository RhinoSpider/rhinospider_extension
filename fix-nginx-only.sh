#!/bin/bash

# Fix only the Nginx routing configuration
echo "🔧 Fixing Nginx Routing Configuration"
echo "===================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Check current services
echo ""
echo "✅ Current services status:"
pm2 list

# Backup current Nginx config
echo ""
echo "📋 Backing up current Nginx config..."
cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
cp /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/default.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

# Create proper Nginx configuration
echo ""
echo "📝 Creating new Nginx configuration..."

cat > /etc/nginx/sites-available/rhinospider << 'EOF'
# IC Proxy Server - Port 3001
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
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,x-device-id' always;
        
        # Handle OPTIONS preflight
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,x-device-id';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/ic-proxy.rhinospider.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ic-proxy.rhinospider.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

# Search Proxy Server - Port 3002
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
        
        # Handle OPTIONS preflight
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

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/search-proxy.rhinospider.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/search-proxy.rhinospider.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

# HTTP to HTTPS redirect for IC proxy
server {
    listen 80;
    server_name ic-proxy.rhinospider.com;
    return 301 https://$server_name$request_uri;
}

# HTTP to HTTPS redirect for search proxy
server {
    listen 80;
    server_name search-proxy.rhinospider.com;
    return 301 https://$server_name$request_uri;
}
EOF

# Remove old config and enable new one
echo ""
echo "🔄 Updating Nginx site configuration..."
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/rhinospider /etc/nginx/sites-enabled/rhinospider

# Test Nginx configuration
echo ""
echo "🧪 Testing Nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Nginx configuration is valid"
    
    # Reload Nginx
    echo "🔄 Reloading Nginx..."
    systemctl reload nginx
    
    echo ""
    echo "✅ Nginx has been reloaded!"
else
    echo ""
    echo "❌ Nginx configuration test failed!"
    echo "Please check the error messages above."
    exit 1
fi

# Test the endpoints
echo ""
echo "🧪 Testing endpoints..."
echo "====================="
sleep 2

echo ""
echo "1. IC Proxy Health (should be on port 3001):"
curl -s http://localhost:3001/api/health | grep -o '"service":"[^"]*"' || echo "Direct port test"

echo ""
echo "2. IC Proxy via domain (should show ic-proxy service):"
curl -s -H "Host: ic-proxy.rhinospider.com" http://localhost/api/health

echo ""
echo "3. IC Proxy Topics endpoint:"
curl -s -H "Host: ic-proxy.rhinospider.com" http://localhost/api/topics | head -c 200

echo ""
echo ""
echo "4. Search Proxy Health (should be on port 3002):"
curl -s http://localhost:3002/api/health

echo ""
echo ""
echo "✅ Nginx routing fix complete!"
echo ""
echo "The domains should now route correctly:"
echo "  - ic-proxy.rhinospider.com → localhost:3001 (IC Proxy)"
echo "  - search-proxy.rhinospider.com → localhost:3002 (Search Proxy)"
echo ""
echo "Test from your browser:"
echo "  - https://ic-proxy.rhinospider.com/api/health"
echo "  - https://ic-proxy.rhinospider.com/api/topics"