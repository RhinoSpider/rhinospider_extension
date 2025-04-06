#!/bin/bash

# Script to enable HTTPS on all RhinoSpider servers
# This script ensures both the servers and nginx are properly configured for HTTPS

echo "===== ENABLING HTTPS FOR RHINOSPIDER SERVERS ====="

# Configuration variables
IC_PROXY_SERVER="root@ic-proxy.rhinospider.com"
SEARCH_PROXY_SERVER="root@search-proxy.rhinospider.com"
STORAGE_SERVER="root@storage.rhinospider.com"
PASSWORD="ffGpA2saNS47qr"

# Create the fix script to run on the IC Proxy server
cat > /tmp/enable_https_ic_proxy.sh << 'EOF'
#!/bin/bash

# Backup existing nginx configuration
echo "Backing up existing nginx configuration..."
cp /etc/nginx/sites-available/ic-proxy.rhinospider.com /etc/nginx/sites-available/ic-proxy.rhinospider.com.bak

# Update nginx configuration for HTTPS
echo "Updating nginx configuration for HTTPS..."
cat > /etc/nginx/sites-available/ic-proxy.rhinospider.com << 'NGINXCONF'
server {
    listen 80;
    server_name ic-proxy.rhinospider.com;
    
    # Redirect all HTTP traffic to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name ic-proxy.rhinospider.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/ic-proxy.rhinospider.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ic-proxy.rhinospider.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    location / {
        # Remove any existing CORS headers
        proxy_hide_header Access-Control-Allow-Origin;
        proxy_hide_header Access-Control-Allow-Methods;
        proxy_hide_header Access-Control-Allow-Headers;
        
        # Add CORS headers
        add_header Access-Control-Allow-Origin '*' always;
        add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS' always;
        add_header Access-Control-Allow-Headers 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        
        # Handle OPTIONS requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin '*' always;
            add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS' always;
            add_header Access-Control-Allow-Headers 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type 'text/plain; charset=utf-8';
            add_header Content-Length 0;
            return 204;
        }
        
        # Proxy to the IC Proxy server
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINXCONF

# Test nginx configuration
echo "Testing nginx configuration..."
nginx -t

# Reload nginx if the test is successful
if [ $? -eq 0 ]; then
    echo "Reloading nginx..."
    systemctl reload nginx
    echo "HTTPS enabled successfully for IC Proxy server."
else
    echo "Nginx configuration test failed. Reverting to backup..."
    cp /etc/nginx/sites-available/ic-proxy.rhinospider.com.bak /etc/nginx/sites-available/ic-proxy.rhinospider.com
    nginx -t && systemctl reload nginx
fi
EOF

# Create the fix script to run on the Search Proxy server
cat > /tmp/enable_https_search_proxy.sh << 'EOF'
#!/bin/bash

# Backup existing nginx configuration
echo "Backing up existing nginx configuration..."
cp /etc/nginx/sites-available/search-proxy.rhinospider.com /etc/nginx/sites-available/search-proxy.rhinospider.com.bak

# Update nginx configuration for HTTPS
echo "Updating nginx configuration for HTTPS..."
cat > /etc/nginx/sites-available/search-proxy.rhinospider.com << 'NGINXCONF'
server {
    listen 80;
    server_name search-proxy.rhinospider.com;
    
    # Redirect all HTTP traffic to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name search-proxy.rhinospider.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/search-proxy.rhinospider.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/search-proxy.rhinospider.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    location / {
        # Remove any existing CORS headers
        proxy_hide_header Access-Control-Allow-Origin;
        proxy_hide_header Access-Control-Allow-Methods;
        proxy_hide_header Access-Control-Allow-Headers;
        
        # Add CORS headers
        add_header Access-Control-Allow-Origin '*' always;
        add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS' always;
        add_header Access-Control-Allow-Headers 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        
        # Handle OPTIONS requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin '*' always;
            add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS' always;
            add_header Access-Control-Allow-Headers 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type 'text/plain; charset=utf-8';
            add_header Content-Length 0;
            return 204;
        }
        
        # Proxy to the Search Proxy server
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINXCONF

# Test nginx configuration
echo "Testing nginx configuration..."
nginx -t

# Reload nginx if the test is successful
if [ $? -eq 0 ]; then
    echo "Reloading nginx..."
    systemctl reload nginx
    echo "HTTPS enabled successfully for Search Proxy server."
else
    echo "Nginx configuration test failed. Reverting to backup..."
    cp /etc/nginx/sites-available/search-proxy.rhinospider.com.bak /etc/nginx/sites-available/search-proxy.rhinospider.com
    nginx -t && systemctl reload nginx
fi
EOF

# Create the fix script to run on the Storage server
cat > /tmp/enable_https_storage.sh << 'EOF'
#!/bin/bash

# Backup existing nginx configuration
echo "Backing up existing nginx configuration..."
cp /etc/nginx/sites-available/storage.rhinospider.com /etc/nginx/sites-available/storage.rhinospider.com.bak

# Update nginx configuration for HTTPS
echo "Updating nginx configuration for HTTPS..."
cat > /etc/nginx/sites-available/storage.rhinospider.com << 'NGINXCONF'
server {
    listen 80;
    server_name storage.rhinospider.com;
    
    # Redirect all HTTP traffic to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name storage.rhinospider.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/storage.rhinospider.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/storage.rhinospider.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    location / {
        # Remove any existing CORS headers
        proxy_hide_header Access-Control-Allow-Origin;
        proxy_hide_header Access-Control-Allow-Methods;
        proxy_hide_header Access-Control-Allow-Headers;
        
        # Add CORS headers
        add_header Access-Control-Allow-Origin '*' always;
        add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS' always;
        add_header Access-Control-Allow-Headers 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        
        # Handle OPTIONS requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin '*' always;
            add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS' always;
            add_header Access-Control-Allow-Headers 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type 'text/plain; charset=utf-8';
            add_header Content-Length 0;
            return 204;
        }
        
        # Proxy to the Storage server
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINXCONF

# Test nginx configuration
echo "Testing nginx configuration..."
nginx -t

# Reload nginx if the test is successful
if [ $? -eq 0 ]; then
    echo "Reloading nginx..."
    systemctl reload nginx
    echo "HTTPS enabled successfully for Storage server."
else
    echo "Nginx configuration test failed. Reverting to backup..."
    cp /etc/nginx/sites-available/storage.rhinospider.com.bak /etc/nginx/sites-available/storage.rhinospider.com
    nginx -t && systemctl reload nginx
fi
EOF

# Function to deploy script to server
deploy_script() {
    local server=$1
    local script=$2
    local script_name=$(basename $script)
    
    echo "Deploying $script_name to $server..."
    sshpass -p "$PASSWORD" scp $script $server:/tmp/$script_name
    sshpass -p "$PASSWORD" ssh $server "chmod +x /tmp/$script_name && sudo /tmp/$script_name"
}

# Deploy scripts to servers
echo "Deploying HTTPS configuration to IC Proxy server..."
deploy_script $IC_PROXY_SERVER /tmp/enable_https_ic_proxy.sh

echo "Deploying HTTPS configuration to Search Proxy server..."
deploy_script $SEARCH_PROXY_SERVER /tmp/enable_https_search_proxy.sh

echo "Deploying HTTPS configuration to Storage server..."
deploy_script $STORAGE_SERVER /tmp/enable_https_storage.sh

echo "HTTPS configuration deployment complete."
