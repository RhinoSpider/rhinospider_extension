#!/bin/bash

# Set up variables
SSHPASS="ffGpA2saNS47qr"
SERVER="143.244.133.154"

# Create a simple deploy script in /tmp
cat > /tmp/deploy.sh << 'EOF'
#!/bin/bash

# Create file for server configuration
cat > /tmp/server-setup.sh << 'INNEREOF'
#!/bin/bash

echo "===== RhinoSpider Server Fix Script ====="
echo "This script will fix HTTPS connections for RhinoSpider proxy servers"

# Install required packages
echo "===== Installing required packages ====="
apt-get update
apt-get install -y nginx certbot python3-certbot-nginx

# Configure nginx
echo "===== Configuring Nginx for both proxy servers ====="
cat > /etc/nginx/sites-available/rhinospider << 'NGINX_CONF'
# IC Proxy Server
server {
    listen 80;
    server_name ic-proxy.rhinospider.com;
    
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
    server_name search-proxy.rhinospider.com;
    
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
NGINX_CONF

# Create symbolic links to enable sites
ln -sf /etc/nginx/sites-available/rhinospider /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Check nginx config
nginx -t

# Restart nginx
systemctl restart nginx

# Set up SSL with certbot
echo "===== Obtaining SSL certificates ====="
certbot --nginx -d ic-proxy.rhinospider.com -d search-proxy.rhinospider.com --non-interactive --agree-tos --email admin@rhinospider.com

# Restart nginx again after SSL setup
systemctl restart nginx

# Final verification
echo "===== Testing connections ====="
echo "Testing HTTP endpoints..."
curl -v http://localhost:3001/api/health || echo "IC proxy not responding on port 3001"
curl -v http://localhost:3002/api/health || echo "Search proxy not responding on port 3002"

echo "Testing HTTP domain endpoints..."
curl -v http://ic-proxy.rhinospider.com/api/health || echo "IC proxy domain not responding via HTTP"
curl -v http://search-proxy.rhinospider.com/api/health || echo "Search proxy domain not responding via HTTP"

echo "Testing HTTPS domain endpoints..."
curl -v https://ic-proxy.rhinospider.com/api/health || echo "IC proxy domain not responding via HTTPS"
curl -v https://search-proxy.rhinospider.com/api/health || echo "Search proxy domain not responding via HTTPS"

echo "===== Server fix completed ====="
INNEREOF

chmod +x /tmp/server-setup.sh

# Execute the script
echo "Running server setup script..."
/tmp/server-setup.sh | tee /tmp/setup-log.txt

echo "Setup completed! Check /tmp/setup-log.txt for details."
EOF

# Make the script executable
chmod +x /tmp/deploy.sh

# Upload the script
echo "Attempting to connect to server and upload deploy script..."
cat /tmp/deploy.sh | sshpass -p "${SSHPASS}" ssh -o StrictHostKeyChecking=no root@${SERVER} "cat > /root/deploy.sh && chmod +x /root/deploy.sh && /root/deploy.sh"

# Clean up
rm /tmp/deploy.sh
