#!/bin/bash
# server-fix.sh - Comprehensive RhinoSpider server fix script

set -e # Exit on error

echo "=== RhinoSpider Server Fix Script ==="
echo "Timestamp: $(date)"
echo

echo "=== Checking Dependencies ==="
# Install required packages
apt-get update
apt-get install -y nginx curl certbot python3-certbot-nginx openssl

echo "=== Checking DNS Resolution ==="
echo "ic-proxy.rhinospider.com resolves to:"
IP1=$(dig +short ic-proxy.rhinospider.com || echo "Failed to resolve")
echo $IP1
echo
echo "search-proxy.rhinospider.com resolves to:"
IP2=$(dig +short search-proxy.rhinospider.com || echo "Failed to resolve")
echo $IP2
echo

# Check if IPs point to this server
SERVER_IP=$(curl -s http://checkip.amazonaws.com/ || wget -qO- http://checkip.amazonaws.com/)
echo "Server IP: $SERVER_IP"

if [[ "$IP1" != "$SERVER_IP" || "$IP2" != "$SERVER_IP" ]]; then
    echo "WARNING: DNS records don't match this server's IP!"
    echo "Please update your DNS records to point to $SERVER_IP"
    echo "Continuing anyway..."
fi

echo "=== Creating Nginx Configuration ==="
# Create configuration for ic-proxy
cat > /etc/nginx/sites-available/ic-proxy.conf << 'EOF'
server {
    listen 80;
    server_name ic-proxy.rhinospider.com;

    # For certbot challenges
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name ic-proxy.rhinospider.com;

    ssl_certificate /etc/letsencrypt/live/ic-proxy.rhinospider.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ic-proxy.rhinospider.com/privkey.pem;
    
    # Strong SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,x-device-id,x-client-id,x-api-key,Authorization' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,x-device-id,x-client-id,x-api-key,Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
}
EOF

# Create configuration for search-proxy
cat > /etc/nginx/sites-available/search-proxy.conf << 'EOF'
server {
    listen 80;
    server_name search-proxy.rhinospider.com;

    # For certbot challenges
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name search-proxy.rhinospider.com;

    ssl_certificate /etc/letsencrypt/live/search-proxy.rhinospider.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/search-proxy.rhinospider.com/privkey.pem;
    
    # Strong SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    
    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,x-device-id,x-client-id,x-api-key,Authorization' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,x-device-id,x-client-id,x-api-key,Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
}
EOF

echo "=== Enabling Configurations ==="
ln -sf /etc/nginx/sites-available/ic-proxy.conf /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/search-proxy.conf /etc/nginx/sites-enabled/

# Remove default if it exists
rm -f /etc/nginx/sites-enabled/default

echo "=== Checking Nginx Configuration ==="
nginx -t

echo "=== Setting up SSL Certificates ==="
mkdir -p /var/www/html/.well-known/acme-challenge
chmod -R 755 /var/www/html

# Restart nginx to apply initial config
systemctl restart nginx

# Check if we have a proper certificate already
if [ ! -f "/etc/letsencrypt/live/ic-proxy.rhinospider.com/fullchain.pem" ]; then
    echo "Setting up SSL certificates with Let's Encrypt..."
    certbot --nginx -d ic-proxy.rhinospider.com --non-interactive --agree-tos --email admin@example.com || {
        echo "Certbot failed for ic-proxy.rhinospider.com, creating self-signed certificate..."
        mkdir -p /etc/letsencrypt/live/ic-proxy.rhinospider.com
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout /etc/letsencrypt/live/ic-proxy.rhinospider.com/privkey.pem \
            -out /etc/letsencrypt/live/ic-proxy.rhinospider.com/fullchain.pem \
            -subj "/CN=ic-proxy.rhinospider.com" \
            -addext "subjectAltName=DNS:ic-proxy.rhinospider.com"
    }
else
    echo "Certificate for ic-proxy.rhinospider.com already exists."
fi

if [ ! -f "/etc/letsencrypt/live/search-proxy.rhinospider.com/fullchain.pem" ]; then
    echo "Setting up SSL certificates with Let's Encrypt..."
    certbot --nginx -d search-proxy.rhinospider.com --non-interactive --agree-tos --email admin@example.com || {
        echo "Certbot failed for search-proxy.rhinospider.com, creating self-signed certificate..."
        mkdir -p /etc/letsencrypt/live/search-proxy.rhinospider.com
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout /etc/letsencrypt/live/search-proxy.rhinospider.com/privkey.pem \
            -out /etc/letsencrypt/live/search-proxy.rhinospider.com/fullchain.pem \
            -subj "/CN=search-proxy.rhinospider.com" \
            -addext "subjectAltName=DNS:search-proxy.rhinospider.com"
    }
else
    echo "Certificate for search-proxy.rhinospider.com already exists."
fi

echo "=== Opening Firewall Ports ==="
# Check if ufw is installed
if command -v ufw &> /dev/null; then
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw status
else
    echo "ufw not installed, skipping firewall configuration."
fi

echo "=== Starting RhinoSpider Services ==="
# Check if the services are running and restart if needed
systemctl status ic-proxy.service &>/dev/null
if [ $? -ne 0 ]; then
    echo "IC Proxy service not found or not running."
    echo "Checking if we can find and start processes on port 3001..."
    
    if lsof -i:3001; then
        echo "Process already running on port 3001"
    else
        echo "No process on port 3001, please manually start the IC Proxy service."
    fi
else
    echo "Restarting IC Proxy service..."
    systemctl restart ic-proxy.service
fi

systemctl status search-proxy.service &>/dev/null
if [ $? -ne 0 ]; then
    echo "Search Proxy service not found or not running."
    echo "Checking if we can find and start processes on port 3002..."
    
    if lsof -i:3002; then
        echo "Process already running on port 3002"
    else
        echo "No process on port 3002, please manually start the Search Proxy service."
    fi
else
    echo "Restarting Search Proxy service..."
    systemctl restart search-proxy.service
fi

echo "=== Restarting Nginx ==="
systemctl restart nginx

echo "=== Testing Endpoints ==="
echo "Testing HTTP endpoints:"
curl -s -w "\n%{http_code}" http://ic-proxy.rhinospider.com/api/health
echo
curl -s -w "\n%{http_code}" http://search-proxy.rhinospider.com/api/health
echo

echo "Testing HTTPS endpoints:"
curl -s -w "\n%{http_code}" -k https://ic-proxy.rhinospider.com/api/health
echo
curl -s -w "\n%{http_code}" -k https://search-proxy.rhinospider.com/api/health
echo

echo "=== Fix Completed ==="
echo "Next steps:"
echo "1. Run the test-connections.sh script for comprehensive testing"
echo "2. Verify that HTTPS and HTTP endpoints are working correctly"