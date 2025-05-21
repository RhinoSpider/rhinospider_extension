#!/bin/bash

# Set up variables
SSHPASS="ffGpA2saNS47qr"
SERVER="143.244.133.154"

# Create a simple script to fix nginx and restart everything
cat > /tmp/restart-services.sh << 'EOF'
#!/bin/bash

echo "===== Fixing nginx configuration ====="
# Get existing configuration
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

# Check nginx config
nginx -t

# Restart nginx
systemctl restart nginx

# Start the proxy services if they're not running
echo "===== Checking and restarting proxy services ====="

# Check IC Proxy
if ! netstat -tuln | grep -q ":3001"; then
    echo "Starting IC Proxy service..."
    cd /root/rhinospider/services/ic-proxy
    npm start > /tmp/ic-proxy.log 2>&1 &
    echo "IC Proxy started with PID $!"
else
    echo "IC Proxy is already running"
fi

# Check Search Proxy
if ! netstat -tuln | grep -q ":3002"; then
    echo "Starting Search Proxy service..."
    cd /root/rhinospider/services/search-proxy
    npm start > /tmp/search-proxy.log 2>&1 &
    echo "Search Proxy started with PID $!"
else
    echo "Search Proxy is already running"
fi

# Final verification
echo "===== Final verification ====="
echo "Testing HTTP endpoints..."
curl -v http://localhost:3001/api/health || echo "IC proxy not responding on port 3001"
curl -v http://localhost:3002/api/health || echo "Search proxy not responding on port 3002"

echo "Testing HTTP domain endpoints..."
curl -v http://ic-proxy.rhinospider.com/api/health || echo "IC proxy domain not responding via HTTP"
curl -v http://search-proxy.rhinospider.com/api/health || echo "Search proxy domain not responding via HTTP"

echo "Testing HTTPS domain endpoints (with -k)..."
curl -k -v https://ic-proxy.rhinospider.com/api/health || echo "IC proxy domain not responding via HTTPS"
curl -k -v https://search-proxy.rhinospider.com/api/health || echo "Search proxy domain not responding via HTTPS"

echo "===== All services should now be operational ====="
EOF

chmod +x /tmp/restart-services.sh

# Upload and execute the script
echo "Attempting to connect to server and restart all services..."
cat /tmp/restart-services.sh | sshpass -p "${SSHPASS}" ssh -o StrictHostKeyChecking=no root@${SERVER} "cat > /root/restart-services.sh && chmod +x /root/restart-services.sh && /root/restart-services.sh"

# Clean up
rm /tmp/restart-services.sh
